"""Seed RUA Skin & Hair Center's catalogue (plus fictional demo bookings) and build the chatbot knowledge base.

Usage (from backend/):
    python -m app.seed.run                     # idempotent: safe to run repeatedly
    python -m app.seed.run --skip-knowledge     # don't call the embedding provider
    python -m app.seed.run --reindex            # re-chunk + re-embed all documents (after changing model)
    python -m app.seed.run --reset-demo         # delete all bookings, patients and messages, then add fresh demo data

Admin/staff accounts are created from ADMIN_EMAIL/ADMIN_PASSWORD and
STAFF_EMAIL/STAFF_PASSWORD. If a password is not set (development only), a random
one is generated and printed once.
"""

import argparse
import logging
import random
import re
import secrets
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from sqlalchemy import delete, func, select, update
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.logging import configure_logging
from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models import (
    Appointment,
    BlogPost,
    Branch,
    ClinicInfo,
    ContactMessage,
    Doctor,
    Patient,
    PatientOtp,
    Service,
    User,
    WhatsAppMessage,
)
from app.seed import data
from app.services.appointments import clinic_now, new_reference, slot_grid
from app.services.patients import upsert_patient
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


def seed_branches(db: Session) -> None:
    for branch in data.BRANCHES:
        upsert(db, Branch, "slug", branch)


def seed_catalogue(db: Session) -> None:
    seed_branches(db)
    for doctor in data.DOCTORS:
        upsert(db, Doctor, "slug", {**doctor, "is_active": True})
    # Retire anything from an earlier catalogue (kept, not deleted, so old bookings keep their history).
    db.execute(update(Doctor).where(Doctor.slug.not_in([d["slug"] for d in data.DOCTORS])).values(is_active=False))
    db.execute(update(Service).where(Service.slug.not_in([s[1] for s in data.SERVICES])).values(is_active=False))
    db.execute(update(BlogPost).where(BlogPost.slug.not_in([p["slug"] for p in data.BLOG_POSTS] or [""])).values(is_published=False))
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



DEMO_DOCTOR_SLUG = "dr-jatin-k-reddy"
# Demo logins from the earlier Cedarline build. When the configured email has no account yet, the
# matching legacy account is renamed (keeping its history) instead of a second account being created.
LEGACY_LOGINS = {
    "admin": "admin@cedarline.example",
    "staff": "staff@cedarline.example",
    "doctor": "doctor@cedarline.example",
}


def _user_by_email(db: Session, email: str) -> User | None:
    return db.scalar(select(User).where(func.lower(User.email) == email.lower()))


def seed_users(db: Session) -> None:
    settings = get_settings()
    accounts = [
        (settings.admin_email, settings.admin_password, "Clinic Administrator", "admin"),
        (settings.staff_email, settings.staff_password, "Front Desk", "staff"),
        (settings.doctor_email, settings.doctor_password, "Dr. Jatin K Reddy", "doctor"),
    ]
    for email, password, name, role in accounts:
        existing = _user_by_email(db, email)
        if existing is None and (legacy := _user_by_email(db, LEGACY_LOGINS[role])) is not None:
            log.info("Renaming legacy %s login %s -> %s", role, legacy.email, email)
            legacy.email = email
            existing = legacy
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
    # The demo doctor login is Dr. Jatin K Reddy: the doctor portal shows only his own patients.
    doctor_user = _user_by_email(db, settings.doctor_email)
    if doctor_user:
        doctor_user.doctor_id = db.scalar(select(Doctor.id).where(Doctor.slug == DEMO_DOCTOR_SLUG))
        doctor_user.full_name = "Dr. Jatin K Reddy"


# Fictional patients (phones in the reserved 90000 xxxxx range) with typical RUA concerns.
SAMPLE_PATIENTS = [
    ("Priya Sharma", "+91 90000 10001", "medical-dermatology", "Acne flare-up on cheeks for three weeks"),
    ("Rahul Varma", "+91 90000 10002", "hair-transplant", "Receding hairline — hair transplant consultation"),
    ("Sneha Kulkarni", "+91 90000 10003", "aesthetic-dermatology", "HydraFacial before my sister's wedding"),
    ("Amit Patel", "+91 90000 10004", "hair-treatments", "Hair thinning at the crown, interested in PRP or GFC"),
    ("Divya Nambiar", "+91 90000 10005", "laser-treatments", "Laser hair reduction for upper lip and chin"),
    ("Karthik Iyer", "+91 90000 10006", "dermatosurgery", "Skin tags on the neck, want them removed"),
    ("Meghana Rao", "+91 90000 10007", "medical-dermatology", "Melasma on cheeks getting darker"),
    ("Farhan Sheikh", "+91 90000 10008", "laser-treatments", "Acne scars — asking about CO2 laser"),
    ("Lakshmi Menon", "+91 90000 10009", "medical-dermatology", "Eczema on my son's arms"),
    ("Arjun Desai", "+91 90000 10010", "hair-transplant", "Beard transplant for patchy beard"),
    ("Ananya Gowda", "+91 90000 10011", "aesthetic-dermatology", "Skin boosters for dull skin"),
    ("Vikram Shetty", "+91 90000 10012", "dermatosurgery", "Wart on the sole of my foot"),
]
CANCEL_REASONS = ["Doctor on emergency duty", "Requested by patient", "Slot overbooked"]


def seed_sample_appointments(db: Session) -> None:
    """Fictional bookings so the triage queue and analytics have something to show (only into an empty table)."""
    if db.scalar(select(func.count(Appointment.id))):
        return
    rng = random.Random(42)
    doctors = list(db.scalars(select(Doctor).where(Doctor.is_active).order_by(Doctor.id)))
    branches = list(db.scalars(select(Branch).where(Branch.is_active).order_by(Branch.sort_order)))
    patients = {
        phone: upsert_patient(db, phone=phone, full_name=name, source=rng.choice(["website", "website", "chatbot"]))
        for name, phone, _, _ in SAMPLE_PATIENTS
    }
    today = clinic_now().date()
    stamp = datetime.now(ZoneInfo("UTC"))
    used: set[tuple[int, object, object]] = set()

    def add(day, status: str) -> None:
        name, phone, department, reason = rng.choice(SAMPLE_PATIENTS)
        options = [d for d in doctors if slot_grid(d, day) and department in (d.departments or [d.department])]
        if not options:
            return
        doctor = rng.choice(options)
        start, end = rng.choice(slot_grid(doctor, day))
        if (doctor.id, day, start) in used:
            return
        used.add((doctor.id, day, start))
        patient = patients[phone]
        db.add(Appointment(
            reference=new_reference(), doctor_id=doctor.id, department=department,
            branch_id=rng.choice(branches).id if branches else None, patient_id=patient.id,
            consultation_fee=doctor.consultation_fee, patient_name=name, patient_phone=patient.phone,
            patient_email=None,
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


# Fictional enquiries for the Messages inbox, each about an RUA doctor and speciality.
SAMPLE_MESSAGES = [
    {
        "name": "Priya Sharma",
        "email": "priya.sharma@example.com",
        "phone": "+91 90000 10001",
        "subject": "Appointment request: Dr. Jeevith C Reddy (Medical Dermatology)",
        "message": "I have had an acne flare-up on my cheeks for three weeks. Can I see Dr. Jeevith at Indiranagar "
                   "this weekend? Sunday afternoon works best.",
        "is_read": False,
    },
    {
        "name": "Rahul Varma",
        "email": "rahul.varma@example.com",
        "phone": "+91 90000 10002",
        "subject": "Appointment request: Dr. Jatin K Reddy (Hair Transplant)",
        "message": "My hairline is receding. I would like an FUE hair transplant consultation with Dr. Jatin and an idea "
                   "of the cost and EMI options. Happy to send photos on WhatsApp.",
        "is_read": False,
    },
    {
        "name": "Sneha Kulkarni",
        "email": "sneha.k@example.com",
        "phone": "+91 90000 10003",
        "subject": "Bridal package with Dr. Eshritha C (Premium Packages)",
        "message": "My wedding is in four months. I would like to plan a bridal glow programme with HydraFacial and "
                   "skin boosters with Dr. Eshritha.",
        "is_read": False,
    },
    {
        "name": "Amit Patel",
        "email": "amit.patel@example.com",
        "phone": "+91 90000 10004",
        "subject": "Hair fall — PRP or GFC with Dr. Jatin K Reddy (Hair Treatments)",
        "message": "Hair thinning at the crown for a year. Is PRP or GFC suitable, and how many sessions are usually "
                   "needed? Ramamurthy Nagar is closer for me.",
        "is_read": True,
    },
    {
        "name": "Divya Nambiar",
        "email": "divya.n@example.com",
        "phone": "+91 90000 10005",
        "subject": "Laser hair reduction with Dr. Eshritha C (Laser Treatments)",
        "message": "I would like laser hair reduction for the upper lip and chin. Which days is Dr. Eshritha at "
                   "Indiranagar, and how many sessions does it take?",
        "is_read": False,
    },
    {
        "name": "Karthik Iyer",
        "email": "karthik.iyer@example.com",
        "phone": "+91 90000 10006",
        "subject": "Skin tag removal with Dr. Jeevith C Reddy (Dermatosurgery)",
        "message": "A few skin tags on my neck. Can they be removed on the same day as the consultation?",
        "is_read": True,
    },
]


def retire_legacy_messages(db: Session) -> int:
    """Delete the earlier build's demo enquiries: example.com senders naming doctors who aren't at RUA.

    Real enquiries (any other sender) are never touched.
    """
    rua = {re.sub(r"^dr\.?\s+", "", d["full_name"], flags=re.I).split()[0].lower() for d in data.DOCTORS}
    removed = 0
    for m in db.scalars(select(ContactMessage).where(ContactMessage.email.ilike("%@example.com"))):
        named = {n.lower() for n in re.findall(r"\bDr\.?\s+([A-Z][a-z]+)", f"{m.subject} {m.message}")}
        if named and not named & rua:
            db.delete(m)
            removed += 1
    return removed


def seed_sample_messages(db: Session) -> None:
    if removed := retire_legacy_messages(db):
        db.flush()
        log.info("Removed %d demo enquiries that named doctors from the earlier clinic", removed)
    if (db.scalar(select(func.count(ContactMessage.id))) or 0) >= 3:
        return
    for p in SAMPLE_MESSAGES:
        db.add(ContactMessage(**p))


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--skip-knowledge", action="store_true")
    parser.add_argument("--reindex", action="store_true", help="re-chunk and re-embed every document")
    parser.add_argument("--reset-demo", action="store_true", help="delete all bookings, patients and messages first")
    args = parser.parse_args()

    settings = get_settings()
    configure_logging(settings.log_level)
    with SessionLocal() as db:
        if args.reset_demo:
            for model in (WhatsAppMessage, Appointment, PatientOtp, Patient, ContactMessage):
                db.execute(delete(model))
            db.commit()
            log.info("Demo bookings, patients and messages cleared")
        seed_clinic(db)
        seed_catalogue(db)
        seed_users(db)
        seed_sample_messages(db)
        seed_sample_appointments(db)
        db.commit()
        log.info("Clinic info, %d centres, %d doctors, %d services, users ready",
                 len(data.BRANCHES), len(data.DOCTORS), len(data.SERVICES))

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
