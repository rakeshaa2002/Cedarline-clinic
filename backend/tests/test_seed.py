"""Seeding over a database from the earlier (Cedarline) build: logins and demo enquiries move to RUA."""

from sqlalchemy import select

from app.core.config import get_settings
from app.models import ContactMessage, User
from app.seed.run import SAMPLE_MESSAGES, seed_sample_messages, seed_users
from tests.conftest import _make_user


def test_legacy_demo_logins_are_renamed_not_duplicated(db, seeded):
    legacy = _make_user(db, "doctor@cedarline.example", "doctor")
    seed_users(db)
    db.commit()
    db.refresh(legacy)
    assert legacy.email == get_settings().doctor_email
    assert legacy.full_name == "Dr. Jatin K Reddy" and legacy.doctor_id is not None
    assert db.scalar(select(User).where(User.email == "doctor@cedarline.example")) is None


def test_old_clinic_demo_enquiries_are_replaced_and_real_ones_kept(db, seeded):
    db.add_all([
        ContactMessage(name="Rahul Varma", email="rahul.varma@example.com", subject="Appointment Request: Dr. Arjun Nair (Dental / Braces)",
                       message="Need braces."),
        ContactMessage(name="Real Patient", email="real.patient@gmail.com", subject="Question for Dr. Arjun",
                       message="A real enquiry from someone else's website form."),
    ])
    db.commit()

    seed_sample_messages(db)
    db.commit()
    subjects = set(db.scalars(select(ContactMessage.subject)))
    assert "Appointment Request: Dr. Arjun Nair (Dental / Braces)" not in subjects
    assert "Question for Dr. Arjun" in subjects  # not an example.com demo row: never touched
    assert {m["subject"] for m in SAMPLE_MESSAGES} <= subjects

    seed_sample_messages(db)  # idempotent
    db.commit()
    assert len(list(db.scalars(select(ContactMessage)))) == len(SAMPLE_MESSAGES) + 1
