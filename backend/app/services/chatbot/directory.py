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

"Who is free tomorrow?" / "When is Dr. Eshritha available?" also reads the booking engine's live
free slots (the same availability the booking page shows), so the assistant can say which doctor
is free when and hand over to the in-chat booking.
"""

import re
from collections.abc import Collection
from dataclasses import dataclass, field
from datetime import date, datetime, time, timedelta
from decimal import Decimal
from zoneinfo import ZoneInfo

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models import Branch, ClinicInfo, Doctor, Service
from app.schemas.chat import ChatAction, ChatDoctor, ChatSuggestion, ChatTurn
from app.services.appointments import availability
from app.services.chatbot.safety import department_hint
from app.services.knowledge_base.system_documents import DEPARTMENT_LABELS, DEPARTMENT_PAGES, WEEKDAYS

LIVE_SOURCE_TITLE = "Live clinic directory"

BOOK = ChatAction(label="Book an Appointment", href="/book-appointment")
CONTACT = ChatAction(label="Centres & Directions", href="/centers")
MY_APPOINTMENTS = ChatAction(label="My Appointments", href="/patient")

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
    "location": re.compile(
        r"\b(where|located|location|address|directions?|map|parking|reach|contact|phone|call|email|whatsapp|"
        r"centres?|centers?|branch\w*|near|nearest|nearby)\b",
        re.I,
    ),
    "booking": re.compile(r"\b(book\w*|appointments?|schedul\w*|reserve|slots?|visit)\b", re.I),
    # An existing appointment: cancel, move or look it up (the patient portal), not a new booking.
    "manage": re.compile(
        r"\b(cancel\w*|reschedul\w*|postpone\w*|prepone|my (appointments?|bookings?|visits?)|"
        r"change (my |the )?(appointment|booking|slot|time)|booking (reference|status))\b",
        re.I,
    ),
    # Paying, not pricing: answered from the knowledge base (EMI, UPI, cards), not by listing every service.
    "payments": re.compile(r"\b(emi|payments?|pay|paying|upi|credit|debit|cards?|insurance|financ\w*|instal\w*)\b", re.I),
}

# Terms safety.department_hint doesn't cover (it only knows body parts and symptoms).
_DEPARTMENT_TERMS = [
    ("hair-transplant", re.compile(r"\b(fue|dhi|sapphire|beard transplant|eyebrow transplant|hair transplant\w*)\b", re.I)),
    ("hair-treatments", re.compile(r"\b(prp|gfc|exosomes?|qr ?678|lllt|mesotherapy|trichologists?|smp|micropigmentation)\b", re.I)),
    ("laser-treatments", re.compile(r"\b(lasers?|laser toning|co2|carbon peel|hollywood peel)\b", re.I)),
    ("aesthetic-dermatology", re.compile(
        r"\b(hydra ?facial|medi ?facials?|chemical peels?|peels?|mnrf|microneedling|skin boosters?|pdrn|nctf|hifu|"
        r"botox|fillers?|thread lift|cosmetic\w*|aesthetic\w*)\b",
        re.I,
    )),
    ("dermatosurgery", re.compile(r"\b(dermatosurg\w*|surger\w*|excision|biops\w*|circumcision|electrocautery)\b", re.I)),
    ("premium-packages", re.compile(r"\b(bridal|groom|packages?|signature glow|iv drips?)\b", re.I)),
    ("medical-dermatology", re.compile(r"\b(dermatolog\w*|paediatric\w*|pediatric\w*|children|kids|std|stds|leprosy)\b", re.I)),
]

_PRONOUN = re.compile(r"\b(he|him|his|she|her|hers|they|them|their)\b", re.I)

# Words too generic to identify a service on their own ("dental", "care", "teeth"...).
_SERVICE_STOPWORDS = {
    "and", "for", "the", "care", "treatment", "treatments", "consultation", "therapy", "hair", "skin", "scalp",
    "management", "other", "procedures", "procedure", "removal", "laser", "lasers", "programs", "plans", "packages",
    "transplant", "repair", "surgery", "surgeries", "disease", "diseases", "evaluation", "medical", "advanced",
    "with", "loss", "chronic", "problems", "sexual", "cost", "costs", "price", "prices",
}

_DEFAULT_SUGGESTIONS = [
    ("doctors", ChatSuggestion(label="Our Doctors", message="Which doctors are available at the clinic?")),
    ("prices", ChatSuggestion(label="Our Treatments", message="What treatments do you offer?")),
    ("timings", ChatSuggestion(label="Clinic Timings", message="What are the clinic timings?")),
    ("booking", ChatSuggestion(label="How to Book", message="How do I book an appointment?")),
]


def detect_topics(text: str) -> set[str]:
    return {name for name, pattern in _TOPICS.items() if pattern.search(text)}


def department_of(text: str) -> str | None:
    # A speciality named in full ("Premium Aesthetic Packages") wins over keyword hints ("aesthetic").
    lowered = text.lower()
    named = [d for d, label in DEPARTMENT_LABELS.items() if label.lower() in lowered]
    if named:
        return max(named, key=lambda d: len(DEPARTMENT_LABELS[d]))
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
    return f"/book-appointment?doctor={d.slug}"


# -- dates and free slots ----------------------------------------------------------------

_MONTHS = ("jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec")
_MONTH = (
    r"(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|"
    r"oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\.?(?![a-z])"
)
_DAY_MONTH = re.compile(r"\b(\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+)?" + _MONTH + r"(?:\s+(\d{4}))?\b", re.I)
_MONTH_DAY = re.compile(r"\b" + _MONTH + r"\s+(\d{1,2})(?:st|nd|rd|th)?\b(?:,?\s+(\d{4}))?", re.I)
_ISO_DATE = re.compile(r"\b(\d{4})-(\d{1,2})-(\d{1,2})\b")
_SLASH_DATE = re.compile(r"\b(\d{1,2})/(\d{1,2})/(\d{2}|\d{4})\b")  # dd/mm/yyyy; "24/7" is not a date
_WEEKDAY_NAME = re.compile(r"\b(next\s+)?(monday|tuesday|wednesday|thursday|friday|saturday|sunday)s?\b", re.I)
_RELATIVE_DAYS = (
    (re.compile(r"\bday after tomorrow\b", re.I), 2),
    (re.compile(r"\b(tomorrow|tmrw|tmr)\b", re.I), 1),
    (re.compile(r"\b(today|tonight|right now|now)\b", re.I), 0),
)
_WEEKEND = re.compile(r"\b(this |the |next )?weekend\b", re.I)

# Asking for free times. "available" counts only with a date or a named doctor (see Intent.slots).
_SLOT_STRONG = re.compile(
    r"\b(slots?|openings?|vacanc\w*|earliest|soonest|next available|free (times?|slots?|appointments?)|"
    r"what times?|which times?|when can i (come|visit|book|see|get))\b",
    re.I,
)
_SLOT_WEAK = re.compile(r"\b(available|availability|free|in clinic|consulting)\b", re.I)


def _safe_date(year: int, month: int, day: int) -> date | None:
    try:
        return date(year, month, day)
    except ValueError:
        return None


def requested_days(text: str, today: date) -> list[date]:
    """The dates a question is about ("tomorrow", "on Sunday", "5 Nov", "this weekend"), soonest first."""
    days: list[date] = []
    for pattern, offset in _RELATIVE_DAYS:
        if pattern.search(text):
            days.append(today + timedelta(days=offset))
            break
    if _WEEKEND.search(text):
        saturday = today + timedelta(days=(5 - today.weekday()) % 7)
        days += [saturday, saturday + timedelta(days=1)] if today.weekday() != 6 else [today]
    for m in _WEEKDAY_NAME.finditer(text):
        wanted = WEEKDAYS.index(m.group(2).capitalize())
        offset = (wanted - today.weekday()) % 7
        days.append(today + timedelta(days=offset or (7 if m.group(1) else 0)))

    def this_or_next_year(month: int, day: int, year: str | None) -> date | None:
        if year:
            return _safe_date(int(year), month, day)
        found = _safe_date(today.year, month, day)
        return found if found is None or found >= today else _safe_date(today.year + 1, month, day)

    for m in _DAY_MONTH.finditer(text):
        days.append(this_or_next_year(_MONTHS.index(m.group(2)[:3].lower()) + 1, int(m.group(1)), m.group(3)))
    for m in _MONTH_DAY.finditer(text):
        days.append(this_or_next_year(_MONTHS.index(m.group(1)[:3].lower()) + 1, int(m.group(2)), m.group(3)))
    for m in _ISO_DATE.finditer(text):
        days.append(_safe_date(int(m.group(1)), int(m.group(2)), int(m.group(3))))
    for m in _SLASH_DATE.finditer(text):
        year = int(m.group(3)) + (2000 if len(m.group(3)) == 2 else 0)
        days.append(_safe_date(year, int(m.group(2)), int(m.group(1))))
    return sorted({d for d in days if d is not None and d >= today})[:3]


def _long_date(d: date) -> str:
    return f"{WEEKDAYS[d.weekday()]} {d:%d %B %Y}"


def _free_ranges(free: list[tuple[time, time]]) -> str:
    """[(10:00, 10:30), (10:30, 11:00), (14:00, 14:30)] -> "10:00 AM–11:00 AM, 2:00 PM–2:30 PM"."""
    ranges: list[list[time]] = []
    for start, end in free:
        if ranges and ranges[-1][1] == start:
            ranges[-1][1] = end
        else:
            ranges.append([start, end])
    return ", ".join(f"{_fmt_time(a)}–{_fmt_time(b)}" for a, b in ranges)


@dataclass
class DaySlots:
    """Free slots on one day: [(doctor, [(start, end), ...])] for doctors who consult that day."""

    day: date
    clinic_open: bool
    doctors: list[tuple[Doctor, list[tuple[time, time]]]]
    not_consulting: list[Doctor]
    asked: bool = True  # False: found because the day asked about had nothing free

    @property
    def free_count(self) -> int:
        return sum(len(free) for _, free in self.doctors)


def _fee(d: Doctor) -> str:
    return _money(d.consultation_fee) if d.consultation_fee is not None else "confirmed by the front desk"


@dataclass
class Intent:
    topics: set[str]
    department: str | None = None
    doctors: list[Doctor] = field(default_factory=list)
    services: list[Service] = field(default_factory=list)
    today: bool = False  # "who is in today?", "open now?"
    days: list[date] = field(default_factory=list)  # dates the question names ("tomorrow", "on Sunday")
    slots: bool = False  # asks which times are free → live slots from the booking engine

    @property
    def wants_doctor_list(self) -> bool:
        return not self.doctors and ("doctors" in self.topics or ("booking" in self.topics and self.department is not None))

    @property
    def wants_services(self) -> bool:
        # "What's Dr. Thomas's fee?" / "doctors and their fees" are about doctors, not the price list.
        about_doctors = bool(self.doctors) or "doctors" in self.topics
        if "payments" in self.topics and not self.services:
            return False  # "Do you offer EMI?" is a policy question
        return bool(self.services) or "services" in self.topics or ("prices" in self.topics and not about_doctors)

    @property
    def wants_booking(self) -> bool:
        return "booking" in self.topics and "manage" not in self.topics


class ClinicDirectory:
    def __init__(
        self,
        clinic: ClinicInfo | None,
        doctors: list[Doctor],
        services: list[Service],
        now: datetime | None = None,
        branches: list[Branch] | None = None,
        db: Session | None = None,
    ):
        self.clinic = clinic
        self.doctors = doctors
        self.services = services
        self.branches = branches or []
        self.db = db  # needed only for live free slots
        self._slots: list[DaySlots] | None = None
        # Name parts shared by two doctors ("Reddy") or too short ("K") can't identify one doctor.
        parts: dict[str, int] = {}
        for d in doctors:
            for p in set(_normalise(re.sub(r"^dr\.?\s+", "", d.full_name, flags=re.I)).split()):
                parts[p] = parts.get(p, 0) + 1
        self._ambiguous = {p for p, n in parts.items() if n > 1 or len(p) < 3}
        # "Today" means the clinic's day, not the server's (Render runs in UTC).
        self.now = now or datetime.now(ZoneInfo(get_settings().clinic_timezone))
        self._doctor_patterns = [(d, self._doctor_pattern(d, self._ambiguous)) for d in doctors]
        self._service_patterns = [(s, p) for s in services if (p := self._service_pattern(s))]

    @classmethod
    def load(cls, db: Session, now: datetime | None = None) -> "ClinicDirectory":
        return cls(
            db.scalar(select(ClinicInfo).limit(1)),
            list(db.scalars(select(Doctor).where(Doctor.is_active).order_by(Doctor.department, Doctor.full_name))),
            list(db.scalars(select(Service).where(Service.is_active).order_by(Service.department, Service.sort_order))),
            now,
            list(db.scalars(select(Branch).where(Branch.is_active).order_by(Branch.sort_order))),
            db,
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
    def _doctor_pattern(d: Doctor, ambiguous: Collection[str] = ()) -> re.Pattern:
        name = _normalise(re.sub(r"^dr\.?\s+", "", d.full_name, flags=re.I))
        parts = [p for p in name.split() if p not in ambiguous]
        alternatives = {name, d.slug.replace("-", " "), d.slug.removeprefix("dr-").replace("-", " "), *parts}
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
        topics = detect_topics(question)
        days = requested_days(question, self.now.date())
        if not days and history and words <= 4:
            # "And on Sunday?" names the day; "what about her?" keeps the day asked about before.
            previous = [t.content for t in history if t.role == "user"]
            days = requested_days(previous[-1], self.now.date()) if previous and _PRONOUN.search(question) else []
        strong = bool(_SLOT_STRONG.search(question))
        weak = bool(_SLOT_WEAK.search(question))
        slots = "manage" not in topics and (
            strong
            or (bool(days) and (weak or "booking" in topics or bool(doctors)))
            or (bool(doctors) and weak)
        )
        return Intent(topics, department, doctors[:3], services[:4], today, days, slots)

    # -- live free slots -------------------------------------------------------------

    def _slot_pool(self, intent: Intent) -> list[Doctor]:
        return intent.doctors or self._department_doctors(intent.department) or self.doctors

    def _day_slots(self, pool: list[Doctor], day: date, asked: bool = True) -> DaySlots:
        is_open, results = availability(self.db, pool, day, now=self.now.replace(tzinfo=None))
        consulting = [(d, [(s.start_time, s.end_time) for s in slots if s.available]) for d, slots in results if slots]
        return DaySlots(day, is_open, consulting, [d for d, slots in results if not slots], asked)

    def free_slots(self, intent: Intent) -> list[DaySlots]:
        """The asked-for days' free slots; with no date (or a full one), the next days that have any."""
        if self._slots is not None:
            return self._slots
        self._slots = []
        if not intent.slots or self.db is None:
            return self._slots
        pool = self._slot_pool(intent)
        today = self.now.date()
        window = get_settings().booking_window_days
        asked = [self._day_slots(pool, d) for d in intent.days if (d - today).days <= window]
        self._slots = list(asked)
        if not any(s.free_count for s in asked):
            # Nothing free on the day asked about (or no day given): find the next one or two days that are.
            start = max(intent.days) + timedelta(days=1) if intent.days else today
            wanted = 1 if intent.days else 2
            for offset in range(0, min(window, 21)):
                day = start + timedelta(days=offset)
                if (day - today).days > window:
                    break
                found = self._day_slots(pool, day, asked=not intent.days)
                if found.free_count:
                    self._slots.append(found)
                    wanted -= 1
                    if not wanted:
                        break
        return self._slots

    def _slots_lines(self, days: list[DaySlots], bullet: str = "- ") -> list[str]:
        lines = []
        for s in days:
            label = _long_date(s.day) + (" (today)" if s.day == self.now.date() else "")
            if not s.asked:
                label = f"Next day with free slots — {label}"
            if not s.clinic_open:
                lines.append(f"{bullet}{label}: the clinic is closed.")
                continue
            parts = [
                f"{d.full_name} — free {_free_ranges(free)} ({len(free)} slot{'s' if len(free) != 1 else ''} of {d.slot_minutes} min)"
                if free else f"{d.full_name} — no free slots left"
                for d, free in s.doctors
            ]
            if s.not_consulting:
                names = ", ".join(d.full_name for d in s.not_consulting)
                parts.append(f"{names} {'does' if len(s.not_consulting) == 1 else 'do'} not consult on {WEEKDAYS[s.day.weekday()]}s")
            lines.append(f"{bullet}{label}: " + ("; ".join(parts) if parts else "no doctor consults that day") + ".")
        return lines

    def department_cards(self, department: str, limit: int = 3) -> list[ChatDoctor]:
        return [self.card(d) for d in self._department_doctors(department)[:limit]]

    def _department_doctors(self, department: str | None) -> list[Doctor]:
        return [d for d in self.doctors if department is None or department in (d.departments or [d.department])]

    def _department_services(self, department: str | None) -> list[Service]:
        return [s for s in self.services if department is None or s.department == department]

    # -- facts for the LLM -----------------------------------------------------------

    @staticmethod
    def _doctor_facts(d: Doctor, detailed: bool = False) -> str:
        text = (
            f"- {d.full_name} — {d.specialization}. Qualifications: {d.qualifications}"
            + (f"; {d.fellowship}" if d.fellowship else "")
            + f". Specialities: {', '.join(DEPARTMENT_LABELS.get(x, x) for x in (d.departments or [d.department]))}. "
            + (f"Languages: {', '.join(d.languages)}. " if d.languages else "")
            + f"Consults {_days(d.consultation_days)}, {_fmt_time(d.start_time)} to {_fmt_time(d.end_time)}. "
            f"Consultation fee: {_fee(d)}."
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
        if self.branches:
            return "; ".join(f"{b.name}: {b.address} (phone {b.phone})" for b in self.branches)
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
        if intent.slots and self.db is not None:
            days = self.free_slots(intent)
            if days:
                minutes = get_settings().booking_min_notice_minutes
                sections.append(
                    f"Live free appointment slots from the booking system (checked at {_fmt_time(self.now.time())} on "
                    f"{_long_date(self.now.date())}). Each range is a window of free consultation slots; same-day "
                    f"bookings must start at least {minutes} minutes from now:\n"
                    + "\n".join(self._slots_lines(days))
                    + "\nAny free slot can be booked right here in the chat (the Book button under the answer) or on "
                    "the Book appointment page (/book-appointment)."
                )
            else:
                sections.append(
                    "Live free appointment slots: none were found for the dates asked within the booking window. "
                    f"The front desk can help on {self.clinic.whatsapp or self.clinic.phone}." if self.clinic else
                    "Live free appointment slots: none were found for the dates asked."
                )

        if self.clinic and "location" in intent.topics:
            c = self.clinic
            sections.append(
                f"Centres and contact for {c.name}: {self._address()}."
                + (f" WhatsApp: {c.whatsapp}." if c.whatsapp else "")
                + (f" Email: {c.email}." if c.email else "")
                + f" Directions and maps: Centres page (/centers). Emergencies: {c.emergency_note}"
            )
        if self.clinic and "manage" in intent.topics:
            c = self.clinic
            sections.append(
                "Existing appointments: patients sign in to My appointments (/patient) with their mobile number and a "
                "6-digit code sent on WhatsApp. There they can see upcoming and past visits and cancel an upcoming "
                f"appointment. To reschedule, reply to the WhatsApp confirmation or call {c.whatsapp or c.phone}; "
                "the front desk moves the appointment and sends the new time on WhatsApp."
            )
        if self.clinic and intent.wants_booking:
            c = self.clinic
            sections.append(
                "How to book:\n- Online: the Book appointment page (/book-appointment), or right here in the chat. "
                "Choose your centre, what you need help with and a doctor (or the first available doctor), pick a date and "
                "a free time slot (shown in real time), and add your name and mobile number. The slot is held at once with a "
                "booking reference and an automatic WhatsApp message; the front desk then confirms on WhatsApp.\n"
                f"- Phone or WhatsApp: {c.whatsapp or c.phone}.\n- In person at either centre's reception desk."
            )
        if not sections:
            return None
        return f"{LIVE_SOURCE_TITLE} — current records from the clinic's database.\n\n" + "\n\n".join(sections)

    # -- formatted reply (no LLM) -----------------------------------------------------------

    def _doctor_answer(self, d: Doctor) -> str:
        return (
            f"**🩺 {d.full_name} — {d.specialization}:**\n\n"
            f"{d.full_name} ({d.qualifications}"
            + (f", {d.fellowship}" if d.fellowship else "")
            + ").\n\n"
            f"- **Consultation days:** {_days(d.consultation_days)}\n"
            f"- **Hours:** {_fmt_time(d.start_time)} to {_fmt_time(d.end_time)} (about {d.slot_minutes} minutes per consultation)\n"
            f"- **Consultation fee:** {_fee(d)}\n"
            + (f"- **Languages:** {', '.join(d.languages)}\n" if d.languages else "")
            + f"\n{d.bio}"
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

        if intent.wants_services and not intent.services and dept is None and "prices" not in intent.topics:
            # "What treatments do you offer?" — one line per speciality instead of every service.
            by_dept: dict[str, list[str]] = {}
            for s in self.services:
                by_dept.setdefault(s.department, []).append(s.name)
            order = list(DEPARTMENT_LABELS)
            lines = [
                f"- **{DEPARTMENT_LABELS[d]}** – {', '.join(names[:4])}" + (f" and {len(names) - 4} more" if len(names) > 4 else "")
                for d, names in sorted(by_dept.items(), key=lambda kv: order.index(kv[0]) if kv[0] in order else 99)
            ]
            parts.append("**✨ Our treatments:**\n\n" + "\n".join(lines)
                         + "\n\nAsk me about any treatment, or explore every speciality on the Services page (/services).")
        elif (intent.wants_services or (broad and dept)) and (pool := intent.services or self._department_services(dept)):
            asking_price = "prices" in intent.topics
            heading = (
                f"**💰 Prices — {dept_label}:**" if dept_label and not intent.services
                else "**💰 Treatments & prices:**" if asking_price else "**✨ About this treatment:**"
            )

            def line(s: Service) -> str:
                price = f"from {_money(s.price_from)}" if s.price_from is not None else "price confirmed at the clinic"
                if intent.services and not asking_price:
                    return (f"- **{s.name}** ({DEPARTMENT_LABELS[s.department]}) – {s.short_description} "
                            f"({price}, about {s.duration_minutes} min)")
                return f"- **{s.name}** – {price} (about {s.duration_minutes} min)"

            parts.append(heading + "\n\n" + "\n".join(line(s) for s in pool) + "\n\nFinal costs are confirmed after your consultation.")

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
            centres = "\n".join(f"- **{b.name}:** {b.address} · {b.phone}" for b in self.branches) or f"- {self._address()}"
            contact = ([f"- **WhatsApp:** {c.whatsapp}"] if c.whatsapp else []) + ([f"- **Email:** {c.email}"] if c.email else [])
            parts.append(
                f"**📍 Our centres:**\n\n{centres}\n\n" + "\n".join(contact)
                + "\n\nDirections and maps are on the Centres page (/centers)."
            )
        if self.clinic and "manage" in intent.topics:
            c = self.clinic
            parts.append(
                "**🗓️ Managing your appointment:**\n\n"
                "1. Open My appointments (/patient) and enter your mobile number\n"
                "2. Type the 6-digit code we send you on WhatsApp\n"
                "3. See your upcoming and past visits, and cancel an upcoming one in a tap\n\n"
                f"To reschedule, reply to your WhatsApp confirmation or call {c.whatsapp or c.phone} and the front desk "
                "will move it and send you the new time on WhatsApp."
            )
        if intent.slots and (days := self.free_slots(intent)):
            parts.append(
                "**🗓️ Free appointment slots:**\n\n" + "\n".join(self._slots_lines(days))
                + "\n\nTap **Book** below to reserve one of these right here in the chat."
            )
        if self.clinic and intent.wants_booking:
            c = self.clinic
            focus = (
                f"\n\nTap **Book with {intent.doctors[0].full_name}** below to open the form with the doctor already selected."
                if len(intent.doctors) == 1 else ""
            )
            parts.append(
                "**📅 Booking an appointment:**\n\nYou can book in about a minute, right here in the chat "
                "or on the Book appointment page (/book-appointment):\n\n"
                "1. Choose your centre and what you need help with\n"
                "2. Pick a doctor (or the first available) and a free time slot\n"
                "3. Share your name and mobile number\n\n"
                "Your slot is held straight away with a booking reference and you get an automatic WhatsApp message; "
                f"the front desk then confirms it on WhatsApp. You can also call or WhatsApp {c.whatsapp or c.phone}, "
                "or visit either centre." + focus
            )
        return "\n\n".join(parts) or None

    # -- widget extras -------------------------------------------------------------------

    def card(self, d: Doctor) -> ChatDoctor:
        return ChatDoctor(
            slug=d.slug,
            full_name=d.full_name,
            specialization=d.specialization,
            department=DEPARTMENT_LABELS.get(d.department, d.department),
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
        elif intent.wants_booking or intent.slots or "/book-appointment" in answer:
            actions.append(BOOK)
        if "manage" in intent.topics:
            actions.insert(0, MY_APPOINTMENTS)
        if intent.wants_doctor_list:
            actions.append(
                ChatAction(label=f"Browse {DEPARTMENT_LABELS[dept]} Doctors", href=f"/doctors?department={dept}")
                if dept else ChatAction(label="Browse All Doctors & Profiles", href="/doctors")
            )
        if intent.wants_services:
            page = DEPARTMENT_PAGES.get(dept or "")
            actions.append(
                ChatAction(label=f"Explore {DEPARTMENT_LABELS[dept]}", href=page)
                if page else ChatAction(label="All Services", href="/services")
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
                out.append(ChatSuggestion(label=f"{label} prices", message=f"What are the prices for {label}?"))
        elif intent.wants_services:
            out = [
                ChatSuggestion(label=f"{DEPARTMENT_LABELS[d]} prices", message=f"What are the prices for {DEPARTMENT_LABELS[d]}?")
                for d in dict.fromkeys(s.department for s in self.services) if d != intent.department
            ][:3]
        if len(out) < 3:
            labels = {s.label for s in out}
            out += [s for s in default_suggestions(intent.topics, limit=4) if s.label not in labels][: 3 - len(out)]
        return out
