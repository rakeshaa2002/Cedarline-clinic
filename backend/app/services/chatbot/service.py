"""The RAG chat pipeline.

    question
      │ 1. safety screen ──► emergency / medical-advice → fixed safe reply (no LLM)
      │ 2. small talk     ──► greeting / thanks → fixed reply
      │ 3. embed query    (Embedder)
      │ 4. retrieve       (pgvector cosine search + similarity threshold)
      │      └─ nothing relevant → "the clinic information doesn't cover that" + contact details
      │ 5. build prompt   (system rules + retrieved context + recent turns)
      │ 6. generate       (LLM)  ── failure ─► extractive fallback (quotes the context)
      │ 7. validate       NO_ANSWER token → no-context reply; ungrounded numbers/names → extractive
      ▼
    answer + sources + suggested page links
"""

import logging
import re

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.exceptions import ServiceUnavailableError
from app.models import ClinicInfo
from app.schemas.chat import ChatAction, ChatRequest, ChatResponse, ChatSource
from app.services.chatbot import safety
from app.services.chatbot.grounding import extractive_answer, is_grounded
from app.services.chatbot.llm import LLMError, LLMProvider
from app.services.chatbot.prompt import NO_ANSWER_TOKEN, build_messages
from app.services.chatbot.retrieval import RetrievedChunk, retrieve
from app.services.knowledge_base.embeddings import Embedder, EmbeddingError

logger = logging.getLogger(__name__)

_GREETING = re.compile(r"^\s*(hi+|hello+|hey+|good (morning|afternoon|evening)|namaste|hola)\b[\s!.?]*$", re.I)
_THANKS = re.compile(r"^\s*(thanks?|thank you|thx|ok(ay)?|great|cool|bye|goodbye)\b[\s\w!.]{0,20}$", re.I)
_BOOKING = re.compile(r"\b(book\w*|appointment\w*|schedul\w*|reserve|consult\w*|slot\w*|visit)\b", re.I)
_DOCTORS = re.compile(r"\b(doctors?|dr\.?|dentists?|dermatologists?|trichologists?|specialists?|paediatrician|pediatrician)\b", re.I)
_CONTACT = re.compile(r"\b(where|located|location|address|directions?|contact|phone|call|email|reach)\b", re.I)

DEPARTMENT_ACTIONS = {
    "dental": ChatAction(label="Dental treatments", href="/services/dental"),
    "skin": ChatAction(label="Skin treatments", href="/services/skin"),
    "hair": ChatAction(label="Hair treatments", href="/services/hair"),
}
BOOK = ChatAction(label="How to book", href="/appointments")
DOCTORS = ChatAction(label="Meet our doctors", href="/doctors")
CONTACT = ChatAction(label="Contact us", href="/contact")


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

    def _actions(self, question: str, answer: str = "") -> list[ChatAction]:
        actions: list[ChatAction] = []
        department = safety.department_hint(question)
        if department in DEPARTMENT_ACTIONS:
            actions.append(DEPARTMENT_ACTIONS[department])
        if _DOCTORS.search(question):
            actions.append(DOCTORS)
        if _CONTACT.search(question):
            actions.append(CONTACT)
        if _BOOKING.search(question) or "/appointments" in answer:
            actions.insert(0, BOOK)
        return actions[:3]

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
            actions=[CONTACT] + ([BOOK] if _BOOKING.search(question) else []),
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
            actions = [BOOK]
            if screen.department in DEPARTMENT_ACTIONS:
                actions.append(DEPARTMENT_ACTIONS[screen.department])
            return ChatResponse(
                answer=safety.medical_advice_reply(screen.department),
                status="safety_redirect",
                actions=actions,
                provider="safety-rules",
            )

        # 2. Small talk.
        if _GREETING.match(question):
            name = self.clinic.name if self.clinic else "the clinic"
            return ChatResponse(
                answer=f"Hello! I'm the virtual assistant for {name}. Ask me about our services, doctors, "
                "opening hours, location, or how to book an appointment.",
                status="answered",
                provider="rules",
            )
        if _THANKS.match(question):
            return ChatResponse(
                answer="You're welcome! Is there anything else I can help you with?",
                status="answered",
                provider="rules",
            )

        # 3 + 4. Embed and retrieve.
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
            "RAG retrieval: %d chunks above threshold (best=%.3f)",
            len(chunks),
            chunks[0].similarity if chunks else 0.0,
        )
        if not chunks:
            return self._no_context(question)

        sources = self._sources(chunks)

        # 5-7. Generate, then validate.
        if self.llm is None:
            text = extractive_answer(question, chunks)
            return ChatResponse(
                answer=text, status="answered", sources=sources,
                actions=self._actions(question, text), provider="extractive",
            )

        clinic_name = self.clinic.name if self.clinic else "the clinic"
        system, messages = build_messages(question, chunks, request.history, clinic_name)
        try:
            text = self.llm.generate(system, messages)
        except LLMError as exc:
            logger.warning("LLM unavailable, using extractive fallback: %s", exc)
            text = extractive_answer(question, chunks)
            return ChatResponse(
                answer=text, status="fallback", sources=sources,
                actions=self._actions(question, text), provider="extractive-fallback",
            )

        if NO_ANSWER_TOKEN in text:
            return self._no_context(question)

        if not is_grounded(text, chunks):
            logger.warning("LLM answer failed grounding check; using extractive fallback")
            text = extractive_answer(question, chunks)
            return ChatResponse(
                answer=text, status="fallback", sources=sources,
                actions=self._actions(question, text), provider="extractive-fallback",
            )

        return ChatResponse(
            answer=text, status="answered", sources=sources,
            actions=self._actions(question, text), provider=self.provider_name,
        )
