import logging
import time
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import DbSession
from app.core.config import get_settings
from app.core.rate_limit import rate_limit
from app.models import ChatEvent
from app.schemas.chat import ChatHealth, ChatRequest, ChatResponse
from app.services.chatbot.llm import LLMProvider, get_llm
from app.services.chatbot.service import ChatService
from app.services.knowledge_base.embeddings import Embedder, get_embedder
from app.services.knowledge_base.ingestion import indexed_chunk_count

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/chat", tags=["chat"])


@router.post(
    "",
    response_model=ChatResponse,
    dependencies=[Depends(rate_limit("chat", "rate_limit_chat_per_minute"))],
)
def chat(
    request: ChatRequest,
    db: DbSession,
    embedder: Annotated[Embedder, Depends(get_embedder)],
    llm: Annotated[LLMProvider | None, Depends(get_llm)],
) -> ChatResponse:
    started = time.perf_counter()
    response = ChatService(db, embedder, llm).answer(request)
    _record(db, response, started)
    return response


def _record(db: Session, response: ChatResponse, started: float) -> None:
    """Store the outcome for the dashboard (never the text). Must not break the reply."""
    try:
        db.add(ChatEvent(
            status=response.status,
            provider=response.provider[:80],
            latency_ms=round((time.perf_counter() - started) * 1000),
            top_similarity=max((s.similarity for s in response.sources), default=None),
        ))
        db.commit()
    except Exception:  # noqa: BLE001
        db.rollback()
        logger.exception("Could not record chat event")


@router.get("/health", response_model=ChatHealth)
def chat_health(
    db: DbSession,
    embedder: Annotated[Embedder, Depends(get_embedder)],
    llm: Annotated[LLMProvider | None, Depends(get_llm)],
) -> ChatHealth:
    settings = get_settings()
    chunks = indexed_chunk_count(db, embedder.model_id)
    return ChatHealth(
        status="ok" if chunks > 0 else "degraded",
        embedding_provider=settings.embedding_provider,
        embedding_model=embedder.model_id,
        llm_provider=llm.name if llm else "extractive",
        llm_model=settings.llm_model if llm else None,
        indexed_chunks=chunks,
        similarity_threshold=settings.effective_similarity_threshold,
    )
