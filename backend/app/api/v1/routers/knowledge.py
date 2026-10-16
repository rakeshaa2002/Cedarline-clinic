"""Admin management of the chatbot's approved knowledge base."""

from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, UploadFile, status
from sqlalchemy import select

from app.api.deps import AdminUser, DbSession
from app.core.config import get_settings
from app.core.exceptions import AppError, NotFoundError, ServiceUnavailableError
from app.models import KnowledgeDocument
from app.schemas.common import Message
from app.schemas.knowledge import KnowledgeDocumentOut, ReindexResult
from app.services.knowledge_base.embeddings import Embedder, EmbeddingError, get_embedder
from app.services.knowledge_base.extraction import extract_text
from app.services.knowledge_base.ingestion import ingest_document
from app.services.knowledge_base.system_documents import reindex_all

router = APIRouter(prefix="/admin/knowledge", tags=["knowledge base"])

EmbedderDep = Annotated[Embedder, Depends(get_embedder)]


class PayloadTooLargeError(AppError):
    status_code = 413
    code = "payload_too_large"


@router.get("/documents", response_model=list[KnowledgeDocumentOut])
def list_documents(db: DbSession, _: AdminUser):
    return db.scalars(
        select(KnowledgeDocument).order_by(KnowledgeDocument.source_type, KnowledgeDocument.title)
    ).all()


@router.post("/documents", response_model=KnowledgeDocumentOut, status_code=status.HTTP_201_CREATED)
async def upload_document(
    db: DbSession,
    _: AdminUser,
    embedder: EmbedderDep,
    file: Annotated[UploadFile, File(description="PDF, TXT or MD, up to UPLOAD_MAX_BYTES")],
    title: Annotated[str | None, Form(max_length=200)] = None,
):
    limit = get_settings().upload_max_bytes
    data = await file.read(limit + 1)  # never read more than the limit into memory
    if len(data) > limit:
        raise PayloadTooLargeError(f"File is too large (max {limit // (1024 * 1024)} MB).")
    filename = (file.filename or "document").replace("\\", "/").split("/")[-1][:255]
    text = extract_text(filename, data)
    return ingest_document(
        db,
        embedder,
        title=(title or filename.rsplit(".", 1)[0]).strip() or "Untitled document",
        text=text,
        source_type="upload",
        filename=filename,
        content_type=file.content_type,
    )


@router.delete("/documents/{document_id}", response_model=Message)
def delete_document(document_id: int, db: DbSession, _: AdminUser):
    document = db.get(KnowledgeDocument, document_id)
    if not document:
        raise NotFoundError("Document not found.")
    db.delete(document)  # chunks are removed by ON DELETE CASCADE
    db.commit()
    note = " It will be regenerated on the next re-index." if document.source_type == "system" else ""
    return Message(message=f"Document deleted.{note}")


@router.post("/reindex", response_model=ReindexResult)
def reindex(db: DbSession, _: AdminUser, embedder: EmbedderDep):
    try:
        documents, chunks = reindex_all(db, embedder)
    except EmbeddingError as exc:
        raise ServiceUnavailableError("Re-indexing failed: the embedding service is unavailable.") from exc
    return ReindexResult(documents=documents, chunks=chunks, embedding_model=embedder.model_id)
