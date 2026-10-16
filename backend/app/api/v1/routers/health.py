import logging

from fastapi import APIRouter, Response, status
from sqlalchemy import text

from app.api.deps import DbSession

router = APIRouter(tags=["health"])
logger = logging.getLogger(__name__)


@router.get("/health")
def health(db: DbSession, response: Response) -> dict:
    """Liveness + database connectivity check (used by Docker and the hosting platform)."""
    try:
        db.execute(text("SELECT 1"))
        database = "ok"
    except Exception:  # noqa: BLE001 - report, don't crash the health check
        logger.exception("Database health check failed")
        database = "unavailable"
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    return {"status": "ok" if database == "ok" else "degraded", "database": database}
