"""Document ingestion: text -> chunks -> embeddings -> pgvector rows."""

import logging

from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.exceptions import ServiceUnavailableError, ValidationFailedError
from app.models import KnowledgeChunk, KnowledgeDocument
from app.services.knowledge_base.chunking import chunk_text
from app.services.knowledge_base.embeddings import Embedder, EmbeddingError
from app.services.knowledge_base.extraction import clean_text

logger = logging.getLogger(__name__)


def embedding_input(title: str, chunk: str) -> str:
    """Prefix each chunk with its document title so the vector carries that context."""
    return f"{title}\n\n{chunk}"


def _embed_into(db: Session, document: KnowledgeDocument, embedder: Embedder) -> None:
    """(Re)build the chunks of one document. Caller commits."""
    settings = get_settings()
    chunks = chunk_text(document.content_text, settings.rag_chunk_size, settings.rag_chunk_overlap)
    if not chunks:
        raise ValidationFailedError("The document does not contain any text to index.")

    vectors = embedder.embed_documents([embedding_input(document.title, c) for c in chunks])

    db.execute(delete(KnowledgeChunk).where(KnowledgeChunk.document_id == document.id))
    for index, (content, vector) in enumerate(zip(chunks, vectors, strict=True)):
        db.add(
            KnowledgeChunk(
                document_id=document.id,
                chunk_index=index,
                content=content,
                embedding=vector,
                embedding_model=embedder.model_id,
                meta={"title": document.title, "source_type": document.source_type},
            )
        )
    document.chunk_count = len(chunks)
    document.status = "ready"
    document.error = None


def ingest_document(
    db: Session,
    embedder: Embedder,
    *,
    title: str,
    text: str,
    source_type: str,
    source_key: str | None = None,
    filename: str | None = None,
    content_type: str | None = None,
) -> KnowledgeDocument:
    """Create (or replace, when `source_key` matches) a document and index it.

    If embedding fails the document is kept with status "failed" so an admin can
    see the error and re-index later; a 503 is then raised to the caller.
    """
    document = None
    if source_key:
        document = db.scalar(select(KnowledgeDocument).where(KnowledgeDocument.source_key == source_key))
    if document is None:
        document = KnowledgeDocument(source_key=source_key)
        db.add(document)

    document.title = title.strip()[:200]
    document.source_type = source_type
    document.filename = filename
    document.content_type = content_type
    document.content_text = clean_text(text)
    document.status = "processing"
    db.flush()

    try:
        _embed_into(db, document, embedder)
    except EmbeddingError as exc:
        db.rollback()
        _mark_failed(db, document, str(exc), title, text, source_type, source_key, filename, content_type)
        raise ServiceUnavailableError(
            "The document was saved but could not be indexed because the embedding service is unavailable."
        ) from exc
    db.commit()
    db.refresh(document)
    logger.info("Indexed document %s (%s chunks)", document.id, document.chunk_count)
    return document


def _mark_failed(db, document, error, title, text, source_type, source_key, filename, content_type):
    if document.id is None or db.get(KnowledgeDocument, document.id) is None:
        document = KnowledgeDocument(source_key=source_key)
        db.add(document)
    document.title = title.strip()[:200]
    document.source_type = source_type
    document.filename = filename
    document.content_type = content_type
    document.content_text = clean_text(text)
    document.status = "failed"
    document.error = error[:500]
    document.chunk_count = 0
    db.commit()


def reindex_document(db: Session, embedder: Embedder, document: KnowledgeDocument) -> None:
    try:
        _embed_into(db, document, embedder)
        db.commit()
    except EmbeddingError as exc:
        db.rollback()
        document.status, document.error = "failed", str(exc)[:500]
        db.commit()
        raise


def indexed_chunk_count(db: Session, model_id: str) -> int:
    return db.scalar(
        select(func.count(KnowledgeChunk.id)).where(KnowledgeChunk.embedding_model == model_id)
    ) or 0
