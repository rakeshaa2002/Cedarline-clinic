"""Convenience entry point so `uvicorn main:app --reload` works from the backend folder.

The application itself lives in `app/main.py`; this just re-exports it.
"""

from app.main import app

__all__ = ["app"]
