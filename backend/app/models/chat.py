from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, Float, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base

CHAT_STATUSES = ("answered", "no_context", "safety_redirect", "emergency", "fallback")


class ChatEvent(Base):
    """One chatbot reply, for the admin dashboard.

    Deliberately stores only the outcome, never the question or answer text: visitors
    may type personal health details, and the clinic does not need to keep them.
    """

    __tablename__ = "chat_events"
    __table_args__ = (
        CheckConstraint(
            "status IN ('answered', 'no_context', 'safety_redirect', 'emergency', 'fallback')", name="status_valid"
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True
    )
    status: Mapped[str] = mapped_column(String(20))
    provider: Mapped[str] = mapped_column(String(80))
    latency_ms: Mapped[int] = mapped_column(Integer)
    # Cosine similarity of the best retrieved chunk (None when retrieval was skipped).
    top_similarity: Mapped[float | None] = mapped_column(Float)
