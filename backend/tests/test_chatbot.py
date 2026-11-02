import httpx
import pytest

from app.core.config import get_settings
from app.services.chatbot.grounding import is_grounded
from app.services.chatbot.llm import GeminiLLM, LLMError, get_llm
from app.services.chatbot.retrieval import RetrievedChunk
from app.services.chatbot.safety import screen_message
from app.services.knowledge_base.embeddings import EmbeddingError, GeminiEmbedder, get_embedder
from app.main import app
from tests.conftest import FakeLLM

JATIN, ESHRITHA, JEEVITH = "dr-jatin-k-reddy", "dr-eshritha-c", "dr-jeevith-c-reddy"
FRONT_DESK = "+91 70199 76689"


def ask(client, message, history=None):
    resp = client.post("/api/v1/chat", json={"message": message, "history": history or []})
    assert resp.status_code == 200, resp.text
    return resp.json()


def use_llm(llm):
    app.dependency_overrides[get_llm] = lambda: llm


# --- Answering from retrieved context ---------------------------------------------------------


@pytest.mark.parametrize(
    ("question", "expected_text", "expected_source"),
    [
        ("What are the clinic's opening hours?", "Monday: 10:00 to 20:00", "opening hours"),
        ("Where is the clinic located?", "Puttappa Layout", "centres"),
        ("How do I book an appointment?", FRONT_DESK, "book an appointment"),
        ("Do you offer EMI?", "EMI plans", "Frequently asked questions"),
        ("How much does a HydraFacial cost?", "HydraFacial & Medifacials", "Advanced Cosmetic Dermatology"),
    ],
)
def test_answers_from_knowledge_base_with_sources(client, knowledge, question, expected_text, expected_source):
    body = ask(client, question)
    assert body["status"] == "answered"
    assert expected_text in body["answer"]
    assert any(expected_source.lower() in s["title"].lower() for s in body["sources"])


def test_booking_question_offers_booking_link(client, knowledge):
    body = ask(client, "How can I book an appointment with a dermatologist?")
    assert {"label": "Book an Appointment", "href": "/book-appointment"} in body["actions"]


def test_llm_receives_retrieved_context_and_rules(client, knowledge):
    llm = FakeLLM("The clinic is open every day from 10:00 to 20:00.")
    use_llm(llm)
    body = ask(client, "What are your timings?")
    assert body["status"] == "answered" and body["provider"] == "fake-llm"
    system, messages = llm.calls[0]
    assert "Use ONLY the facts inside <context>" in system and "RUA Skin & Hair Center" in system
    assert "<context>" in messages[-1]["content"] and "Monday: 10:00 to 20:00" in messages[-1]["content"]


def test_conversation_history_is_passed_to_llm(client, knowledge):
    llm = FakeLLM("Dr. Jeevith C Reddy consults from Tuesday to Sunday.")
    use_llm(llm)
    history = [
        {"role": "user", "content": "Tell me about Dr. Jeevith C Reddy"},
        {"role": "assistant", "content": "He is one of our consultant dermatologists."},
    ]
    ask(client, "Which days?", history)
    messages = llm.calls[0][1]
    assert messages[0]["content"] == "Tell me about Dr. Jeevith C Reddy"
    assert messages[1]["role"] == "assistant"


# --- No relevant context ----------------------------------------------------------------------------


def test_unrelated_question_returns_no_context(client, knowledge):
    llm = FakeLLM("Paris is the capital of France.")
    use_llm(llm)
    body = ask(client, "What is the capital of France?")
    assert body["status"] == "no_context"
    assert "couldn't find" in body["answer"] and f"on {FRONT_DESK} and" in body["answer"]  # no empty email slot
    assert llm.calls == []  # nothing relevant was retrieved, so the LLM was never asked


def test_empty_knowledge_base_still_answers_from_live_directory(client, seeded):
    # Hours, doctors and prices are read straight from the database, so they work before indexing...
    body = ask(client, "What are the opening hours?")
    assert body["status"] == "answered" and "Monday: 10:00 to 20:00" in body["answer"]
    # ...while policies (payments, consent...) still need the knowledge base.
    assert ask(client, "Do you offer EMI?")["status"] == "no_context"


def test_llm_no_answer_token_becomes_no_context(client, knowledge):
    use_llm(FakeLLM("[[NO_ANSWER]]"))
    assert ask(client, "Do you offer parking validation for the mall?")["status"] == "no_context"


# --- Hallucination guards and provider failures ---------------------------------------------------------


def test_ungrounded_llm_answer_is_replaced(client, knowledge):
    # Invented hours ("04:45 to 23:59") are not in the context -> discarded for a quoted answer.
    use_llm(FakeLLM("We are open every day from 04:45 to 23:59."))
    body = ask(client, "What are the clinic's opening hours?")
    assert body["status"] == "fallback"
    assert "23:59" not in body["answer"] and "10:00 to 20:00" in body["answer"]


def test_invented_doctor_name_is_rejected():
    chunk = RetrievedChunk(1, 1, "Doctors", "Dr. Eshritha C is our aesthetic dermatologist. Open 10:00 to 20:00.", 0.9)
    assert is_grounded("Dr. Eshritha C is available from 10:00.", [chunk])
    assert not is_grounded("Dr. John Smith is available.", [chunk])
    assert not is_grounded("A HydraFacial costs INR 999.", [chunk])


def test_llm_outage_falls_back_to_extractive_answer(client, knowledge):
    use_llm(FakeLLM(error=True))
    body = ask(client, "Where is the clinic located?")
    assert body["status"] == "fallback" and body["provider"] == "extractive-fallback"
    assert "Puttappa Layout" in body["answer"] and "GPH Tower" in body["answer"]  # both centres


def test_embedding_outage_returns_clear_503(client, knowledge):
    class BrokenEmbedder:
        model_id = "broken"

        def embed_query(self, text):
            raise EmbeddingError("down")

    app.dependency_overrides[get_embedder] = lambda: BrokenEmbedder()
    resp = client.post("/api/v1/chat", json={"message": "What are your opening hours?"})
    assert resp.status_code == 503
    assert "temporarily unavailable" in resp.json()["error"]["message"]


# --- Live clinic directory ---------------------------------------------------------------------------------


def test_doctor_list_is_complete_with_profile_cards(client, knowledge):
    body = ask(client, "Which doctors do you have?")
    assert body["status"] == "answered"
    for name in ("Dr. Jatin K Reddy", "Dr. Eshritha C", "Dr. Jeevith C Reddy"):
        assert name in body["answer"]
    assert "Fee: confirmed by the front desk" in body["answer"] and "Tue–Sun" in body["answer"]
    assert {d["slug"] for d in body["doctors"]} == {JATIN, ESHRITHA, JEEVITH}
    assert {"label": "Browse All Doctors & Profiles", "href": "/doctors"} in body["actions"]
    assert len(body["suggestions"]) == 3


def test_single_doctor_gets_profile_card_and_direct_booking_link(client, knowledge):
    body = ask(client, "Tell me about Dr. Eshritha C")
    assert "Fellowship in Dermatosurgery" in body["answer"] and "11:00 AM to 8:00 PM" in body["answer"]
    [card] = body["doctors"]
    assert card["slug"] == ESHRITHA and card["consultation_fee"] is None
    assert card["booking_href"] == "/book-appointment?doctor=dr-eshritha-c"
    assert body["actions"][0] == {"label": "Book with Dr. Eshritha C", "href": "/book-appointment?doctor=dr-eshritha-c"}


def test_shared_surname_does_not_pick_a_doctor(client, knowledge):
    # Two doctors are "Reddy": the surname alone must not open one profile.
    body = ask(client, "Tell me about Dr. Reddy")
    assert len(body["doctors"]) != 1


def test_follow_up_question_keeps_the_doctor(client, knowledge):
    history = [
        {"role": "user", "content": "Tell me about Dr. Jeevith C Reddy"},
        {"role": "assistant", "content": "Dr. Jeevith C Reddy is a consultant dermatologist."},
    ]
    body = ask(client, "Which days does he consult?", history)
    assert "Tuesday" in body["answer"] and "Sunday" in body["answer"]
    assert [d["slug"] for d in body["doctors"]] == [JEEVITH]


def test_department_question_shows_its_doctors_and_booking(client, knowledge):
    body = ask(client, "How can I book with a hair transplant surgeon?")
    assert [d["slug"] for d in body["doctors"]] == [JATIN]
    assert body["actions"][0]["href"] == "/book-appointment?doctor=dr-jatin-k-reddy"
    assert {"label": "Browse Hair Transplant Doctors", "href": "/doctors?department=hair-transplant"} in body["actions"]


def test_price_question_lists_every_department_service(client, knowledge):
    body = ask(client, "What are the prices for laser treatments?")
    for service in ("Laser Hair Reduction", "Laser Tattoo & Pigment Removal", "CO₂ Laser Resurfacing"):
        assert service in body["answer"]
    assert "price confirmed at the clinic" in body["answer"] and "HydraFacial" not in body["answer"]
    assert {"label": "Explore Laser Treatments", "href": "/services/laser-treatments"} in body["actions"]


def test_named_speciality_beats_keyword_hints(client, knowledge):
    body = ask(client, "What are the prices for Premium Aesthetic Packages?")
    assert "Prices — Premium Aesthetic Packages" in body["answer"] and "HydraFacial" not in body["answer"]


def test_treatment_overview_names_every_speciality(client, knowledge):
    body = ask(client, "What treatments do you offer?")
    for label in ("Medical Dermatology", "Dermatosurgery", "Advanced Cosmetic Dermatology", "Laser Treatments",
                  "Hair Treatments", "Hair Transplant", "Premium Aesthetic Packages"):
        assert f"**{label}**" in body["answer"]
    assert {"label": "All Services", "href": "/services"} in body["actions"]


def test_specific_treatment_is_described_not_just_priced(client, knowledge):
    body = ask(client, "Do you do PRP for hair?")
    assert "PRP Hair Treatment" in body["answer"] and "platelet" in body["answer"].lower()
    cost = ask(client, "How much does a HydraFacial cost?")
    assert "Hair Transplant Cost" not in cost["answer"]  # "cost" alone doesn't identify a service


def test_payment_questions_do_not_dump_the_price_list(client, knowledge):
    body = ask(client, "Do you offer EMI?")
    assert "EMI plans" in body["answer"] and "price confirmed at the clinic" not in body["answer"]


@pytest.mark.parametrize("message", ["Can I cancel my appointment?", "I want to reschedule my booking"])
def test_existing_appointments_point_to_the_patient_portal(client, knowledge, message):
    body = ask(client, message)
    assert "/patient" in body["answer"] and "WhatsApp" in body["answer"]
    assert body["actions"][0] == {"label": "My Appointments", "href": "/patient"}
    assert {"label": "Book an Appointment", "href": "/book-appointment"} not in body["actions"]


def test_centre_questions_list_both_centres(client, knowledge):
    body = ask(client, "Which centre is near KR Puram?")
    assert "RUA Ramamurthy Nagar" in body["answer"] and "RUA Indiranagar" in body["answer"]
    assert {"label": "Centres & Directions", "href": "/centers"} in body["actions"]


def test_directory_reflects_admin_edits_without_reindexing(client, knowledge, db):
    from decimal import Decimal

    from sqlalchemy import select

    from app.models import Doctor

    doctor = db.scalar(select(Doctor).where(Doctor.slug == JATIN))
    doctor.consultation_fee = Decimal("950")
    db.commit()
    body = ask(client, "What is Dr. Jatin K Reddy's consultation fee?")
    assert "₹950" in body["answer"] and body["doctors"][0]["consultation_fee"] == 950


def test_llm_receives_the_full_live_directory(client, knowledge):
    llm = FakeLLM("**👩‍⚕️ Our doctors:**\n\n- **Dr. Eshritha C** – Consultant Dermatologist")
    use_llm(llm)
    body = ask(client, "Which doctors do you have?")
    prompt = llm.calls[0][1][-1]["content"]
    assert 'title="Live clinic directory"' in prompt
    assert all(name in prompt for name in ("Dr. Jatin K Reddy", "Dr. Eshritha C", "Dr. Jeevith C Reddy"))
    assert body["status"] == "answered" and body["provider"] == "fake-llm"


@pytest.mark.parametrize(
    ("now", "expected_today", "in_today", "not_in_today"),
    [
        # Sunday 11:00 — open; only Dr. Jeevith (Tue–Sun) consults on Sundays.
        ((2026, 10, 25, 11, 0), "**Today (Sunday):** 10:00 to 20:00 (open now)", "Dr. Jeevith C Reddy", "Dr. Jatin K Reddy"),
        # Monday 21:30 — after hours; Dr. Jeevith is off on Mondays.
        ((2026, 10, 26, 21, 30), "**Today (Monday):** 10:00 to 20:00 (closed right now)", "Dr. Eshritha C", "Dr. Jeevith C Reddy"),
    ],
)
def test_today_questions_use_the_clinic_date(client, knowledge, monkeypatch, now, expected_today, in_today, not_in_today):
    from datetime import datetime
    from zoneinfo import ZoneInfo

    from app.services.chatbot.directory import ClinicDirectory

    fixed = datetime(*now, tzinfo=ZoneInfo(get_settings().clinic_timezone))
    original = ClinicDirectory.load.__func__
    monkeypatch.setattr(ClinicDirectory, "load", classmethod(lambda cls, db, now=None: original(cls, db, fixed)))

    llm = FakeLLM(error=True)  # the formatted directory answer is the fallback
    use_llm(llm)
    body = ask(client, "What are the clinic timings today?")
    assert expected_today in body["answer"]
    consulting = body["answer"].split("Doctors consulting today:")[1].split("\n")[0]
    assert in_today in consulting and not_in_today not in consulting
    prompt = llm.calls[0][1][-1]["content"]
    assert f"Today is {fixed:%A}, {fixed:%d %B %Y}" in prompt


def test_numbered_steps_are_not_treated_as_facts():
    chunk = RetrievedChunk(1, 1, "Booking", "Book online at /book-appointment or call the front desk.", 0.9)
    assert is_grounded("1. Choose your centre\n2. Choose a doctor\n3. Submit your details", [chunk])
    assert not is_grounded("Call the front desk on 12345.", [chunk])


# --- Healthcare safety ------------------------------------------------------------------------------------


@pytest.mark.parametrize(
    "message",
    [
        "I have a rash on my arm, what cream should I use?",
        "Do I have an infection?",
        "Can you diagnose my pimples?",
        "What dosage of paracetamol should I take?",
        "My scalp is itchy and flaky, what's wrong with me?",
        "Which medicine is best for hair fall?",
        "Should I take antibiotics for my acne?",
    ],
)
def test_medical_advice_requests_are_redirected_without_llm(client, knowledge, message):
    llm = FakeLLM("You should apply hydrocortisone twice daily.")
    use_llm(llm)
    body = ask(client, message)
    assert body["status"] == "safety_redirect"
    assert "can't diagnose" in body["answer"]
    assert any(a["href"] == "/book-appointment" for a in body["actions"])
    assert llm.calls == []


@pytest.mark.parametrize(
    "message",
    ["I have severe chest pain", "My father can't breathe", "I want to kill myself", "child swallowed poison"],
)
def test_emergencies_get_urgent_care_message(client, knowledge, message):
    body = ask(client, message)
    assert body["status"] == "emergency"
    assert "112" in body["answer"]


@pytest.mark.parametrize(
    "message",
    ["What laser treatments do you offer?", "Do you treat hair loss?", "Which doctors are available?",
     "What are the clinic timings?", "Is there a skin specialist?", "Do I have to bring my old reports?",
     "Could I have an appointment on Saturday?", "Can I have a copy of my bill?", "Do you do PRP for hair?",
     "How much does a hair transplant cost?"],
)
def test_general_questions_are_not_blocked(message):
    assert screen_message(message).kind is None


def test_department_hint_for_redirect(client, knowledge):
    body = ask(client, "My hair is falling a lot, what should I take?")
    assert "hair specialists" in body["answer"]
    assert {"label": "Hair treatments", "href": "/services/hair-treatments"} in body["actions"]
    # Routing without diagnosis: the recommended speciality's doctors, ready to book.
    assert {d["slug"] for d in body["doctors"]} == {JATIN, JEEVITH}


def test_symptoms_without_a_department_go_to_medical_dermatology(client, knowledge):
    body = ask(client, "Do I have an infection?")
    assert body["status"] == "safety_redirect" and "Medical Dermatology" in body["answer"]
    assert {d["slug"] for d in body["doctors"]} == {JATIN, ESHRITHA, JEEVITH}


# --- Input validation & misc ---------------------------------------------------------------------------------


def test_chat_input_validation(client):
    assert client.post("/api/v1/chat", json={"message": "   "}).status_code == 422
    too_long = "a" * (get_settings().chat_max_question_chars + 1)
    assert client.post("/api/v1/chat", json={"message": too_long}).status_code == 422
    assert client.post("/api/v1/chat", json={"message": "hi", "history": [{"role": "system", "content": "x"}]}).status_code == 422


def test_greeting(client, seeded):
    body = ask(client, "Hello!")
    assert body["status"] == "answered" and "RUA Skin & Hair Center" in body["answer"]


def test_chat_health(client, knowledge):
    body = client.get("/api/v1/chat/health").json()
    assert body["status"] == "ok" and body["indexed_chunks"] > 0
    assert body["llm_provider"] == "extractive"


def test_chat_rate_limit(client, knowledge, monkeypatch):
    monkeypatch.setattr(get_settings(), "rate_limit_chat_per_minute", 2)
    codes = [client.post("/api/v1/chat", json={"message": "hello"}).status_code for _ in range(3)]
    assert codes == [200, 200, 429]


# --- Provider adapters (HTTP mocked, no network) ------------------------------------------------------------


def _settings(**kw):
    return get_settings().model_copy(update={"gemini_api_key": "test-key", "llm_model": "gemini-test", **kw})


def test_gemini_llm_request_and_response_parsing():
    seen = {}

    def handler(request: httpx.Request):
        seen["url"] = str(request.url)
        seen["key"] = request.headers["x-goog-api-key"]
        seen["body"] = request.read().decode()
        return httpx.Response(200, json={"candidates": [{"content": {"parts": [
            {"text": "thinking...", "thought": True}, {"text": "We are open 09:00 to 20:00."}]}}]})

    llm = GeminiLLM(_settings(), client=httpx.Client(transport=httpx.MockTransport(handler)))
    out = llm.generate("system rules", [{"role": "user", "content": "hours?"}])
    assert out == "We are open 09:00 to 20:00."
    assert seen["url"].endswith("/models/gemini-test:generateContent") and seen["key"] == "test-key"
    assert '"systemInstruction"' in seen["body"]


def test_gemini_llm_errors_are_wrapped():
    client = httpx.Client(transport=httpx.MockTransport(lambda r: httpx.Response(429, json={})))
    with pytest.raises(LLMError):
        GeminiLLM(_settings(), client=client).generate("s", [{"role": "user", "content": "q"}])
    blocked = httpx.Client(transport=httpx.MockTransport(lambda r: httpx.Response(200, json={"candidates": []})))
    with pytest.raises(LLMError):
        GeminiLLM(_settings(), client=blocked).generate("s", [{"role": "user", "content": "q"}])


def test_gemini_llm_falls_back_to_next_model_when_overloaded():
    tried = []

    def handler(request: httpx.Request):
        model = request.url.path.rsplit("/", 1)[-1].split(":")[0]
        tried.append(model)
        if model == "gemini-test":
            return httpx.Response(503, json={"error": {"status": "UNAVAILABLE"}})
        return httpx.Response(200, json={"candidates": [{"content": {"parts": [{"text": "From the backup model."}]}}]})

    llm = GeminiLLM(_settings(llm_fallback_models="gemini-backup"), client=httpx.Client(transport=httpx.MockTransport(handler)))
    assert llm.generate("s", [{"role": "user", "content": "q"}]) == "From the backup model."
    assert tried == ["gemini-test", "gemini-backup"]

    # A non-transient error (e.g. a bad key) is not retried on another model.
    tried.clear()
    denied = httpx.Client(transport=httpx.MockTransport(lambda r: tried.append(1) or httpx.Response(403, json={})))
    with pytest.raises(LLMError, match="403"):
        GeminiLLM(_settings(llm_fallback_models="gemini-backup"), client=denied).generate("s", [{"role": "user", "content": "q"}])
    assert tried == [1]


def test_gemini_embedder_retries_rate_limits(monkeypatch):
    monkeypatch.setattr(GeminiEmbedder, "RETRY_DELAYS", (0, 0))
    responses = iter([httpx.Response(429, json={}), httpx.Response(200, json={"embeddings": [{"values": [0.5] * 768}]})])
    embedder = GeminiEmbedder(_settings(), client=httpx.Client(transport=httpx.MockTransport(lambda r: next(responses))))
    assert len(embedder.embed_query("hours")) == 768


def test_gemini_embedder_checks_dimensions():
    def ok(request):
        n = len(__import__("json").loads(request.read())["requests"])
        return httpx.Response(200, json={"embeddings": [{"values": [0.5] * 768} for _ in range(n)]})

    embedder = GeminiEmbedder(_settings(), client=httpx.Client(transport=httpx.MockTransport(ok)))
    vectors = embedder.embed_documents(["a", "b"])
    assert len(vectors) == 2 and len(vectors[0]) == 768
    assert abs(sum(v * v for v in vectors[0]) - 1) < 1e-6  # normalised

    wrong = httpx.Client(transport=httpx.MockTransport(lambda r: httpx.Response(200, json={"embeddings": [{"values": [0.1] * 3072}]})))
    with pytest.raises(EmbeddingError, match="3072 dimensions"):
        GeminiEmbedder(_settings(), client=wrong).embed_query("hours")


def test_missing_api_key_is_reported():
    with pytest.raises(EmbeddingError):
        GeminiEmbedder(get_settings().model_copy(update={"gemini_api_key": None}))


# --- Live free slots (which doctor is free when) ------------------------------------------------


def _pin_clock(monkeypatch, *when):
    from datetime import datetime
    from zoneinfo import ZoneInfo

    from app.services.chatbot.directory import ClinicDirectory

    fixed = datetime(*when, tzinfo=ZoneInfo(get_settings().clinic_timezone))
    original = ClinicDirectory.load.__func__
    monkeypatch.setattr(ClinicDirectory, "load", classmethod(lambda cls, db, now=None: original(cls, db, fixed)))
    return fixed


def test_free_slot_questions_read_the_live_booking_engine(client, knowledge):
    from datetime import timedelta

    from app.services.appointments import clinic_now

    today = clinic_now().date()
    sunday = today + timedelta(days=(6 - today.weekday()) % 7 + 7)  # a Sunday 7-13 days ahead
    question = f"Which doctors have free slots on {sunday.isoformat()}?"

    body = ask(client, question)  # offline: the formatted directory answer
    assert body["status"] == "answered" and "**🗓️ Free appointment slots:**" in body["answer"]
    line = next(x for x in body["answer"].splitlines() if f"{sunday:%d %B %Y}" in x)
    assert "Dr. Jeevith C Reddy — free 10:00 AM–6:00 PM (16 slots of 30 min)" in line
    assert "Dr. Eshritha C" in line and "do not consult on Sundays" in line  # Mon–Sat doctors
    assert {"label": "Book an Appointment", "href": "/book-appointment"} in body["actions"]

    # A booking takes its slot out of the next answer.
    booked = client.post("/api/v1/appointments", json={
        "department": "medical-dermatology", "doctor_slug": JEEVITH, "branch_slug": "indiranagar",
        "appointment_date": sunday.isoformat(), "start_time": "10:00", "patient_name": "Asha Kumar",
        "patient_phone": "+91 90000 20001", "reason": "Acne flare-up for three weeks",
    })
    assert booked.status_code == 201, booked.text
    assert "Dr. Jeevith C Reddy — free 10:30 AM–6:00 PM (15 slots of 30 min)" in ask(client, question)["answer"]


def test_doctor_availability_without_a_date_lists_the_next_free_days(client, knowledge):
    body = ask(client, "When is Dr. Eshritha available?")
    assert len([x for x in body["answer"].splitlines() if "Dr. Eshritha C — free" in x]) == 2
    assert "Dr. Jatin K Reddy — free" not in body["answer"]  # only the doctor asked about
    assert body["actions"][0] == {"label": "Book with Dr. Eshritha C", "href": f"/book-appointment?doctor={ESHRITHA}"}


def test_a_day_with_nothing_free_offers_the_next_free_day(client, knowledge, monkeypatch):
    _pin_clock(monkeypatch, 2026, 10, 26, 21, 30)  # Monday, after the last slot
    llm = FakeLLM(error=True)
    use_llm(llm)
    answer = ask(client, "Which doctor is available today?")["answer"]
    assert "Monday 26 October 2026 (today): Dr. Eshritha C — no free slots left" in answer
    assert "Next day with free slots — Tuesday 27 October 2026: Dr. Eshritha C — free 11:00 AM–8:00 PM" in answer
    assert "Live free appointment slots from the booking system" in llm.calls[0][1][-1]["content"]


@pytest.mark.parametrize(
    ("text", "expected"),
    [
        ("free slots tomorrow?", ["2026-11-03"]),
        ("who is available on Sunday", ["2026-11-08"]),
        ("next monday please", ["2026-11-09"]),
        ("anyone this weekend?", ["2026-11-07", "2026-11-08"]),
        ("on 5th Nov", ["2026-11-05"]),
        ("05/11/2026", ["2026-11-05"]),
        ("1 jan", ["2027-01-01"]),
        ("are you open 24/7?", []),
        ("May I book?", []),
        ("acne for 2 decades", []),
        ("31 feb", []),
    ],
)
def test_requested_days(text, expected):
    from datetime import date

    from app.services.chatbot.directory import requested_days

    assert [d.isoformat() for d in requested_days(text, date(2026, 11, 2))] == expected  # a Monday


@pytest.mark.parametrize(
    "message",
    ["Is laser hair reduction available?", "What are the clinic timings today?", "Is the consultation free?"],
)
def test_general_questions_do_not_trigger_slot_lookups(client, knowledge, message):
    assert "Free appointment slots" not in ask(client, message)["answer"]
