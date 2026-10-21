"""Send an appointment email and record the attempt (sent / failed / skipped) on the appointment."""

import logging

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.session import SessionLocal
from app.models import Appointment, AppointmentEmail, ClinicInfo
from app.services.email import sender
from app.services.email.ics import build_ics
from app.services.email.templates import Attachment, appointment_email

logger = logging.getLogger(__name__)


def send_appointment_email(db: Session, appointment: Appointment, kind: str) -> AppointmentEmail:
    settings = get_settings()
    clinic = db.scalar(select(ClinicInfo).limit(1))
    email = appointment_email(kind, appointment, clinic, settings.public_site_url)
    if kind in ("confirmation", "cancellation"):
        cancel = kind == "cancellation"
        email.attachments.append(Attachment(
            filename="appointment.ics",
            content=build_ics(appointment, clinic, cancel=cancel).encode(),
            maintype="text",
            subtype="calendar",
            params={"method": "CANCEL" if cancel else "REQUEST"},
        ))

    record = AppointmentEmail(
        appointment_id=appointment.id, kind=kind, recipient=email.to, subject=email.subject[:255], status="skipped"
    )
    if email.to.endswith(".example"):
        record.error = "Demo address (.example domain) — not sent."
    elif not settings.smtp_configured:
        record.error = "SMTP is not configured (set SMTP_HOST, SMTP_USERNAME and SMTP_PASSWORD)."
    else:
        try:
            record.message_id = sender.deliver(email)[:255]
            record.status = "sent"
        except Exception as exc:  # noqa: BLE001 - any SMTP/network failure is recorded, never raised
            logger.warning("Appointment %s %s email failed: %s", appointment.reference, kind, exc)
            record.status = "failed"
            record.error = f"{type(exc).__name__}: {exc}"[:1000]
    db.add(record)
    db.commit()
    db.refresh(appointment)
    return record


def send_appointment_email_task(appointment_id: int, kind: str) -> None:
    """Background-task variant with its own session (the request's session is closed by then)."""
    db = SessionLocal()
    try:
        appointment = db.get(Appointment, appointment_id)
        if appointment is not None:
            send_appointment_email(db, appointment, kind)
    except Exception:  # noqa: BLE001 - background task must not crash the worker
        logger.exception("Could not send %s email for appointment %s", kind, appointment_id)
    finally:
        db.close()
