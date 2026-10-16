"""Import every model so Base.metadata is complete (used by Alembic and tests)."""

from app.models.chat import CHAT_STATUSES, ChatEvent
from app.models.clinic import DEPARTMENTS, BlogPost, ClinicInfo, ContactMessage, Doctor, Service
from app.models.knowledge import KnowledgeChunk, KnowledgeDocument
from app.models.user import USER_ROLES, User

__all__ = [
    "CHAT_STATUSES",
    "DEPARTMENTS",
    "USER_ROLES",
    "BlogPost",
    "ChatEvent",
    "ClinicInfo",
    "ContactMessage",
    "Doctor",
    "KnowledgeChunk",
    "KnowledgeDocument",
    "Service",
    "User",
]
