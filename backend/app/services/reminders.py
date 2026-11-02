"""Automated WhatsApp reminders for confirmed appointments (about 24 hours and 2 hours before).

`send_due_reminders` is idempotent: each reminder is stamped on the appointment once sent, so the
background loop (started in app.main) and the admin "run now" button can both call it safely.
"""

import asyncio
import logging
from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.session import SessionLocal
from app.models import Appointment
from app.services.appointments import clinic_now
from app.services.whatsapp.notify import send_appointment_whatsapp

logger = logging.getLogger(__name__)


def send_due_reminders(db: Session, now: datetime | None = None) -> int:
    """Send any reminders that are due now. Returns how many were sent (or attempted)."""
    now = now or clinic_now()
    horizon = now + timedelta(hours=24)
    rows = db.scalars(
        select(Appointment).where(
            Appointment.status == "confirmed",
            Appointment.appointment_date >= now.date(),
            Appointment.appointment_date <= horizon.date(),
        )
    ).all()
    sent = 0
    for a in rows:
        start = datetime.combine(a.appointment_date, a.start_time)
        if start <= now:
            continue
        until = start - now
        stamp = datetime.now(UTC)
        if until <= timedelta(hours=2) and a.reminder_2h_sent_at is None:
            a.reminder_2h_sent_at = stamp
            a.reminder_24h_sent_at = a.reminder_24h_sent_at or stamp  # the 24h one is now redundant
            db.commit()
            send_appointment_whatsapp(db, a, "reminder", today=now.date())
            sent += 1
        elif timedelta(hours=2) < until <= timedelta(hours=24) and a.reminder_24h_sent_at is None:
            a.reminder_24h_sent_at = stamp
            db.commit()
            send_appointment_whatsapp(db, a, "reminder", today=now.date())
            sent += 1
    return sent


def _run_once() -> None:
    db = SessionLocal()
    try:
        count = send_due_reminders(db)
        if count:
            logger.info("Sent %d appointment reminder(s)", count)
    except Exception:  # noqa: BLE001 - the loop must keep running
        logger.exception("Reminder run failed")
    finally:
        db.close()


async def reminder_loop() -> None:
    """Runs for the life of the API process."""
    interval = get_settings().reminder_interval_seconds
    while True:
        await asyncio.to_thread(_run_once)
        await asyncio.sleep(interval)
