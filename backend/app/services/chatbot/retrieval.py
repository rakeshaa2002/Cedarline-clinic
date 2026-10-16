"""Vector retrieval from PostgreSQL using pgvector cosine distance."""

from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import KnowledgeChunk, KnowledgeDocument


@dataclass
class RetrievedChunk:
    chunk_id: int
    document_id: int
    title: str
    content: str
    similarity: float
    chunk_index: int = 0


def retrieve(
    db: Session,
    query_vector: list[float],
    *,
    model_id: str,
    top_k: int,
    threshold: float,
) -> list[RetrievedChunk]:
    """Return the `top_k` most similar chunks whose cosine similarity >= threshold.

    The ORDER BY uses `embedding <=> :query` (cosine distance), which the HNSW
    index (vector_cosine_ops) accelerates. Similarity = 1 - distance.
    Equivalent SQL:

        SELECT c.id, c.document_id, d.title, c.content, 1 - (c.embedding <=> :q) AS similarity
        FROM knowledge_chunks c JOIN knowledge_documents d ON d.id = c.document_id
        WHERE c.embedding_model = :model AND d.status = 'ready'
        ORDER BY c.embedding <=> :q
        LIMIT :k;
    """
    distance = KnowledgeChunk.embedding.cosine_distance(query_vector)
    stmt = (
        select(
            KnowledgeChunk.id,
            KnowledgeChunk.document_id,
            KnowledgeDocument.title,
            KnowledgeChunk.content,
            KnowledgeChunk.chunk_index,
            (1 - distance).label("similarity"),
        )
        .join(KnowledgeDocument, KnowledgeDocument.id == KnowledgeChunk.document_id)
        .where(KnowledgeChunk.embedding_model == model_id, KnowledgeDocument.status == "ready")
        .order_by(distance)
        .limit(top_k)
    )
    results = [
        RetrievedChunk(
            chunk_id=row.id,
            document_id=row.document_id,
            title=row.title,
            content=row.content,
            similarity=round(float(row.similarity), 4),
            chunk_index=row.chunk_index,
        )
        for row in db.execute(stmt)
    ]
    return [r for r in results if r.similarity >= threshold]
