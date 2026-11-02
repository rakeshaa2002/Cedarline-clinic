"""Import every model so Base.metadata is complete (used by Alembic and tests)."""

from app.models.appointment import (
    ACTIVE_STATUSES,
    APPOINTMENT_STATUSES,
    EMAIL_KINDS,
    Appointment,
    AppointmentEmail,
)
from app.models.chat import CHAT_STATUSES, ChatEvent
from app.models.clinic import DEPARTMENTS, THEMES, BlogPost, Branch, ClinicInfo, ContactMessage, Doctor, Service
from app.models.crm import PATIENT_SOURCES, WHATSAPP_KINDS, Patient, PatientOtp, WhatsAppMessage
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
    "Branch",
    "ChatEvent",
    "ClinicInfo",
    "ContactMessage",
    "Doctor",
    "KnowledgeChunk",
    "KnowledgeDocument",
    "MediaFile",
    "PATIENT_SOURCES",
    "Patient",
    "PatientOtp",
    "Service",
    "TransformationCase",
    "User",
    "WHATSAPP_KINDS",
    "WhatsAppMessage",
]
