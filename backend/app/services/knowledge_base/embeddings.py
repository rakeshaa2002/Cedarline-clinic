"""Embedding providers.

* GeminiEmbedder  – Google `gemini-embedding-001` (or any Gemini embedding model) via REST.
* OpenAIEmbedder  – any OpenAI-compatible `/embeddings` endpoint.
* HashingEmbedder – deterministic, offline, lexical vectors. For local development,
                    demos without an API key, and automated tests. Not a neural model.

Every provider returns L2-normalised vectors of exactly `settings.embedding_dim`
values, which is the dimension of the pgvector column. A mismatch raises an error
rather than silently storing unusable vectors.
"""

import hashlib
import logging
import math
import re
import time
from functools import lru_cache
from typing import Protocol

import httpx

from app.core.config import Settings, get_settings

logger = logging.getLogger(__name__)


class EmbeddingError(Exception):
    """The embedding provider failed or returned unusable output."""


class Embedder(Protocol):
    model_id: str

    def embed_documents(self, texts: list[str]) -> list[list[float]]: ...

    def embed_query(self, text: str) -> list[float]: ...


def _normalise(vector: list[float]) -> list[float]:
    norm = math.sqrt(sum(v * v for v in vector))
    return [v / norm for v in vector] if norm else vector


def _check_dims(vectors: list[list[float]], dim: int) -> list[list[float]]:
    for v in vectors:
        if len(v) != dim:
            raise EmbeddingError(
                f"Embedding has {len(v)} dimensions but the database expects {dim}. "
                "Set EMBEDDING_DIM to match the model and re-run migrations."
            )
    return [_normalise(v) for v in vectors]


# --------------------------------------------------------------------------------------
# Offline lexical embedder
# --------------------------------------------------------------------------------------

_STOPWORDS = set(
    """a an and are as at be but by can could do does for from had has have how i if in into is it
    its me my of on or our please should so tell than that the their them then there these they this
    to us was we what when which who will with would you your yours about any also get""".split()
)

# Map common phrasings onto one canonical token so "timings" matches "opening hours".
_CANONICAL = {
    **dict.fromkeys(["hour", "hours", "timing", "timings", "open", "opening", "opens", "close", "closing", "closed", "working"], "hours"),
    **dict.fromkeys(["where", "located", "location", "address", "situated", "direction", "directions", "map", "reach"], "location"),
    **dict.fromkeys(["appointment", "appointments", "book", "booking", "reserve", "consultation", "slot", "slots"], "appointment"),
    **dict.fromkeys(["doctor", "doctors", "dr", "physician", "physicians", "specialist", "specialists", "consultant"], "doctor"),
    **dict.fromkeys(["dental", "dentist", "dentists", "teeth", "tooth", "oral", "dentistry"], "dental"),
    **dict.fromkeys(["skin", "dermatology", "dermatologist", "derma", "dermatological"], "skin"),
    **dict.fromkeys(["hair", "trichology", "trichologist", "scalp"], "hair"),
    **dict.fromkeys(["price", "prices", "cost", "costs", "fee", "fees", "charge", "charges", "pricing", "expensive"], "price"),
    **dict.fromkeys(["phone", "call", "telephone", "email", "contact", "whatsapp"], "contact"),
    **dict.fromkeys(["service", "services", "treatment", "treatments", "procedure", "procedures", "offer", "offered", "provide"], "service"),
    **dict.fromkeys(["child", "children", "kid", "kids", "pediatric", "paediatric", "pediatrics"], "pediatrics"),
    **dict.fromkeys(["cancel", "cancellation", "reschedule", "rescheduling"], "cancel"),
    **dict.fromkeys(["insurance", "insurer", "cashless", "tpa"], "insurance"),
    **dict.fromkeys(["pay", "payment", "payments", "upi", "card", "cards", "cash"], "payment"),
    **dict.fromkeys(["park", "parking"], "parking"),
}

_TOKEN_RE = re.compile(r"[a-z0-9]+")


def _stem(token: str) -> str:
    for suffix, replacement in (("ies", "y"), ("ing", ""), ("ed", ""), ("es", ""), ("s", "")):
        if token.endswith(suffix) and len(token) - len(suffix) >= 4:
            return token[: -len(suffix)] + replacement
    return token


def lexical_terms(text: str) -> list[str]:
    terms = []
    for raw in _TOKEN_RE.findall(text.lower()):
        if raw in _STOPWORDS or len(raw) < 2:
            continue
        terms.append(_CANONICAL.get(raw) or _stem(raw))
    return terms


class HashingEmbedder:
    """Feature-hashed bag of words + bigrams, sublinear TF, signed buckets."""

    def __init__(self, dim: int):
        self.dim = dim
        self.model_id = f"hashing-v2-{dim}"

    HASHES_PER_FEATURE = 2  # spreading each feature over 2 buckets stops one collision erasing it

    def _buckets(self, feature: str) -> list[tuple[int, float]]:
        digest = hashlib.blake2b(feature.encode(), digest_size=8 * self.HASHES_PER_FEATURE).digest()
        buckets = []
        for i in range(self.HASHES_PER_FEATURE):
            value = int.from_bytes(digest[i * 8 : (i + 1) * 8], "big")
            buckets.append((value % self.dim, 1.0 if (value >> 63) & 1 else -1.0))
        return buckets

    def _embed(self, text: str) -> list[float]:
        terms = lexical_terms(text)
        counts: dict[str, float] = {}
        for t in terms:
            counts[t] = counts.get(t, 0) + 1.0
        for a, b in zip(terms, terms[1:]):
            key = f"{a}_{b}"
            counts[key] = counts.get(key, 0) + 0.5
        vector = [0.0] * self.dim
        for feature, tf in counts.items():
            weight = 1.0 + math.log(tf) if tf >= 1 else tf  # sublinear term frequency
            for index, sign in self._buckets(feature):
                vector[index] += sign * weight
        return _normalise(vector)

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        return [self._embed(t) for t in texts]

    def embed_query(self, text: str) -> list[float]:
        return self._embed(text)


# --------------------------------------------------------------------------------------
# Hosted providers
# --------------------------------------------------------------------------------------


def _retry_after(resp: httpx.Response) -> float:
    """Seconds the API asked us to wait (Retry-After header or Gemini's RetryInfo), else 0."""
    try:
        if header := resp.headers.get("retry-after"):
            return float(header)
        for detail in resp.json().get("error", {}).get("details", []):
            if str(detail.get("@type", "")).endswith("RetryInfo"):
                return float(str(detail.get("retryDelay", "0s")).rstrip("s"))
    except (ValueError, AttributeError):
        pass
    return 0.0


class GeminiEmbedder:
    BATCH = 100  # API limit per batchEmbedContents call
    RETRY_DELAYS: tuple[float, ...] = (1.0, 3.0)  # short back-off on HTTP 429/503 (rate limit / overload)
    INDEX_RETRY_DELAYS: tuple[float, ...] = (5.0, 20.0, 60.0, 60.0)  # free tier quotas are per minute

    def __init__(self, settings: Settings, client: httpx.Client | None = None):
        if not settings.gemini_api_key:
            raise EmbeddingError("GEMINI_API_KEY is not configured.")
        self.settings = settings
        self.model = settings.embedding_model.removeprefix("models/")
        self.model_id = settings.embedding_model_id
        self.client = client or httpx.Client(timeout=settings.ai_request_timeout_seconds)

    def _batch(self, texts: list[str], task_type: str) -> list[list[float]]:
        url = f"{self.settings.gemini_base_url}/models/{self.model}:batchEmbedContents"
        body = {
            "requests": [
                {
                    "model": f"models/{self.model}",
                    "content": {"parts": [{"text": t}]},
                    "taskType": task_type,
                    "outputDimensionality": self.settings.embedding_dim,
                }
                for t in texts
            ]
        }
        # Indexing can afford to wait out a per-minute quota; a live chat query cannot.
        delays = self.INDEX_RETRY_DELAYS if task_type == "RETRIEVAL_DOCUMENT" else self.RETRY_DELAYS
        try:
            for delay in (*delays, None):
                resp = self.client.post(url, json=body, headers={"x-goog-api-key": self.settings.gemini_api_key})
                if resp.status_code not in (429, 503) or delay is None:
                    break
                delay = max(delay, min(_retry_after(resp), 65.0))
                logger.warning("Gemini embedding HTTP %s, retrying in %.0fs", resp.status_code, delay)
                time.sleep(delay)
            resp.raise_for_status()
            return [e["values"] for e in resp.json()["embeddings"]]
        except httpx.HTTPStatusError as exc:
            logger.warning("Gemini embedding failed with HTTP %s", exc.response.status_code)
            raise EmbeddingError(f"Embedding API returned HTTP {exc.response.status_code}") from exc
        except (httpx.HTTPError, KeyError, ValueError) as exc:
            logger.warning("Gemini embedding failed: %s", type(exc).__name__)
            raise EmbeddingError("Embedding API request failed") from exc

    def _embed(self, texts: list[str], task_type: str) -> list[list[float]]:
        vectors: list[list[float]] = []
        for i in range(0, len(texts), self.BATCH):
            vectors.extend(self._batch(texts[i : i + self.BATCH], task_type))
        return _check_dims(vectors, self.settings.embedding_dim)

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        return self._embed(texts, "RETRIEVAL_DOCUMENT")

    def embed_query(self, text: str) -> list[float]:
        return self._embed([text], "RETRIEVAL_QUERY")[0]


class OpenAIEmbedder:
    BATCH = 100

    def __init__(self, settings: Settings, client: httpx.Client | None = None):
        if not settings.openai_api_key:
            raise EmbeddingError("OPENAI_API_KEY is not configured.")
        self.settings = settings
        self.model_id = settings.embedding_model_id
        self.client = client or httpx.Client(timeout=settings.ai_request_timeout_seconds)

    def _embed(self, texts: list[str]) -> list[list[float]]:
        vectors: list[list[float]] = []
        for i in range(0, len(texts), self.BATCH):
            body = {
                "model": self.settings.embedding_model,
                "input": texts[i : i + self.BATCH],
                "dimensions": self.settings.embedding_dim,
            }
            try:
                resp = self.client.post(
                    f"{self.settings.openai_base_url}/embeddings",
                    json=body,
                    headers={"Authorization": f"Bearer {self.settings.openai_api_key}"},
                )
                resp.raise_for_status()
                data = sorted(resp.json()["data"], key=lambda d: d["index"])
                vectors.extend(d["embedding"] for d in data)
            except httpx.HTTPStatusError as exc:
                raise EmbeddingError(f"Embedding API returned HTTP {exc.response.status_code}") from exc
            except (httpx.HTTPError, KeyError, ValueError) as exc:
                raise EmbeddingError("Embedding API request failed") from exc
        return _check_dims(vectors, self.settings.embedding_dim)

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        return self._embed(texts)

    def embed_query(self, text: str) -> list[float]:
        return self._embed([text])[0]


@lru_cache
def _build_embedder(provider: str) -> Embedder:
    settings = get_settings()
    if provider == "gemini":
        return GeminiEmbedder(settings)
    if provider == "openai":
        return OpenAIEmbedder(settings)
    return HashingEmbedder(settings.embedding_dim)


def get_embedder() -> Embedder:
    """FastAPI dependency (overridable in tests) returning the configured embedder."""
    from app.core.exceptions import ServiceUnavailableError

    try:
        return _build_embedder(get_settings().embedding_provider)
    except EmbeddingError as exc:
        logger.error("Embedding provider misconfigured: %s", exc)
        raise ServiceUnavailableError(
            "The clinic assistant is not configured yet. Please contact the clinic directly."
        ) from exc
