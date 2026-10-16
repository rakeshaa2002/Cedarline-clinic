"""A small in-memory sliding-window rate limiter used as a FastAPI dependency.

Good enough for a single API instance. With several instances behind a load
balancer the limits apply per instance; swap the store for Redis in that case.
"""

import threading
import time
from collections import defaultdict, deque

from fastapi import HTTPException, Request, status


class SlidingWindowLimiter:
    def __init__(self) -> None:
        self._hits: dict[str, deque[float]] = defaultdict(deque)
        self._lock = threading.Lock()

    def hit(self, key: str, limit: int, window_seconds: float = 60.0) -> float | None:
        """Record a request. Returns None if allowed, else seconds until a slot frees up."""
        now = time.monotonic()
        with self._lock:
            hits = self._hits[key]
            while hits and hits[0] <= now - window_seconds:
                hits.popleft()
            if len(hits) >= limit:
                return max(0.0, window_seconds - (now - hits[0]))
            hits.append(now)
            return None

    def reset(self) -> None:
        with self._lock:
            self._hits.clear()


limiter = SlidingWindowLimiter()


def client_ip(request: Request) -> str:
    # Hosting platforms (Render, etc.) put the real client IP first in X-Forwarded-For.
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def rate_limit(bucket: str, per_minute_setting: str):
    """Build a dependency limiting `bucket` to settings.<per_minute_setting> requests/minute/IP."""

    def dependency(request: Request) -> None:
        from app.core.config import get_settings

        limit = getattr(get_settings(), per_minute_setting)
        retry_after = limiter.hit(f"{bucket}:{client_ip(request)}", limit)
        if retry_after is not None:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many requests. Please wait a moment and try again.",
                headers={"Retry-After": str(int(retry_after) + 1)},
            )

    return dependency
