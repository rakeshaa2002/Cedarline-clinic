"""The patient CRM: one record per mobile number, created or updated whenever someone books."""

import re

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.exceptions import ValidationFailedError
from app.models import Patient


def normalize_phone(raw: str) -> str:
    """Return an E.164 number ("+919876543210"). Indian numbers may be typed with or without +91/0."""
    raw = (raw or "").strip()
    digits = re.sub(r"\D", "", raw)
    if raw.startswith("+") and not digits.startswith("91"):
        if 8 <= len(digits) <= 15:
            return f"+{digits}"
        raise ValidationFailedError("Please enter a valid phone number.")
    if len(digits) == 12 and digits.startswith("91"):
        digits = digits[2:]
    elif len(digits) == 11 and digits.startswith("0"):
        digits = digits[1:]
    if len(digits) != 10 or digits[0] not in "6789":
        raise ValidationFailedError("Please enter a valid 10-digit Indian mobile number.")
    return f"+91{digits}"


def display_phone(e164: str) -> str:
    """"+919876543210" -> "+91 98765 43210"."""
    if e164.startswith("+91") and len(e164) == 13:
        return f"+91 {e164[3:8]} {e164[8:]}"
    return e164


def find_patient(db: Session, phone: str) -> Patient | None:
    return db.scalar(select(Patient).where(Patient.phone == phone))


def upsert_patient(db: Session, *, phone: str, full_name: str | None = None, email: str | None = None, source: str = "website") -> Patient:
    """Find the patient by phone (creating them if new) and fill in name/email from the latest booking."""
    phone = normalize_phone(phone)
    patient = find_patient(db, phone)
    if patient is None:
        patient = Patient(phone=phone, full_name=(full_name or "").strip(), email=email or None, source=source, tags=[])
        db.add(patient)
        db.flush()
        return patient
    if full_name and full_name.strip():
        patient.full_name = full_name.strip()
    if email:
        patient.email = email
    return patient
