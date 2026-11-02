"""Booking engine, reception triage workflow, patient notifications (WhatsApp + email/.ics) and analytics.

Seed schedules (placeholders until RUA confirms rosters):
  Dr. Jatin K Reddy    Mon–Sat 10:00–19:00  primary: hair-transplant
  Dr. Eshritha C       Mon–Sat 11:00–20:00  primary: aesthetic-dermatology
  Dr. Jeevith C Reddy  Tue–Sun 10:00–18:00  primary: medical-dermatology
All three take dermatosurgery and medical-dermatology bookings; slots are 30 minutes.
"""

import re
from datetime import date, timedelta

import pytest

from app.core.config import get_settings
from app.services.appointments import clinic_now
from tests.conftest import _make_user

PATIENT = {
    "patient_name": "Asha Kumar",
    "patient_email": "asha.kumar@mailbox.org",
    "patient_phone": "+91 90000 20001",
    "reason": "Receding hairline, would like a hair transplant consultation",
}
MON, TUE, WED, THU, FRI, SAT, SUN = range(7)
JATIN, ESHRITHA, JEEVITH = "dr-jatin-k-reddy", "dr-eshritha-c", "dr-jeevith-c-reddy"


def next_weekday(weekday: int, min_days: int = 1) -> date:
    day = clinic_now().date() + timedelta(days=min_days)
    while day.weekday() != weekday:
        day += timedelta(days=1)
    return day


def book(client, **overrides):
    body = {
        "department": "hair-transplant",
        "doctor_slug": JATIN,
        "branch_slug": "indiranagar",
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
    monkeypatch.setattr(settings, "smtp_username", "bookings@ruaskinandhair.in")
    sent = []

    def fake_deliver(email):
        sent.append(email)
        return f"<{len(sent)}@ruaskinandhair.in>"

    monkeypatch.setattr(sender, "deliver", fake_deliver)
    return sent


@pytest.fixture
def whatsapp(monkeypatch):
    """Turn WhatsApp 'on' and capture outgoing messages instead of calling Meta's API."""
    from app.services.whatsapp import sender

    settings = get_settings()
    monkeypatch.setattr(settings, "whatsapp_access_token", "test-token")
    monkeypatch.setattr(settings, "whatsapp_phone_number_id", "1234567890")
    sent = []

    def fake_deliver(to, text, *, template=None, params=None):
        sent.append({"to": to, "text": text, "template": template, "params": params})
        return f"wamid.{len(sent)}"

    monkeypatch.setattr(sender, "deliver", fake_deliver)
    return sent


# --- Availability --------------------------------------------------------------------------------


def test_availability_lists_the_doctors_slot_grid(client, seeded):
    body = availability(client, doctor=JATIN, date=str(next_weekday(MON)))
    [doctor] = body["doctors"]
    starts = [s["start_time"] for s in doctor["slots"]]
    assert starts[0] == "10:00:00" and starts[-1] == "18:30:00" and len(starts) == 18
    assert all(s["available"] for s in doctor["slots"])


def test_no_slots_on_days_the_doctor_does_not_consult(client, seeded):
    body = availability(client, doctor=JATIN, date=str(next_weekday(SUN)))
    assert body["doctors"][0]["slots"] == []


def test_department_availability_includes_every_doctor_who_takes_it(client, seeded):
    body = availability(client, department="dermatosurgery", date=str(next_weekday(TUE)))
    assert {d["slug"] for d in body["doctors"]} == {JATIN, ESHRITHA, JEEVITH}
    body = availability(client, department="hair-transplant", date=str(next_weekday(TUE)))
    assert [d["slug"] for d in body["doctors"]] == [JATIN]


def test_clinic_closed_day_has_no_slots(client, seeded, db):
    from sqlalchemy import select

    from app.models import ClinicInfo

    clinic = db.scalar(select(ClinicInfo))
    clinic.opening_hours = [{**h, "closed": h["day"] == "Sunday"} for h in clinic.opening_hours]
    db.commit()
    body = availability(client, department="medical-dermatology", date=str(next_weekday(SUN)))
    assert body["clinic_open"] is False and all(d["slots"] == [] for d in body["doctors"])


def test_availability_summary_shows_next_free_slot(client, seeded):
    body = client.get("/api/v1/appointments/availability/summary", params={"days": 7, "doctor": JATIN}).json()
    [doctor] = body["doctors"]
    assert len(doctor["days"]) == 7 and doctor["next_available"] is not None
    sunday = next(d for d in doctor["days"] if date.fromisoformat(d["date"]).weekday() == SUN)
    assert sunday == {"date": sunday["date"], "free": 0, "total": 0}


# --- Booking ----------------------------------------------------------------------------------------


def test_booking_holds_the_slot_creates_the_patient_and_notifies(client, seeded, admin_headers):
    resp = book(client)
    assert resp.status_code == 201, resp.text
    booking = resp.json()
    assert re.fullmatch(r"RUA-[A-Z2-9]{6}", booking["reference"])
    assert booking["status"] == "pending" and booking["end_time"] == "10:30:00"
    assert booking["doctor"]["slug"] == JATIN and booking["branch"]["slug"] == "indiranagar"
    assert booking["patient_phone"] == "+919000020001"

    doctor = availability(client, doctor=JATIN, date=booking["appointment_date"])["doctors"][0]
    assert slot(doctor, "10:00:00")["available"] is False and slot(doctor, "10:30:00")["available"] is True

    [item] = client.get("/api/v1/admin/appointments", headers=admin_headers).json()["items"]
    assert item["last_email"]["kind"] == "received" and item["last_email"]["status"] == "skipped"
    assert item["last_whatsapp"]["kind"] == "received" and item["last_whatsapp"]["status"] == "skipped"
    assert "WhatsApp is not configured" in item["last_whatsapp"]["error"]
    assert booking["reference"] in item["last_whatsapp"]["body"]

    patients = client.get("/api/v1/admin/patients", headers=admin_headers).json()
    assert patients["total"] == 1 and patients["items"][0]["phone"] == "+919000020001"
    assert item["patient_id"] == patients["items"][0]["id"]


def test_booking_without_email_is_phone_first(client, seeded, admin_headers):
    resp = book(client, patient_email="")
    assert resp.status_code == 201, resp.text
    [item] = client.get("/api/v1/admin/appointments", headers=admin_headers).json()["items"]
    assert item["patient_email"] is None and item["last_email"] is None and item["last_whatsapp"]["kind"] == "received"


def test_repeat_bookings_reuse_the_patient(client, seeded, admin_headers):
    book(client)
    book(client, start_time="11:00", patient_phone="9000020001", patient_name="Asha K")
    patients = client.get("/api/v1/admin/patients", headers=admin_headers).json()["items"]
    assert len(patients) == 1 and patients[0]["full_name"] == "Asha K" and patients[0]["upcoming"] == 2


def test_double_booking_is_rejected(client, seeded):
    assert book(client).status_code == 201
    resp = book(client, patient_name="Ravi Shankar", patient_phone="+91 90000 20002")
    assert resp.status_code == 409 and "just been taken" in resp.json()["error"]["message"]


def test_any_available_doctor_is_assigned_in_turn(client, seeded):
    # Tuesday 11:00: all three doctors consult and take dermatosurgery bookings.
    day = str(next_weekday(TUE))
    common = {"department": "dermatosurgery", "appointment_date": day, "start_time": "11:00"}
    slugs = {book(client, doctor_slug=None, patient_phone=f"+91 90000 3000{i}", **common).json()["doctor"]["slug"] for i in range(3)}
    assert slugs == {JATIN, ESHRITHA, JEEVITH}
    fourth = book(client, doctor_slug="any", patient_phone="+91 90000 30009", **common)
    assert fourth.status_code == 409 and "No doctor is free" in fourth.json()["error"]["message"]


@pytest.mark.parametrize(
    ("overrides", "message"),
    [
        ({"appointment_date": str(clinic_now().date() - timedelta(days=1))}, "between today and"),
        ({"appointment_date": str(clinic_now().date() + timedelta(days=200))}, "between today and"),
        ({"appointment_date": str(next_weekday(SUN))}, "doesn't consult on Sundays"),
        ({"start_time": "10:15"}, "listed time slots"),
        ({"department": "aesthetic-dermatology", "doctor_slug": JEEVITH}, "isn't available in Advanced Cosmetic Dermatology"),
        ({"branch_slug": "koramangala"}, "choose one of our centres"),
    ],
)
def test_invalid_bookings_explain_why(client, seeded, overrides, message):
    resp = book(client, **overrides)
    assert resp.status_code == 422 and message in resp.json()["error"]["message"], resp.text


def test_booking_input_is_validated(client, seeded):
    assert book(client, patient_phone="call me").status_code == 422
    assert book(client, patient_phone="12345 67890").status_code == 422  # not an Indian mobile
    assert book(client, patient_email="not-an-email").status_code == 422
    assert book(client, reason="hi").status_code == 422


# --- Triage workflow + notifications -------------------------------------------------------------------


def _booked_id(client, admin_headers, **overrides) -> int:
    resp = book(client, **overrides)
    assert resp.status_code == 201, resp.text
    items = client.get("/api/v1/admin/appointments", params={"q": resp.json()["reference"]}, headers=admin_headers).json()["items"]
    return items[0]["id"]


def test_deleting_a_doctor_with_appointments_needs_explicit_opt_in(client, seeded, admin_headers, outbox, db):
    from sqlalchemy import func, select

    from app.models import Appointment, AppointmentEmail

    appointment_id = _booked_id(client, admin_headers)
    client.patch(f"/api/v1/admin/appointments/{appointment_id}/status", json={"status": "confirmed"}, headers=admin_headers)
    book(client, start_time="11:00", patient_phone="+91 90000 20003")
    doctor = next(d for d in client.get("/api/v1/admin/doctors", headers=admin_headers).json() if d["slug"] == JATIN)
    url = f"/api/v1/admin/doctors/{doctor['id']}"

    resp = client.delete(url, headers=admin_headers)
    assert resp.status_code == 409, resp.text
    error = resp.json()["error"]
    assert error["code"] == "doctor_has_appointments" and "2 appointments" in error["message"]
    assert error["details"] == [{"field": "appointments", "message": "2"}]

    resp = client.delete(url, params={"delete_appointments": "true"}, headers=admin_headers)
    assert resp.status_code == 204, resp.text
    assert db.scalar(select(func.count(Appointment.id)).where(Appointment.doctor_id == doctor["id"])) == 0
    assert db.scalar(select(func.count(AppointmentEmail.id)).where(AppointmentEmail.appointment_id == appointment_id)) == 0


def test_deleting_a_doctor_without_appointments_needs_no_flag(client, seeded, admin_headers):
    doctor = client.get("/api/v1/admin/doctors", headers=admin_headers).json()[0]
    assert client.delete(f"/api/v1/admin/doctors/{doctor['id']}", headers=admin_headers).status_code == 204


def test_confirming_sends_whatsapp_and_a_calendar_invite(client, seeded, admin_headers, outbox, whatsapp):
    appointment_id = _booked_id(client, admin_headers)
    assert whatsapp[-1]["to"] == "+919000020001" and "Booking ref" in whatsapp[-1]["text"]  # automated acknowledgement

    resp = client.patch(f"/api/v1/admin/appointments/{appointment_id}/status", json={"status": "confirmed"}, headers=admin_headers)
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["status"] == "confirmed" and body["confirmed_at"]
    message = body["whatsapp_messages"][0]
    assert message["kind"] == "confirmation" and message["status"] == "sent" and message["provider_message_id"].startswith("wamid.")
    assert "confirmed" in whatsapp[-1]["text"] and "RUA Indiranagar" in whatsapp[-1]["text"]

    email = outbox[-1]
    assert email.to == PATIENT["patient_email"] and email.subject.startswith("Confirmed:")
    assert "Dr. Jatin K Reddy" in email.html and "book-appointment?doctor=dr-jatin-k-reddy" in email.html
    [ics] = email.attachments
    text = ics.content.decode()
    assert ics.subtype == "calendar" and "METHOD:REQUEST" in text and "STATUS:CONFIRMED" in text
    assert "Puttappa Layout" in text  # the centre's address, not the head office
    assert all(len(line.encode()) <= 75 for line in text.split("\r\n"))


def test_whatsapp_templates_are_used_when_configured(client, seeded, admin_headers, whatsapp, monkeypatch):
    monkeypatch.setattr(get_settings(), "whatsapp_template_received", "booking_received")
    reference = book(client).json()["reference"]
    sent = whatsapp[-1]
    assert sent["template"] == "booking_received" and sent["params"][0] == "Asha" and sent["params"][1] == reference


def test_whatsapp_failures_are_recorded_not_raised(client, seeded, admin_headers, whatsapp, monkeypatch):
    from app.services.whatsapp import sender

    def broken(*args, **kwargs):
        raise sender.WhatsAppError("HTTP 401: Invalid OAuth access token")

    monkeypatch.setattr(sender, "deliver", broken)
    appointment_id = _booked_id(client, admin_headers)
    detail = client.get(f"/api/v1/admin/appointments/{appointment_id}", headers=admin_headers).json()
    assert detail["whatsapp_messages"][0]["status"] == "failed" and "Invalid OAuth" in detail["whatsapp_messages"][0]["error"]


def test_cancelling_needs_a_reason_frees_the_slot_and_notifies(client, seeded, admin_headers, outbox, whatsapp):
    appointment_id = _booked_id(client, admin_headers)
    url = f"/api/v1/admin/appointments/{appointment_id}/status"
    assert client.patch(url, json={"status": "cancelled"}, headers=admin_headers).status_code == 422

    body = client.patch(url, json={"status": "cancelled", "reason": "Doctor on emergency duty"}, headers=admin_headers).json()
    assert body["status"] == "cancelled" and body["cancellation_reason"] == "Doctor on emergency duty"
    assert "Doctor on emergency duty" in whatsapp[-1]["text"]
    email = outbox[-1]
    assert "Doctor on emergency duty" in email.html and "METHOD:CANCEL" in email.attachments[0].content.decode()

    doctor = availability(client, doctor=JATIN, date=body["appointment_date"])["doctors"][0]
    assert slot(doctor, "10:00:00")["available"] is True
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


def test_resend_and_notes(client, seeded, admin_headers, outbox, whatsapp):
    appointment_id = _booked_id(client, admin_headers)
    base = f"/api/v1/admin/appointments/{appointment_id}"
    assert client.post(f"{base}/emails", json={"kind": "confirmation"}, headers=admin_headers).status_code == 409
    assert client.post(f"{base}/whatsapp", json={"kind": "confirmation"}, headers=admin_headers).status_code == 409
    client.patch(f"{base}/status", json={"status": "confirmed"}, headers=admin_headers)
    body = client.post(f"{base}/emails", json={"kind": "confirmation"}, headers=admin_headers).json()
    assert [e["kind"] for e in body["emails"]][:2] == ["confirmation", "confirmation"]
    body = client.post(f"{base}/whatsapp", json={"kind": "reminder"}, headers=admin_headers).json()
    assert body["whatsapp_messages"][0]["kind"] == "reminder"

    body = client.put(base, json={"admin_notes": "  Prefers a call after 5 pm  "}, headers=admin_headers).json()
    assert body["admin_notes"] == "Prefers a call after 5 pm"


def test_reschedule_moves_the_slot_and_notifies(client, seeded, admin_headers, outbox, whatsapp):
    appointment_id = _booked_id(client, admin_headers)
    base = f"/api/v1/admin/appointments/{appointment_id}"
    client.patch(f"{base}/status", json={"status": "confirmed"}, headers=admin_headers)
    new_day = str(next_weekday(SAT))
    body = client.put(base, json={"appointment_date": new_day, "start_time": "11:30"}, headers=admin_headers).json()
    assert body["appointment_date"] == new_day and body["start_time"] == "11:30:00" and body["end_time"] == "12:00:00"
    assert body["whatsapp_messages"][0]["kind"] == "reschedule" and "New time" in whatsapp[-1]["text"]
    assert sum(e.subject.startswith("Confirmed:") for e in outbox) == 2
    old = availability(client, doctor=JATIN, date=str(next_weekday(MON)))["doctors"][0]
    assert slot(old, "10:00:00")["available"] is True


def test_queue_counts_filters_and_search(client, seeded, admin_headers):
    refs = [
        book(client, start_time=t, patient_phone=f"+91 90000 4000{i}").json()["reference"]
        for i, t in enumerate(["10:00", "10:30", "11:00"])
    ]
    first_id = client.get("/api/v1/admin/appointments", params={"q": refs[0]}, headers=admin_headers).json()["items"][0]["id"]
    client.patch(f"/api/v1/admin/appointments/{first_id}/status", json={"status": "confirmed", "notify": False}, headers=admin_headers)

    body = client.get("/api/v1/admin/appointments", params={"status": "pending"}, headers=admin_headers).json()
    assert body["counts"] == {"pending": 2, "confirmed": 1, "completed": 0, "cancelled": 0}
    assert body["total"] == 2 and [i["start_time"] for i in body["items"]] == ["10:30:00", "11:00:00"]
    assert client.get("/api/v1/admin/appointments", params={"q": "nobody"}, headers=admin_headers).json()["total"] == 0


def test_doctor_login_sees_only_their_patients(client, seeded, db):
    from sqlalchemy import select

    from app.models import Doctor

    book(client)  # Dr. Jatin
    book(client, department="medical-dermatology", doctor_slug=JEEVITH, appointment_date=str(next_weekday(TUE)), patient_phone="+91 90000 20004")
    user = _make_user(db, "jeevith@test.example", "doctor")
    user.doctor_id = db.scalar(select(Doctor.id).where(Doctor.slug == JEEVITH))
    db.commit()
    token = client.post("/api/v1/auth/login", json={"email": "jeevith@test.example", "password": "correct-horse-battery"}).json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    items = client.get("/api/v1/admin/appointments", headers=headers).json()["items"]
    assert [i["doctor"]["slug"] for i in items] == [JEEVITH]
    patients = client.get("/api/v1/admin/patients", headers=headers).json()["items"]
    assert [p["phone"] for p in patients] == ["+919000020004"]


def test_appointments_require_staff_login(client, seeded):
    assert client.get("/api/v1/admin/appointments").status_code == 401


def test_analytics(client, seeded, admin_headers, db):
    from sqlalchemy import update

    from app.models import Doctor

    db.execute(update(Doctor).where(Doctor.slug == JATIN).values(consultation_fee=800))
    db.commit()
    ids = [_booked_id(client, admin_headers, start_time=t, patient_phone=f"+91 90000 5000{i}") for i, t in enumerate(["10:00", "10:30", "11:00", "11:30"])]
    status = lambda i, s, **kw: client.patch(f"/api/v1/admin/appointments/{i}/status", json={"status": s, "notify": False, **kw}, headers=admin_headers)  # noqa: E731
    status(ids[0], "confirmed")
    status(ids[1], "confirmed")
    status(ids[1], "completed")
    status(ids[2], "cancelled", reason="Slot overbooked")

    body = client.get("/api/v1/admin/appointments/analytics", headers=admin_headers).json()
    assert body["total"] == 4 and body["pending"] == 1
    assert body["conversion_rate"] == pytest.approx(2 / 3, abs=0.001)
    assert body["cancellation_rate"] == pytest.approx(1 / 3, abs=0.001)
    assert body["revenue_total"] == "1600.00"
    assert body["by_department"] == [{"department": "hair-transplant", "total": 4, "revenue": "1600.00"}]
    assert body["by_branch"] == [{"branch": "RUA Indiranagar", "total": 4}]
    assert body["by_source"] == {"website": 4} and len(body["by_month"]) == 6
    assert body["whatsapp_sent"] == 0 and body["whatsapp_pending"] == 4
