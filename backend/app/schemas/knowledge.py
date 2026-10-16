from datetime import datetime

from app.schemas.common import ORMModel
from pydantic import BaseModel


class KnowledgeDocumentOut(ORMModel):
    id: int
    title: str
    source_type: str
    filename: str | None
    content_type: str | None
    status: str
    error: str | None
    chunk_count: int
    created_at: datetime
    updated_at: datetime


class ReindexResult(BaseModel):
    documents: int
    chunks: int
    embedding_model: str
