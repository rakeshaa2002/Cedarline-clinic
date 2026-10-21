"""The RAG chat pipeline.

    question
      │ 1. safety screen ──► emergency / medical-advice → fixed safe reply (no LLM)
      │ 2. small talk     ──► greeting / thanks → fixed reply
      │ 3. live directory (doctors, fees, services, prices, hours, booking read from the database)
      │ 4. embed query    (Embedder)
      │ 5. retrieve       (pgvector cosine search + similarity threshold)
      │      └─ nothing relevant and no directory facts → "the clinic information doesn't cover that"
      │ 6. build prompt   (system rules + live directory + retrieved context + recent turns)
      │ 7. generate       (LLM)  ── failure ─► formatted directory answer, else extractive quote
      │ 8. validate       NO_ANSWER token → no-context reply; ungrounded numbers/names → fallback as in 7
      ▼
    answer + sources + doctor cards + booking links + follow-up suggestions
"""

import logging
import re

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.exceptions import ServiceUnavailableError
from app.models import ClinicInfo
from app.schemas.chat import ChatAction, ChatRequest, ChatResponse, ChatSource, ChatStatus
from app.services.chatbot import safety
from app.services.chatbot.directory import (
    BOOK,
    CONTACT,
    LIVE_SOURCE_TITLE,
    ClinicDirectory,
    default_suggestions,
    detect_topics,
    redirect_suggestions,
)
from app.services.chatbot.grounding import extractive_answer, is_grounded
from app.services.chatbot.llm import LLMError, LLMProvider
from app.services.chatbot.prompt import NO_ANSWER_TOKEN, build_messages
from app.services.chatbot.retrieval import RetrievedChunk, retrieve
from app.services.knowledge_base.embeddings import Embedder, EmbeddingError

logger = logging.getLogger(__name__)

_GREETING = re.compile(r"^\s*(hi+|hello+|hey+|good (morning|afternoon|evening)|namaste|hola)\b[\s!.?]*$", re.I)
_THANKS = re.compile(r"^\s*(thanks?|thank you|thx|ok(ay)?|great|cool|bye|goodbye)\b[\s\w!.]{0,20}$", re.I)

DEPARTMENT_ACTIONS = {
    "dental": ChatAction(label="Dental treatments", href="/services/dental"),
    "skin": ChatAction(label="Skin treatments", href="/services/skin"),
    "hair": ChatAction(label="Hair treatments", href="/services/hair"),
}


class ChatService:
    def __init__(self, db: Session, embedder: Embedder, llm: LLMProvider | None):
        self.db = db
        self.embedder = embedder
        self.llm = llm
        self.settings = get_settings()
        self._clinic: ClinicInfo | None = None

    # -- helpers -------------------------------------------------------------------

    @property
    def clinic(self) -> ClinicInfo | None:
        if self._clinic is None:
            self._clinic = self.db.scalar(select(ClinicInfo).limit(1))
        return self._clinic

    @property
    def provider_name(self) -> str:
        return self.llm.name if self.llm else "extractive"

    @staticmethod
    def _sources(chunks: list[RetrievedChunk]) -> list[ChatSource]:
        seen: dict[int, ChatSource] = {}
        for c in chunks:
            if c.document_id not in seen:
                seen[c.document_id] = ChatSource(document_id=c.document_id, title=c.title, similarity=c.similarity)
        return list(seen.values())[:3]

    def _retrieval_query(self, request: ChatRequest) -> str:
        """Short follow-ups ("and on Sunday?") are combined with the previous user question."""
        if len(request.message.split()) <= 4:
            previous = [t.content for t in request.history if t.role == "user"]
            if previous:
                return f"{previous[-1]} {request.message}"
        return request.message

    def _no_context(self, question: str) -> ChatResponse:
        contact = ""
        if self.clinic:
            contact = f" Please contact our front desk on {self.clinic.phone} or {self.clinic.email} and they'll be glad to help."
        return ChatResponse(
            answer="I'm sorry — I couldn't find that in the clinic's approved information, so I'd rather not guess."
            + contact,
            status="no_context",
            actions=[CONTACT] + ([BOOK] if "booking" in detect_topics(question) else []),
            suggestions=default_suggestions(),
            provider=self.provider_name,
        )

    # -- pipeline ------------------------------------------------------------------

    def answer(self, request: ChatRequest) -> ChatResponse:
        question = request.message

        # 1. Safety first — these replies are fixed text and never reach the LLM.
        screen = safety.screen_message(question)
        if screen.kind == "emergency":
            return ChatResponse(
                answer=safety.emergency_reply(self.clinic.phone if self.clinic else None),
                status="emergency",
                actions=[CONTACT],
                provider="safety-rules",
            )
        if screen.kind == "medical_advice":
            # No diagnosis, but route the patient: show the recommended department's doctors to book with.
            department = screen.department or "general"
            actions = [BOOK]
            if department in DEPARTMENT_ACTIONS:
                actions.append(DEPARTMENT_ACTIONS[department])
            return ChatResponse(
                answer=safety.medical_advice_reply(screen.department),
                status="safety_redirect",
                actions=actions,
                doctors=ClinicDirectory.load(self.db).department_cards(department),
                suggestions=redirect_suggestions(department),
                provider="safety-rules",
            )

        # 2. Small talk.
        if _GREETING.match(question):
            name = self.clinic.name if self.clinic else "the clinic"
            return ChatResponse(
                answer=f"Hello! I'm the virtual assistant for {name}. Ask me about our services, doctors, "
                "fees, opening hours, location, or how to book an appointment.",
                status="answered",
                suggestions=default_suggestions(limit=4),
                provider="rules",
            )
        if _THANKS.match(question):
            return ChatResponse(
                answer="You're welcome! Is there anything else I can help you with?",
                status="answered",
                suggestions=default_suggestions(),
                provider="rules",
            )

        # 3. Live directory facts: complete lists and current values, even before a re-index.
        directory = ClinicDirectory.load(self.db)
        intent = directory.analyse(question, request.history)
        live = directory.context(intent)

        # 4 + 5. Embed and retrieve.
        try:
            query_vector = self.embedder.embed_query(self._retrieval_query(request))
        except EmbeddingError as exc:
            logger.error("Query embedding failed: %s", exc)
            raise ServiceUnavailableError(
                "The clinic assistant is temporarily unavailable. Please try again shortly or contact the clinic."
            ) from exc

        chunks = retrieve(
            self.db,
            query_vector,
            model_id=self.embedder.model_id,
            top_k=self.settings.rag_top_k,
            threshold=self.settings.effective_similarity_threshold,
        )
        logger.info(
            "RAG retrieval: %d chunks above threshold (best=%.3f); live directory: %s",
            len(chunks),
            chunks[0].similarity if chunks else 0.0,
            "yes" if live else "no",
        )
        if not chunks and live is None:
            return self._no_context(question)

        sources = self._sources(chunks)
        context = ([RetrievedChunk(0, 0, LIVE_SOURCE_TITLE, live, 1.0)] if live else []) + chunks

        def reply(text: str, status: ChatStatus, provider: str) -> ChatResponse:
            cards = directory.cards(intent, text)
            return ChatResponse(
                answer=text, status=status, sources=sources,
                actions=directory.actions(intent, cards, text), doctors=cards,
                suggestions=directory.suggestions(intent, cards), provider=provider,
            )

        def offline_answer() -> str:
            return directory.answer(intent) or extractive_answer(question, context)

        # 6-8. Generate, then validate.
        if self.llm is None:
            return reply(offline_answer(), "answered", "extractive")

        clinic_name = self.clinic.name if self.clinic else "the clinic"
        system, messages = build_messages(question, context, request.history, clinic_name)
        try:
            text = self.llm.generate(system, messages)
        except LLMError as exc:
            logger.warning("LLM unavailable, using extractive fallback: %s", exc)
            return reply(offline_answer(), "fallback", "extractive-fallback")

        if NO_ANSWER_TOKEN in text:
            return self._no_context(question)

        if not is_grounded(text, context):
            logger.warning("LLM answer failed grounding check; using extractive fallback")
            return reply(offline_answer(), "fallback", "extractive-fallback")

        return reply(text, "answered", self.provider_name)
