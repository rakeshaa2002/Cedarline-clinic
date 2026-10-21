from datetime import date, datetime, time
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator

from app.schemas.common import ORMModel, PersonName, PhoneNumber

Department = Literal["general", "dental", "skin", "hair", "pediatrics"]
Theme = Literal["cedar", "emerald", "sapphire", "slate", "plum"]


class OpeningHour(BaseModel):
    day: str
    open: str | None = None
    close: str | None = None
    closed: bool = False


class ClinicInfoOut(ORMModel):
    name: str
    tagline: str
    about: str
    phone: str
    whatsapp: str | None
    email: str
    address_line: str
    city: str
    state: str
    postal_code: str
    country: str
    map_embed_url: str | None
    opening_hours: list[OpeningHour]
    emergency_note: str
    theme: Theme


class ThemeUpdate(BaseModel):
    theme: Theme


# --- Doctors ----------------------------------------------------------------------


class DoctorOut(ORMModel):
    id: int
    slug: str
    full_name: str
    department: Department
    specialization: str
    qualifications: str
    experience_years: int
    bio: str
    languages: list[str]
    photo_url: str | None
    consultation_days: list[int]
    start_time: time
    end_time: time
    slot_minutes: int
    consultation_fee: Decimal | None
    is_active: bool


class DoctorBase(BaseModel):
    full_name: str = Field(min_length=3, max_length=120)
    department: Department
    specialization: str = Field(min_length=2, max_length=150)
    qualifications: str = Field(min_length=2, max_length=255)
    experience_years: int = Field(ge=0, le=60)
    bio: str = Field(min_length=10, max_length=3000)
    languages: list[str] = Field(default_factory=list, max_length=10)
    photo_url: str | None = Field(default=None, max_length=500)
    consultation_days: list[int] = Field(min_length=1, max_length=7)
    start_time: time
    end_time: time
    slot_minutes: int = Field(default=30, ge=10, le=120)
    consultation_fee: Decimal | None = Field(default=None, ge=0, le=100000, decimal_places=2)
    is_active: bool = True

    @field_validator("consultation_days")
    @classmethod
    def _valid_days(cls, v: list[int]) -> list[int]:
        if any(d < 0 or d > 6 for d in v):
            raise ValueError("Days must be 0 (Monday) to 6 (Sunday)")
        return sorted(set(v))

    @model_validator(mode="after")
    def _shift_order(self):
        if self.start_time >= self.end_time:
            raise ValueError("start_time must be before end_time")
        return self


class DoctorCreate(DoctorBase):
    slug: str = Field(min_length=3, max_length=120, pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$")


class DoctorUpdate(DoctorBase):
    pass


# --- Services ---------------------------------------------------------------------


class ServiceOut(ORMModel):
    id: int
    slug: str
    name: str
    department: Department
    short_description: str
    description: str
    duration_minutes: int
    price_from: Decimal | None
    icon: str
    is_active: bool


class ServiceBase(BaseModel):
    name: str = Field(min_length=2, max_length=150)
    department: Department
    short_description: str = Field(min_length=10, max_length=300)
    description: str = Field(min_length=10, max_length=5000)
    duration_minutes: int = Field(default=30, ge=5, le=480)
    price_from: Decimal | None = Field(default=None, ge=0, max_digits=10, decimal_places=2)
    icon: str = Field(default="stethoscope", max_length=50)
    sort_order: int = 0
    is_active: bool = True


class ServiceCreate(ServiceBase):
    slug: str = Field(min_length=3, max_length=120, pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$")


class ServiceUpdate(ServiceBase):
    pass


# --- Blog -------------------------------------------------------------------------


class BlogAuthor(ORMModel):
    id: int
    slug: str
    full_name: str
    specialization: str
    photo_url: str | None


class BlogPostSummary(ORMModel):
    id: int
    slug: str
    title: str
    excerpt: str
    category: str
    cover_image: str | None
    reading_minutes: int
    published_at: date
    author: BlogAuthor | None


class BlogPostOut(BlogPostSummary):
    content: str


class BlogPostAdminOut(BlogPostOut):
    is_published: bool
    author_id: int | None


class BlogPostBase(BaseModel):
    title: str = Field(min_length=5, max_length=200)
    excerpt: str = Field(min_length=10, max_length=400)
    # Markdown: "## " headings, paragraphs, "- " lists, **bold**, *italic* and [links](https://...).
    content: str = Field(min_length=20, max_length=50000)
    category: str = Field(min_length=2, max_length=40)
    cover_image: str | None = Field(default=None, max_length=500)
    reading_minutes: int | None = Field(default=None, ge=1, le=120)  # None = estimated from the word count
    author_id: int | None = None
    is_published: bool = True
    published_at: date | None = None  # None = today

    @field_validator("cover_image", mode="before")
    @classmethod
    def _empty_cover(cls, v):
        return v or None


class BlogPostCreate(BlogPostBase):
    slug: str = Field(min_length=3, max_length=160, pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$")


class BlogPostUpdate(BlogPostBase):
    pass


# --- Before / after gallery -----------------------------------------------------------


class TransformationOut(ORMModel):
    id: int
    department: Department
    title: str
    description: str
    before_image: str
    after_image: str


class TransformationAdminOut(TransformationOut):
    patient_consent: bool
    is_published: bool
    sort_order: int


class TransformationIn(BaseModel):
    department: Department
    title: str = Field(min_length=3, max_length=150)
    description: str = Field(default="", max_length=1000)
    before_image: str = Field(min_length=1, max_length=500)
    after_image: str = Field(min_length=1, max_length=500)
    patient_consent: bool = False
    is_published: bool = False
    sort_order: int = 0

    @model_validator(mode="after")
    def _consent_before_publishing(self):
        if self.is_published and not self.patient_consent:
            raise ValueError("Confirm the patient's written consent before publishing their photos.")
        return self


# --- Contact ----------------------------------------------------------------------


class ContactCreate(BaseModel):
    name: PersonName
    email: EmailStr
    phone: PhoneNumber | None = None
    subject: str = Field(min_length=3, max_length=150)
    message: str = Field(min_length=10, max_length=2000)

    @field_validator("phone", mode="before")
    @classmethod
    def _empty_phone(cls, v):
        return v or None


class ContactOut(ORMModel):
    id: int
    name: str
    email: str
    phone: str | None
    subject: str
    message: str
    is_read: bool
    created_at: datetime


# --- Highlights & Testimonials ----------------------------------------------------


class TestimonialOut(BaseModel):
    id: int
    quote: str
    name: str
    detail: str


class HighlightItem(BaseModel):
    icon: str
    title: str
    text: str


class ClinicHighlightsOut(BaseModel):
    values: list[HighlightItem]
    facilities: list[str]
    why_choose: list[HighlightItem]

