from datetime import datetime

from sqlalchemy import Boolean, CheckConstraint, DateTime, Integer, LargeBinary, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin


class MediaFile(Base):
    """An uploaded image kept in PostgreSQL when Cloudinary isn't configured (served at /api/v1/media/{id})."""

    __tablename__ = "media_files"

    id: Mapped[int] = mapped_column(primary_key=True)
    filename: Mapped[str] = mapped_column(String(255))
    content_type: Mapped[str] = mapped_column(String(100))
    size_bytes: Mapped[int] = mapped_column(Integer)
    data: Mapped[bytes] = mapped_column(LargeBinary)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class TransformationCase(TimestampMixin, Base):
    """A before/after treatment result. Published only with the patient's written consent on file."""

    __tablename__ = "transformation_cases"
    __table_args__ = (
        CheckConstraint("department IN ('general', 'dental', 'skin', 'hair', 'pediatrics')", name="department_valid"),
        CheckConstraint("NOT is_published OR patient_consent", name="consent_before_publishing"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    department: Mapped[str] = mapped_column(String(30), index=True)
    title: Mapped[str] = mapped_column(String(150))
    description: Mapped[str] = mapped_column(Text, default="")
    before_image: Mapped[str] = mapped_column(String(500))
    after_image: Mapped[str] = mapped_column(String(500))
    patient_consent: Mapped[bool] = mapped_column(Boolean, default=False)
    is_published: Mapped[bool] = mapped_column(Boolean, default=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
