"""Seed content for RUA Skin & Hair Center.

Clinic, centres, doctors and services come from `rua_catalogue.json`, which is generated from the
website's content (frontend/src/content/rua) so the booking engine, chatbot and website agree.
Doctor consultation schedules are placeholders until RUA confirms each doctor's roster — edit them
in Admin > Doctors. Sample patients and bookings are fictional (phones use the reserved 9000x range).
"""

import json
import re
from datetime import time
from pathlib import Path

CATALOGUE = json.loads((Path(__file__).with_name("rua_catalogue.json")).read_text(encoding="utf-8"))
_BRAND = CATALOGUE["brand"]
_CENTRES = CATALOGUE["centres"]

WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
MON, TUE, WED, THU, FRI, SAT, SUN = range(7)

CLINIC = {
    "name": _BRAND["name"],
    "tagline": _BRAND["tagline"],
    "about": (
        f"{_BRAND['promise']} RUA is a doctor-led skin and hair center in Bengaluru, founded by three MD (DVL) "
        "dermatologists — Dr. Jatin K Reddy, Dr. Eshritha C and Dr. Jeevith C Reddy — offering medical dermatology, "
        "dermatosurgery, advanced cosmetic dermatology, laser treatments, hair treatments and hair transplants at two "
        "centres: Ramamurthy Nagar and Indiranagar."
    ),
    "phone": "+91 70199 76689",
    "whatsapp": "+91 70199 76689",
    "email": "",
    "address_line": ", ".join(_CENTRES[0]["addressLines"][:2]),
    "city": "Bengaluru",
    "state": "Karnataka",
    "postal_code": _CENTRES[0]["postalCode"],
    "country": "India",
    "map_embed_url": _CENTRES[0]["mapEmbedUrl"],
    "opening_hours": [{"day": d, "open": "10:00", "close": "20:00", "closed": False} for d in WEEK],
    "emergency_note": (
        "RUA Skin & Hair Center is an outpatient clinic and does not provide emergency care. In a medical emergency, "
        "call 112 or go to the nearest hospital emergency department."
    ),
    "theme": "cedar",
}

BRANCHES = [
    {
        "slug": c["slug"],
        "name": c["name"],
        "area": c["area"],
        "address": ", ".join(c["addressLines"]),
        "phone": c["phoneDisplay"],
        "whatsapp": "+91 70199 76689",
        "map_url": c["mapsUrl"],
        "sort_order": i,
        "is_active": True,
    }
    for i, c in enumerate(_CENTRES)
]

# Primary category and placeholder weekly schedule per doctor (RUA to confirm rosters).
_DOCTOR_SETUP = {
    "dr-jatin-k-reddy": ("hair-transplant", [MON, TUE, WED, THU, FRI, SAT], time(10, 0), time(19, 0)),
    "dr-eshritha-c": ("aesthetic-dermatology", [MON, TUE, WED, THU, FRI, SAT], time(11, 0), time(20, 0)),
    "dr-jeevith-c-reddy": ("medical-dermatology", [TUE, WED, THU, FRI, SAT, SUN], time(10, 0), time(18, 0)),
}

DOCTORS = []
for d in CATALOGUE["doctors"]:
    primary, days, start, end = _DOCTOR_SETUP[d["slug"]]
    departments = list(dict.fromkeys([primary, *d["categories"], "medical-dermatology"]))
    DOCTORS.append({
        "slug": d["slug"],
        "full_name": d["name"],
        "department": primary,
        "departments": departments,
        "specialization": d["role"],
        "qualifications": d["qualifications"],
        "fellowship": d["fellowship"],
        "experience_years": None,
        "bio": " ".join([d["personaLine"], *d["bio"]]),
        "languages": [],
        "photo_url": d["photo"],
        "consultation_days": days,
        "start_time": start,
        "end_time": end,
        "slot_minutes": 30,
        "consultation_fee": None,
    })

_DURATION = {
    "medical-dermatology": 20, "dermatosurgery": 30, "aesthetic-dermatology": 60, "laser-treatments": 45,
    "hair-treatments": 60, "hair-transplant": 360, "premium-packages": 60,
}
_ICON = {c["slug"]: c["icon"] for c in CATALOGUE["categories"]}


def _slugify(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")[:110]


def _clip(text: str, limit: int = 300) -> str:
    """Trim to the last full sentence that fits (short_description is VARCHAR(300))."""
    if len(text) <= limit:
        return text
    cut = text[:limit]
    end = cut.rfind(". ")
    return cut[: end + 1] if end > limit // 3 else cut.rsplit(" ", 1)[0] + "…"


def _treatment_description(t: dict) -> str:
    facts = "; ".join(f"{f['label']}: {f['value']}" for f in t["facts"])
    who = "; ".join(t["whoFor"])
    steps = " ".join(f"{s['title']}: {s['text']}" for s in t["steps"])
    faqs = " ".join(f"Q: {f['q']} A: {f['a']}" for f in t["faqs"])
    text = (
        f"{t['summary']} Key facts for {t['name']} — {facts}. {t.get('whoForTitle') or 'Who it is for'}: {who}. "
        f"How it works at RUA: {steps} Results and recovery: {t['results']} Cost: {t['cost']} {faqs}"
    )
    return text[:5000]


# (department, slug, name, icon, minutes, price, short description, description)
SERVICES = []
_seen: set[str] = set()
for t in CATALOGUE["treatments"]:
    _seen.add(t["slug"])
    SERVICES.append((
        t["category"], t["slug"], t["name"], _ICON[t["category"]],
        _DURATION[t["category"]] if t["slug"] != "hair-transplant-cost" else 30,
        None, _clip(t["summary"]), _treatment_description(t),
    ))
# Every other service RUA lists, so the chatbot can answer "do you do …?" for all of them.
for c in CATALOGUE["categories"]:
    for item in c["items"]:
        if item.get("treatment"):
            continue
        slug = _slugify(f"{c['slug']}-{item['name']}")
        if slug in _seen:
            continue
        _seen.add(slug)
        SERVICES.append((
            c["slug"], slug, item["name"], _ICON[c["slug"]], _DURATION[c["slug"]], None,
            _clip(f"{item['name']} — part of RUA's {c['name']}. {c['tagline']}"),
            f"{item['name']} is offered at RUA Skin & Hair Center as part of {c['name']}. {c['tagline']} {c['intro']} "
            "A dermatologist assesses you at consultation and recommends the right plan.",
        ))

BLOG_DISCLAIMER = (
    "\n\n*This article is general information, not a substitute for a consultation. "
    "Please see a qualified dermatologist for advice about your own health.*"
)
BLOG_POSTS: list[dict] = []

TESTIMONIALS = [
    {"id": i + 1, "quote": t["quote"], "name": "RUA patient", "detail": t["context"]}
    for i, t in enumerate(CATALOGUE["testimonials"])
]

CLINIC_HIGHLIGHTS = {
    "values": [
        {"icon": "sparkles", "title": w["title"], "text": w["text"]} for w in CATALOGUE["whyRua"]
    ],
    "facilities": [e["name"] for e in CATALOGUE["equipment"]],
    "why_choose": [
        {"icon": "award", "title": "3 MD (DVL) dermatologists", "text": "Fellowship-trained founders lead every plan."},
        {"icon": "map-pin", "title": "2 centres in Bengaluru", "text": "Ramamurthy Nagar and Indiranagar."},
        {"icon": "clock", "title": "Open 7 days", "text": "Sunday to Saturday, 10am to 8pm."},
        {"icon": "wallet", "title": "Flexible payment", "text": "EMI plans for treatment packages."},
    ],
}
