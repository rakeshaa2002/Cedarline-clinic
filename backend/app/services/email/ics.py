"""iCalendar (RFC 5545) invites so a booking lands in Google, Apple or Outlook calendars in one tap.

A confirmation is METHOD:REQUEST; a cancellation reuses the same UID with METHOD:CANCEL, which
removes the event from the patient's calendar. SEQUENCE increases with every update.
"""

from datetime import UTC, datetime
from zoneinfo import ZoneInfo

from app.core.config import get_settings
from app.models import Appointment, ClinicInfo

_FMT = "%Y%m%dT%H%M%SZ"


def _escape(value: str) -> str:
    return value.replace("\\", "\\\\").replace(";", "\\;").replace(",", "\\,").replace("\n", "\\n")


def _fold(line: str) -> str:
    """Lines longer than 75 octets continue on the next line after a single space."""
    out, current = [], ""
    for ch in line:
        if len((current + ch).encode()) > 74:
            out.append(current)
            current = " " + ch
        else:
            current += ch
    out.append(current)
    return "\r\n".join(out)


def build_ics(appointment: Appointment, clinic: ClinicInfo | None, *, cancel: bool = False) -> str:
    tz = ZoneInfo(get_settings().clinic_timezone)
    start = datetime.combine(appointment.appointment_date, appointment.start_time, tz).astimezone(UTC)
    end = datetime.combine(appointment.appointment_date, appointment.end_time, tz).astimezone(UTC)
    now = datetime.now(UTC)
    clinic_name = clinic.name if clinic else "Cedarline Multispeciality Clinic"
    address = f"{clinic.address_line}, {clinic.city} {clinic.postal_code}" if clinic else ""
    doctor = appointment.doctor
    description = (
        f"Booking reference: {appointment.reference}\n"
        f"Doctor: {doctor.full_name} ({doctor.specialization})\n"
        "Please arrive 10 minutes early and bring any previous reports."
        + (f"\nClinic phone: {clinic.phone}" if clinic else "")
    )
    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Cedarline Clinic//Appointments//EN",
        "CALSCALE:GREGORIAN",
        f"METHOD:{'CANCEL' if cancel else 'REQUEST'}",
        "BEGIN:VEVENT",
        f"UID:{appointment.reference}@cedarline-clinic",
        f"SEQUENCE:{int(now.timestamp())}",
        f"DTSTAMP:{now:{_FMT}}",
        f"DTSTART:{start:{_FMT}}",
        f"DTEND:{end:{_FMT}}",
        f"SUMMARY:{_escape(f'{clinic_name}: consultation with {doctor.full_name}')}",
        f"LOCATION:{_escape(address)}",
        f"DESCRIPTION:{_escape(description)}",
        f"STATUS:{'CANCELLED' if cancel else 'CONFIRMED'}",
    ]
    if clinic:
        lines.append(f"ORGANIZER;CN={_escape(clinic_name)}:mailto:{clinic.email}")
    lines.append(f"ATTENDEE;CN={_escape(appointment.patient_name)};ROLE=REQ-PARTICIPANT;RSVP=FALSE:mailto:{appointment.patient_email}")
    if not cancel:
        lines += [
            "BEGIN:VALARM",
            "TRIGGER:-PT2H",  # reminder two hours before the visit
            "ACTION:DISPLAY",
            f"DESCRIPTION:{_escape(f'Reminder: {clinic_name} appointment at {appointment.start_time:%I:%M %p}')}",
            "END:VALARM",
        ]
    lines += ["END:VEVENT", "END:VCALENDAR"]
    return "\r\n".join(_fold(line) for line in lines) + "\r\n"
