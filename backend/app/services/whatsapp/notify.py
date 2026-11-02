"""Send a WhatsApp message and record the attempt (sent / failed / skipped) for the CRM timeline."""

import logging
import re
from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.session import SessionLocal
from app.models import Appointment, ClinicInfo, Patient, WhatsAppMessage
from app.services.patients import normalize_phone
from app.services.whatsapp import sender
from app.services.whatsapp.messages import appointment_message

logger = logging.getLogger(__name__)


def send_whatsapp(
    db: Session,
    *,
    to: str,
    kind: str,
    text: str,
    params: list[str] | None = None,
    appointment: Appointment | None = None,
    patient: Patient | None = None,
) -> WhatsAppMessage:
    settings = get_settings()
    try:
        phone = normalize_phone(to)
    except Exception:  # noqa: BLE001 - invalid numbers are recorded, not raised
        phone = to[:20]
    record = WhatsAppMessage(
        appointment_id=appointment.id if appointment else None,
        patient_id=patient.id if patient else (appointment.patient_id if appointment else None),
        to_phone=phone,
        kind=kind,
        body=re.sub(r"\b\d{6}\b", "••••••", text) if kind == "otp" else text,  # never store a live login code
        status="skipped",
    )
    if patient is not None and not patient.whatsapp_opt_in and kind != "otp":
        record.error = "Patient has opted out of WhatsApp messages."
    elif not settings.whatsapp_configured:
        record.error = "WhatsApp is not configured (set WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID). Send it manually from the CRM."
    else:
        try:
            record.provider_message_id = sender.deliver(phone, text, template=settings.whatsapp_template(kind), params=params)[:255]
            record.status = "sent"
        except Exception as exc:  # noqa: BLE001 - delivery failures are recorded, never raised
            logger.warning("WhatsApp %s message to %s failed: %s", kind, phone, exc)
            record.status = "failed"
            record.error = f"{type(exc).__name__}: {exc}"[:1000]
    db.add(record)
    db.commit()
    return record


def send_appointment_whatsapp(db: Session, appointment: Appointment, kind: str, today: date | None = None) -> WhatsAppMessage:
    """`today` is the clinic's date, so a reminder can say "today" or "tomorrow"."""
    clinic = db.scalar(select(ClinicInfo).limit(1))
    if today is None:
        from app.services.appointments import clinic_now  # local import: appointments imports patients, not us

        today = clinic_now().date()
    text, params = appointment_message(kind, appointment, clinic, get_settings().public_site_url, today=today)
    patient = db.get(Patient, appointment.patient_id) if appointment.patient_id else None
    record = send_whatsapp(db, to=appointment.patient_phone, kind=kind, text=text, params=params, appointment=appointment, patient=patient)
    db.refresh(appointment)
    return record


def send_appointment_whatsapp_task(appointment_id: int, kind: str) -> None:
    """Background-task variant with its own session."""
    db = SessionLocal()
    try:
        appointment = db.get(Appointment, appointment_id)
        if appointment is not None:
            send_appointment_whatsapp(db, appointment, kind)
    except Exception:  # noqa: BLE001 - background task must not crash the worker
        logger.exception("Could not send %s WhatsApp for appointment %s", kind, appointment_id)
    finally:
        db.close()
