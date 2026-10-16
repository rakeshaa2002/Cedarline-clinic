import pytest
from sqlalchemy import func, select

from app.models import KnowledgeChunk, KnowledgeDocument
from app.services.chatbot.retrieval import retrieve
from app.services.knowledge_base.chunking import chunk_text
from app.services.knowledge_base.embeddings import HashingEmbedder, get_embedder
from app.services.knowledge_base.extraction import ExtractionError, UnsupportedFileError, clean_text, extract_text


def make_pdf(text: str) -> bytes:
    """Build a minimal one-page PDF containing `text` (no PDF library needed)."""
    stream = f"BT /F1 12 Tf 72 720 Td ({text}) Tj ET".encode()
    objects = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R "
        b"/Resources << /Font << /F1 5 0 R >> >> >>",
        b"<< /Length " + str(len(stream)).encode() + b" >>\nstream\n" + stream + b"\nendstream",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    ]
    out = bytearray(b"%PDF-1.4\n")
    offsets = []
    for i, obj in enumerate(objects, start=1):
        offsets.append(len(out))
        out += f"{i} 0 obj\n".encode() + obj + b"\nendobj\n"
    xref = len(out)
    out += f"xref\n0 {len(objects) + 1}\n0000000000 65535 f \n".encode()
    for off in offsets:
        out += f"{off:010d} 00000 n \n".encode()
    out += f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF".encode()
    return bytes(out)


# --- Extraction ---------------------------------------------------------------------------


def test_extract_txt_and_md():
    assert extract_text("notes.txt", "Hello   clinic\r\n\r\n\r\nSecond paragraph here.".encode()) == (
        "Hello clinic\n\nSecond paragraph here."
    )
    assert "Heading" in extract_text("faq.md", b"# Heading\n\nSome markdown content for the clinic.")


def test_extract_pdf():
    text = extract_text("guide.pdf", make_pdf("Cedarline offers Saturday dental appointments"))
    assert "Saturday dental appointments" in text


@pytest.mark.parametrize(
    ("name", "data", "error"),
    [
        ("virus.exe", b"MZ....", UnsupportedFileError),
        ("fake.pdf", b"not really a pdf at all", UnsupportedFileError),
        ("binary.txt", b"\x00\x01\x02" * 50, UnsupportedFileError),
        ("empty.txt", b"   ", ExtractionError),
    ],
)
def test_extract_rejects_bad_files(name, data, error):
    with pytest.raises(error):
        extract_text(name, data)


def test_clean_text_rejoins_hyphenation_and_strips_controls():
    assert clean_text("treat-\nment\x07 plan") == "treatment plan"


# --- Chunking -------------------------------------------------------------------------------


def test_short_text_is_one_chunk():
    assert chunk_text("One short paragraph.", 800, 150) == ["One short paragraph."]


def test_chunks_respect_size_and_overlap():
    paragraphs = [f"Paragraph {i}. " + "This sentence adds detail about clinic services. " * 4 for i in range(12)]
    chunks = chunk_text("\n\n".join(paragraphs), chunk_size=500, overlap=120)
    assert len(chunks) > 3
    assert all(len(c) <= 500 for c in chunks)
    # Each chunk after the first begins with text carried over from the previous chunk.
    for previous, current in zip(chunks, chunks[1:]):
        carried = current.split("\n\n")[0]
        assert carried in previous


def test_headings_stay_with_their_paragraph():
    text = "# Title\n\n## Parking\n\nBasement parking is available.\n\n## Payment\n\nWe accept UPI."
    chunks = chunk_text(text, chunk_size=60, overlap=0)
    assert any("## Parking\nBasement parking is available." in c for c in chunks)
    assert not any(c.strip() in ("## Parking", "## Payment") for c in chunks)


def test_long_list_is_split_on_line_boundaries():
    listing = "\n".join(f"- Dr. Person {i} — consults Monday to Friday, 9:00 AM to 1:00 PM." for i in range(30))
    chunks = chunk_text(listing, chunk_size=300, overlap=0)
    for chunk in chunks:
        for line in chunk.splitlines():
            assert line.startswith("- Dr. Person")  # no line was cut in half


def test_invalid_chunk_parameters():
    with pytest.raises(ValueError):
        chunk_text("text", chunk_size=100, overlap=100)


# --- Embeddings -----------------------------------------------------------------------------


def test_hashing_embedder_dimensions_and_similarity():
    e = HashingEmbedder(768)
    a, b, c = e.embed_documents(["clinic opening hours", "What are your timings?", "teeth whitening price"])
    assert len(a) == 768
    assert abs(sum(x * x for x in a) - 1.0) < 1e-6  # unit length

    def cos(x, y):
        return sum(i * j for i, j in zip(x, y))

    assert cos(a, b) > cos(a, c)  # "timings" is mapped to the same concept as "opening hours"


# --- Ingestion + pgvector retrieval -------------------------------------------------------------


def test_upload_document_indexes_chunks_and_is_retrievable(client, db, admin_headers):
    content = (
        "# Monsoon camp\n\nCedarline runs a free monsoon skin-care awareness camp every July on the first "
        "Saturday of the month at the clinic.\n\n" + "Additional details about registration. " * 40
    )
    resp = client.post(
        "/api/v1/admin/knowledge/documents",
        headers=admin_headers,
        files={"file": ("monsoon-camp.md", content.encode(), "text/markdown")},
        data={"title": "Monsoon skin-care camp"},
    )
    assert resp.status_code == 201, resp.text
    doc = resp.json()
    assert doc["status"] == "ready" and doc["chunk_count"] >= 2 and doc["source_type"] == "upload"

    # Vectors are real pgvector values with the configured dimension.
    dims = db.scalar(
        select(func.vector_dims(KnowledgeChunk.embedding)).where(KnowledgeChunk.document_id == doc["id"]).limit(1)
    )
    assert dims == 768

    embedder = get_embedder()
    results = retrieve(db, embedder.embed_query("When is the monsoon skin care camp?"),
                       model_id=embedder.model_id, top_k=3, threshold=0.1)
    assert results and results[0].document_id == doc["id"]
    assert results == sorted(results, key=lambda r: -r.similarity)


def test_retrieval_ignores_vectors_from_other_models(db, knowledge):
    embedder = get_embedder()
    vector = embedder.embed_query("opening hours")
    assert retrieve(db, vector, model_id=embedder.model_id, top_k=3, threshold=0.0)
    assert retrieve(db, vector, model_id="some-other-model", top_k=3, threshold=0.0) == []


def test_upload_validation(client, admin_headers, monkeypatch):
    from app.core.config import get_settings

    exe = client.post("/api/v1/admin/knowledge/documents", headers=admin_headers,
                      files={"file": ("tool.exe", b"MZ" * 100, "application/octet-stream")})
    assert exe.status_code == 415

    monkeypatch.setattr(get_settings(), "upload_max_bytes", 1024)
    big = client.post("/api/v1/admin/knowledge/documents", headers=admin_headers,
                      files={"file": ("big.txt", b"a " * 2000, "text/plain")})
    assert big.status_code == 413


def test_delete_document_cascades_to_chunks(client, db, admin_headers):
    resp = client.post("/api/v1/admin/knowledge/documents", headers=admin_headers,
                       files={"file": ("note.txt", b"The clinic library has leaflets on dental hygiene.", "text/plain")})
    doc_id = resp.json()["id"]
    assert db.scalar(select(func.count()).where(KnowledgeChunk.document_id == doc_id)) == 1
    assert client.delete(f"/api/v1/admin/knowledge/documents/{doc_id}", headers=admin_headers).status_code == 200
    assert db.scalar(select(func.count()).where(KnowledgeChunk.document_id == doc_id)) == 0
    assert client.delete(f"/api/v1/admin/knowledge/documents/{doc_id}", headers=admin_headers).status_code == 404


def test_system_documents_generated_from_database(db, knowledge):
    keys = set(db.scalars(select(KnowledgeDocument.source_key)))
    assert {"clinic-opening-hours", "clinic-location-contact", "doctors-directory", "services-dental",
            "doctor-meera-iyer", "seed-faq-general"} <= keys
    hours = db.scalar(select(KnowledgeDocument).where(KnowledgeDocument.source_key == "clinic-opening-hours"))
    assert "Sunday: closed" in hours.content_text


def test_reindex_endpoint(client, admin_headers, knowledge):
    resp = client.post("/api/v1/admin/knowledge/reindex", headers=admin_headers)
    assert resp.status_code == 200
    body = resp.json()
    assert body["documents"] >= 25 and body["chunks"] >= body["documents"]
    assert body["embedding_model"] == "hashing-v2-768"
