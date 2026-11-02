"""Patient CRM (admin), patient portal (OTP login) and WhatsApp messaging schemas."""

from datetime import date, datetime, time

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.schemas.appointment import AppointmentBranch, AppointmentDoctor, AppointmentOut, AppointmentStatus, WhatsAppMessageOut
from app.schemas.clinic import Department
from app.schemas.common import ORMModel, PhoneNumber

# --- CRM ---------------------------------------------------------------------------------


class PatientOut(ORMModel):
    id: int
    full_name: str
    phone: str
    email: str | None
    notes: str | None
    tags: list[str]
    source: str
    whatsapp_opt_in: bool
    created_at: datetime


class PatientListItem(PatientOut):
    visits: int
    upcoming: int
    last_visit: date | None
    next_visit: date | None
    last_doctor: str | None


class PatientList(BaseModel):
    items: list[PatientListItem]
    total: int
    page: int
    page_size: int
    pages: int
    stats: dict[str, int]


class PatientDetail(PatientOut):
    appointments: list[AppointmentOut]
    whatsapp_messages: list[WhatsAppMessageOut]


def _clean_tags(v: list[str]) -> list[str]:
    tags = [t.strip()[:40] for t in v if t and t.strip()]
    return list(dict.fromkeys(tags))[:12]


class PatientCreate(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)
    phone: PhoneNumber
    email: EmailStr | None = None
    notes: str | None = Field(default=None, max_length=4000)
    tags: list[str] = Field(default_factory=list)

    _tags = field_validator("tags")(_clean_tags)

    @field_validator("email", mode="before")
    @classmethod
    def _empty_email(cls, v):
        return v or None


class PatientUpdate(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)
    email: EmailStr | None = None
    notes: str | None = Field(default=None, max_length=4000)
    tags: list[str] = Field(default_factory=list)
    whatsapp_opt_in: bool = True

    _tags = field_validator("tags")(_clean_tags)

    @field_validator("email", mode="before")
    @classmethod
    def _empty_email(cls, v):
        return v or None


class ManualWhatsApp(BaseModel):
    message: str = Field(min_length=2, max_length=2000)


# --- Doctor availability board (admin / doctor portal) -----------------------------------------


class BoardSlot(BaseModel):
    start_time: time
    end_time: time
    state: str  # "free" | "booked" | "past"
    appointment_id: int | None = None
    reference: str | None = None
    patient_name: str | None = None
    status: AppointmentStatus | None = None


class BoardDoctor(BaseModel):
    doctor_id: int
    slug: str
    full_name: str
    specialization: str
    photo_url: str | None
    consulting: bool
    hours: str | None
    free: int
    booked: int
    slots: list[BoardSlot]


class AvailabilityBoard(BaseModel):
    date: date
    clinic_open: bool
    doctors: list[BoardDoctor]


# --- Patient portal -------------------------------------------------------------------------------


class OtpRequest(BaseModel):
    phone: PhoneNumber


class OtpRequested(BaseModel):
    message: str
    phone: str
    # Only in development when WhatsApp isn't configured, so the portal can be demonstrated.
    dev_code: str | None = None


class OtpVerify(BaseModel):
    phone: PhoneNumber
    code: str = Field(min_length=6, max_length=6, pattern=r"^\d{6}$")


class PatientProfileUpdate(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)
    email: EmailStr | None = None

    @field_validator("email", mode="before")
    @classmethod
    def _empty_email(cls, v):
        return v or None


class PatientToken(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    patient: PatientOut


class PortalAppointment(ORMModel):
    id: int
    reference: str
    status: AppointmentStatus
    department: Department
    appointment_date: date
    start_time: time
    end_time: time
    reason: str
    cancellation_reason: str | None
    created_at: datetime
    doctor: AppointmentDoctor
    branch: AppointmentBranch | None


class PortalCancel(BaseModel):
    reason: str | None = Field(default=None, max_length=300)
