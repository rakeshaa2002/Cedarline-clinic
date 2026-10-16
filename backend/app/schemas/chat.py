from datetime import date
from typing import Literal

from pydantic import BaseModel, Field, field_validator

from app.core.config import get_settings


class ChatTurn(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(max_length=2000)


class ChatRequest(BaseModel):
    message: str = Field(min_length=1)
    # Recent conversation, kept by the browser. The server does not store chats.
    history: list[ChatTurn] = Field(default_factory=list, max_length=10)

    @field_validator("message")
    @classmethod
    def _clean_message(cls, v: str) -> str:
        v = " ".join(v.split())
        if not v:
            raise ValueError("Message cannot be empty")
        limit = get_settings().chat_max_question_chars
        if len(v) > limit:
            raise ValueError(f"Message is too long (max {limit} characters)")
        return v


class ChatSource(BaseModel):
    document_id: int
    title: str
    similarity: float


class ChatAction(BaseModel):
    label: str
    href: str


ChatStatus = Literal["answered", "no_context", "safety_redirect", "emergency", "fallback"]


class ChatResponse(BaseModel):
    answer: str
    status: ChatStatus
    sources: list[ChatSource] = []
    actions: list[ChatAction] = []
    provider: str


# --- Admin dashboard --------------------------------------------------------------------


class ChatDayCount(BaseModel):
    date: date
    count: int


class ChatUsage(BaseModel):
    today: int
    total: int  # questions in the last `window_days`
    window_days: int
    by_status: dict[ChatStatus, int]
    answered_rate: float | None
    avg_latency_ms: int | None
    per_day: list[ChatDayCount]


class KnowledgeSummary(BaseModel):
    documents: int
    ready: int
    failed: int
    chunks: int
    embedding_model: str


class Overview(BaseModel):
    chat: ChatUsage
    knowledge: KnowledgeSummary
    unread_messages: int
    active_doctors: int
    active_services: int


class ChatHealth(BaseModel):
    status: Literal["ok", "degraded"]
    embedding_provider: str
    embedding_model: str
    llm_provider: str
    llm_model: str | None
    indexed_chunks: int
    similarity_threshold: float
