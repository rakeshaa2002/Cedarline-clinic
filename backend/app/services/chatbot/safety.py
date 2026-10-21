"""Rule-based safety screening that runs BEFORE retrieval or any LLM call.

The assistant only gives general clinic information. Messages that look like a
medical emergency, or that ask for a diagnosis, personal treatment advice or
medication guidance, get a fixed, pre-approved response. Fixed responses mean
the LLM never gets the chance to improvise medical advice.
"""

import re
from dataclasses import dataclass
from typing import Literal

_EMERGENCY = re.compile(
    r"\b("
    r"chest pain|heart attack|can'?t breathe|cannot breathe|difficulty breathing|trouble breathing|"
    r"short(ness)? of breath|not breathing|unconscious|passed out|fainted|seizure|convulsion|stroke|"
    r"face (is )?drooping|severe bleeding|bleeding (heavily|a lot|won'?t stop)|heavy bleeding|"
    r"overdos\w*|poison\w*|suicid\w*|kill (myself|me)|end my life|self[- ]harm|hurt myself|"
    r"anaphyla\w*|throat (is )?(swelling|closing)|severe allergic|choking|"
    r"head injury|broken bone|severe burn|emergency"
    r")\b",
    re.IGNORECASE,
)

_MEDICATION = re.compile(
    r"\b("
    r"dose|dosage|how many (mg|milligrams|tablets|pills)|\d+\s?mg|"
    r"(which|what) (medicine|medication|tablet|pill|antibiotic|painkiller|drug|cream|ointment|shampoo|serum)|"
    r"(should|can|could) i (take|use|apply|stop taking|mix|combine)|"
    r"prescri(be|ption) (me|for me)|side effects? of my|is it safe (for me )?to take"
    r")\b",
    re.IGNORECASE,
)

_DIAGNOSIS = re.compile(
    r"\b("
    r"diagnos\w*|"
    # "do I have diabetes?" but not "do I have to bring reports?" / "could I have an appointment?"
    r"(do|could|might|can) i have (?!to\b)(?![\w\s]*\b(appointment|slot|booking|consultation|parking|refund|copy|bill)\b)|"
    r"am i (sick|ill|infected)|"
    r"what('?s| is) wrong with (me|my)|is (it|this) (serious|cancer|an infection|normal|contagious)|"
    r"what (condition|disease|infection) (do|could|might) i|"
    r"i (have|got|am having|'m having|am experiencing|'m experiencing|feel|am suffering from|'m suffering from) .*"
    r"(pain|ache|rash|itch|swelling|swollen|bleeding|fever|lump|spots|acne|hair ?fall|hair loss|bald|sensitive|infection|dizzy)|"
    r"my \w+( \w+)? (hurts|is hurting|is bleeding|is swollen|is itchy|itches|is falling|aches|is sensitive)|"
    r"(best|right) (treatment|medicine|cure) for (me|my)|how (do|can|should) i (treat|cure|get rid of)|"
    r"what should i do about my"
    r")",
    re.IGNORECASE,
)

_DEPARTMENT_HINTS = [
    ("dental", re.compile(r"\b(tooth|teeth|gum|gums|jaw|cavity|dental|mouth|braces|wisdom)\b", re.I)),
    ("skin", re.compile(r"\b(skin|acne|pimple|rash|eczema|psoriasis|mole|pigment\w*|itch\w*|spots?|scar)\b", re.I)),
    ("hair", re.compile(r"\b(hair|scalp|dandruff|bald\w*|hairfall)\b", re.I)),
    ("pediatrics", re.compile(r"\b(child|baby|infant|kid|son|daughter|toddler)\b", re.I)),
]

SafetyKind = Literal["emergency", "medical_advice"]


@dataclass
class SafetyResult:
    kind: SafetyKind | None
    department: str | None = None


def department_hint(message: str) -> str | None:
    for department, pattern in _DEPARTMENT_HINTS:
        if pattern.search(message):
            return department
    return None


def screen_message(message: str) -> SafetyResult:
    if _EMERGENCY.search(message):
        return SafetyResult("emergency")
    if _MEDICATION.search(message) or _DIAGNOSIS.search(message):
        return SafetyResult("medical_advice", department_hint(message))
    return SafetyResult(None)


DEPARTMENT_NAMES = {
    "dental": "our Dental Care team",
    "skin": "our Skin & Dermatology team",
    "hair": "our Hair & Trichology team",
    "pediatrics": "our Paediatrics team",
    "general": "a General Medicine doctor",
}


def emergency_reply(clinic_phone: str | None) -> str:
    call_clinic = f" You can also reach the clinic on {clinic_phone} during opening hours." if clinic_phone else ""
    return (
        "This sounds like it could be urgent. I'm an information assistant and can't assess symptoms.\n\n"
        "**If you or someone else may be in danger, call your local emergency number now "
        "(112 in India) or go to the nearest hospital emergency department.**"
        f"{call_clinic}"
    )


def medical_advice_reply(department: str | None) -> str:
    # Routing, not diagnosis: point to the department whose doctors can examine the patient.
    who = DEPARTMENT_NAMES[department or "general"]
    return (
        "I'm sorry, I can't diagnose conditions or recommend treatments or medicines — that needs "
        "a qualified healthcare professional who can examine you and review your history.\n\n"
        f"The right place to start is **{who}**. You can book a consultation with one of the doctors below "
        "(right here in the chat or on the How to book page), call the clinic or visit the front desk. "
        "If your symptoms are severe or getting worse quickly, please seek urgent medical care."
    )
