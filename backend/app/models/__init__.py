"""Import every model so Base.metadata is complete (used by Alembic and tests)."""

from app.models.appointment import (
    ACTIVE_STATUSES,
    APPOINTMENT_STATUSES,
    EMAIL_KINDS,
    Appointment,
    AppointmentEmail,
)
from app.models.chat import CHAT_STATUSES, ChatEvent
from app.models.clinic import DEPARTMENTS, THEMES, BlogPost, ClinicInfo, ContactMessage, Doctor, Service
from app.models.knowledge import KnowledgeChunk, KnowledgeDocument
from app.models.media import MediaFile, TransformationCase
from app.models.user import USER_ROLES, User

__all__ = [
    "ACTIVE_STATUSES",
    "APPOINTMENT_STATUSES",
    "CHAT_STATUSES",
    "DEPARTMENTS",
    "EMAIL_KINDS",
    "THEMES",
    "USER_ROLES",
    "Appointment",
    "AppointmentEmail",
    "BlogPost",
    "ChatEvent",
    "ClinicInfo",
    "ContactMessage",
    "Doctor",
    "KnowledgeChunk",
    "KnowledgeDocument",
    "MediaFile",
    "Service",
    "TransformationCase",
    "User",
]
