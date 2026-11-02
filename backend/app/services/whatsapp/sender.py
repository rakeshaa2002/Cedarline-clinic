"""Low-level delivery through the Meta WhatsApp Business Cloud API."""

import httpx

from app.core.config import get_settings


class WhatsAppError(RuntimeError):
    pass


def deliver(to_e164: str, text: str, *, template: str | None = None, params: list[str] | None = None) -> str:
    """Send one message and return the provider message id. Raises WhatsAppError on failure."""
    settings = get_settings()
    url = f"https://graph.facebook.com/{settings.whatsapp_api_version}/{settings.whatsapp_phone_number_id}/messages"
    to = to_e164.lstrip("+")
    if template:
        payload = {
            "messaging_product": "whatsapp",
            "to": to,
            "type": "template",
            "template": {
                "name": template,
                "language": {"code": settings.whatsapp_template_language},
                "components": [{"type": "body", "parameters": [{"type": "text", "text": p} for p in params or []]}],
            },
        }
    else:
        payload = {"messaging_product": "whatsapp", "to": to, "type": "text", "text": {"preview_url": True, "body": text}}
    try:
        response = httpx.post(
            url,
            json=payload,
            headers={"Authorization": f"Bearer {settings.whatsapp_access_token}"},
            timeout=settings.whatsapp_timeout_seconds,
        )
    except httpx.HTTPError as exc:
        raise WhatsAppError(f"Network error: {exc}") from exc
    if response.status_code >= 400:
        try:
            detail = response.json().get("error", {}).get("message", response.text)
        except ValueError:
            detail = response.text
        raise WhatsAppError(f"HTTP {response.status_code}: {detail}"[:500])
    messages = response.json().get("messages") or [{}]
    return str(messages[0].get("id", ""))
