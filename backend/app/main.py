import asyncio
import contextlib
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

from app.api.v1.router import api_router
from app.core.config import get_settings
from app.core.exceptions import register_exception_handlers
from app.core.logging import configure_logging


@asynccontextmanager
async def lifespan(_: FastAPI):
    """Start the automated WhatsApp reminder loop (not in tests: they call it directly)."""
    settings = get_settings()
    task = None
    if settings.reminders_enabled and settings.environment != "test":
        from app.services.reminders import reminder_loop

        task = asyncio.create_task(reminder_loop())
    yield
    if task:
        task.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await task


def create_app() -> FastAPI:
    settings = get_settings()
    settings.validate_production()
    configure_logging(settings.log_level)

    app = FastAPI(
        lifespan=lifespan,
        title=settings.app_name,
        version="1.0.0",
        description=(
            "API for RUA Skin & Hair Center: real-time online booking with automated WhatsApp "
            "notifications and reminders, a patient CRM, admin / doctor / patient portals, and an AI "
            "assistant (RAG over PostgreSQL + pgvector, with medical-safety rules)."
        ),
        docs_url="/docs",
        redoc_url="/redoc",
    )

    app.add_middleware(GZipMiddleware, minimum_size=1000)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_origin_regex=r"^https://.*\.onrender\.com$",
        allow_credentials=False,  # we use bearer tokens, not cookies
        allow_methods=["*"],
        allow_headers=["*"],
    )

    register_exception_handlers(app)
    app.include_router(api_router)

    @app.get("/", include_in_schema=False)
    def root() -> dict:
        return {"name": settings.app_name, "docs": "/docs", "health": "/api/v1/health"}

    return app


app = create_app()
