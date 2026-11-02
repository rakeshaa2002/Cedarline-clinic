"""Patient CRM: the customer list, patient profiles with their visit and WhatsApp history, notes and tags.

Doctor logins see only patients they have appointments with.
"""

from typing import Annotated

from fastapi import APIRouter, Query, status
from sqlalchemy import Select, case, func, or_, select
from sqlalchemy.orm import selectinload

from app.api.deps import DbSession, StaffUser
from app.core.exceptions import ConflictError, NotFoundError
from app.models import Appointment, Doctor, Patient, User, WhatsAppMessage
from app.schemas.appointment import AppointmentOut, WhatsAppMessageOut
from app.schemas.crm import ManualWhatsApp, PatientCreate, PatientDetail, PatientList, PatientListItem, PatientOut, PatientUpdate
from app.services.appointments import clinic_now
from app.services.patients import find_patient, normalize_phone
from app.services.whatsapp.notify import send_whatsapp

router = APIRouter(prefix="/admin/patients", tags=["admin: patients (CRM)"])


def _doctor_scope(stmt: Select, user: User) -> Select:
    if user.role == "doctor" and user.doctor_id:
        stmt = stmt.where(Patient.id.in_(select(Appointment.patient_id).where(Appointment.doctor_id == user.doctor_id)))
    return stmt


def _get(db, patient_id: int, user: User) -> Patient:
    patient = db.scalar(_doctor_scope(select(Patient).where(Patient.id == patient_id), user))
    if patient is None:
        raise NotFoundError("Patient not found.")
    return patient


@router.get("", response_model=PatientList)
def list_patients(
    db: DbSession,
    user: StaffUser,
    q: Annotated[str | None, Query(max_length=100, description="Name, phone, email or tag")] = None,
    tag: Annotated[str | None, Query(max_length=40)] = None,
    segment: Annotated[str | None, Query(pattern="^(upcoming|new|returning|inactive)$")] = None,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
):
    today = clinic_now().date()
    visits = (
        select(
            Appointment.patient_id.label("pid"),
            func.count().filter(Appointment.status.in_(("confirmed", "completed", "pending"))).label("visits"),
            func.count().filter(Appointment.status.in_(("pending", "confirmed")), Appointment.appointment_date >= today).label("upcoming"),
            func.max(case((Appointment.appointment_date < today, Appointment.appointment_date))).label("last_visit"),
            func.min(case((Appointment.appointment_date >= today, Appointment.appointment_date))).label("next_visit"),
        )
        .where(Appointment.patient_id.is_not(None))
        .group_by(Appointment.patient_id)
        .subquery()
    )
    base = _doctor_scope(
        select(Patient, visits.c.visits, visits.c.upcoming, visits.c.last_visit, visits.c.next_visit).outerjoin(
            visits, visits.c.pid == Patient.id
        ),
        user,
    )
    if q and q.strip():
        term = f"%{q.strip()}%"
        digits = "".join(ch for ch in q if ch.isdigit())
        conditions = [Patient.full_name.ilike(term), Patient.email.ilike(term), Patient.tags.any(q.strip())]
        if len(digits) >= 4:
            conditions.append(Patient.phone.like(f"%{digits}%"))
        base = base.where(or_(*conditions))
    if tag:
        base = base.where(Patient.tags.any(tag))
    if segment == "upcoming":
        base = base.where(visits.c.upcoming > 0)
    elif segment == "new":
        base = base.where(func.coalesce(visits.c.visits, 0) <= 1)
    elif segment == "returning":
        base = base.where(visits.c.visits > 1)
    elif segment == "inactive":
        base = base.where(func.coalesce(visits.c.upcoming, 0) == 0)

    total = db.scalar(select(func.count()).select_from(base.subquery())) or 0
    rows = db.execute(
        base.order_by(visits.c.next_visit.asc().nulls_last(), Patient.updated_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()

    # Last doctor seen per patient on this page.
    ids = [r.Patient.id for r in rows]
    last_doctor: dict[int, str] = {}
    if ids:
        for pid, name in db.execute(
            select(Appointment.patient_id, Doctor.full_name)
            .join(Doctor, Doctor.id == Appointment.doctor_id)
            .where(Appointment.patient_id.in_(ids))
            .order_by(Appointment.appointment_date.desc(), Appointment.start_time.desc())
        ):
            last_doctor.setdefault(pid, name)

    scoped_all = _doctor_scope(select(Patient.id), user).subquery()
    stats = {
        "total": db.scalar(select(func.count()).select_from(scoped_all)) or 0,
        "upcoming": db.scalar(
            select(func.count(func.distinct(Appointment.patient_id))).where(
                Appointment.patient_id.in_(select(scoped_all.c.id)),
                Appointment.status.in_(("pending", "confirmed")),
                Appointment.appointment_date >= today,
            )
        ) or 0,
        "new_this_month": db.scalar(
            select(func.count()).where(
                Patient.id.in_(select(scoped_all.c.id)), Patient.created_at >= today.replace(day=1)
            )
        ) or 0,
    }
    items = [
        PatientListItem(
            **PatientOut.model_validate(r.Patient).model_dump(),
            visits=r.visits or 0,
            upcoming=r.upcoming or 0,
            last_visit=r.last_visit,
            next_visit=r.next_visit,
            last_doctor=last_doctor.get(r.Patient.id),
        )
        for r in rows
    ]
    return PatientList(items=items, total=total, page=page, page_size=page_size, pages=max(1, -(-total // page_size)), stats=stats)


@router.get("/tags", response_model=list[str])
def list_tags(db: DbSession, _: StaffUser):
    rows = db.execute(select(func.unnest(Patient.tags)).distinct()).scalars().all()
    return sorted(t for t in rows if t)


@router.post("", response_model=PatientOut, status_code=status.HTTP_201_CREATED)
def create_patient(data: PatientCreate, db: DbSession, _: StaffUser):
    """Register a walk-in or phone enquiry."""
    phone = normalize_phone(data.phone)
    if find_patient(db, phone):
        raise ConflictError("A patient with this phone number already exists.")
    patient = Patient(
        full_name=data.full_name.strip(), phone=phone, email=str(data.email) if data.email else None,
        notes=data.notes, tags=data.tags, source="walk-in",
    )
    db.add(patient)
    db.commit()
    db.refresh(patient)
    return patient


@router.get("/{patient_id}", response_model=PatientDetail)
def get_patient(patient_id: int, db: DbSession, user: StaffUser):
    patient = _get(db, patient_id, user)
    appts = select(Appointment).options(selectinload(Appointment.emails), selectinload(Appointment.whatsapp_messages)).where(
        Appointment.patient_id == patient.id
    )
    if user.role == "doctor" and user.doctor_id:
        appts = appts.where(Appointment.doctor_id == user.doctor_id)
    appointments = db.scalars(appts.order_by(Appointment.appointment_date.desc(), Appointment.start_time.desc())).all()
    messages = db.scalars(
        select(WhatsAppMessage)
        .where(WhatsAppMessage.patient_id == patient.id, WhatsAppMessage.kind != "otp")
        .order_by(WhatsAppMessage.created_at.desc(), WhatsAppMessage.id.desc())
        .limit(100)
    ).all()
    return PatientDetail(
        **PatientOut.model_validate(patient).model_dump(),
        appointments=[AppointmentOut.model_validate(a) for a in appointments],
        whatsapp_messages=[WhatsAppMessageOut.model_validate(m) for m in messages],
    )


@router.put("/{patient_id}", response_model=PatientOut)
def update_patient(patient_id: int, data: PatientUpdate, db: DbSession, user: StaffUser):
    patient = _get(db, patient_id, user)
    patient.full_name = data.full_name.strip()
    patient.email = str(data.email) if data.email else None
    patient.notes = (data.notes or "").strip() or None
    patient.tags = data.tags
    patient.whatsapp_opt_in = data.whatsapp_opt_in
    db.commit()
    db.refresh(patient)
    return patient


@router.post("/{patient_id}/whatsapp", response_model=WhatsAppMessageOut, status_code=status.HTTP_201_CREATED)
def message_patient(patient_id: int, data: ManualWhatsApp, db: DbSession, user: StaffUser):
    """Send a free-text WhatsApp message (logged on the patient's timeline)."""
    patient = _get(db, patient_id, user)
    return send_whatsapp(db, to=patient.phone, kind="manual", text=data.message.strip(), patient=patient)

