"""Booking engine, reception triage workflow, patient emails (.ics) and booking analytics."""

import re
from datetime import date, timedelta

import pytest

from app.core.config import get_settings
from app.services.appointments import clinic_now
from tests.conftest import _make_user

PATIENT = {
    "patient_name": "Asha Kumar",
    "patient_email": "asha.kumar@mailbox.org",
    "patient_phone": "+91 98450 12345",
    "reason": "Braces consultation for my teenage son",
}
MON, TUE, WED, SAT, SUN = 0, 1, 2, 5, 6


def next_weekday(weekday: int, min_days: int = 1) -> date:
    day = clinic_now().date() + timedelta(days=min_days)
    while day.weekday() != weekday:
        day += timedelta(days=1)
    return day


def book(client, **overrides):
    body = {
        "department": "dental",
        "doctor_slug": "arjun-nair",  # Orthodontist: Mon, Tue, Thu, Sat · 10:00–17:00 · 30-min slots
        "appointment_date": str(next_weekday(MON)),
        "start_time": "10:00",
        **PATIENT,
        **overrides,
    }
    return client.post("/api/v1/appointments", json=body)


def availability(client, **params):
    resp = client.get("/api/v1/appointments/availability", params=params)
    assert resp.status_code == 200, resp.text
    return resp.json()


def slot(doctor: dict, start: str) -> dict:
    return next(s for s in doctor["slots"] if s["start_time"] == start)


@pytest.fixture
def outbox(monkeypatch):
    """Turn SMTP 'on' and capture outgoing emails instead of sending them."""
    from app.services.email import sender

    settings = get_settings()
    monkeypatch.setattr(settings, "smtp_host", "smtp.test.local")
    monkeypatch.setattr(settings, "smtp_username", "bookings@cedarline-clinic.in")
    sent = []

    def fake_deliver(email):
        sent.append(email)
        return f"<{len(sent)}@cedarline-clinic.in>"

    monkeypatch.setattr(sender, "deliver", fake_deliver)
    return sent


# --- Availability --------------------------------------------------------------------------------


def test_availability_lists_the_doctors_slot_grid(client, seeded):
    body = availability(client, doctor="arjun-nair", date=str(next_weekday(MON)))
    [doctor] = body["doctors"]
    starts = [s["start_time"] for s in doctor["slots"]]
    assert starts[0] == "10:00:00" and starts[-1] == "16:30:00" and len(starts) == 14
    assert all(s["available"] for s in doctor["slots"])


def test_no_slots_on_days_the_doctor_does_not_consult(client, seeded):
    body = availability(client, doctor="arjun-nair", date=str(next_weekday(WED)))
    assert body["doctors"][0]["slots"] == []


def test_clinic_closed_day_has_no_slots(client, seeded):
    body = availability(client, department="general", date=str(next_weekday(SUN)))
    assert body["clinic_open"] is False and all(d["slots"] == [] for d in body["doctors"])


# --- Booking ----------------------------------------------------------------------------------------


def test_booking_holds_the_slot_and_logs_the_acknowledgement(client, seeded, admin_headers):
    resp = book(client)
    assert resp.status_code == 201, resp.text
    booking = resp.json()
    assert re.fullmatch(r"CED-[A-Z2-9]{6}", booking["reference"])
    assert booking["status"] == "pending" and booking["end_time"] == "10:30:00"
    assert booking["doctor"]["slug"] == "arjun-nair" and booking["consultation_fee"] == "800.00"

    doctor = availability(client, doctor="arjun-nair", date=booking["appointment_date"])["doctors"][0]
    assert slot(doctor, "10:00:00")["available"] is False and slot(doctor, "10:30:00")["available"] is True

    [item] = client.get("/api/v1/admin/appointments", headers=admin_headers).json()["items"]
    assert item["last_email"]["kind"] == "received"
    assert item["last_email"]["status"] == "skipped" and "SMTP is not configured" in item["last_email"]["error"]


def test_double_booking_is_rejected(client, seeded):
    assert book(client).status_code == 201
    resp = book(client, patient_name="Ravi Shankar", patient_email="ravi@mailbox.org")
    assert resp.status_code == 409 and "just been taken" in resp.json()["error"]["message"]


def test_any_available_doctor_is_assigned_in_turn(client, seeded):
    # Tuesday 10:00: both Dr. Arjun Nair and Dr. Meera Iyer consult.
    day = str(next_weekday(TUE))
    first = book(client, doctor_slug=None, appointment_date=day).json()
    second = book(client, doctor_slug="any", appointment_date=day, patient_email="b@mailbox.org").json()
    assert {first["doctor"]["slug"], second["doctor"]["slug"]} == {"arjun-nair", "meera-iyer"}
    third = book(client, doctor_slug=None, appointment_date=day, patient_email="c@mailbox.org")
    assert third.status_code == 409 and "No doctor is free" in third.json()["error"]["message"]


@pytest.mark.parametrize(
    ("overrides", "message"),
    [
        ({"appointment_date": str(clinic_now().date() - timedelta(days=1))}, "between today and"),
        ({"appointment_date": str(clinic_now().date() + timedelta(days=200))}, "between today and"),
        ({"appointment_date": str(next_weekday(WED))}, "doesn't consult on Wednesdays"),
        ({"appointment_date": str(next_weekday(SUN))}, "clinic is closed on Sundays"),
        ({"start_time": "10:15"}, "listed time slots"),
        ({"doctor_slug": "naomi-fernandes"}, "isn't available in Dental Care"),
    ],
)
def test_invalid_bookings_explain_why(client, seeded, overrides, message):
    resp = book(client, **overrides)
    assert resp.status_code == 422 and message in resp.json()["error"]["message"]


def test_booking_input_is_validated(client, seeded):
    assert book(client, patient_phone="call me").status_code == 422
    assert book(client, patient_email="not-an-email").status_code == 422
    assert book(client, reason="hi").status_code == 422


# --- Triage workflow + emails --------------------------------------------------------------------------


def _booked_id(client, admin_headers, **overrides) -> int:
    reference = book(client, **overrides).json()["reference"]
    items = client.get("/api/v1/admin/appointments", params={"q": reference}, headers=admin_headers).json()["items"]
    return items[0]["id"]


def test_confirming_emails_a_calendar_invite(client, seeded, admin_headers, outbox):
    appointment_id = _booked_id(client, admin_headers)
    resp = client.patch(f"/api/v1/admin/appointments/{appointment_id}/status", json={"status": "confirmed"}, headers=admin_headers)
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["status"] == "confirmed" and body["confirmed_at"]
    confirmation = body["emails"][0]
    assert confirmation["kind"] == "confirmation" and confirmation["status"] == "sent" and confirmation["message_id"]

    email = outbox[-1]
    assert email.to == PATIENT["patient_email"] and email.subject.startswith("Confirmed:")
    assert "Dr. Arjun Nair" in email.html and "arjun-nair#book" in email.html  # reschedule link
    [ics] = email.attachments
    text = ics.content.decode()
    assert ics.subtype == "calendar" and ics.params["method"] == "REQUEST"
    assert "METHOD:REQUEST" in text and "TRIGGER:-PT2H" in text and "STATUS:CONFIRMED" in text
    assert all(len(line.encode()) <= 75 for line in text.split("\r\n"))


def test_cancelling_needs_a_reason_frees_the_slot_and_cancels_the_invite(client, seeded, admin_headers, outbox):
    appointment_id = _booked_id(client, admin_headers)
    url = f"/api/v1/admin/appointments/{appointment_id}/status"
    assert client.patch(url, json={"status": "cancelled"}, headers=admin_headers).status_code == 422

    body = client.patch(url, json={"status": "cancelled", "reason": "Doctor on emergency duty"}, headers=admin_headers).json()
    assert body["status"] == "cancelled" and body["cancellation_reason"] == "Doctor on emergency duty"
    email = outbox[-1]
    assert "Doctor on emergency duty" in email.html and "Choose a new time" in email.html
    assert "METHOD:CANCEL" in email.attachments[0].content.decode()

    doctor = availability(client, doctor="arjun-nair", date=body["appointment_date"])["doctors"][0]
    assert slot(doctor, "10:00:00")["available"] is True  # released for someone else
    # Cancelled is final.
    assert client.patch(url, json={"status": "confirmed"}, headers=admin_headers).status_code == 409


def test_smtp_failures_are_recorded_not_raised(client, seeded, admin_headers, outbox, monkeypatch):
    from app.services.email import sender

    def broken(email):
        raise ConnectionRefusedError("SMTP server unreachable")

    monkeypatch.setattr(sender, "deliver", broken)
    appointment_id = _booked_id(client, admin_headers)
    resp = client.patch(f"/api/v1/admin/appointments/{appointment_id}/status", json={"status": "confirmed"}, headers=admin_headers)
    assert resp.status_code == 200
    failed = resp.json()["emails"][0]
    assert failed["status"] == "failed" and "SMTP server unreachable" in failed["error"]


def test_resend_and_notes(client, seeded, admin_headers, outbox):
    appointment_id = _booked_id(client, admin_headers)
    base = f"/api/v1/admin/appointments/{appointment_id}"
    assert client.post(f"{base}/emails", json={"kind": "confirmation"}, headers=admin_headers).status_code == 409
    client.patch(f"{base}/status", json={"status": "confirmed"}, headers=admin_headers)
    body = client.post(f"{base}/emails", json={"kind": "confirmation"}, headers=admin_headers).json()
    assert [e["kind"] for e in body["emails"]][:2] == ["confirmation", "confirmation"]

    body = client.put(base, json={"admin_notes": "  Prefers a call after 5 pm  "}, headers=admin_headers).json()
    assert body["admin_notes"] == "Prefers a call after 5 pm"


def test_reschedule_moves_the_slot_and_resends_confirmation(client, seeded, admin_headers, outbox):
    appointment_id = _booked_id(client, admin_headers)
    base = f"/api/v1/admin/appointments/{appointment_id}"
    client.patch(f"{base}/status", json={"status": "confirmed"}, headers=admin_headers)
    new_day = str(next_weekday(SAT))
    body = client.put(base, json={"appointment_date": new_day, "start_time": "11:30"}, headers=admin_headers).json()
    assert body["appointment_date"] == new_day and body["start_time"] == "11:30:00" and body["end_time"] == "12:00:00"
    assert sum(e.subject.startswith("Confirmed:") for e in outbox) == 2  # original + updated time
    old = availability(client, doctor="arjun-nair", date=str(next_weekday(MON)))["doctors"][0]
    assert slot(old, "10:00:00")["available"] is True


def test_queue_counts_filters_and_search(client, seeded, admin_headers):
    refs = [book(client, start_time=t, patient_email=f"p{i}@mailbox.org").json()["reference"] for i, t in enumerate(["10:00", "10:30", "11:00"])]
    first_id = client.get("/api/v1/admin/appointments", params={"q": refs[0]}, headers=admin_headers).json()["items"][0]["id"]
    client.patch(f"/api/v1/admin/appointments/{first_id}/status", json={"status": "confirmed", "notify": False}, headers=admin_headers)

    body = client.get("/api/v1/admin/appointments", params={"status": "pending"}, headers=admin_headers).json()
    assert body["counts"] == {"pending": 2, "confirmed": 1, "completed": 0, "cancelled": 0}
    assert body["total"] == 2 and [i["start_time"] for i in body["items"]] == ["10:30:00", "11:00:00"]
    assert client.get("/api/v1/admin/appointments", params={"q": "nobody"}, headers=admin_headers).json()["total"] == 0


def test_doctor_login_sees_only_their_patients(client, seeded, db):
    from sqlalchemy import select

    from app.models import Doctor

    book(client)  # Dr. Arjun Nair
    book(client, doctor_slug="meera-iyer", appointment_date=str(next_weekday(TUE)))
    user = _make_user(db, "meera@test.example", "doctor")
    user.doctor_id = db.scalar(select(Doctor.id).where(Doctor.slug == "meera-iyer"))
    db.commit()
    token = client.post("/api/v1/auth/login", json={"email": "meera@test.example", "password": "correct-horse-battery"}).json()["access_token"]
    items = client.get("/api/v1/admin/appointments", headers={"Authorization": f"Bearer {token}"}).json()["items"]
    assert [i["doctor"]["slug"] for i in items] == ["meera-iyer"]


def test_appointments_require_staff_login(client, seeded):
    assert client.get("/api/v1/admin/appointments").status_code == 401


def test_analytics(client, seeded, admin_headers):
    ids = [_booked_id(client, admin_headers, start_time=t, patient_email=f"a{i}@mailbox.org") for i, t in enumerate(["10:00", "10:30", "11:00", "11:30"])]
    status = lambda i, s, **kw: client.patch(f"/api/v1/admin/appointments/{i}/status", json={"status": s, "notify": False, **kw}, headers=admin_headers)  # noqa: E731
    status(ids[0], "confirmed")
    status(ids[1], "confirmed")
    status(ids[1], "completed")
    status(ids[2], "cancelled", reason="Slot overbooked")

    body = client.get("/api/v1/admin/appointments/analytics", headers=admin_headers).json()
    assert body["total"] == 4 and body["pending"] == 1
    assert body["conversion_rate"] == pytest.approx(2 / 3, abs=0.001)
    assert body["cancellation_rate"] == pytest.approx(1 / 3, abs=0.001)
    assert body["revenue_total"] == "1600.00"  # two visits at ₹800
    assert body["by_department"] == [{"department": "dental", "total": 4, "revenue": "1600.00"}]
    assert body["by_source"] == {"website": 4} and len(body["by_month"]) == 6
