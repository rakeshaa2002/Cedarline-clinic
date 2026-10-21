"""Live clinic directory: doctors, prices, timings and booking straight from the database.

Vector search returns the handful of most similar chunks. That suits policies and
articles, but it can cut a list short ("which doctors do you have?" may retrieve
three of nine profiles) and it lags behind admin edits until the next re-index.
For structured questions the assistant therefore also reads the live tables:

    question (+ recent turns for follow-ups like "what's her fee?")
      │ analyse()     topics, department, doctors and services mentioned
      │ context()     complete, current facts added to the LLM prompt
      │ answer()      the same facts as a formatted reply when no LLM answer is usable
      ▼ cards() / actions() / suggestions()   doctor cards, booking links, follow-up chips
"""

import re
from collections.abc import Collection
from dataclasses import dataclass, field
from datetime import datetime, time
from decimal import Decimal
from zoneinfo import ZoneInfo

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models import ClinicInfo, Doctor, Service
from app.schemas.chat import ChatAction, ChatDoctor, ChatSuggestion, ChatTurn
from app.services.chatbot.safety import department_hint
from app.services.knowledge_base.system_documents import DEPARTMENT_LABELS, DEPARTMENT_PAGES, WEEKDAYS

LIVE_SOURCE_TITLE = "Live clinic directory"

BOOK = ChatAction(label="Book an Appointment", href="/appointments")
CONTACT = ChatAction(label="Directions & Contact", href="/contact")

_TOPICS = {
    "doctors": re.compile(
        r"\b(doctors?|dr\.?|dentists?|dermatologists?|trichologists?|specialists?|surgeons?|physicians?|"
        r"paediatricians?|pediatricians?|orthodontists?|consultants?|who (treats|does|handles|sees))\b",
        re.I,
    ),
    "prices": re.compile(r"(₹|\b(price\w*|cost\w*|fees?|charges?|rates?|how much|expensive|cheap\w*|afford\w*|inr|rupees?)\b)", re.I),
    "services": re.compile(r"\b(services?|treatments?|procedures?|therap\w*|offer\w*|provide\w*|do you (do|treat))\b", re.I),
    "timings": re.compile(
        r"\b(timings?|hours?|open\w*|clos\w*|when|days?|today|tomorrow|weekends?|available|availability|"
        r"monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b",
        re.I,
    ),
    "location": re.compile(r"\b(where|located|location|address|directions?|map|parking|reach|contact|phone|call|email|whatsapp)\b", re.I),
    "booking": re.compile(r"\b(book\w*|appointments?|schedul\w*|reserve|slots?|visit)\b", re.I),
}

# Terms safety.department_hint doesn't cover (it only knows body parts and symptoms).
_DEPARTMENT_TERMS = [
    ("dental", re.compile(r"\b(dentists?|dentistry|orthodontists?|aligners?|implants?|root canal|whitening)\b", re.I)),
    ("skin", re.compile(r"\b(dermatolog\w*|chemical peels?|melasma|laser)\b", re.I)),
    ("hair", re.compile(r"\b(trichologists?|trichology|prp|transplant|fue)\b", re.I)),
    ("pediatrics", re.compile(r"\b(paediatric\w*|pediatric\w*|children|kids|vaccin\w*|immuni[sz]\w*)\b", re.I)),
    (
        "general",
        re.compile(
            r"\b(general (medicine|physician)|family (physician|doctor|medicine)|internal medicine|physicians?|"
            r"diabetes|blood pressure|health check-?ups?)\b",
            re.I,
        ),
    ),
]

_PRONOUN = re.compile(r"\b(he|him|his|she|her|hers|they|them|their)\b", re.I)

# Words too generic to identify a service on their own ("dental", "care", "teeth"...).
_SERVICE_STOPWORDS = {
    "and", "for", "the", "care", "treatment", "treatments", "consultation", "therapy", "dental", "hair", "skin",
    "scalp", "general", "check", "checks", "up", "health", "child", "children", "childrens", "childhood", "clear",
    "teeth",
}

_DEFAULT_SUGGESTIONS = [
    ("doctors", ChatSuggestion(label="Our Doctors", message="Which doctors are available at the clinic?")),
    ("prices", ChatSuggestion(label="Treatment Prices", message="What are the prices of your treatments?")),
    ("timings", ChatSuggestion(label="Clinic Timings", message="What are the clinic timings?")),
    ("booking", ChatSuggestion(label="How to Book", message="How do I book an appointment?")),
]


def detect_topics(text: str) -> set[str]:
    return {name for name, pattern in _TOPICS.items() if pattern.search(text)}


def department_of(text: str) -> str | None:
    return department_hint(text) or next((dept for dept, p in _DEPARTMENT_TERMS if p.search(text)), None)


def default_suggestions(exclude: Collection[str] = (), limit: int = 3) -> list[ChatSuggestion]:
    return [s for topic, s in _DEFAULT_SUGGESTIONS if topic not in exclude][:limit]


def redirect_suggestions(department: str | None) -> list[ChatSuggestion]:
    """Follow-ups for a safety redirect: help the patient reach the right doctor."""
    suggestions = []
    if department in DEPARTMENT_LABELS:
        label = DEPARTMENT_LABELS[department]
        suggestions.append(ChatSuggestion(label=f"{label} doctors", message=f"Which {label} doctors are available?"))
    return suggestions + default_suggestions({"doctors", "prices"}, limit=2)


def _normalise(text: str) -> str:
    return re.sub(r"['’]", "", text.lower())


def _fmt_time(t: time) -> str:
    return t.strftime("%I:%M %p").lstrip("0")


def _money(amount: Decimal | int) -> str:
    return f"₹{amount:,.0f}"


def _days(days: list[int]) -> str:
    return ", ".join(WEEKDAYS[d] for d in sorted(days))


def _short_days(days: list[int]) -> str:
    """[0, 1, 2, 3, 4, 5] -> "Mon–Sat"; [0, 2, 4] -> "Mon, Wed, Fri"."""
    runs: list[list[int]] = []
    for d in sorted(days):
        if runs and d == runs[-1][-1] + 1:
            runs[-1].append(d)
        else:
            runs.append([d])
    parts = []
    for run in runs:
        if len(run) >= 3:
            parts.append(f"{WEEKDAYS[run[0]][:3]}–{WEEKDAYS[run[-1]][:3]}")
        else:
            parts.extend(WEEKDAYS[d][:3] for d in run)
    return ", ".join(parts)


def _booking_href(d: Doctor) -> str:
    return f"/appointments?doctor={d.slug}"


def _fee(d: Doctor) -> str:
    return _money(d.consultation_fee) if d.consultation_fee is not None else "confirmed by the front desk"


@dataclass
class Intent:
    topics: set[str]
    department: str | None = None
    doctors: list[Doctor] = field(default_factory=list)
    services: list[Service] = field(default_factory=list)
    today: bool = False  # "who is in today?", "open now?"

    @property
    def wants_doctor_list(self) -> bool:
        return not self.doctors and ("doctors" in self.topics or ("booking" in self.topics and self.department is not None))

    @property
    def wants_services(self) -> bool:
        # "What's Dr. Thomas's fee?" / "doctors and their fees" are about doctors, not the price list.
        about_doctors = bool(self.doctors) or "doctors" in self.topics
        return bool(self.services) or "services" in self.topics or ("prices" in self.topics and not about_doctors)


class ClinicDirectory:
    def __init__(
        self, clinic: ClinicInfo | None, doctors: list[Doctor], services: list[Service], now: datetime | None = None
    ):
        self.clinic = clinic
        self.doctors = doctors
        self.services = services
        # "Today" means the clinic's day, not the server's (Render runs in UTC).
        self.now = now or datetime.now(ZoneInfo(get_settings().clinic_timezone))
        self._doctor_patterns = [(d, self._doctor_pattern(d)) for d in doctors]
        self._service_patterns = [(s, p) for s in services if (p := self._service_pattern(s))]

    @classmethod
    def load(cls, db: Session, now: datetime | None = None) -> "ClinicDirectory":
        return cls(
            db.scalar(select(ClinicInfo).limit(1)),
            list(db.scalars(select(Doctor).where(Doctor.is_active).order_by(Doctor.department, Doctor.full_name))),
            list(db.scalars(select(Service).where(Service.is_active).order_by(Service.department, Service.sort_order))),
            now,
        )

    def _today_status(self) -> tuple[str, str, bool]:
        """(weekday, opening hours today, open right now) in the clinic's timezone."""
        day = WEEKDAYS[self.now.weekday()]
        hours = next((h for h in (self.clinic.opening_hours if self.clinic else []) if h.get("day") == day), None)
        if not hours or hours.get("closed"):
            return day, "closed", False
        return day, f"{hours['open']} to {hours['close']}", hours["open"] <= f"{self.now:%H:%M}" < hours["close"]

    def _doctors_today(self) -> list[Doctor]:
        return [d for d in self.doctors if self.now.weekday() in d.consultation_days]

    # -- matching ------------------------------------------------------------------

    @staticmethod
    def _doctor_pattern(d: Doctor) -> re.Pattern:
        name = _normalise(re.sub(r"^dr\.?\s+", "", d.full_name, flags=re.I))
        parts = name.split()
        alternatives = {name, d.slug.replace("-", " "), *parts}
        return re.compile(r"\b(" + "|".join(re.escape(a) for a in sorted(alternatives, key=len, reverse=True)) + r")\b")

    @staticmethod
    def _service_pattern(s: Service) -> re.Pattern | None:
        words = [w for w in re.findall(r"[a-z]+", _normalise(s.name)) if w not in _SERVICE_STOPWORDS and len(w) >= 3]
        stems = {w[:-1] if w.endswith("s") and len(w) > 4 else w for w in words}
        if not stems:
            return None
        return re.compile(r"\b(" + "|".join(re.escape(w) for w in sorted(stems)) + r")(e?s)?\b")

    def find_doctors(self, text: str) -> list[Doctor]:
        norm = _normalise(text)
        hits = [(m.start(), d) for d, p in self._doctor_patterns if (m := p.search(norm))]
        return [d for _, d in sorted(hits, key=lambda h: h[0])]

    def find_services(self, text: str) -> list[Service]:
        norm = _normalise(text)
        return [s for s, p in self._service_patterns if p.search(norm)]

    def analyse(self, question: str, history: list[ChatTurn]) -> Intent:
        words = len(question.split())
        doctors = self.find_doctors(question)
        services = self.find_services(question)
        department = department_of(question)

        if not doctors and history and (_PRONOUN.search(question) or words <= 3):
            # "What's her fee?" / "Which days?" — carry over the one doctor the last exchange was about.
            carried = self.find_doctors(" ".join(t.content for t in history[-2:]))
            if len(carried) == 1:
                doctors = carried
        if department is None and history and words <= 4:
            previous = [t.content for t in history if t.role == "user"]
            department = department_of(previous[-1]) if previous else None
        if department is None and (doctors or services):
            department = (doctors or services)[0].department
        today = bool(re.search(r"\b(today|tonight|now|right now)\b", question, re.I))
        return Intent(detect_topics(question), department, doctors[:3], services[:4], today)

    def department_cards(self, department: str, limit: int = 3) -> list[ChatDoctor]:
        return [self.card(d) for d in self._department_doctors(department)[:limit]]

    def _department_doctors(self, department: str | None) -> list[Doctor]:
        return [d for d in self.doctors if department is None or d.department == department]

    def _department_services(self, department: str | None) -> list[Service]:
        return [s for s in self.services if department is None or s.department == department]

    # -- facts for the LLM -----------------------------------------------------------

    @staticmethod
    def _doctor_facts(d: Doctor, detailed: bool = False) -> str:
        text = (
            f"- {d.full_name} — {d.specialization}, {DEPARTMENT_LABELS[d.department]}. "
            f"{d.experience_years} years' experience. Qualifications: {d.qualifications}. "
            f"Languages: {', '.join(d.languages)}. Consults {_days(d.consultation_days)}, "
            f"{_fmt_time(d.start_time)} to {_fmt_time(d.end_time)}. Consultation fee: {_fee(d)}."
        )
        if detailed:
            text += f" A typical consultation lasts about {d.slot_minutes} minutes. About: {d.bio}"
        return text

    @staticmethod
    def _service_facts(s: Service, detailed: bool = False) -> str:
        price = f"from {_money(s.price_from)}" if s.price_from is not None else "price confirmed at the clinic"
        text = f"- {s.name} ({DEPARTMENT_LABELS[s.department]}): {price}, about {s.duration_minutes} minutes."
        return f"{text} {s.description if detailed else s.short_description}"

    def _hours_lines(self) -> list[str]:
        return [
            f"- {h['day']}: closed" if h.get("closed") else f"- {h['day']}: {h['open']} to {h['close']}"
            for h in (self.clinic.opening_hours if self.clinic else [])
        ]

    def _address(self) -> str:
        c = self.clinic
        return f"{c.address_line}, {c.city}, {c.state} {c.postal_code}" if c else ""

    def context(self, intent: Intent) -> str | None:
        """Current records relevant to the question, or None when it isn't about directory data."""
        sections = []
        dept = intent.department
        dept_label = DEPARTMENT_LABELS.get(dept or "")
        broad = not (intent.topics or intent.doctors or intent.services)  # e.g. "tell me about dental care"

        if intent.doctors:
            sections.append("Doctor profiles:\n" + "\n".join(self._doctor_facts(d, detailed=True) for d in intent.doctors))
        elif intent.wants_doctor_list or (broad and dept):
            pool = self._department_doctors(dept)
            title = f"{dept_label} doctors" if dept_label else "All doctors"
            sections.append(f"{title} ({len(pool)}):\n" + "\n".join(self._doctor_facts(d) for d in pool))

        if intent.services:
            sections.append("Services asked about:\n" + "\n".join(self._service_facts(s, detailed=True) for s in intent.services))
        elif intent.wants_services or (broad and dept):
            pool = self._department_services(dept)
            title = f"{dept_label} services and indicative prices" if dept_label else "All services and indicative prices"
            sections.append(f"{title}:\n" + "\n".join(self._service_facts(s) for s in pool)
                            + "\nFinal treatment costs are confirmed after consultation.")

        if self.clinic and "timings" in intent.topics:
            day, hours, is_open = self._today_status()
            consulting = ", ".join(d.full_name for d in self._doctors_today()) or "none"
            sections.append(
                f"Today is {day}, {self.now:%d %B %Y} (clinic time {_fmt_time(self.now.time())}). "
                f"Opening hours today: {hours}; the clinic is currently {'open' if is_open else 'closed'}. "
                f"Doctors consulting today: {consulting}.\n\n"
                "Clinic opening hours:\n" + "\n".join(self._hours_lines())
            )
        if self.clinic and "location" in intent.topics:
            c = self.clinic
            sections.append(
                f"Location and contact: {c.name}, {self._address()}. Phone: {c.phone}."
                + (f" WhatsApp: {c.whatsapp}." if c.whatsapp else "")
                + f" Email: {c.email}. Directions and a map: Contact page (/contact). Emergencies: {c.emergency_note}"
            )
        if self.clinic and "booking" in intent.topics:
            c = self.clinic
            sections.append(
                "How to book:\n- Online: the booking engine on the How to book page (/appointments), or right "
                "here in the chat. Choose a department and doctor (or the first available doctor), pick a date and "
                "a free time slot (shown in real time), and add brief details. The slot is held at once with a "
                "booking reference; the front desk then confirms by email with a calendar invite.\n"
                f"- Phone or WhatsApp: {c.whatsapp or c.phone}.\n- Email: {c.email}.\n- In person at the reception desk."
            )
        if not sections:
            return None
        return f"{LIVE_SOURCE_TITLE} — current records from the clinic's database.\n\n" + "\n\n".join(sections)

    # -- formatted reply (no LLM) -----------------------------------------------------------

    def _doctor_answer(self, d: Doctor) -> str:
        return (
            f"**🩺 {d.full_name} — {d.specialization}:**\n\n"
            f"{d.full_name} is a {d.specialization} in our {DEPARTMENT_LABELS[d.department]} department with "
            f"{d.experience_years} years of experience ({d.qualifications}).\n\n"
            f"- **Consultation days:** {_days(d.consultation_days)}\n"
            f"- **Hours:** {_fmt_time(d.start_time)} to {_fmt_time(d.end_time)} (about {d.slot_minutes} minutes per consultation)\n"
            f"- **Consultation fee:** {_fee(d)}\n"
            f"- **Languages:** {', '.join(d.languages)}\n\n"
            f"{d.bio}"
        )

    def answer(self, intent: Intent) -> str | None:
        """A complete reply built only from the records — used when the LLM is off, down or ungrounded."""
        parts = []
        dept = intent.department
        dept_label = DEPARTMENT_LABELS.get(dept or "")
        broad = not (intent.topics or intent.doctors or intent.services)

        if intent.doctors:
            parts.extend(self._doctor_answer(d) for d in intent.doctors)
        elif (intent.wants_doctor_list or (broad and dept)) and (pool := self._department_doctors(dept)):
            heading = f"**👩‍⚕️ Our {dept_label} doctors:**" if dept_label else f"**👩‍⚕️ Our doctors ({len(pool)} specialists):**"
            parts.append(heading + "\n\n" + "\n".join(
                f"- **{d.full_name}** – {d.specialization} (Fee: {_fee(d)}) · "
                f"{_short_days(d.consultation_days)}, {_fmt_time(d.start_time)}–{_fmt_time(d.end_time)}"
                for d in pool
            ))

        if (intent.wants_services or (broad and dept)) and (pool := intent.services or self._department_services(dept)):
            heading = f"**💰 {dept_label} treatments & prices:**" if dept_label and not intent.services else "**💰 Treatments & prices:**"
            lines = [
                f"- **{s.name}** – "
                + (f"from {_money(s.price_from)}" if s.price_from is not None else "price confirmed at the clinic")
                + f" (about {s.duration_minutes} min)"
                for s in pool
            ]
            parts.append(heading + "\n\n" + "\n".join(lines) + "\n\nFinal costs are confirmed after your consultation.")

        if self.clinic and "timings" in intent.topics and not intent.doctors:
            day, hours, is_open = self._today_status()
            status = f"{hours} (open now)" if is_open else hours if hours == "closed" else f"{hours} (closed right now)"
            consulting = ", ".join(d.full_name for d in self._doctors_today())
            parts.append(
                f"**🕒 Clinic timings:**\n\n**Today ({day}):** {status}\n\n" + "\n".join(self._hours_lines())
                + (f"\n\nDoctors consulting today: {consulting}." if consulting else "")
                + "\n\nEach doctor consults on set days within these hours."
            )
        if self.clinic and "location" in intent.topics:
            c = self.clinic
            contact = [f"- **Phone:** {c.phone}"] + ([f"- **WhatsApp:** {c.whatsapp}"] if c.whatsapp else []) + [f"- **Email:** {c.email}"]
            parts.append(
                f"**📍 Location & contact:**\n\n{c.name}, {self._address()}\n\n" + "\n".join(contact)
                + "\n\nDirections and a map are on the Contact page (/contact)."
            )
        if self.clinic and "booking" in intent.topics:
            c = self.clinic
            focus = (
                f"\n\nTap **Book with {intent.doctors[0].full_name}** below to open the form with the doctor already selected."
                if len(intent.doctors) == 1 else ""
            )
            parts.append(
                "**📅 Booking an appointment:**\n\nYou can book online in about two minutes, right here in the chat "
                "or on the How to book page (/appointments):\n\n"
                "1. Choose your department and preferred doctor\n"
                "2. Pick a date and one of the free time slots\n"
                "3. Share your contact details and the reason for your visit\n\n"
                "Your slot is held straight away with a booking reference, and the front desk confirms it by email "
                f"with a calendar invite. You can also call or WhatsApp {c.whatsapp or c.phone}, email {c.email}, "
                "or visit the reception desk." + focus
            )
        return "\n\n".join(parts) or None

    # -- widget extras -------------------------------------------------------------------

    def card(self, d: Doctor) -> ChatDoctor:
        return ChatDoctor(
            slug=d.slug,
            full_name=d.full_name,
            specialization=d.specialization,
            department=DEPARTMENT_LABELS[d.department],
            qualifications=d.qualifications,
            experience_years=d.experience_years,
            languages=list(d.languages),
            photo_url=d.photo_url,
            consultation_fee=int(d.consultation_fee) if d.consultation_fee is not None else None,
            schedule=f"{_short_days(d.consultation_days)} · {_fmt_time(d.start_time)}–{_fmt_time(d.end_time)}",
            booking_href=_booking_href(d),
        )

    def cards(self, intent: Intent, answer: str) -> list[ChatDoctor]:
        """Doctor cards: the doctors asked about, else the one to three the answer is about."""
        if intent.doctors:
            return [self.card(d) for d in intent.doctors]
        if not (intent.topics & {"doctors", "booking", "timings", "prices"} or intent.department):
            return []
        mentioned = self.find_doctors(answer)
        if 1 <= len(mentioned) <= 3:
            return [self.card(d) for d in mentioned]
        if intent.department and intent.topics & {"doctors", "booking"}:
            pool = self._department_doctors(intent.department)
            if len(pool) <= 3:
                return [self.card(d) for d in pool]
        return []

    def actions(self, intent: Intent, cards: list[ChatDoctor], answer: str) -> list[ChatAction]:
        dept = intent.department
        actions = []
        if len(cards) == 1:
            actions.append(ChatAction(label=f"Book with {cards[0].full_name}", href=cards[0].booking_href))
        elif "booking" in intent.topics or "/appointments" in answer:
            actions.append(BOOK)
        if intent.wants_doctor_list:
            actions.append(
                ChatAction(label=f"Browse {DEPARTMENT_LABELS[dept]} Doctors", href=f"/doctors?department={dept}")
                if dept else ChatAction(label="Browse All Doctors & Profiles", href="/doctors")
            )
        if intent.wants_services:
            page = DEPARTMENT_PAGES.get(dept or "")
            actions.append(
                ChatAction(label=f"{DEPARTMENT_LABELS[dept]} Treatments & Prices", href=page)
                if page else ChatAction(label="All Services & Prices", href="/services")
            )
        if "location" in intent.topics:
            actions.append(CONTACT)
        unique = list({a.href: a for a in actions}.values())
        return unique[:3]

    def suggestions(self, intent: Intent, cards: list[ChatDoctor]) -> list[ChatSuggestion]:
        out: list[ChatSuggestion] = []
        shown = {c.slug for c in cards}
        if intent.wants_doctor_list and len(cards) != 1:
            # Like a directory: one tap opens any doctor's full profile.
            pool = self._department_doctors(intent.department)
            if intent.today:
                pool = [d for d in pool if d in self._doctors_today()]
            out = [
                ChatSuggestion(label=d.full_name, message=f"Tell me about {d.full_name}")
                for d in pool if d.slug not in shown
            ][:4]
        elif len(cards) == 1:
            focus = next(d for d in self.doctors if d.slug == cards[0].slug)
            label = DEPARTMENT_LABELS[focus.department]
            if len(self._department_doctors(focus.department)) > 1:
                out.append(ChatSuggestion(label=f"Other {label} doctors", message=f"Which {label} doctors are available?"))
            if self._department_services(focus.department):
                out.append(ChatSuggestion(label=f"{label} prices", message=f"What are the prices for {label} treatments?"))
        elif intent.wants_services:
            out = [
                ChatSuggestion(label=f"{DEPARTMENT_LABELS[d]} prices", message=f"What are the prices for {DEPARTMENT_LABELS[d]} treatments?")
                for d in dict.fromkeys(s.department for s in self.services) if d != intent.department
            ][:3]
        if len(out) < 3:
            labels = {s.label for s in out}
            out += [s for s in default_suggestions(intent.topics, limit=4) if s.label not in labels][: 3 - len(out)]
        return out
