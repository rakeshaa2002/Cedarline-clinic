import pytest
from sqlalchemy import inspect

from app.db.session import engine


def test_login_success_and_me(client, admin_headers):
    me = client.get("/api/v1/auth/me", headers=admin_headers)
    assert me.status_code == 200
    assert me.json()["role"] == "admin"
    assert "hashed_password" not in me.json()


def test_login_wrong_password(client, admin_headers):
    resp = client.post("/api/v1/auth/login", json={"email": "admin@test.example", "password": "wrong"})
    assert resp.status_code == 401
    assert resp.json()["error"]["message"] == "Incorrect email or password."


def test_login_unknown_email_gives_same_error(client):
    resp = client.post("/api/v1/auth/login", json={"email": "ghost@test.example", "password": "whatever"})
    assert resp.status_code == 401
    assert resp.json()["error"]["message"] == "Incorrect email or password."


def test_login_is_rate_limited(client, monkeypatch):
    from app.core.config import get_settings

    monkeypatch.setattr(get_settings(), "rate_limit_login_per_minute", 3)
    codes = [
        client.post("/api/v1/auth/login", json={"email": "x@test.example", "password": "y"}).status_code
        for _ in range(5)
    ]
    assert codes[:3] == [401, 401, 401]
    assert codes[3:] == [429, 429]


@pytest.mark.parametrize(
    ("method", "path"),
    [
        ("get", "/api/v1/admin/overview"),
        ("get", "/api/v1/admin/messages"),
        ("patch", "/api/v1/admin/messages/1/read"),
        ("get", "/api/v1/admin/knowledge/documents"),
        ("post", "/api/v1/admin/knowledge/reindex"),
        ("get", "/api/v1/auth/me"),
    ],
)
def test_admin_routes_require_authentication(client, method, path):
    resp = getattr(client, method)(path)
    assert resp.status_code == 401


def test_invalid_token_rejected(client):
    resp = client.get("/api/v1/admin/overview", headers={"Authorization": "Bearer not.a.jwt"})
    assert resp.status_code == 401


def test_staff_cannot_use_admin_only_routes(client, staff_headers):
    assert client.get("/api/v1/admin/overview", headers=staff_headers).status_code == 200
    assert client.get("/api/v1/admin/knowledge/documents", headers=staff_headers).status_code == 403
    assert client.post("/api/v1/admin/knowledge/reindex", headers=staff_headers).status_code == 403


def test_overview_counts_chatbot_outcomes(client, knowledge, staff_headers):
    client.post("/api/v1/chat", json={"message": "What are the clinic's opening hours?"})
    client.post("/api/v1/chat", json={"message": "Which tablet should I take for my fever?"})
    client.post("/api/v1/chat", json={"message": "Who won the football world cup in 1998?"})

    overview = client.get("/api/v1/admin/overview", headers=staff_headers).json()
    chat = overview["chat"]
    assert chat["today"] == chat["total"] == 3
    assert chat["by_status"]["answered"] == 1
    assert chat["by_status"]["safety_redirect"] == 1
    assert chat["by_status"]["no_context"] == 1
    assert chat["answered_rate"] == pytest.approx(0.333, abs=0.001)
    assert len(chat["per_day"]) == 14 and chat["per_day"][-1]["count"] == 3
    assert overview["knowledge"]["ready"] == overview["knowledge"]["documents"] > 0
    assert overview["knowledge"]["chunks"] > 0
    assert overview["active_doctors"] > 0 and overview["active_services"] > 0


def test_overview_without_chat_activity(client, seeded, staff_headers):
    chat = client.get("/api/v1/admin/overview", headers=staff_headers).json()["chat"]
    assert chat["total"] == 0 and chat["answered_rate"] is None and chat["avg_latency_ms"] is None


def test_chat_events_never_store_message_text():
    columns = {c["name"] for c in inspect(engine).get_columns("chat_events")}
    assert columns == {"id", "created_at", "status", "provider", "latency_ms", "top_similarity"}


def test_admin_can_update_doctor_but_staff_cannot(client, seeded, admin_headers, staff_headers):
    doctor = client.get("/api/v1/admin/doctors", headers=admin_headers).json()[0]
    update = {k: doctor[k] for k in (
        "full_name", "department", "specialization", "qualifications", "experience_years", "bio",
        "languages", "photo_url", "consultation_days", "start_time", "end_time", "slot_minutes", "is_active",
    )}
    update["experience_years"] = 20
    assert client.put(f"/api/v1/admin/doctors/{doctor['id']}", json=update, headers=staff_headers).status_code == 403
    resp = client.put(f"/api/v1/admin/doctors/{doctor['id']}", json=update, headers=admin_headers)
    assert resp.status_code == 200 and resp.json()["experience_years"] == 20

    bad = {**update, "start_time": "18:00:00", "end_time": "09:00:00"}
    assert client.put(f"/api/v1/admin/doctors/{doctor['id']}", json=bad, headers=admin_headers).status_code == 422
