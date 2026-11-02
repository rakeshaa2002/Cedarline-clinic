"""Public booking engine: real-time slot availability, availability summaries and booking requests."""

from datetime import date, timedelta
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, Query, status
from sqlalchemy import select

from app.api.deps import DbSession
from app.core.exceptions import NotFoundError, ValidationFailedError
from app.core.rate_limit import rate_limit
from app.models import Doctor
from app.schemas.appointment import (
    AppointmentConfirmation,
    AppointmentCreate,
    AvailabilitySummary,
    AvailabilityOut,
    DayAvailability,
    DoctorAvailability,
    DoctorAvailabilitySummary,
    NextSlot,
)
from app.schemas.clinic import Department
from app.services.appointments import availability, book, clinic_now, department_filter
from app.services.email.appointment_emails import send_appointment_email_task
from app.services.whatsapp.notify import send_appointment_whatsapp_task

router = APIRouter(prefix="/appointments", tags=["appointments"])


def _doctors(db, department: str | None, doctor: str | None) -> list[Doctor]:
    stmt = select(Doctor).where(Doctor.is_active).order_by(Doctor.full_name)
    if doctor:
        stmt = stmt.where(Doctor.slug == doctor)
    if department:
        stmt = stmt.where(department_filter(department))
    return list(db.scalars(stmt))


@router.get("/availability", response_model=AvailabilityOut)
def get_availability(
    db: DbSession,
    day: Annotated[date, Query(alias="date")],
    department: Department | None = None,
    doctor: Annotated[str | None, Query(max_length=120, description="Doctor slug")] = None,
):
    """Every slot for one day, per doctor, marked available or taken. Pass a department, a doctor, or both."""
    if not department and not doctor:
        raise ValidationFailedError("Choose a department or a doctor.")
    doctors = _doctors(db, department, doctor)
    if doctor and not doctors:
        raise NotFoundError("Doctor not found.")
    clinic_open, per_doctor = availability(db, doctors, day)
    return AvailabilityOut(
        date=day,
        clinic_open=clinic_open,
        doctors=[
            DoctorAvailability(
                doctor_id=d.id, slug=d.slug, full_name=d.full_name, specialization=d.specialization,
                photo_url=d.photo_url, consultation_fee=d.consultation_fee, slots=slots,
            )
            for d, slots in per_doctor
        ],
    )


@router.get("/availability/summary", response_model=AvailabilitySummary)
def availability_summary(
    db: DbSession,
    days: Annotated[int, Query(ge=1, le=14)] = 7,
    department: Department | None = None,
    doctor: Annotated[str | None, Query(max_length=120)] = None,
):
    """Free slots per doctor for the next few days, and each doctor's next available slot."""
    doctors = _doctors(db, department, doctor)
    today = clinic_now().date()
    per_doctor: dict[int, list[DayAvailability]] = {d.id: [] for d in doctors}
    next_slot: dict[int, NextSlot] = {}
    for offset in range(days):
        day = today + timedelta(days=offset)
        _, rows = availability(db, doctors, day)
        for d, slots in rows:
            free = [s for s in slots if s.available]
            per_doctor[d.id].append(DayAvailability(date=day, free=len(free), total=len(slots)))
            if free and d.id not in next_slot:
                next_slot[d.id] = NextSlot(date=day, start_time=free[0].start_time)
    return AvailabilitySummary(
        days=days,
        doctors=[
            DoctorAvailabilitySummary(
                doctor_id=d.id, slug=d.slug, full_name=d.full_name, specialization=d.specialization, photo_url=d.photo_url,
                consultation_days=list(d.consultation_days), start_time=d.start_time, end_time=d.end_time,
                next_available=next_slot.get(d.id), days=per_doctor[d.id],
            )
            for d in doctors
        ],
    )


@router.post(
    "",
    response_model=AppointmentConfirmation,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(rate_limit("booking", "rate_limit_booking_per_minute"))],
)
def create_appointment(data: AppointmentCreate, db: DbSession, tasks: BackgroundTasks):
    """Book a slot. It is held immediately (status "pending") and the patient gets an automated WhatsApp
    acknowledgement (and email, if given) while the front desk confirms it."""
    appointment = book(db, data)
    tasks.add_task(send_appointment_whatsapp_task, appointment.id, "received")
    if appointment.patient_email:
        tasks.add_task(send_appointment_email_task, appointment.id, "received")
    return appointment
