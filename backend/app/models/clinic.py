from datetime import date, datetime, time
from decimal import Decimal

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    Time,
    func,
)
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin

DEPARTMENTS = ("general", "dental", "skin", "hair", "pediatrics")
_DEPT_CHECK = "department IN ('general', 'dental', 'skin', 'hair', 'pediatrics')"


class ClinicInfo(TimestampMixin, Base):
    """Single-row table holding the clinic's public details."""

    __tablename__ = "clinic_info"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(150))
    tagline: Mapped[str] = mapped_column(String(255))
    about: Mapped[str] = mapped_column(Text)
    phone: Mapped[str] = mapped_column(String(40))
    whatsapp: Mapped[str | None] = mapped_column(String(40))
    email: Mapped[str] = mapped_column(String(255))
    address_line: Mapped[str] = mapped_column(String(255))
    city: Mapped[str] = mapped_column(String(100))
    state: Mapped[str] = mapped_column(String(100))
    postal_code: Mapped[str] = mapped_column(String(20))
    country: Mapped[str] = mapped_column(String(100))
    map_embed_url: Mapped[str | None] = mapped_column(Text)
    # [{"day": "Monday", "open": "09:00", "close": "20:00", "closed": false}, ...]
    opening_hours: Mapped[list[dict]] = mapped_column(JSONB, default=list)
    emergency_note: Mapped[str] = mapped_column(Text)


class Doctor(TimestampMixin, Base):
    __tablename__ = "doctors"
    __table_args__ = (
        CheckConstraint(_DEPT_CHECK, name="department_valid"),
        CheckConstraint("start_time < end_time", name="shift_valid"),
        CheckConstraint("slot_minutes BETWEEN 10 AND 120", name="slot_minutes_valid"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    slug: Mapped[str] = mapped_column(String(120), unique=True)
    full_name: Mapped[str] = mapped_column(String(120))
    department: Mapped[str] = mapped_column(String(30), index=True)
    specialization: Mapped[str] = mapped_column(String(150))
    qualifications: Mapped[str] = mapped_column(String(255))
    experience_years: Mapped[int] = mapped_column(Integer)
    bio: Mapped[str] = mapped_column(Text)
    languages: Mapped[list[str]] = mapped_column(ARRAY(String(40)), default=list)
    photo_url: Mapped[str | None] = mapped_column(String(500))
    # ISO weekday numbers: 0 = Monday ... 6 = Sunday
    consultation_days: Mapped[list[int]] = mapped_column(ARRAY(Integer), default=list)
    start_time: Mapped[time] = mapped_column(Time)
    end_time: Mapped[time] = mapped_column(Time)
    slot_minutes: Mapped[int] = mapped_column(Integer, default=30)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, index=True)


class Service(TimestampMixin, Base):
    __tablename__ = "services"
    __table_args__ = (CheckConstraint(_DEPT_CHECK, name="department_valid"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    slug: Mapped[str] = mapped_column(String(120), unique=True)
    name: Mapped[str] = mapped_column(String(150))
    department: Mapped[str] = mapped_column(String(30), index=True)
    short_description: Mapped[str] = mapped_column(String(300))
    description: Mapped[str] = mapped_column(Text)
    duration_minutes: Mapped[int] = mapped_column(Integer, default=30)
    price_from: Mapped[Decimal | None] = mapped_column(Numeric(10, 2))
    icon: Mapped[str] = mapped_column(String(50), default="stethoscope")
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, index=True)


class BlogPost(TimestampMixin, Base):
    __tablename__ = "blog_posts"

    id: Mapped[int] = mapped_column(primary_key=True)
    slug: Mapped[str] = mapped_column(String(160), unique=True)
    title: Mapped[str] = mapped_column(String(200))
    excerpt: Mapped[str] = mapped_column(String(400))
    content: Mapped[str] = mapped_column(Text)  # lightweight markdown: "## " headings + paragraphs
    category: Mapped[str] = mapped_column(String(40), index=True)
    cover_image: Mapped[str | None] = mapped_column(String(500))
    reading_minutes: Mapped[int] = mapped_column(Integer, default=4)
    author_id: Mapped[int | None] = mapped_column(
        ForeignKey("doctors.id", ondelete="SET NULL"), index=True
    )
    is_published: Mapped[bool] = mapped_column(Boolean, default=True)
    published_at: Mapped[date] = mapped_column(Date, index=True)

    author: Mapped[Doctor | None] = relationship()


class ContactMessage(Base):
    __tablename__ = "contact_messages"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(255))
    phone: Mapped[str | None] = mapped_column(String(30))
    subject: Mapped[str] = mapped_column(String(150))
    message: Mapped[str] = mapped_column(Text)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )
