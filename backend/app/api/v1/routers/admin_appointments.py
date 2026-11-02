"""Reception triage: the booking queue, one-click confirm/cancel with patient emails, and booking analytics.

Doctors linked to a doctor profile (users.doctor_id) only ever see their own patients.
"""

from collections import Counter, defaultdict
from datetime import date, timedelta
from decimal import Decimal
from typing import Annotated

from datetime import datetime

from fastapi import APIRouter, Query, status
from pydantic import BaseModel
from sqlalchemy import Select, func, or_, select
from sqlalchemy.orm import selectinload

from app.api.deps import AdminUser, DbSession, StaffUser
from app.core.exceptions import ConflictError, NotFoundError
from app.models import Appointment, Branch, ClinicInfo, Doctor, User, WhatsAppMessage
from app.schemas.appointment import (
    AppointmentAnalytics,
    BranchDemand,
    AppointmentDetail,
    AppointmentList,
    AppointmentOut,
    AppointmentStatus,
    AppointmentUpdate,
    DepartmentDemand,
    MonthCount,
    ResendEmail,
    StatusUpdate,
)
from app.schemas.clinic import Department
from app.schemas.crm import AvailabilityBoard, BoardDoctor, BoardSlot
from app.services.appointments import change_status, clinic_now, clinic_open_on, reschedule, slot_grid
from app.services.email.appointment_emails import send_appointment_email
from app.services.reminders import send_due_reminders
from app.services.whatsapp.notify import send_appointment_whatsapp

router = APIRouter(prefix="/admin/appointments", tags=["admin: appointments"])

STATUSES = ("pending", "confirmed", "completed", "cancelled")
WENT_AHEAD = ("confirmed", "completed")


def _scoped(stmt: Select, user: User) -> Select:
    if user.role == "doctor" and user.doctor_id:
        stmt = stmt.where(Appointment.doctor_id == user.doctor_id)
    return stmt


def _get(db, appointment_id: int, user: User) -> Appointment:
    stmt = _scoped(
        select(Appointment)
        .options(selectinload(Appointment.emails), selectinload(Appointment.whatsapp_messages))
        .where(Appointment.id == appointment_id),
        user,
    )
    appointment = db.scalar(stmt)
    if appointment is None:
        raise NotFoundError("Appointment not found.")
    return appointment


@router.get("", response_model=AppointmentList)
def list_appointments(
    db: DbSession,
    user: StaffUser,
    status_filter: Annotated[AppointmentStatus | None, Query(alias="status")] = None,
    department: Department | None = None,
    doctor_id: int | None = None,
    q: Annotated[str | None, Query(max_length=100, description="Reference, name, email or phone")] = None,
    date_from: date | None = None,
    date_to: date | None = None,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
):
    base = _scoped(select(Appointment), user)
    if department:
        base = base.where(Appointment.department == department)
    if doctor_id:
        base = base.where(Appointment.doctor_id == doctor_id)
    if date_from:
        base = base.where(Appointment.appointment_date >= date_from)
    if date_to:
        base = base.where(Appointment.appointment_date <= date_to)
    if q and q.strip():
        term = f"%{q.strip()}%"
        base = base.where(or_(
            Appointment.reference.ilike(term), Appointment.patient_name.ilike(term),
            Appointment.patient_email.ilike(term), Appointment.patient_phone.ilike(term),
        ))

    # Tab badges count every status under the other filters.
    counts = dict.fromkeys(STATUSES, 0)
    counts.update(_status_counts(db, base))

    stmt = base.where(Appointment.status == status_filter) if status_filter else base
    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    # Open work in date order (soonest first); history newest first.
    if status_filter in ("pending", "confirmed"):
        order = (Appointment.appointment_date, Appointment.start_time)
    else:
        order = (Appointment.appointment_date.desc(), Appointment.start_time.desc())
    items = db.scalars(
        stmt.options(selectinload(Appointment.emails), selectinload(Appointment.whatsapp_messages)).order_by(*order).offset((page - 1) * page_size).limit(page_size)
    ).all()
    return AppointmentList(
        items=[AppointmentOut.model_validate(a) for a in items],
        total=total, page=page, page_size=page_size, pages=max(1, -(-total // page_size)), counts=counts,
    )


def _status_counts(db, base: Select) -> dict[str, int]:
    sub = base.subquery()
    return dict(db.execute(select(sub.c.status, func.count()).group_by(sub.c.status)).all())


@router.get("/analytics", response_model=AppointmentAnalytics)
def appointment_analytics(db: DbSession, user: StaffUser):
    rows = db.execute(_scoped(
        select(
            Appointment.status, Appointment.department, Appointment.source,
            Appointment.appointment_date, Appointment.consultation_fee, Appointment.branch_id,
        ),
        user,
    )).all()
    today = clinic_now().date()
    month_key = f"{today:%Y-%m}"
    fee = lambda r: r.consultation_fee or Decimal(0)  # noqa: E731

    # The current month and the five before it.
    months: list[str] = []
    cursor = today.replace(day=1)
    for _ in range(6):
        months.insert(0, f"{cursor:%Y-%m}")
        cursor = (cursor - timedelta(days=1)).replace(day=1)
    by_month = {m: Counter() for m in months}
    dept_total: Counter = Counter()
    dept_revenue: defaultdict[str, Decimal] = defaultdict(Decimal)
    for r in rows:
        key = f"{r.appointment_date:%Y-%m}"
        if key in by_month:
            by_month[key][r.status] += 1
        dept_total[r.department] += 1
        if r.status in WENT_AHEAD:
            dept_revenue[r.department] += fee(r)

    branch_names = dict(db.execute(select(Branch.id, Branch.name)).all())
    branch_total: Counter = Counter(branch_names.get(r.branch_id, "Not specified") for r in rows)
    wa_rows = db.execute(
        _scoped(select(WhatsAppMessage.status).join(Appointment, Appointment.id == WhatsAppMessage.appointment_id), user)
    ).all()

    went_ahead = sum(1 for r in rows if r.status in WENT_AHEAD)
    cancelled = sum(1 for r in rows if r.status == "cancelled")
    decided = went_ahead + cancelled
    return AppointmentAnalytics(
        total=len(rows),
        this_month=sum(1 for r in rows if f"{r.appointment_date:%Y-%m}" == month_key),
        pending=sum(1 for r in rows if r.status == "pending"),
        today=sum(1 for r in rows if r.appointment_date == today and r.status != "cancelled"),
        upcoming_7_days=sum(
            1 for r in rows if today <= r.appointment_date <= today + timedelta(days=7) and r.status in ("pending", "confirmed")
        ),
        conversion_rate=round(went_ahead / decided, 3) if decided else None,
        cancellation_rate=round(cancelled / decided, 3) if decided else None,
        revenue_this_month=sum(
            (fee(r) for r in rows if r.status in WENT_AHEAD and f"{r.appointment_date:%Y-%m}" == month_key), Decimal(0)
        ),
        revenue_total=sum((fee(r) for r in rows if r.status in WENT_AHEAD), Decimal(0)),
        by_month=[
            MonthCount(month=m, total=sum(c.values()), **{s: c[s] for s in STATUSES}) for m, c in by_month.items()
        ],
        by_department=[
            DepartmentDemand(department=d, total=n, revenue=dept_revenue[d]) for d, n in dept_total.most_common()
        ],
        by_branch=[BranchDemand(branch=b, total=n) for b, n in branch_total.most_common()],
        by_source=dict(Counter(r.source for r in rows)),
        whatsapp_sent=sum(1 for r in wa_rows if r.status == "sent"),
        whatsapp_pending=sum(1 for r in wa_rows if r.status != "sent"),
    )


@router.get("/board", response_model=AvailabilityBoard)
def availability_board(db: DbSession, user: StaffUser, day: Annotated[date | None, Query(alias="date")] = None):
    """Every doctor's slots for one day: free, booked (with the patient) or already past."""
    day = day or clinic_now().date()
    now = clinic_now()
    clinic = db.scalar(select(ClinicInfo).limit(1))
    stmt = select(Doctor).where(Doctor.is_active).order_by(Doctor.full_name)
    if user.role == "doctor" and user.doctor_id:
        stmt = stmt.where(Doctor.id == user.doctor_id)
    doctors = list(db.scalars(stmt))
    booked = {
        (a.doctor_id, a.start_time): a
        for a in db.scalars(
            select(Appointment).where(
                Appointment.appointment_date == day,
                Appointment.status.in_(("pending", "confirmed", "completed")),
                Appointment.doctor_id.in_([d.id for d in doctors] or [0]),
            )
        )
    }
    result = []
    for d in doctors:
        slots = []
        for start, end in slot_grid(d, day):
            appt = booked.get((d.id, start))
            if appt:
                slots.append(BoardSlot(
                    start_time=start, end_time=end, state="booked", appointment_id=appt.id, reference=appt.reference,
                    patient_name=appt.patient_name, status=appt.status,
                ))
            else:
                past = datetime.combine(day, start) < now
                slots.append(BoardSlot(start_time=start, end_time=end, state="past" if past else "free"))
        consulting = bool(slots)
        result.append(BoardDoctor(
            doctor_id=d.id, slug=d.slug, full_name=d.full_name, specialization=d.specialization, photo_url=d.photo_url,
            consulting=consulting,
            hours=f"{d.start_time:%H:%M}–{d.end_time:%H:%M}" if consulting else None,
            free=sum(1 for s in slots if s.state == "free"),
            booked=sum(1 for s in slots if s.state == "booked"),
            slots=slots,
        ))
    return AvailabilityBoard(date=day, clinic_open=clinic_open_on(clinic, day), doctors=result)


class ReminderRun(BaseModel):
    sent: int


@router.post("/reminders/run", response_model=ReminderRun)
def run_reminders(db: DbSession, _: StaffUser):
    """Send any WhatsApp reminders that are due now (the server also does this automatically)."""
    return ReminderRun(sent=send_due_reminders(db))


@router.get("/{appointment_id}", response_model=AppointmentDetail)
def get_appointment(appointment_id: int, db: DbSession, user: StaffUser):
    return _get(db, appointment_id, user)


@router.patch("/{appointment_id}/status", response_model=AppointmentDetail)
def update_status(appointment_id: int, data: StatusUpdate, db: DbSession, user: StaffUser):
    """Confirm, cancel (with a reason) or complete. Confirmations and cancellations are sent to the patient
    automatically on WhatsApp (and by email when we have one)."""
    appointment = _get(db, appointment_id, user)
    change_status(appointment, data.status, data.reason)
    db.commit()
    if data.notify and data.status in ("confirmed", "cancelled"):
        kind = "confirmation" if data.status == "confirmed" else "cancellation"
        send_appointment_whatsapp(db, appointment, kind)
        send_appointment_email(db, appointment, kind)
    return _get(db, appointment_id, user)


@router.put("/{appointment_id}", response_model=AppointmentDetail)
def update_appointment(appointment_id: int, data: AppointmentUpdate, db: DbSession, user: StaffUser):
    """Edit staff notes and/or reschedule. A rescheduled confirmed booking re-sends its confirmation."""
    appointment = _get(db, appointment_id, user)
    fields = data.model_fields_set
    if "admin_notes" in fields:
        appointment.admin_notes = (data.admin_notes or "").strip() or None
        db.commit()
    if data.appointment_date and data.start_time:
        reschedule(db, appointment, day=data.appointment_date, start=data.start_time, doctor_id=data.doctor_id)
        appointment.reminder_24h_sent_at = appointment.reminder_2h_sent_at = None  # remind for the new time
        db.commit()
        if data.notify:
            send_appointment_whatsapp(db, appointment, "reschedule")
            if appointment.status == "confirmed":
                send_appointment_email(db, appointment, "confirmation")
    return _get(db, appointment_id, user)


@router.post("/{appointment_id}/emails", response_model=AppointmentDetail)
def resend_email(appointment_id: int, data: ResendEmail, db: DbSession, user: StaffUser):
    appointment = _get(db, appointment_id, user)
    allowed = {"confirmation": ("confirmed", "completed"), "cancellation": ("cancelled",)}[data.kind]
    if appointment.status not in allowed:
        raise ConflictError(f"A {data.kind} email can't be sent for a {appointment.status} appointment.")
    send_appointment_email(db, appointment, data.kind)
    return _get(db, appointment_id, user)


class ResendWhatsApp(BaseModel):
    kind: str


@router.post("/{appointment_id}/whatsapp", response_model=AppointmentDetail)
def resend_whatsapp(appointment_id: int, data: ResendWhatsApp, db: DbSession, user: StaffUser):
    """Send (or re-send) a WhatsApp notification for this appointment."""
    appointment = _get(db, appointment_id, user)
    allowed = {
        "received": ("pending",),
        "confirmation": ("confirmed",),
        "reminder": ("confirmed",),
        "cancellation": ("cancelled",),
        "reschedule": ("pending", "confirmed"),
    }
    if data.kind not in allowed:
        raise ConflictError("Unknown WhatsApp message type.")
    if appointment.status not in allowed[data.kind]:
        raise ConflictError(f"A {data.kind} message can't be sent for a {appointment.status} appointment.")
    send_appointment_whatsapp(db, appointment, data.kind)
    return _get(db, appointment_id, user)


@router.delete("/{appointment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_appointment(appointment_id: int, db: DbSession, user: AdminUser):
    db.delete(_get(db, appointment_id, user))
    db.commit()
    return None
