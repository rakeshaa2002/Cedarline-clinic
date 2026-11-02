"""Patient portal (WhatsApp OTP login), the patient CRM, automated WhatsApp reminders and the availability board."""

from datetime import datetime, timedelta

import pytest
from sqlalchemy import select

from app.models import Appointment, WhatsAppMessage
from app.services.reminders import send_due_reminders
from tests.test_appointments import JATIN, MON, TUE, book, next_weekday, outbox, whatsapp  # noqa: F401 (fixtures)

PHONE = "+91 90000 20001"  # PATIENT's phone in test_appointments


def login(client, phone=PHONE, sent=None) -> dict:
    """Sign in through the OTP flow. `sent` is the whatsapp fixture's outbox when WhatsApp is 'on'."""
    resp = client.post("/api/v1/patient/otp", json={"phone": phone})
    assert resp.status_code == 200, resp.text
    code = resp.json()["dev_code"] or sent[-1]["text"][:6]
    token = client.post("/api/v1/patient/verify", json={"phone": phone, "code": code}).json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


# --- Patient portal --------------------------------------------------------------------------------------


def test_otp_login_flow(client, seeded, db):
    resp = client.post("/api/v1/patient/otp", json={"phone": "90000 20001"})
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["phone"] == "+919000020001" and len(body["dev_code"]) == 6  # demo mode: WhatsApp isn't configured
    code = body["dev_code"]
    wrong = "000000" if code != "000000" else "111111"

    bad = client.post("/api/v1/patient/verify", json={"phone": PHONE, "code": wrong})
    assert bad.status_code == 422 and "isn't right" in bad.json()["error"]["message"]

    ok = client.post("/api/v1/patient/verify", json={"phone": PHONE, "code": code})
    assert ok.status_code == 200, ok.text
    assert ok.json()["patient"]["phone"] == "+919000020001" and ok.json()["patient"]["source"] == "portal"
    headers = {"Authorization": f"Bearer {ok.json()['access_token']}"}
    assert client.get("/api/v1/patient/me", headers=headers).json()["phone"] == "+919000020001"

    # A code works once, and is never stored in readable form.
    assert client.post("/api/v1/patient/verify", json={"phone": PHONE, "code": code}).status_code == 422
    logged = db.scalar(select(WhatsAppMessage).where(WhatsAppMessage.kind == "otp"))
    assert code not in logged.body and logged.status == "skipped"


def test_otp_locks_after_too_many_wrong_codes(client, seeded):
    code = client.post("/api/v1/patient/otp", json={"phone": PHONE}).json()["dev_code"]
    wrong = "000000" if code != "000000" else "111111"
    for _ in range(5):
        client.post("/api/v1/patient/verify", json={"phone": PHONE, "code": wrong})
    resp = client.post("/api/v1/patient/verify", json={"phone": PHONE, "code": code})
    assert resp.status_code == 422 and "Too many attempts" in resp.json()["error"]["message"]


def test_otp_is_sent_on_whatsapp_and_not_revealed(client, seeded, whatsapp):
    body = client.post("/api/v1/patient/otp", json={"phone": PHONE}).json()
    assert body["dev_code"] is None
    assert whatsapp[-1]["to"] == "+919000020001" and any(ch.isdigit() for ch in whatsapp[-1]["text"])


def test_patient_sees_and_cancels_only_their_own_appointments(client, seeded, admin_headers, whatsapp):
    mine = book(client).json()
    other = book(client, start_time="11:00", patient_name="Ravi Shankar", patient_phone="+91 90000 20002").json()
    headers = login(client, sent=whatsapp)

    appointments = client.get("/api/v1/patient/appointments", headers=headers).json()
    assert [a["reference"] for a in appointments] == [mine["reference"]]
    assert appointments[0]["branch"]["slug"] == "indiranagar" and appointments[0]["doctor"]["slug"] == JATIN

    my_id = appointments[0]["id"]
    other_id = client.get("/api/v1/admin/appointments", params={"q": other["reference"]}, headers=admin_headers).json()["items"][0]["id"]
    assert client.post(f"/api/v1/patient/appointments/{other_id}/cancel", json={}, headers=headers).status_code == 404

    resp = client.post(f"/api/v1/patient/appointments/{my_id}/cancel", json={"reason": "Travelling"}, headers=headers)
    assert resp.status_code == 200, resp.text
    assert resp.json()["status"] == "cancelled" and resp.json()["cancellation_reason"] == "Cancelled by the patient: Travelling"
    assert "Travelling" in whatsapp[-1]["text"]
    assert client.post(f"/api/v1/patient/appointments/{my_id}/cancel", json={}, headers=headers).status_code == 409


def test_profile_update(client, seeded):
    headers = login(client)
    resp = client.put("/api/v1/patient/me", json={"full_name": "  Asha K  ", "email": ""}, headers=headers)
    assert resp.status_code == 200 and resp.json()["full_name"] == "Asha K" and resp.json()["email"] is None


def test_patient_and_staff_tokens_do_not_cross(client, seeded, admin_headers):
    patient_headers = login(client)
    assert client.get("/api/v1/admin/appointments", headers=patient_headers).status_code == 401
    assert client.get("/api/v1/admin/patients", headers=patient_headers).status_code == 401
    assert client.get("/api/v1/patient/me", headers=admin_headers).status_code == 401
    assert client.get("/api/v1/patient/me").status_code == 401


# --- Patient CRM -----------------------------------------------------------------------------------------


def test_walk_in_registration_and_search(client, seeded, admin_headers):
    walk_in = {"full_name": "Meena Rao", "phone": "9000020005", "tags": ["VIP", " laser ", "VIP"], "notes": "Prefers evenings"}
    resp = client.post("/api/v1/admin/patients", json=walk_in, headers=admin_headers)
    assert resp.status_code == 201, resp.text
    assert resp.json()["source"] == "walk-in" and resp.json()["tags"] == ["VIP", "laser"]
    assert client.post("/api/v1/admin/patients", json=walk_in, headers=admin_headers).status_code == 409

    book(client)  # Asha, upcoming
    search = lambda **p: client.get("/api/v1/admin/patients", params=p, headers=admin_headers).json()  # noqa: E731
    assert [p["full_name"] for p in search(q="meena")["items"]] == ["Meena Rao"]
    assert [p["full_name"] for p in search(q="20001")["items"]] == ["Asha Kumar"]  # phone digits
    assert [p["full_name"] for p in search(tag="VIP")["items"]] == ["Meena Rao"]
    assert [p["full_name"] for p in search(segment="upcoming")["items"]] == ["Asha Kumar"]
    everyone = search()
    assert everyone["stats"]["total"] == 2 and everyone["stats"]["upcoming"] == 1
    assert everyone["items"][0]["full_name"] == "Asha Kumar"  # soonest visit first
    assert everyone["items"][0]["last_doctor"] == "Dr. Jatin K Reddy"
    assert client.get("/api/v1/admin/patients/tags", headers=admin_headers).json() == ["VIP", "laser"]


def test_patient_profile_timeline_notes_and_manual_whatsapp(client, seeded, admin_headers, whatsapp):
    book(client)
    patient_id = client.get("/api/v1/admin/patients", headers=admin_headers).json()["items"][0]["id"]
    base = f"/api/v1/admin/patients/{patient_id}"

    detail = client.get(base, headers=admin_headers).json()
    assert len(detail["appointments"]) == 1 and [m["kind"] for m in detail["whatsapp_messages"]] == ["received"]

    sent = client.post(f"{base}/whatsapp", json={"message": "Your reports are ready to collect."}, headers=admin_headers)
    assert sent.status_code == 201 and sent.json()["status"] == "sent" and sent.json()["kind"] == "manual"
    assert whatsapp[-1]["text"] == "Your reports are ready to collect."

    update = {"full_name": "Asha Kumar", "email": "", "notes": "Allergic to lidocaine", "tags": ["hair"], "whatsapp_opt_in": False}
    assert client.put(base, json=update, headers=admin_headers).json()["whatsapp_opt_in"] is False
    skipped = client.post(f"{base}/whatsapp", json={"message": "Offer for you"}, headers=admin_headers).json()
    assert skipped["status"] == "skipped" and "opted out" in skipped["error"]


def test_unconfigured_whatsapp_is_logged_for_manual_follow_up(client, seeded, admin_headers):
    book(client)
    patient_id = client.get("/api/v1/admin/patients", headers=admin_headers).json()["items"][0]["id"]
    resp = client.post(f"/api/v1/admin/patients/{patient_id}/whatsapp", json={"message": "Hello from RUA"}, headers=admin_headers)
    assert resp.json()["status"] == "skipped" and "Send it manually" in resp.json()["error"]


# --- Automated reminders -----------------------------------------------------------------------------------


def _confirmed(client, admin_headers, **overrides) -> Appointment:
    ref = book(client, **overrides).json()["reference"]
    item = client.get("/api/v1/admin/appointments", params={"q": ref}, headers=admin_headers).json()["items"][0]
    client.patch(f"/api/v1/admin/appointments/{item['id']}/status", json={"status": "confirmed", "notify": False}, headers=admin_headers)
    return item


def test_reminders_go_out_a_day_before_and_two_hours_before_once(client, seeded, admin_headers, db, whatsapp):
    day = next_weekday(TUE, min_days=2)
    _confirmed(client, admin_headers, appointment_date=str(day), start_time="11:00")
    book(client, appointment_date=str(day), start_time="12:00", patient_phone="+91 90000 20009")  # pending: no reminder
    start = datetime.combine(day, datetime.min.time()).replace(hour=11)

    assert send_due_reminders(db, now=start - timedelta(hours=30)) == 0  # too early
    assert send_due_reminders(db, now=start - timedelta(hours=20)) == 1
    assert "Reminder" in whatsapp[-1]["text"] and "is tomorrow, " in whatsapp[-1]["text"]
    assert send_due_reminders(db, now=start - timedelta(hours=19)) == 0  # already sent
    assert send_due_reminders(db, now=start - timedelta(minutes=90)) == 1
    assert "is today, " in whatsapp[-1]["text"]
    assert send_due_reminders(db, now=start - timedelta(minutes=60)) == 0
    assert send_due_reminders(db, now=start + timedelta(minutes=5)) == 0  # started already
    kinds = db.scalars(select(WhatsAppMessage.kind).where(WhatsAppMessage.kind == "reminder")).all()
    assert len(kinds) == 2


def test_reschedule_rearms_reminders(client, seeded, admin_headers, db):
    day = next_weekday(TUE, min_days=2)
    item = _confirmed(client, admin_headers, appointment_date=str(day), start_time="11:00")
    start = datetime.combine(day, datetime.min.time()).replace(hour=11)
    assert send_due_reminders(db, now=start - timedelta(hours=20)) == 1
    new_day = day + timedelta(days=7)
    client.put(f"/api/v1/admin/appointments/{item['id']}", json={"appointment_date": str(new_day), "start_time": "11:00"}, headers=admin_headers)
    db.expire_all()
    assert send_due_reminders(db, now=start + timedelta(days=7) - timedelta(hours=20)) == 1


def test_reminder_run_endpoint(client, seeded, admin_headers):
    resp = client.post("/api/v1/admin/appointments/reminders/run", headers=admin_headers)
    assert resp.status_code == 200 and resp.json() == {"sent": 0}
    assert client.post("/api/v1/admin/appointments/reminders/run").status_code == 401


# --- Availability board -------------------------------------------------------------------------------------


def test_board_shows_free_and_booked_slots_per_doctor(client, seeded, admin_headers):
    day = next_weekday(MON)
    book(client, appointment_date=str(day), start_time="10:30")
    board = client.get("/api/v1/admin/appointments/board", params={"date": str(day)}, headers=admin_headers).json()
    assert board["clinic_open"] is True
    by_slug = {d["slug"]: d for d in board["doctors"]}
    assert set(by_slug) == {"dr-jatin-k-reddy", "dr-eshritha-c", "dr-jeevith-c-reddy"}
    jatin = by_slug[JATIN]
    booked = next(s for s in jatin["slots"] if s["start_time"] == "10:30:00")
    assert booked["state"] == "booked" and booked["patient_name"] == "Asha Kumar" and jatin["booked"] == 1
    assert jatin["free"] == len(jatin["slots"]) - 1
    assert by_slug["dr-jeevith-c-reddy"]["consulting"] is False and by_slug["dr-jeevith-c-reddy"]["slots"] == []  # off on Mondays


@pytest.mark.parametrize("department", ["hair-transplant", "laser-treatments"])
def test_availability_summary_by_speciality(client, seeded, department):
    body = client.get("/api/v1/appointments/availability/summary", params={"department": department, "days": 5}).json()
    slugs = {d["slug"] for d in body["doctors"]}
    assert slugs == ({JATIN} if department == "hair-transplant" else {JATIN, "dr-eshritha-c"})
    assert all(d["next_available"] for d in body["doctors"])
