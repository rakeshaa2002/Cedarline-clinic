"""Seed the database with fictional demo data and build the chatbot knowledge base.

Usage (from backend/):
    python -m app.seed.run                     # idempotent: safe to run repeatedly
    python -m app.seed.run --skip-knowledge     # don't call the embedding provider
    python -m app.seed.run --reindex            # re-chunk + re-embed all documents (after changing model)

Admin/staff accounts are created from ADMIN_EMAIL/ADMIN_PASSWORD and
STAFF_EMAIL/STAFF_PASSWORD. If a password is not set (development only), a random
one is generated and printed once.
"""

import argparse
import logging
import secrets
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.logging import configure_logging
from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models import BlogPost, ClinicInfo, Doctor, Service, User
from app.seed import data
from app.services.knowledge_base.embeddings import get_embedder
from app.services.knowledge_base.system_documents import reindex_all, sync_generated_documents

log = logging.getLogger("seed")


def upsert(db: Session, model, key: str, values: dict):
    obj = db.scalar(select(model).where(getattr(model, key) == values[key]))
    if obj is None:
        obj = model(**values)
        db.add(obj)
    else:
        for field, value in values.items():
            setattr(obj, field, value)
    return obj


def seed_clinic(db: Session) -> None:
    info = db.scalar(select(ClinicInfo).limit(1))
    if info is None:
        db.add(ClinicInfo(**data.CLINIC))
    else:
        for field, value in data.CLINIC.items():
            setattr(info, field, value)


def seed_catalogue(db: Session) -> None:
    for doctor in data.DOCTORS:
        upsert(db, Doctor, "slug", {**doctor, "is_active": True})
    for order, (dept, slug, name, icon, minutes, price, short, desc) in enumerate(data.SERVICES):
        upsert(db, Service, "slug", {
            "slug": slug, "name": name, "department": dept, "icon": icon, "duration_minutes": minutes,
            "price_from": price, "short_description": short, "description": desc, "sort_order": order,
            "is_active": True,
        })
    db.flush()

    doctors = {d.slug: d for d in db.scalars(select(Doctor))}
    today = datetime.now(ZoneInfo(get_settings().clinic_timezone)).date()
    for post in data.BLOG_POSTS:
        values = {k: v for k, v in post.items() if k not in ("author", "days_ago")}
        values["content"] = post["content"] + data.BLOG_DISCLAIMER
        values["author_id"] = doctors[post["author"]].id
        values["published_at"] = today - timedelta(days=post["days_ago"])
        values["is_published"] = True
        upsert(db, BlogPost, "slug", values)


from app.models import BlogPost, ClinicInfo, ContactMessage, Doctor, Service, User


def seed_users(db: Session) -> None:
    settings = get_settings()
    accounts = [
        (settings.admin_email, settings.admin_password, "Clinic Administrator", "admin"),
        (settings.staff_email, settings.staff_password, "Front Desk", "staff"),
        (settings.doctor_email, settings.doctor_password, "Dr. Ananya Rao", "doctor"),
    ]
    for email, password, name, role in accounts:
        existing = db.scalar(select(User).where(func.lower(User.email) == email.lower()))
        if existing and not password:
            continue  # keep the existing password
        if not password:
            if settings.environment == "production":
                log.warning("No password set for %s; account not created. Set %s_PASSWORD to create it.", email, role.upper())
                continue
            password = secrets.token_urlsafe(12)
            print(f"\n  Generated {role} login -> {email} / {password}  (set {role.upper()}_PASSWORD to choose one)\n")
        if existing:
            existing.hashed_password = hash_password(password)
            existing.role, existing.is_active = role, True
        else:
            db.add(User(email=email, full_name=name, role=role, hashed_password=hash_password(password)))


def seed_sample_messages(db: Session) -> None:
    count = db.scalar(select(func.count(ContactMessage.id))) or 0
    if count >= 3:
        return
    sample_patients = [
        {
            "name": "Priya Sharma",
            "email": "priya.sharma@example.com",
            "phone": "+91 98451 23456",
            "subject": "Appointment Request: Dr. Ananya Rao (General Medicine)",
            "message": "Looking for an annual preventive health checkup and fatigue consultation with Dr. Ananya Rao this Friday around 10:30 AM.",
            "is_read": False,
        },
        {
            "name": "Rahul Varma",
            "email": "rahul.varma@example.com",
            "phone": "+91 97412 88990",
            "subject": "Appointment Request: Dr. Arjun Nair (Dental / Braces)",
            "message": "Need consultation for orthodontic braces and clear aligner evaluation for mild front tooth crowding. Available on Saturday afternoon.",
            "is_read": False,
        },
        {
            "name": "Sneha Kulkarni",
            "email": "sneha.k@example.com",
            "phone": "+91 99001 44556",
            "subject": "Appointment Request: Dr. Naomi Fernandes (Dermatology)",
            "message": "Severe cystic acne flare-up on cheeks for 3 weeks. Requesting clinical skin examination with Dr. Naomi Fernandes on Tuesday evening.",
            "is_read": False,
        },
        {
            "name": "Amit Patel",
            "email": "amit.patel@example.com",
            "phone": "+91 98860 11223",
            "subject": "Appointment Request: Dr. Sara Thomas (Hair & Scalp)",
            "message": "Experiencing rapid crown hair thinning and dry scalp. Would like a digital trichoscopy consultation with Dr. Sara Thomas on Monday.",
            "is_read": False,
        },
        {
            "name": "Divya Nambiar",
            "email": "divya.n@example.com",
            "phone": "+91 94481 77889",
            "subject": "Appointment Request: Dr. Leela Krishnan (Paediatrics)",
            "message": "6-month booster vaccination and developmental milestone checkup for baby boy. Preferred time: Wednesday morning.",
            "is_read": False,
        },
    ]
    for p in sample_patients:
        db.add(ContactMessage(**p))


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--skip-knowledge", action="store_true")
    parser.add_argument("--reindex", action="store_true", help="re-chunk and re-embed every document")
    args = parser.parse_args()

    settings = get_settings()
    configure_logging(settings.log_level)
    with SessionLocal() as db:
        seed_clinic(db)
        seed_catalogue(db)
        seed_users(db)
        seed_sample_messages(db)
        db.commit()
        log.info("Clinic info, %d doctors, %d services, %d articles, users ready",
                 len(data.DOCTORS), len(data.SERVICES), len(data.BLOG_POSTS))

        if not args.skip_knowledge:
            try:
                embedder = get_embedder()
                if args.reindex:
                    documents, chunks = reindex_all(db, embedder)
                    log.info("Re-indexed %d documents into %d chunks with %s", documents, chunks, embedder.model_id)
                else:
                    changed = sync_generated_documents(db, embedder)
                    log.info("Knowledge base synced with %s (%d documents (re)indexed)", embedder.model_id, changed)
            except Exception as exc:  # noqa: BLE001 - never block API start-up on the AI provider
                db.rollback()
                log.error("Knowledge base not indexed (%s). Fix the AI configuration, then use "
                          "Admin > Chatbot knowledge > Re-index.", exc)


if __name__ == "__main__":
    main()
