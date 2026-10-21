"""Online booking: slot grids, real-time availability, race-safe booking and the status workflow.

A doctor's day is split into `slot_minutes` slots between `start_time` and `end_time` on their
consultation days. A slot is free when no pending/confirmed appointment holds it; the partial
unique index `uq_appointments_active_slot` makes that rule hold even for simultaneous requests.
"""

import secrets
from datetime import date, datetime, time, timedelta
from zoneinfo import ZoneInfo

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.exceptions import ConflictError, NotFoundError, ValidationFailedError
from app.models import ACTIVE_STATUSES, Appointment, ClinicInfo, Doctor
from app.schemas.appointment import AppointmentCreate, Slot
from app.services.knowledge_base.system_documents import DEPARTMENT_LABELS, WEEKDAYS

_REFERENCE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"  # no 0/O, 1/I/L: easy to read over the phone

# Allowed status changes. Cancelled and completed bookings are final.
TRANSITIONS = {
    "pending": {"confirmed", "cancelled"},
    "confirmed": {"completed", "cancelled"},
    "completed": set(),
    "cancelled": set(),
}


def clinic_now() -> datetime:
    """Current wall-clock time at the clinic, as a naive datetime (slots are stored as local times)."""
    return datetime.now(ZoneInfo(get_settings().clinic_timezone)).replace(tzinfo=None)


def new_reference() -> str:
    return "CED-" + "".join(secrets.choice(_REFERENCE_ALPHABET) for _ in range(6))


def slot_grid(doctor: Doctor, day: date) -> list[tuple[time, time]]:
    """Every (start, end) slot the doctor offers on `day`; empty on days they don't consult."""
    if day.weekday() not in doctor.consultation_days:
        return []
    step = timedelta(minutes=doctor.slot_minutes)
    cursor = datetime.combine(day, doctor.start_time)
    end = datetime.combine(day, doctor.end_time)
    grid = []
    while cursor + step <= end:
        grid.append((cursor.time(), (cursor + step).time()))
        cursor += step
    return grid


def clinic_open_on(clinic: ClinicInfo | None, day: date) -> bool:
    if clinic is None:
        return True
    hours = next((h for h in clinic.opening_hours if h.get("day") == WEEKDAYS[day.weekday()]), None)
    return bool(hours) and not hours.get("closed")


def _booked(db: Session, doctor_ids: list[int], day: date, exclude_id: int | None = None) -> set[tuple[int, time]]:
    stmt = select(Appointment.doctor_id, Appointment.start_time).where(
        Appointment.doctor_id.in_(doctor_ids),
        Appointment.appointment_date == day,
        Appointment.status.in_(ACTIVE_STATUSES),
    )
    if exclude_id is not None:
        stmt = stmt.where(Appointment.id != exclude_id)
    return {(row.doctor_id, row.start_time) for row in db.execute(stmt)}


def _bookable_window(day: date, now: datetime) -> bool:
    return now.date() <= day <= now.date() + timedelta(days=get_settings().booking_window_days)


def availability(
    db: Session, doctors: list[Doctor], day: date, *, now: datetime | None = None, exclude_id: int | None = None
) -> tuple[bool, list[tuple[Doctor, list[Slot]]]]:
    """(clinic open that day, [(doctor, slots)]) — slots are marked unavailable once taken or too soon."""
    now = now or clinic_now()
    clinic = db.scalar(select(ClinicInfo).limit(1))
    is_open = clinic_open_on(clinic, day)
    if not is_open or not _bookable_window(day, now) or not doctors:
        return is_open, [(d, []) for d in doctors]
    booked = _booked(db, [d.id for d in doctors], day, exclude_id)
    earliest = now + timedelta(minutes=get_settings().booking_min_notice_minutes)
    result = []
    for d in doctors:
        slots = [
            Slot(
                start_time=start,
                end_time=end,
                available=(d.id, start) not in booked and datetime.combine(day, start) >= earliest,
            )
            for start, end in slot_grid(d, day)
        ]
        result.append((d, slots))
    return is_open, result


def _pick_doctor(
    db: Session, candidates: list[Doctor], day: date, start: time, now: datetime, exclude_id: int | None = None
) -> tuple[Doctor, time]:
    """The first candidate free at `start`, or a precise error explaining why nobody is."""
    if not _bookable_window(day, now):
        raise ValidationFailedError(
            f"Please choose a date between today and {get_settings().booking_window_days} days from now."
        )
    clinic = db.scalar(select(ClinicInfo).limit(1))
    if not clinic_open_on(clinic, day):
        raise ValidationFailedError(f"The clinic is closed on {WEEKDAYS[day.weekday()]}s. Please choose another day.")

    _, per_doctor = availability(db, candidates, day, now=now, exclude_id=exclude_id)
    single = len(candidates) == 1
    for doctor, slots in per_doctor:
        slot = next((s for s in slots if s.start_time == start), None)
        if slot is None:
            if single and not slots:
                raise ValidationFailedError(f"{doctor.full_name} doesn't consult on {WEEKDAYS[day.weekday()]}s.")
            if single:
                raise ValidationFailedError("Please choose one of the listed time slots.")
            continue
        if slot.available:
            return doctor, slot.end_time
        if single:
            if datetime.combine(day, start) < now + timedelta(minutes=get_settings().booking_min_notice_minutes):
                raise ValidationFailedError("That time is too soon or has already passed. Please choose a later slot.")
            raise ConflictError("That slot has just been taken. Please choose another time.")
    raise ConflictError("No doctor is free at that time. Please choose another slot.")


def _commit_slot(db: Session, appointment: Appointment) -> None:
    """Commit, turning a lost race for the slot into a friendly 409 (and retrying a rare reference clash)."""
    for _ in range(3):
        try:
            db.commit()
            return
        except IntegrityError as exc:
            db.rollback()
            if "uq_appointments_reference" in str(exc.orig):
                appointment.reference = new_reference()
                db.add(appointment)
                continue
            raise ConflictError("That slot has just been taken. Please choose another time.") from None
    raise ConflictError("Could not create a booking reference. Please try again.")


def book(db: Session, data: AppointmentCreate, *, now: datetime | None = None) -> Appointment:
    now = now or clinic_now()
    stmt = select(Doctor).where(Doctor.is_active, Doctor.department == data.department).order_by(Doctor.full_name)
    candidates = list(db.scalars(stmt))
    if data.doctor_slug:
        candidates = [d for d in candidates if d.slug == data.doctor_slug]
        if not candidates:
            raise ValidationFailedError(f"That doctor isn't available in {DEPARTMENT_LABELS[data.department]}.")
    if not candidates:
        raise ValidationFailedError(f"No {DEPARTMENT_LABELS[data.department]} doctors are taking bookings right now.")

    doctor, end = _pick_doctor(db, candidates, data.appointment_date, data.start_time, now)
    appointment = Appointment(
        reference=new_reference(),
        doctor_id=doctor.id,
        department=doctor.department,
        consultation_fee=doctor.consultation_fee,
        patient_name=data.patient_name,
        patient_email=str(data.patient_email),
        patient_phone=data.patient_phone,
        reason=data.reason,
        appointment_date=data.appointment_date,
        start_time=data.start_time,
        end_time=end,
        status="pending",
        source=data.source,
    )
    db.add(appointment)
    _commit_slot(db, appointment)
    db.refresh(appointment)
    return appointment


def reschedule(
    db: Session, appointment: Appointment, *, day: date, start: time, doctor_id: int | None = None,
    now: datetime | None = None,
) -> None:
    if appointment.status not in ACTIVE_STATUSES:
        raise ConflictError(f"A {appointment.status} appointment can't be rescheduled.")
    doctor = db.get(Doctor, doctor_id or appointment.doctor_id)
    if doctor is None or not doctor.is_active:
        raise NotFoundError("Doctor not found.")
    doctor, end = _pick_doctor(db, [doctor], day, start, now or clinic_now(), exclude_id=appointment.id)
    appointment.doctor_id = doctor.id
    appointment.department = doctor.department
    appointment.consultation_fee = doctor.consultation_fee
    appointment.appointment_date = day
    appointment.start_time = start
    appointment.end_time = end
    _commit_slot(db, appointment)
    db.refresh(appointment)


def change_status(appointment: Appointment, status: str, reason: str | None = None) -> None:
    if status not in TRANSITIONS[appointment.status]:
        raise ConflictError(f"A {appointment.status} appointment can't be marked {status}.")
    stamp = datetime.now(ZoneInfo("UTC"))
    appointment.status = status
    if status == "confirmed":
        appointment.confirmed_at = stamp
    elif status == "completed":
        appointment.completed_at = stamp
    elif status == "cancelled":
        appointment.cancelled_at = stamp
        appointment.cancellation_reason = (reason or "").strip()
