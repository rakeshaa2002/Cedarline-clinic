"""Patient portal: sign in with a one-time code sent on WhatsApp, then see, book and cancel appointments."""

import hashlib
import hmac
import secrets
from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, status
from sqlalchemy import select

from app.api.deps import CurrentPatient, DbSession
from app.core.config import get_settings
from app.core.exceptions import ConflictError, NotFoundError, ValidationFailedError
from app.core.rate_limit import rate_limit
from app.core.security import create_access_token
from app.models import Appointment, PatientOtp
from app.schemas.crm import (
    OtpRequest,
    OtpRequested,
    OtpVerify,
    PatientOut,
    PatientProfileUpdate,
    PatientToken,
    PortalAppointment,
    PortalCancel,
)
from app.services.appointments import change_status, clinic_now
from app.services.email.appointment_emails import send_appointment_email
from app.services.patients import display_phone, find_patient, normalize_phone, upsert_patient
from app.services.whatsapp.messages import otp_message
from app.services.whatsapp.notify import send_appointment_whatsapp, send_whatsapp

router = APIRouter(prefix="/patient", tags=["patient portal"])

OTP_TTL = timedelta(minutes=10)
OTP_MAX_ATTEMPTS = 5


def _hash(phone: str, code: str) -> str:
    key = get_settings().jwt_secret.encode()
    return hmac.new(key, f"{phone}:{code}".encode(), hashlib.sha256).hexdigest()


@router.post(
    "/otp",
    response_model=OtpRequested,
    dependencies=[Depends(rate_limit("otp", "rate_limit_otp_per_minute"))],
)
def request_otp(data: OtpRequest, db: DbSession):
    """Send a 6-digit login code to the patient's WhatsApp."""
    settings = get_settings()
    phone = normalize_phone(data.phone)
    code = f"{secrets.randbelow(1_000_000):06d}"
    db.add(PatientOtp(phone=phone, code_hash=_hash(phone, code), expires_at=datetime.now(UTC) + OTP_TTL))
    db.commit()
    text, params = otp_message(code)
    record = send_whatsapp(db, to=phone, kind="otp", text=text, params=params, patient=find_patient(db, phone))
    demo = settings.environment != "production" and record.status != "sent"
    return OtpRequested(
        message=f"We've sent a 6-digit code to {display_phone(phone)} on WhatsApp.",
        phone=phone,
        dev_code=code if demo else None,
    )


@router.post("/verify", response_model=PatientToken)
def verify_otp(data: OtpVerify, db: DbSession):
    phone = normalize_phone(data.phone)
    otp = db.scalar(
        select(PatientOtp)
        .where(PatientOtp.phone == phone, PatientOtp.consumed_at.is_(None))
        .order_by(PatientOtp.created_at.desc(), PatientOtp.id.desc())
        .limit(1)
    )
    now = datetime.now(UTC)
    if otp is None or otp.expires_at < now:
        raise ValidationFailedError("That code has expired. Please request a new one.")
    if otp.attempts >= OTP_MAX_ATTEMPTS:
        raise ValidationFailedError("Too many attempts. Please request a new code.")
    if not hmac.compare_digest(otp.code_hash, _hash(phone, data.code)):
        otp.attempts += 1
        db.commit()
        raise ValidationFailedError("That code isn't right. Please check and try again.")
    otp.consumed_at = now
    patient = upsert_patient(db, phone=phone, source="portal")
    db.commit()
    db.refresh(patient)
    minutes = get_settings().patient_token_expire_minutes
    token, expires_in = create_access_token(f"patient:{patient.id}", "patient", expire_minutes=minutes)
    return PatientToken(access_token=token, expires_in=expires_in, patient=PatientOut.model_validate(patient))


@router.get("/me", response_model=PatientOut)
def me(patient: CurrentPatient):
    return patient


@router.put("/me", response_model=PatientOut)
def update_me(data: PatientProfileUpdate, patient: CurrentPatient, db: DbSession):
    patient.full_name = data.full_name.strip()
    patient.email = str(data.email) if data.email else None
    db.commit()
    db.refresh(patient)
    return patient


@router.get("/appointments", response_model=list[PortalAppointment])
def my_appointments(patient: CurrentPatient, db: DbSession):
    return db.scalars(
        select(Appointment)
        .where((Appointment.patient_id == patient.id) | (Appointment.patient_phone == patient.phone))
        .order_by(Appointment.appointment_date.desc(), Appointment.start_time.desc())
    ).all()


@router.post("/appointments/{appointment_id}/cancel", response_model=PortalAppointment, status_code=status.HTTP_200_OK)
def cancel_my_appointment(appointment_id: int, data: PortalCancel, patient: CurrentPatient, db: DbSession):
    appointment = db.get(Appointment, appointment_id)
    if appointment is None or (appointment.patient_id != patient.id and appointment.patient_phone != patient.phone):
        raise NotFoundError("Appointment not found.")
    start = datetime.combine(appointment.appointment_date, appointment.start_time)
    if start <= clinic_now():
        raise ConflictError("Past appointments can't be cancelled.")
    reason = "Cancelled by the patient" + (f": {data.reason.strip()}" if data.reason and data.reason.strip() else "")
    change_status(appointment, "cancelled", reason)
    db.commit()
    send_appointment_whatsapp(db, appointment, "cancellation")
    send_appointment_email(db, appointment, "cancellation")
    db.refresh(appointment)
    return appointment
