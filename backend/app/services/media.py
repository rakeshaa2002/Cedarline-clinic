"""Image uploads for doctor photos, blog covers and before/after cases.

With CLOUDINARY_* configured, images go to Cloudinary and are served from its CDN with automatic
format/quality optimisation. Otherwise they are stored in PostgreSQL and served by
GET /api/v1/media/{id}, which works on any host (Render's disk is not persistent).
"""

import hashlib
import time

import httpx
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.exceptions import ServiceUnavailableError, ValidationFailedError
from app.models import MediaFile

# The file's own bytes decide its type; the browser-supplied content type is not trusted.
_SIGNATURES = {
    b"\xff\xd8\xff": "image/jpeg",
    b"\x89PNG\r\n\x1a\n": "image/png",
    b"GIF87a": "image/gif",
    b"GIF89a": "image/gif",
}


def sniff_image_type(data: bytes) -> str | None:
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "image/webp"
    return next((kind for sig, kind in _SIGNATURES.items() if data.startswith(sig)), None)


def _cloudinary_upload(filename: str, data: bytes) -> str:
    s = get_settings()
    timestamp = str(int(time.time()))
    to_sign = f"folder={s.cloudinary_folder}&timestamp={timestamp}{s.cloudinary_api_secret}"
    try:
        resp = httpx.post(
            f"https://api.cloudinary.com/v1_1/{s.cloudinary_cloud_name}/image/upload",
            data={
                "api_key": s.cloudinary_api_key,
                "timestamp": timestamp,
                "folder": s.cloudinary_folder,
                "signature": hashlib.sha1(to_sign.encode()).hexdigest(),  # noqa: S324 - Cloudinary's signing scheme
            },
            files={"file": (filename, data)},
            timeout=s.ai_request_timeout_seconds,
        )
        resp.raise_for_status()
        url: str = resp.json()["secure_url"]
    except (httpx.HTTPError, KeyError, ValueError) as exc:
        raise ServiceUnavailableError("The image could not be uploaded to Cloudinary. Please try again.") from exc
    # Serve WebP/AVIF at a sensible quality and size, chosen per browser by Cloudinary.
    return url.replace("/image/upload/", "/image/upload/f_auto,q_auto,c_limit,w_1600/", 1)


def store_image(db: Session, filename: str, data: bytes) -> str:
    """Validate and store an image; returns the URL to save on the record."""
    settings = get_settings()
    if not data:
        raise ValidationFailedError("The file is empty.")
    if len(data) > settings.upload_max_bytes:
        raise ValidationFailedError(f"Images must be under {settings.upload_max_bytes // (1024 * 1024)} MB.")
    content_type = sniff_image_type(data)
    if content_type is None:
        raise ValidationFailedError("Please upload a JPEG, PNG, WebP or GIF image.")
    safe_name = (filename or "image").rsplit("/", 1)[-1].rsplit("\\", 1)[-1][:200]

    if settings.cloudinary_configured:
        return _cloudinary_upload(safe_name, data)
    media = MediaFile(filename=safe_name, content_type=content_type, size_bytes=len(data), data=data)
    db.add(media)
    db.commit()
    return f"/api/v1/media/{media.id}"
