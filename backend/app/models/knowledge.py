from pgvector.sqlalchemy import Vector
from sqlalchemy import CheckConstraint, ForeignKey, Index, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.config import get_settings
from app.db.base import Base, TimestampMixin

EMBEDDING_DIM = get_settings().embedding_dim


class KnowledgeDocument(TimestampMixin, Base):
    """An approved source of clinic information (uploaded file, FAQ, or generated from DB data)."""

    __tablename__ = "knowledge_documents"
    __table_args__ = (
        CheckConstraint("source_type IN ('upload', 'seed', 'system')", name="source_type_valid"),
        CheckConstraint("status IN ('processing', 'ready', 'failed')", name="status_valid"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(200))
    # upload = admin-uploaded file, seed = bundled FAQ docs, system = generated from DB tables
    source_type: Mapped[str] = mapped_column(String(20))
    # Stable key for seed/system documents so re-indexing replaces instead of duplicating.
    source_key: Mapped[str | None] = mapped_column(String(120), unique=True)
    filename: Mapped[str | None] = mapped_column(String(255))
    content_type: Mapped[str | None] = mapped_column(String(100))
    content_text: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(20), default="processing")
    error: Mapped[str | None] = mapped_column(Text)
    chunk_count: Mapped[int] = mapped_column(Integer, default=0)

    chunks: Mapped[list["KnowledgeChunk"]] = relationship(
        back_populates="document", cascade="all, delete-orphan", passive_deletes=True
    )


class KnowledgeChunk(Base):
    __tablename__ = "knowledge_chunks"
    __table_args__ = (
        # Approximate-nearest-neighbour index for cosine distance (the <=> operator).
        Index(
            "ix_knowledge_chunks_embedding_hnsw",
            "embedding",
            postgresql_using="hnsw",
            postgresql_ops={"embedding": "vector_cosine_ops"},
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    document_id: Mapped[int] = mapped_column(
        ForeignKey("knowledge_documents.id", ondelete="CASCADE"), index=True
    )
    chunk_index: Mapped[int] = mapped_column(Integer)
    content: Mapped[str] = mapped_column(Text)
    embedding = mapped_column(Vector(EMBEDDING_DIM), nullable=False)
    # Which model produced the vector; retrieval only compares vectors from the active model.
    embedding_model: Mapped[str] = mapped_column(String(120), index=True)
    meta: Mapped[dict] = mapped_column("metadata", JSONB, default=dict)

    document: Mapped[KnowledgeDocument] = relationship(back_populates="chunks")
