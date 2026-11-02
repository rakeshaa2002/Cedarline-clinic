"""WhatsApp message text for each automated notification.

Each builder returns (text, template_params). The text is what the patient reads (and what the CRM
timeline shows); template_params are the same values in order, for an approved WhatsApp template
when one is configured (WHATSAPP_TEMPLATE_<KIND>).
"""

from datetime import date, time, timedelta

from app.models import Appointment, ClinicInfo


def _when(day: date, start: time) -> str:
    return f"{day:%a, %d %b %Y} at {start.strftime('%I:%M %p').lstrip('0')}"


def _centre(a: Appointment) -> str:
    return a.branch.name if a.branch else "RUA Skin & Hair Center"


def _centre_phone(a: Appointment, clinic: ClinicInfo | None) -> str:
    if a.branch:
        return a.branch.phone
    return clinic.phone if clinic else ""


def _directions(a: Appointment) -> str:
    return f"\nDirections: {a.branch.map_url}" if a.branch and a.branch.map_url else ""


def appointment_message(
    kind: str, a: Appointment, clinic: ClinicInfo | None, site_url: str, today: date | None = None
) -> tuple[str, list[str]]:
    name = (a.patient_name or "there").split(" ")[0]
    doctor = a.doctor.full_name
    when = _when(a.appointment_date, a.start_time)
    centre = _centre(a)
    phone = _centre_phone(a, clinic)

    if kind == "received":
        text = (
            f"Hello {name}, thank you for booking with RUA Skin & Hair Center.\n\n"
            f"Booking ref: {a.reference}\nDoctor: {doctor}\nWhen: {when}\nCentre: {centre}\n\n"
            "Your slot is held. Our front desk will confirm it shortly here on WhatsApp. "
            f"To change anything, reply to this message or call {phone}."
        )
        return text, [name, a.reference, doctor, when, centre]
    if kind == "confirmation":
        text = (
            f"Hello {name}, your appointment is confirmed ✅\n\n"
            f"Booking ref: {a.reference}\nDoctor: {doctor}\nWhen: {when}\nCentre: {centre}{_directions(a)}\n\n"
            "Please arrive 10 minutes early and bring any previous prescriptions or reports. "
            f"Need to reschedule? Call {phone}."
        )
        return text, [name, a.reference, doctor, when, centre]
    if kind == "reschedule":
        text = (
            f"Hello {name}, your RUA appointment has been moved.\n\n"
            f"Booking ref: {a.reference}\nNew time: {when}\nDoctor: {doctor}\nCentre: {centre}\n\n"
            f"If this doesn't suit you, call {phone} and we'll find another time."
        )
        return text, [name, a.reference, when, doctor, centre]
    if kind == "cancellation":
        reason = a.cancellation_reason or "the clinic had to cancel this slot"
        text = (
            f"Hello {name}, your appointment {a.reference} on {when} has been cancelled ({reason}).\n\n"
            f"We're sorry for the inconvenience. Book a new time at {site_url}/book-appointment or call {phone}."
        )
        return text, [name, a.reference, when, reason, phone]
    if kind == "reminder":
        relative = ""
        if today is not None:
            relative = {today: "today, ", today + timedelta(days=1): "tomorrow, "}.get(a.appointment_date, "")
        text = (
            f"Reminder from RUA Skin & Hair Center: hello {name}, your appointment with {doctor} is {relative}{when} "
            f"at {centre}.{_directions(a)}\n\nBooking ref: {a.reference}. To reschedule, call {phone}."
        )
        return text, [name, doctor, when, centre, a.reference]
    raise ValueError(f"Unknown appointment message kind: {kind}")


def otp_message(code: str) -> tuple[str, list[str]]:
    text = f"{code} is your RUA Skin & Hair Center login code. It expires in 10 minutes. Do not share it with anyone."
    return text, [code]
