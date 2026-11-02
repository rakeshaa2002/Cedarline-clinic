from datetime import date, datetime, time
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator

from app.schemas.clinic import Department
from app.schemas.common import ORMModel, PersonName, PhoneNumber

AppointmentStatus = Literal["pending", "confirmed", "completed", "cancelled"]
AppointmentSource = Literal["website", "chatbot", "admin"]
EmailKind = Literal["received", "confirmation", "cancellation"]
WhatsAppKind = Literal["received", "confirmation", "cancellation", "reschedule", "reminder", "otp", "manual"]


# --- Availability -------------------------------------------------------------------


class Slot(BaseModel):
    start_time: time
    end_time: time
    available: bool


class DoctorAvailability(BaseModel):
    doctor_id: int
    slug: str
    full_name: str
    specialization: str
    photo_url: str | None
    consultation_fee: Decimal | None
    slots: list[Slot]


class AvailabilityOut(BaseModel):
    date: date
    clinic_open: bool
    doctors: list[DoctorAvailability]


class DayAvailability(BaseModel):
    date: date
    free: int
    total: int


class NextSlot(BaseModel):
    date: date
    start_time: time


class DoctorAvailabilitySummary(BaseModel):
    doctor_id: int
    slug: str
    full_name: str
    specialization: str
    photo_url: str | None
    consultation_days: list[int]
    start_time: time
    end_time: time
    next_available: NextSlot | None
    days: list[DayAvailability]


class AvailabilitySummary(BaseModel):
    days: int
    doctors: list[DoctorAvailabilitySummary]


# --- Booking --------------------------------------------------------------------------


class AppointmentCreate(BaseModel):
    department: Department
    # None = "first available doctor in the department at that time".
    doctor_slug: str | None = Field(default=None, max_length=120)
    # The RUA centre the patient will visit.
    branch_slug: str | None = Field(default=None, max_length=80)
    appointment_date: date
    start_time: time
    patient_name: PersonName
    patient_email: EmailStr | None = None
    patient_phone: PhoneNumber
    reason: str = Field(min_length=5, max_length=1000)
    source: Literal["website", "chatbot"] = "website"

    @field_validator("reason")
    @classmethod
    def _strip(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 5:
            raise ValueError("Please describe the reason for your visit (at least 5 characters)")
        return v

    @field_validator("doctor_slug", mode="before")
    @classmethod
    def _any_doctor(cls, v):
        return None if v in ("", "any") else v

    @field_validator("patient_email", "branch_slug", mode="before")
    @classmethod
    def _empty_is_none(cls, v):
        return v or None


class AppointmentDoctor(ORMModel):
    id: int
    slug: str
    full_name: str
    specialization: str
    department: Department
    photo_url: str | None


class AppointmentBranch(ORMModel):
    id: int
    slug: str
    name: str
    area: str
    address: str
    phone: str
    map_url: str | None


class AppointmentConfirmation(ORMModel):
    """What the patient sees after booking: never includes staff notes or the audit trail."""

    reference: str
    status: AppointmentStatus
    department: Department
    appointment_date: date
    start_time: time
    end_time: time
    consultation_fee: Decimal | None
    patient_name: str
    patient_email: str | None
    patient_phone: str
    doctor: AppointmentDoctor
    branch: AppointmentBranch | None


# --- Admin ------------------------------------------------------------------------------


class AppointmentEmailOut(ORMModel):
    id: int
    kind: EmailKind
    status: Literal["sent", "failed", "skipped"]
    recipient: str
    subject: str
    message_id: str | None
    error: str | None
    created_at: datetime


class WhatsAppMessageOut(ORMModel):
    id: int
    appointment_id: int | None
    to_phone: str
    kind: WhatsAppKind
    body: str
    status: Literal["sent", "failed", "skipped"]
    provider_message_id: str | None
    error: str | None
    created_at: datetime


class AppointmentOut(ORMModel):
    id: int
    reference: str
    status: AppointmentStatus
    source: AppointmentSource
    department: Department
    patient_id: int | None
    branch: AppointmentBranch | None
    appointment_date: date
    start_time: time
    end_time: time
    consultation_fee: Decimal | None
    patient_name: str
    patient_email: str | None
    patient_phone: str
    reason: str
    cancellation_reason: str | None
    admin_notes: str | None
    confirmed_at: datetime | None
    completed_at: datetime | None
    cancelled_at: datetime | None
    created_at: datetime
    updated_at: datetime
    doctor: AppointmentDoctor
    last_email: AppointmentEmailOut | None
    last_whatsapp: WhatsAppMessageOut | None


class AppointmentDetail(AppointmentOut):
    emails: list[AppointmentEmailOut]
    whatsapp_messages: list[WhatsAppMessageOut]
    reminder_24h_sent_at: datetime | None
    reminder_2h_sent_at: datetime | None


class AppointmentList(BaseModel):
    items: list[AppointmentOut]
    total: int
    page: int
    page_size: int
    pages: int
    counts: dict[str, int]  # per status, for the triage tabs (ignores the status filter)


CANCELLATION_REASONS = (
    "Doctor on emergency duty",
    "Slot overbooked",
    "Doctor on leave",
    "Requested by patient",
    "Clinic closed that day",
)


class StatusUpdate(BaseModel):
    status: Literal["confirmed", "completed", "cancelled"]
    reason: str | None = Field(default=None, max_length=500)
    notify: bool = True  # email the patient

    @model_validator(mode="after")
    def _reason_for_cancellation(self):
        if self.status == "cancelled" and not (self.reason and self.reason.strip()):
            raise ValueError("Please give a reason for the cancellation; the patient will see it.")
        return self


class AppointmentUpdate(BaseModel):
    """Staff notes and rescheduling. Omitted fields are left unchanged."""

    admin_notes: str | None = Field(default=None, max_length=2000)
    doctor_id: int | None = None
    appointment_date: date | None = None
    start_time: time | None = None
    notify: bool = True

    @model_validator(mode="after")
    def _date_and_time_together(self):
        if (self.appointment_date is None) != (self.start_time is None):
            raise ValueError("To reschedule, give both a date and a start time.")
        return self


class ResendEmail(BaseModel):
    kind: Literal["confirmation", "cancellation"]


# --- Analytics --------------------------------------------------------------------------


class MonthCount(BaseModel):
    month: str  # "2026-10"
    total: int
    confirmed: int
    completed: int
    cancelled: int
    pending: int


class DepartmentDemand(BaseModel):
    department: Department
    total: int
    revenue: Decimal


class BranchDemand(BaseModel):
    branch: str
    total: int


class AppointmentAnalytics(BaseModel):
    total: int
    this_month: int
    pending: int
    today: int
    upcoming_7_days: int
    # Share of decided requests (confirmed, completed or cancelled) that went ahead.
    conversion_rate: float | None
    cancellation_rate: float | None
    # Consultation fees of confirmed + completed visits (indicative: treatment costs are extra).
    revenue_this_month: Decimal
    revenue_total: Decimal
    by_month: list[MonthCount]
    by_department: list[DepartmentDemand]
    by_branch: list[BranchDemand]
    by_source: dict[str, int]
    whatsapp_sent: int
    whatsapp_pending: int
