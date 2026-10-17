from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

from app.api.v1.router import api_router
from app.core.config import get_settings
from app.core.exceptions import register_exception_handlers
from app.core.logging import configure_logging


def create_app() -> FastAPI:
    settings = get_settings()
    settings.validate_production()
    configure_logging(settings.log_level)

    app = FastAPI(
        title=settings.app_name,
        version="1.0.0",
        description=(
            "API for the Cedarline Multispeciality Clinic website: an AI healthcare chatbot "
            "(RAG over PostgreSQL + pgvector, with medical-safety rules), clinic content, "
            "and an admin dashboard for the chatbot's knowledge base."
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
