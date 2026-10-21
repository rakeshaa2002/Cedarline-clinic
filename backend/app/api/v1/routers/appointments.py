"""Public booking engine: real-time slot availability and booking requests."""

from datetime import date
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, Query, status
from sqlalchemy import select

from app.api.deps import DbSession
from app.core.exceptions import NotFoundError, ValidationFailedError
from app.core.rate_limit import rate_limit
from app.models import Doctor
from app.schemas.appointment import AppointmentConfirmation, AppointmentCreate, AvailabilityOut, DoctorAvailability
from app.schemas.clinic import Department
from app.services.appointments import availability, book
from app.services.email.appointment_emails import send_appointment_email_task

router = APIRouter(prefix="/appointments", tags=["appointments"])


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
    stmt = select(Doctor).where(Doctor.is_active).order_by(Doctor.full_name)
    if doctor:
        stmt = stmt.where(Doctor.slug == doctor)
    if department:
        stmt = stmt.where(Doctor.department == department)
    doctors = list(db.scalars(stmt))
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


@router.post(
    "",
    response_model=AppointmentConfirmation,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(rate_limit("booking", "rate_limit_booking_per_minute"))],
)
def create_appointment(data: AppointmentCreate, db: DbSession, tasks: BackgroundTasks):
    """Book a slot. It is held immediately (status "pending") until the front desk confirms it."""
    appointment = book(db, data)
    tasks.add_task(send_appointment_email_task, appointment.id, "received")
    return appointment
