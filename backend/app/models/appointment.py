from datetime import date, datetime, time
from decimal import Decimal

from sqlalchemy import CheckConstraint, Date, DateTime, ForeignKey, Index, Numeric, String, Text, Time, func, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin
from app.models.clinic import Branch, Doctor

APPOINTMENT_STATUSES = ("pending", "confirmed", "completed", "cancelled")
ACTIVE_STATUSES = ("pending", "confirmed")  # these hold their slot
APPOINTMENT_SOURCES = ("website", "chatbot", "admin")
EMAIL_KINDS = ("received", "confirmation", "cancellation")
EMAIL_STATUSES = ("sent", "failed", "skipped")


class Appointment(TimestampMixin, Base):
    """A booking request. It holds its slot while pending or confirmed (see the partial unique index)."""

    __tablename__ = "appointments"
    __table_args__ = (
        CheckConstraint("status IN ('pending', 'confirmed', 'completed', 'cancelled')", name="status_valid"),
        CheckConstraint("source IN ('website', 'chatbot', 'admin')", name="source_valid"),
        CheckConstraint("start_time < end_time", name="time_range_valid"),
        # Two active bookings can never share a doctor's slot, even under concurrent requests.
        Index(
            "uq_appointments_active_slot",
            "doctor_id",
            "appointment_date",
            "start_time",
            unique=True,
            postgresql_where=text("status IN ('pending', 'confirmed')"),
        ),
        Index("ix_appointments_date_status", "appointment_date", "status"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    reference: Mapped[str] = mapped_column(String(20), unique=True)
    doctor_id: Mapped[int] = mapped_column(ForeignKey("doctors.id", ondelete="RESTRICT"), index=True)
    # What the patient needs help with (a service category) — drives demand analytics.
    department: Mapped[str] = mapped_column(String(30), index=True)
    branch_id: Mapped[int | None] = mapped_column(ForeignKey("branches.id", ondelete="SET NULL"), index=True)
    patient_id: Mapped[int | None] = mapped_column(ForeignKey("patients.id", ondelete="SET NULL"), index=True)
    consultation_fee: Mapped[Decimal | None] = mapped_column(Numeric(10, 2))

    patient_name: Mapped[str] = mapped_column(String(120))
    patient_email: Mapped[str | None] = mapped_column(String(255))
    patient_phone: Mapped[str] = mapped_column(String(30))
    reason: Mapped[str] = mapped_column(Text)

    appointment_date: Mapped[date] = mapped_column(Date)
    start_time: Mapped[time] = mapped_column(Time)
    end_time: Mapped[time] = mapped_column(Time)

    status: Mapped[str] = mapped_column(String(20), default="pending", index=True)
    source: Mapped[str] = mapped_column(String(20), default="website")
    cancellation_reason: Mapped[str | None] = mapped_column(Text)
    admin_notes: Mapped[str | None] = mapped_column(Text)
    confirmed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    cancelled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    # Automated WhatsApp reminders (set once sent, so each goes out only once).
    reminder_24h_sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    reminder_2h_sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    doctor: Mapped[Doctor] = relationship(lazy="joined")
    branch: Mapped[Branch | None] = relationship(lazy="joined")
    whatsapp_messages: Mapped[list["WhatsAppMessage"]] = relationship(  # noqa: F821
        "WhatsAppMessage",
        primaryjoin="Appointment.id == foreign(WhatsAppMessage.appointment_id)",
        order_by="(WhatsAppMessage.created_at.desc(), WhatsAppMessage.id.desc())",
        viewonly=True,
    )
    emails: Mapped[list["AppointmentEmail"]] = relationship(
        back_populates="appointment",
        cascade="all, delete-orphan",
        order_by="(AppointmentEmail.created_at.desc(), AppointmentEmail.id.desc())",
    )

    @property
    def last_email(self) -> "AppointmentEmail | None":
        return self.emails[0] if self.emails else None

    @property
    def last_whatsapp(self):
        return self.whatsapp_messages[0] if self.whatsapp_messages else None


class AppointmentEmail(Base):
    """Audit trail of every email sent (or attempted) for an appointment."""

    __tablename__ = "appointment_emails"
    __table_args__ = (
        CheckConstraint("kind IN ('received', 'confirmation', 'cancellation')", name="kind_valid"),
        CheckConstraint("status IN ('sent', 'failed', 'skipped')", name="status_valid"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    appointment_id: Mapped[int] = mapped_column(ForeignKey("appointments.id", ondelete="CASCADE"), index=True)
    kind: Mapped[str] = mapped_column(String(20))
    status: Mapped[str] = mapped_column(String(20))
    recipient: Mapped[str] = mapped_column(String(255))
    subject: Mapped[str] = mapped_column(String(255))
    message_id: Mapped[str | None] = mapped_column(String(255))
    error: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    appointment: Mapped[Appointment] = relationship(back_populates="emails")
