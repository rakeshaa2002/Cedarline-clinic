"""Application settings, loaded from environment variables (and an optional .env file).

Nothing secret is hard-coded here: secrets have no default, or a default that the
app refuses to use in production (see `validate_production`).
"""

from functools import lru_cache
from typing import Literal

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

INSECURE_DEV_SECRET = "dev-only-insecure-secret-change-me"


class Settings(BaseSettings):
    # env_parse_none_str="": an empty value (e.g. GEMINI_API_KEY=) means "not set".
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore", env_parse_none_str="")

    # --- General -----------------------------------------------------------
    environment: Literal["development", "test", "production"] = "development"
    app_name: str = "Cedarline Clinic API"
    log_level: str = "INFO"
    clinic_timezone: str = "Asia/Kolkata"

    # Comma-separated list of allowed browser origins for CORS.
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    # --- Database ----------------------------------------------------------
    database_url: str = "postgresql+psycopg://clinic:clinic_dev_password@localhost:5434/clinic"
    db_pool_size: int = 5
    db_max_overflow: int = 5

    # --- Auth --------------------------------------------------------------
    jwt_secret: str = INSECURE_DEV_SECRET
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 120

    # Used only by the seed script to create the first admin/staff/doctor accounts.
    admin_email: str = "admin@cedarline.example"
    admin_password: str | None = None
    staff_email: str = "staff@cedarline.example"
    staff_password: str | None = None
    doctor_email: str = "doctor@cedarline.example"
    doctor_password: str | None = None

    # --- Rate limits (requests per minute, per client IP) ---------------------
    rate_limit_chat_per_minute: int = 20
    rate_limit_login_per_minute: int = 5
    rate_limit_contact_per_minute: int = 5

    # --- Embeddings ----------------------------------------------------------
    # "gemini" | "openai" (any OpenAI-compatible API) | "hashing" (offline, dev/test only)
    embedding_provider: Literal["gemini", "openai", "hashing"] = "hashing"
    embedding_model: str = "gemini-embedding-001"
    # MUST match the pgvector column dimension created by the Alembic migration.
    embedding_dim: int = 768

    # --- LLM -----------------------------------------------------------------
    # "gemini" | "openai" | "extractive" (no LLM; returns retrieved sentences verbatim)
    llm_provider: Literal["gemini", "openai", "extractive"] = "extractive"
    llm_model: str = "gemini-2.5-flash"
    # Comma-separated models tried in order when the primary one is overloaded (HTTP 429/5xx).
    llm_fallback_models: str = "gemini-flash-lite-latest"
    llm_temperature: float = 0.2
    # Generous because "thinking" models spend part of this budget before answering.
    llm_max_output_tokens: int = 1024
    ai_request_timeout_seconds: float = 20.0

    gemini_api_key: str | None = None
    gemini_base_url: str = "https://generativelanguage.googleapis.com/v1beta"
    openai_api_key: str | None = None
    openai_base_url: str = "https://api.openai.com/v1"

    # --- RAG -----------------------------------------------------------------
    rag_chunk_size: int = 800  # characters
    rag_chunk_overlap: int = 150  # characters
    rag_top_k: int = 5
    # Minimum cosine similarity for a chunk to count as relevant. When unset, a
    # sensible per-provider default is used (see `effective_similarity_threshold`).
    rag_similarity_threshold: float | None = None
    chat_max_question_chars: int = 500

    # --- Uploads -------------------------------------------------------------
    upload_max_bytes: int = 5 * 1024 * 1024

    @field_validator("database_url")
    @classmethod
    def _use_psycopg_driver(cls, v: str) -> str:
        # Neon/Render/Supabase give "postgres://" or "postgresql://" URLs; SQLAlchemy needs the driver name.
        for prefix in ("postgres://", "postgresql://"):
            if v.startswith(prefix):
                return "postgresql+psycopg://" + v[len(prefix):]
        return v

    @field_validator("rag_chunk_overlap")
    @classmethod
    def _overlap_smaller_than_chunk(cls, v: int, info):
        size = info.data.get("rag_chunk_size", 800)
        if v >= size:
            raise ValueError("RAG_CHUNK_OVERLAP must be smaller than RAG_CHUNK_SIZE")
        return v

    @property
    def cors_origin_list(self) -> list[str]:
        if self.cors_origins.strip() == "*":
            return ["*"]
        return [o.strip().rstrip("/") for o in self.cors_origins.split(",") if o.strip()]

    @property
    def llm_models(self) -> list[str]:
        """Primary model first, then the fallbacks (duplicates removed)."""
        models = [self.llm_model, *(m.strip() for m in self.llm_fallback_models.split(","))]
        return list(dict.fromkeys(m for m in models if m))

    @property
    def effective_similarity_threshold(self) -> float:
        if self.rag_similarity_threshold is not None:
            return self.rag_similarity_threshold
        # Lexical hashing vectors produce much lower cosine scores than neural embeddings.
        return {"hashing": 0.15, "gemini": 0.55, "openai": 0.35}[self.embedding_provider]

    @property
    def embedding_model_id(self) -> str:
        """Identifier stored with every chunk so vectors from different models never mix."""
        if self.embedding_provider == "hashing":
            return f"hashing-v2-{self.embedding_dim}"
        return f"{self.embedding_provider}:{self.embedding_model}:{self.embedding_dim}"

    def validate_production(self) -> None:
        if self.environment != "production":
            return
        if self.jwt_secret == INSECURE_DEV_SECRET or len(self.jwt_secret) < 32:
            raise RuntimeError("JWT_SECRET must be set to a random value of at least 32 characters in production")


@lru_cache
def get_settings() -> Settings:
    return Settings()
