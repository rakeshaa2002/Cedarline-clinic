"""Patients (the CRM), WhatsApp message log and one-time passcodes for the patient portal."""

from datetime import datetime

from sqlalchemy import Boolean, CheckConstraint, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin

PATIENT_SOURCES = ("website", "chatbot", "admin", "walk-in", "portal")
WHATSAPP_KINDS = ("received", "confirmation", "cancellation", "reschedule", "reminder", "otp", "manual")
WHATSAPP_STATUSES = ("sent", "failed", "skipped")


class Patient(TimestampMixin, Base):
    """One person, identified by mobile number. Bookings link to it automatically."""

    __tablename__ = "patients"
    __table_args__ = (CheckConstraint("source IN ('website', 'chatbot', 'admin', 'walk-in', 'portal')", name="source_valid"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    full_name: Mapped[str] = mapped_column(String(120), default="")
    # E.164, e.g. "+919876543210"
    phone: Mapped[str] = mapped_column(String(20), unique=True, index=True)
    email: Mapped[str | None] = mapped_column(String(255))
    notes: Mapped[str | None] = mapped_column(Text)
    tags: Mapped[list[str]] = mapped_column(ARRAY(String(40)), default=list, server_default="{}")
    source: Mapped[str] = mapped_column(String(20), default="website")
    whatsapp_opt_in: Mapped[bool] = mapped_column(Boolean, default=True)


class WhatsAppMessage(Base):
    """Every WhatsApp message sent (or attempted) to a patient — the text is kept for the CRM timeline."""

    __tablename__ = "whatsapp_messages"
    __table_args__ = (
        CheckConstraint(
            "kind IN ('received', 'confirmation', 'cancellation', 'reschedule', 'reminder', 'otp', 'manual')", name="kind_valid"
        ),
        CheckConstraint("status IN ('sent', 'failed', 'skipped')", name="status_valid"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    appointment_id: Mapped[int | None] = mapped_column(ForeignKey("appointments.id", ondelete="CASCADE"), index=True)
    patient_id: Mapped[int | None] = mapped_column(ForeignKey("patients.id", ondelete="SET NULL"), index=True)
    to_phone: Mapped[str] = mapped_column(String(20))
    kind: Mapped[str] = mapped_column(String(20))
    body: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(20))
    provider_message_id: Mapped[str | None] = mapped_column(String(255))
    error: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)


class PatientOtp(Base):
    """A hashed 6-digit login code for the patient portal (valid 10 minutes, limited attempts)."""

    __tablename__ = "patient_otps"

    id: Mapped[int] = mapped_column(primary_key=True)
    phone: Mapped[str] = mapped_column(String(20), index=True)
    code_hash: Mapped[str] = mapped_column(String(128))
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    consumed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
