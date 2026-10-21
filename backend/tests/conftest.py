"""Test configuration.

Tests run against a real PostgreSQL + pgvector database (TEST_DATABASE_URL), because
the features under test — the partial unique index that prevents double booking and
the `<=>` vector search — are PostgreSQL features that SQLite cannot emulate.

No external AI API is ever called: the offline hashing embedder is used, and LLM
behaviour is simulated with FakeLLM.
"""

import os

# Configure settings BEFORE any app module is imported (settings are cached).
TEST_DB_URL = os.environ.get(
    "TEST_DATABASE_URL", "postgresql+psycopg://clinic:clinic_dev_password@localhost:5434/clinic_test"
)
os.environ.update(
    {
        "ENVIRONMENT": "test",
        "DATABASE_URL": TEST_DB_URL,
        "EMBEDDING_PROVIDER": "hashing",
        "LLM_PROVIDER": "extractive",
        "JWT_SECRET": "test-secret-that-is-long-enough-for-hs256-signing",
        "RATE_LIMIT_CHAT_PER_MINUTE": "1000",
        "RATE_LIMIT_LOGIN_PER_MINUTE": "1000",
        "RATE_LIMIT_BOOKING_PER_MINUTE": "1000",
        "RATE_LIMIT_CONTACT_PER_MINUTE": "1000",
        "GEMINI_API_KEY": "",
        "OPENAI_API_KEY": "",
    }
)


import psycopg  # noqa: E402
import pytest  # noqa: E402
from alembic import command  # noqa: E402
from alembic.config import Config  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import text  # noqa: E402
from sqlalchemy.engine import make_url  # noqa: E402

from app.core.rate_limit import limiter  # noqa: E402
from app.core.security import hash_password  # noqa: E402
from app.db.session import SessionLocal, engine  # noqa: E402
from app.main import app  # noqa: E402
from app.models import User  # noqa: E402
from app.services.chatbot.llm import LLMError  # noqa: E402

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def _ensure_test_database() -> None:
    url = make_url(TEST_DB_URL)
    admin_dsn = url.set(drivername="postgresql", database="postgres").render_as_string(hide_password=False)
    with psycopg.connect(admin_dsn, autocommit=True) as conn:
        exists = conn.execute("SELECT 1 FROM pg_database WHERE datname = %s", (url.database,)).fetchone()
        if not exists:
            conn.execute(f'CREATE DATABASE "{url.database}"')


@pytest.fixture(scope="session", autouse=True)
def database():
    _ensure_test_database()
    cfg = Config(os.path.join(BACKEND_DIR, "alembic.ini"))
    cfg.set_main_option("script_location", os.path.join(BACKEND_DIR, "alembic"))
    cfg.cmd_opts = type("Opts", (), {"x": [f"db_url={TEST_DB_URL}"]})()
    command.downgrade(cfg, "base")  # start from a clean schema
    command.upgrade(cfg, "head")  # ...and exercise the real migration
    yield
    engine.dispose()


TABLES = (
    "appointment_emails, appointments, media_files, transformation_cases, "
    "blog_posts, chat_events, contact_messages, knowledge_chunks, knowledge_documents, "
    "services, doctors, clinic_info, users"
)


@pytest.fixture(autouse=True)
def clean_tables():
    with engine.begin() as conn:
        conn.execute(text(f"TRUNCATE {TABLES} RESTART IDENTITY CASCADE"))
    limiter.reset()
    app.dependency_overrides.clear()
    yield
    app.dependency_overrides.clear()


@pytest.fixture
def db():
    session = SessionLocal()
    yield session
    session.close()


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture
def seeded(db):
    """Clinic info, doctors, services and articles from the real seed data."""
    from app.seed.run import seed_catalogue, seed_clinic

    seed_clinic(db)
    seed_catalogue(db)
    db.commit()
    return db


@pytest.fixture
def knowledge(seeded):
    """Seeded catalogue + an indexed knowledge base (offline hashing embeddings)."""
    from app.services.knowledge_base.embeddings import get_embedder
    from app.services.knowledge_base.system_documents import sync_generated_documents

    sync_generated_documents(seeded, get_embedder())
    return seeded


def _make_user(db, email: str, role: str, password: str = "correct-horse-battery") -> User:
    user = User(email=email, full_name=role.title(), role=role, hashed_password=hash_password(password))
    db.add(user)
    db.commit()
    return user


@pytest.fixture
def admin_headers(client, db):
    _make_user(db, "admin@test.example", "admin")
    resp = client.post("/api/v1/auth/login", json={"email": "admin@test.example", "password": "correct-horse-battery"})
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}


@pytest.fixture
def staff_headers(client, db):
    _make_user(db, "staff@test.example", "staff")
    resp = client.post("/api/v1/auth/login", json={"email": "staff@test.example", "password": "correct-horse-battery"})
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}


class FakeLLM:
    """Stands in for Gemini/OpenAI. Records calls so tests can assert it was (not) used."""

    name = "fake-llm"

    def __init__(self, reply: str = "", error: bool = False):
        self.reply = reply
        self.error = error
        self.calls: list[tuple[str, list[dict]]] = []

    def generate(self, system: str, messages: list[dict]) -> str:
        self.calls.append((system, messages))
        if self.error:
            raise LLMError("simulated outage")
        return self.reply
