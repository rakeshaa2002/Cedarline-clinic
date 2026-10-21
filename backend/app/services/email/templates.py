"""Patient emails as HTML + plain text.

Email clients ignore most CSS, so the layout is tables with inline styles (renders the same in
Gmail, Apple Mail and Outlook) and buttons are table cells, not styled links. Every value that
came from a patient or admin is HTML-escaped.
"""

from dataclasses import dataclass, field
from html import escape
from urllib.parse import quote

from app.models import Appointment, ClinicInfo

BRAND = "#135a5f"
INK = "#0d2139"
MUTED = "#55657a"
LINE = "#e3e9ef"


@dataclass
class Attachment:
    filename: str
    content: bytes
    maintype: str
    subtype: str
    params: dict[str, str] = field(default_factory=dict)


@dataclass
class OutgoingEmail:
    to: str
    subject: str
    html: str
    text: str
    attachments: list[Attachment] = field(default_factory=list)


def _button(label: str, href: str, *, primary: bool = True) -> str:
    bg, fg, border = (BRAND, "#ffffff", BRAND) if primary else ("#ffffff", BRAND, "#a9dbdc")
    return (
        '<table role="presentation" cellpadding="0" cellspacing="0" style="display:inline-table;margin:0 8px 8px 0">'
        f'<tr><td style="background:{bg};border:1px solid {border};border-radius:10px;vertical-align:middle">'
        f'<a href="{escape(href)}" style="display:inline-block;padding:12px 20px;font:600 14px Arial,sans-serif;'
        f'color:{fg};text-decoration:none;vertical-align:middle">{escape(label)}</a></td></tr></table>'
    )


def _details(rows: list[tuple[str, str]]) -> str:
    cells = "".join(
        f'<tr><td style="padding:8px 0;font:13px Arial,sans-serif;color:{MUTED};width:38%;vertical-align:top">{escape(k)}</td>'
        f'<td style="padding:8px 0;font:600 14px Arial,sans-serif;color:{INK};vertical-align:top">{escape(v)}</td></tr>'
        for k, v in rows
    )
    return (
        f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid {LINE};'
        f'border-bottom:1px solid {LINE};margin:20px 0">{cells}</table>'
    )


def _layout(clinic: ClinicInfo | None, preheader: str, heading: str, body: str) -> str:
    name = escape(clinic.name if clinic else "Cedarline Multispeciality Clinic")
    footer = (
        f"{name}<br>{escape(clinic.address_line)}, {escape(clinic.city)} {escape(clinic.postal_code)}<br>"
        f"{escape(clinic.phone)} · {escape(clinic.email)}"
        if clinic else name
    )
    return f"""<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{escape(heading)}</title></head>
<body style="margin:0;padding:0;background:#f3f6f8">
<span style="display:none!important;max-height:0;overflow:hidden;opacity:0">{escape(preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f6f8;padding:24px 12px">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid {LINE}">
<tr><td style="background:{BRAND};padding:22px 28px;font:700 18px Arial,sans-serif;color:#ffffff">{name}</td></tr>
<tr><td style="padding:28px">
<h1 style="margin:0 0 12px;font:700 22px Arial,sans-serif;color:{INK}">{escape(heading)}</h1>
{body}
</td></tr>
<tr><td style="padding:18px 28px;background:#f8fafb;border-top:1px solid {LINE};font:12px/1.6 Arial,sans-serif;color:{MUTED}">
{footer}<br>This is general clinic information, not medical advice. In an emergency call 112.
</td></tr>
</table></td></tr></table></body></html>"""


def _p(text: str) -> str:
    return f'<p style="margin:0 0 12px;font:15px/1.6 Arial,sans-serif;color:{INK}">{text}</p>'


def appointment_email(kind: str, appointment: Appointment, clinic: ClinicInfo | None, site_url: str) -> OutgoingEmail:
    """Build the "received", "confirmation" or "cancellation" email (the .ics is attached by the caller)."""
    a = appointment
    first_name = escape(a.patient_name.split()[0])
    when_date = f"{a.appointment_date:%A, %d %B %Y}"
    when_time = f"{a.start_time:%I:%M %p}".lstrip("0") + " – " + f"{a.end_time:%I:%M %p}".lstrip("0")
    doctor = f"{a.doctor.full_name} ({a.doctor.specialization})"
    rows = [("Reference", a.reference), ("Doctor", doctor), ("Date", when_date), ("Time", when_time)]
    if a.consultation_fee is not None:
        rows.append(("Consultation fee", f"₹{a.consultation_fee:,.0f} (payable at the clinic)"))
    reschedule = f"{site_url}/appointments?doctor={a.doctor.slug}#book"
    address = f"{clinic.address_line}, {clinic.city} {clinic.postal_code}" if clinic else ""
    directions = f"https://www.google.com/maps/search/?api=1&query={quote(address)}" if address else f"{site_url}/contact"
    phone = clinic.phone if clinic else ""

    if kind == "received":
        subject = f"We've received your appointment request · {a.reference}"
        heading = "Request received"
        intro = (
            f"Hi {first_name}, thank you for choosing us. Your appointment request is with our front desk. "
            "We'll email you as soon as it's confirmed, usually within a few working hours."
        )
        body = _p(intro) + _details(rows) + _button("Clinic location", directions, primary=False)
        text_extra = "We'll email you once the front desk confirms your slot."
    elif kind == "confirmation":
        subject = f"Confirmed: {a.appointment_date:%d %b} at {a.start_time:%I:%M %p} with {a.doctor.full_name} · {a.reference}"
        heading = "Your appointment is confirmed"
        intro = f"Hi {first_name}, you're all set. We've attached a calendar invite with a reminder two hours before your visit."
        tips = _p(
            "<strong>Before your visit:</strong> please arrive 10 minutes early and bring a photo ID and any "
            "previous prescriptions or reports."
        )
        body = (
            _p(intro) + _details(rows) + tips
            + _button("Get directions", directions) + _button("Need to change? Reschedule", reschedule, primary=False)
        )
        text_extra = "A calendar invite is attached. Please arrive 10 minutes early."
    elif kind == "cancellation":
        subject = f"Appointment cancelled · {a.reference}"
        heading = "Your appointment has been cancelled"
        reason = escape(a.cancellation_reason or "The clinic had to cancel this slot.")
        intro = (
            f"Hi {first_name}, we're sorry, but we had to cancel your appointment with {escape(a.doctor.full_name)}."
        )
        body = (
            _p(intro) + _p(f"<strong>Reason:</strong> {reason}") + _details(rows)
            + _p("You can pick a new time in under a minute. The link opens the booking form with the same doctor selected.")
            + _button("Choose a new time", reschedule)
        )
        text_extra = f"Reason: {a.cancellation_reason or 'The clinic had to cancel this slot.'}\nBook a new time: {reschedule}"
    else:
        raise ValueError(f"Unknown email kind: {kind}")

    text = (
        f"{heading}\n\n"
        + "\n".join(f"{k}: {v}" for k, v in rows)
        + f"\n\n{text_extra}\n\nReschedule: {reschedule}\nDirections: {directions}"
        + (f"\nQuestions? Call {phone}." if phone else "")
    )
    html = _layout(clinic, preheader=f"{heading} · {when_date}, {when_time}", heading=heading, body=body)
    return OutgoingEmail(to=a.patient_email, subject=subject, html=html, text=text)
