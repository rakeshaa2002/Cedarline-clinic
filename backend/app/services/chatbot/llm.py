"""LLM providers for answer generation (Gemini or any OpenAI-compatible API)."""

import logging
from functools import lru_cache
from typing import Protocol

import httpx

from app.core.config import Settings, get_settings

logger = logging.getLogger(__name__)


class LLMError(Exception):
    """The LLM provider failed, timed out, or returned no usable text."""


_TRANSIENT_STATUSES = {429, 500, 502, 503, 504}


class _Overloaded(Exception):
    """A transient provider error: worth trying the next fallback model."""

    def __init__(self, status: int):
        super().__init__(f"HTTP {status}")
        self.status = status


class LLMProvider(Protocol):
    name: str

    def generate(self, system: str, messages: list[dict]) -> str: ...


class GeminiLLM:
    def __init__(self, settings: Settings, client: httpx.Client | None = None):
        if not settings.gemini_api_key:
            raise LLMError("GEMINI_API_KEY is not configured.")
        self.settings = settings
        self.name = f"gemini:{settings.llm_model}"
        self.client = client or httpx.Client(timeout=settings.ai_request_timeout_seconds)

    def generate(self, system: str, messages: list[dict]) -> str:
        s = self.settings
        body = {
            "systemInstruction": {"parts": [{"text": system}]},
            "contents": [
                {"role": "model" if m["role"] == "assistant" else "user", "parts": [{"text": m["content"]}]}
                for m in messages
            ],
            "generationConfig": {"temperature": s.llm_temperature, "maxOutputTokens": s.llm_max_output_tokens},
        }
        models = s.llm_models
        for i, model in enumerate(models):
            try:
                return self._generate(model, body)
            except _Overloaded as exc:
                if i == len(models) - 1:
                    raise LLMError(f"LLM returned HTTP {exc.status}") from exc
                logger.warning("Gemini model %s overloaded (HTTP %s), trying %s", model, exc.status, models[i + 1])
        raise LLMError("No LLM model configured")

    def _generate(self, model: str, body: dict) -> str:
        s = self.settings
        url = f"{s.gemini_base_url}/models/{model}:generateContent"
        try:
            resp = self.client.post(url, json=body, headers={"x-goog-api-key": s.gemini_api_key})
            resp.raise_for_status()
            data = resp.json()
        except httpx.HTTPStatusError as exc:
            status = exc.response.status_code
            logger.warning("Gemini generation failed with HTTP %s", status)
            if status in _TRANSIENT_STATUSES:
                raise _Overloaded(status) from exc
            raise LLMError(f"LLM returned HTTP {status}") from exc
        except (httpx.HTTPError, ValueError) as exc:
            logger.warning("Gemini generation failed: %s", type(exc).__name__)
            raise LLMError("LLM request failed") from exc

        candidates = data.get("candidates") or []
        if not candidates:
            raise LLMError("LLM returned no candidates (possibly blocked)")
        parts = (candidates[0].get("content") or {}).get("parts") or []
        text = "".join(p.get("text", "") for p in parts if not p.get("thought")).strip()
        if not text:
            raise LLMError(f"LLM returned empty text (finishReason={candidates[0].get('finishReason')})")
        return text


class OpenAICompatibleLLM:
    def __init__(self, settings: Settings, client: httpx.Client | None = None):
        if not settings.openai_api_key:
            raise LLMError("OPENAI_API_KEY is not configured.")
        self.settings = settings
        self.name = f"openai:{settings.llm_model}"
        self.client = client or httpx.Client(timeout=settings.ai_request_timeout_seconds)

    def generate(self, system: str, messages: list[dict]) -> str:
        s = self.settings
        body = {
            "model": s.llm_model,
            "messages": [{"role": "system", "content": system}, *messages],
            "temperature": s.llm_temperature,
            "max_tokens": s.llm_max_output_tokens,
        }
        try:
            resp = self.client.post(
                f"{s.openai_base_url}/chat/completions",
                json=body,
                headers={"Authorization": f"Bearer {s.openai_api_key}"},
            )
            resp.raise_for_status()
            text = (resp.json()["choices"][0]["message"]["content"] or "").strip()
        except httpx.HTTPStatusError as exc:
            raise LLMError(f"LLM returned HTTP {exc.response.status_code}") from exc
        except (httpx.HTTPError, KeyError, IndexError, ValueError) as exc:
            raise LLMError("LLM request failed") from exc
        if not text:
            raise LLMError("LLM returned empty text")
        return text


@lru_cache
def _build_llm(provider: str) -> LLMProvider | None:
    settings = get_settings()
    if provider == "gemini":
        return GeminiLLM(settings)
    if provider == "openai":
        return OpenAICompatibleLLM(settings)
    return None  # "extractive": answer from retrieved text without an LLM


def get_llm() -> LLMProvider | None:
    """FastAPI dependency (overridable in tests). None means extractive mode."""
    try:
        return _build_llm(get_settings().llm_provider)
    except LLMError as exc:
        # Misconfiguration: fall back to extractive answers rather than failing every request.
        logger.error("LLM provider unavailable, using extractive answers: %s", exc)
        return None
