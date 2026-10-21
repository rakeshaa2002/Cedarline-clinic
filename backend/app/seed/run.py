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
import random
import secrets
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.logging import configure_logging
from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models import Appointment, BlogPost, ClinicInfo, Doctor, Service, User
from app.seed import data
from app.services.appointments import clinic_now, new_reference, slot_grid
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
    db.flush()
    # The demo doctor login is Dr. Ananya Rao: her portal shows only her own patients.
    doctor_user = db.scalar(select(User).where(func.lower(User.email) == settings.doctor_email.lower()))
    if doctor_user and doctor_user.doctor_id is None:
        doctor_user.doctor_id = db.scalar(select(Doctor.id).where(Doctor.slug == "ananya-rao"))


SAMPLE_PATIENTS = [
    ("Priya Sharma", "+91 98451 23456", "Annual preventive health check-up; feeling tired lately"),
    ("Rahul Varma", "+91 97412 88990", "Braces / clear aligner evaluation for crowded front teeth"),
    ("Sneha Kulkarni", "+91 99001 44556", "Acne flare-up on cheeks for three weeks"),
    ("Amit Patel", "+91 98860 11223", "Hair thinning at the crown and dry scalp"),
    ("Divya Nambiar", "+91 94481 77889", "Booster vaccination and growth check for my son"),
    ("Karthik Iyer", "+91 99863 45120", "Routine dental cleaning and check-up"),
    ("Meghana Rao", "+91 98805 66771", "Blood pressure review and medication follow-up"),
    ("Farhan Sheikh", "+91 97390 21456", "Pigmentation on forehead, would like a consultation"),
    ("Lakshmi Menon", "+91 98444 90876", "Hair transplant consultation"),
    ("Arjun Desai", "+91 99161 33452", "Tooth sensitivity when drinking cold water"),
]
CANCEL_REASONS = ["Doctor on emergency duty", "Requested by patient", "Slot overbooked"]


def seed_sample_appointments(db: Session) -> None:
    """Fictional bookings so the triage queue and analytics have something to show (only into an empty table)."""
    if db.scalar(select(func.count(Appointment.id))):
        return
    rng = random.Random(42)
    doctors = list(db.scalars(select(Doctor).where(Doctor.is_active).order_by(Doctor.id)))
    today = clinic_now().date()
    stamp = datetime.now(ZoneInfo("UTC"))
    used: set[tuple[int, object, object]] = set()

    def add(day, status: str) -> None:
        options = [d for d in doctors if slot_grid(d, day)]
        if not options:
            return
        doctor = rng.choice(options)
        start, end = rng.choice(slot_grid(doctor, day))
        if (doctor.id, day, start) in used:
            return
        used.add((doctor.id, day, start))
        name, phone, reason = rng.choice(SAMPLE_PATIENTS)
        db.add(Appointment(
            reference=new_reference(), doctor_id=doctor.id, department=doctor.department,
            consultation_fee=doctor.consultation_fee, patient_name=name, patient_phone=phone,
            patient_email=name.lower().replace(" ", ".") + "@patients.example",  # never emailed
            reason=reason, appointment_date=day, start_time=start, end_time=end, status=status,
            source=rng.choice(["website", "website", "chatbot"]),
            confirmed_at=stamp if status in ("confirmed", "completed") else None,
            completed_at=stamp if status == "completed" else None,
            cancelled_at=stamp if status == "cancelled" else None,
            cancellation_reason=rng.choice(CANCEL_REASONS) if status == "cancelled" else None,
        ))

    for offset in range(-150, 0, 2):  # history: mostly completed visits
        add(today + timedelta(days=offset), rng.choices(["completed", "cancelled"], [0.85, 0.15])[0])
    for offset in range(1, 15):  # the coming fortnight: some confirmed, some awaiting triage
        for _ in range(2):
            add(today + timedelta(days=offset), rng.choice(["pending", "confirmed"]))


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
        seed_sample_appointments(db)
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
