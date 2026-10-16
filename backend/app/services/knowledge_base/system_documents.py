"""Knowledge documents generated from the structured clinic data.

The chatbot must never contradict the website, so doctor profiles, services,
opening hours, location and published articles are turned into knowledge
documents straight from the database tables the website itself renders.
They are regenerated whenever an admin re-indexes or edits doctors/services.
"""

import logging
from dataclasses import dataclass
from pathlib import Path

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.models import BlogPost, ClinicInfo, Doctor, KnowledgeDocument, Service
from app.services.knowledge_base.embeddings import Embedder
from app.services.knowledge_base.extraction import clean_text
from app.services.knowledge_base.ingestion import ingest_document, reindex_document

logger = logging.getLogger(__name__)

SEED_KNOWLEDGE_DIR = Path(__file__).resolve().parents[2] / "seed" / "knowledge"

WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
DEPARTMENT_LABELS = {
    "general": "General Medicine",
    "dental": "Dental Care",
    "skin": "Skin & Dermatology",
    "hair": "Hair & Trichology",
    "pediatrics": "Paediatrics",
}
DEPARTMENT_PAGES = {"dental": "/services/dental", "skin": "/services/skin", "hair": "/services/hair"}


@dataclass
class GeneratedDoc:
    key: str
    title: str
    text: str
    source_type: str = "system"


def _fmt_time(t) -> str:
    return t.strftime("%I:%M %p").lstrip("0")


def _days(days: list[int]) -> str:
    return ", ".join(WEEKDAYS[d] for d in sorted(days))


def build_system_documents(db: Session) -> list[GeneratedDoc]:
    docs: list[GeneratedDoc] = []
    clinic = db.scalar(select(ClinicInfo).limit(1))

    if clinic:
        address = f"{clinic.address_line}, {clinic.city}, {clinic.state} {clinic.postal_code}, {clinic.country}"
        hours_lines = [
            f"- {h['day']}: closed" if h.get("closed") else f"- {h['day']}: {h['open']} to {h['close']}"
            for h in clinic.opening_hours
        ]
        hours = "\n".join(hours_lines)
        docs.append(GeneratedDoc(
            "clinic-overview",
            f"About {clinic.name}",
            f"{clinic.name} — {clinic.tagline}\n\n{clinic.about}\n\n"
            f"Departments: {', '.join(DEPARTMENT_LABELS.values())}.",
        ))
        docs.append(GeneratedDoc(
            "clinic-opening-hours",
            "Clinic opening hours and timings",
            # Question-style lead-ins help retrieval: user questions embed close to them.
            f"What are the clinic's opening hours and timings? {clinic.name} is open:\n{hours}\n\n"
            "Individual doctors consult on specific days within these hours; see each doctor's "
            "profile or the How to book page (/appointments) for their consultation days.",
        ))
        docs.append(GeneratedDoc(
            "clinic-location-contact",
            "Clinic location, address and contact details",
            f"Where is the clinic located? {clinic.name} is located at {address}.\n\n"
            f"Phone: {clinic.phone}\n"
            + (f"WhatsApp: {clinic.whatsapp}\n" if clinic.whatsapp else "")
            + f"Email: {clinic.email}\n\n"
            "Directions and a map are available on the Contact Us page (/contact).\n\n"
            f"Emergencies: {clinic.emergency_note}",
        ))

    doctors = list(db.scalars(select(Doctor).where(Doctor.is_active).order_by(Doctor.department, Doctor.full_name)))
    if doctors:
        listing = "\n".join(
            f"- {d.full_name} — {d.specialization} ({DEPARTMENT_LABELS[d.department]}); "
            f"consults {_days(d.consultation_days)}, {_fmt_time(d.start_time)} to {_fmt_time(d.end_time)}."
            for d in doctors
        )
        docs.append(GeneratedDoc(
            "doctors-directory",
            "Our doctors and their consultation days",
            f"Which doctors are available at the clinic? Cedarline has {len(doctors)} doctors:\n{listing}\n\n"
            "Full profiles are on the Our Doctors page (/doctors). To book, call the front desk or see the How to book page (/appointments).",
        ))
        for d in doctors:
            docs.append(GeneratedDoc(
                f"doctor-{d.slug}",
                f"Doctor profile: {d.full_name}",
                f"{d.full_name} is a {d.specialization} in the {DEPARTMENT_LABELS[d.department]} department.\n\n"
                f"Qualifications: {d.qualifications}. Experience: {d.experience_years} years.\n"
                f"Languages spoken: {', '.join(d.languages)}.\n"
                f"Consultation days: {_days(d.consultation_days)}. Consultation hours: "
                f"{_fmt_time(d.start_time)} to {_fmt_time(d.end_time)} (a typical consultation lasts about {d.slot_minutes} minutes).\n\n"
                f"{d.bio}",
            ))

    services = list(db.scalars(select(Service).where(Service.is_active).order_by(Service.department, Service.sort_order)))
    by_dept: dict[str, list[Service]] = {}
    for s in services:
        by_dept.setdefault(s.department, []).append(s)
    if services:
        overview = "\n".join(
            f"- {DEPARTMENT_LABELS[dept]}: {', '.join(s.name for s in items)}" for dept, items in by_dept.items()
        )
        docs.append(GeneratedDoc(
            "services-overview",
            "All services offered by the clinic",
            f"What services does the clinic provide? Services offered, by department:\n{overview}\n\n"
            "See the All Services page (/services) for details.",
        ))
    for dept, items in by_dept.items():
        lines = []
        for s in items:
            # Every fact names its service, so a chunk boundary can never detach a price from it.
            price = (
                f" Indicative starting price for {s.name}: INR {s.price_from:,.0f} (final cost is confirmed after consultation)."
                if s.price_from
                else f" The price of {s.name} varies and is confirmed at the clinic."
            )
            lines.append(
                f"## {s.name}\n{s.description} Typical appointment duration for {s.name}: "
                f"{s.duration_minutes} minutes.{price}"
            )
        page = DEPARTMENT_PAGES.get(dept)
        docs.append(GeneratedDoc(
            f"services-{dept}",
            f"{DEPARTMENT_LABELS[dept]} services and treatments",
            f"Which {DEPARTMENT_LABELS[dept]} treatments are offered at the clinic? "
            f"{', '.join(s.name for s in items)}.\n\n" + "\n\n".join(lines)
            + (f"\n\nMore information: {page}" if page else ""),
        ))

    for post in db.scalars(select(BlogPost).where(BlogPost.is_published)):
        docs.append(GeneratedDoc(
            f"blog-{post.slug}",
            f"Patient education: {post.title}",
            f"{post.title}\n\n{post.excerpt}\n\n{post.content}\n\nRead the full article at /blog/{post.slug}.",
        ))
    return docs


def seed_knowledge_files() -> list[GeneratedDoc]:
    """Approved FAQ / policy documents bundled with the app (app/seed/knowledge/*.md)."""
    docs = []
    for path in sorted(SEED_KNOWLEDGE_DIR.glob("*.md")):
        text = path.read_text(encoding="utf-8")
        first_line = text.splitlines()[0] if text else path.stem
        title = first_line.lstrip("# ").strip() or path.stem
        docs.append(GeneratedDoc(f"seed-{path.stem}", title, text, source_type="seed"))
    return docs


def sync_generated_documents(
    db: Session, embedder: Embedder, *, include_seed: bool = True, indexed_ids: set[int] | None = None
) -> int:
    """Create/refresh generated documents; only re-embed ones whose text or model changed.

    Returns the number of documents (re)indexed; their ids are added to `indexed_ids` if given.
    """
    generated = build_system_documents(db) + (seed_knowledge_files() if include_seed else [])
    keys = {g.key for g in generated}
    changed = 0
    for g in generated:
        existing = db.scalar(select(KnowledgeDocument).where(KnowledgeDocument.source_key == g.key))
        up_to_date = (
            existing is not None
            and existing.status == "ready"
            and existing.content_text == clean_text(g.text)
            and existing.title == g.title
            and all(c.embedding_model == embedder.model_id for c in existing.chunks)
        )
        if up_to_date:
            continue
        document = ingest_document(db, embedder, title=g.title, text=g.text, source_type=g.source_type, source_key=g.key)
        if indexed_ids is not None:
            indexed_ids.add(document.id)
        changed += 1

    # Remove system documents whose source rows were deleted or deactivated.
    stale = db.execute(
        delete(KnowledgeDocument)
        .where(KnowledgeDocument.source_type == "system", KnowledgeDocument.source_key.not_in(keys))
        .returning(KnowledgeDocument.id)
    ).all()
    db.commit()
    if stale:
        logger.info("Removed %d stale system documents", len(stale))
    return changed


def reindex_all(db: Session, embedder: Embedder) -> tuple[int, int]:
    """Regenerate system documents and re-embed every document with the current model."""
    just_indexed: set[int] = set()
    sync_generated_documents(db, embedder, indexed_ids=just_indexed)
    documents = list(db.scalars(select(KnowledgeDocument)))
    for document in documents:
        if document.id not in just_indexed:  # don't spend API quota embedding the same text twice
            reindex_document(db, embedder, document)
    return len(documents), sum(d.chunk_count for d in documents)
