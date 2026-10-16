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
        ("What are the clinic's opening hours?", "Monday: 09:00 to 20:00", "opening hours"),
        ("Where is the clinic located?", "48 Lakeside Avenue", "location"),
        ("How do I book an appointment?", "+91 80 0123 4567", "book an appointment"),
        ("Do you accept insurance?", "cashless", "Frequently asked questions"),
        ("How much does teeth whitening cost?", "Teeth Whitening", "Dental"),
    ],
)
def test_answers_from_knowledge_base_with_sources(client, knowledge, question, expected_text, expected_source):
    body = ask(client, question)
    assert body["status"] == "answered"
    assert expected_text in body["answer"]
    assert any(expected_source.lower() in s["title"].lower() for s in body["sources"])


def test_booking_question_offers_booking_link(client, knowledge):
    body = ask(client, "How can I book an appointment with a dentist?")
    assert {"label": "How to book", "href": "/appointments"} in body["actions"]


def test_llm_receives_retrieved_context_and_rules(client, knowledge):
    llm = FakeLLM("The clinic is open Monday to Friday from 09:00 to 20:00, and closed on Sunday.")
    use_llm(llm)
    body = ask(client, "What are your timings?")
    assert body["status"] == "answered" and body["provider"] == "fake-llm"
    system, messages = llm.calls[0]
    assert "Use ONLY the facts inside <context>" in system
    assert "<context>" in messages[-1]["content"] and "Monday: 09:00 to 20:00" in messages[-1]["content"]


def test_conversation_history_is_passed_to_llm(client, knowledge):
    llm = FakeLLM("Dr. Sara Thomas consults on Monday, Thursday and Friday.")
    use_llm(llm)
    history = [{"role": "user", "content": "Tell me about Dr. Sara Thomas"}, {"role": "assistant", "content": "She is our trichologist."}]
    ask(client, "Which days?", history)
    messages = llm.calls[0][1]
    assert messages[0]["content"] == "Tell me about Dr. Sara Thomas"
    assert messages[1]["role"] == "assistant"


# --- No relevant context ----------------------------------------------------------------------------


def test_unrelated_question_returns_no_context(client, knowledge):
    llm = FakeLLM("Paris is the capital of France.")
    use_llm(llm)
    body = ask(client, "What is the capital of France?")
    assert body["status"] == "no_context"
    assert "couldn't find" in body["answer"] and "+91 80 0123 4567" in body["answer"]
    assert llm.calls == []  # nothing relevant was retrieved, so the LLM was never asked


def test_empty_knowledge_base_returns_no_context(client, seeded):
    assert ask(client, "What are the opening hours?")["status"] == "no_context"


def test_llm_no_answer_token_becomes_no_context(client, knowledge):
    use_llm(FakeLLM("[[NO_ANSWER]]"))
    assert ask(client, "Do you offer parking validation for the mall?")["status"] == "no_context"


# --- Hallucination guards and provider failures ---------------------------------------------------------


def test_ungrounded_llm_answer_is_replaced(client, knowledge):
    # Invented hours ("04:45 to 23:59") are not in the context -> discarded for a quoted answer.
    use_llm(FakeLLM("We are open every day from 04:45 to 23:59."))
    body = ask(client, "What are the clinic's opening hours?")
    assert body["status"] == "fallback"
    assert "23:59" not in body["answer"] and "09:00 to 20:00" in body["answer"]


def test_invented_doctor_name_is_rejected():
    chunk = RetrievedChunk(1, 1, "Doctors", "Dr. Meera Iyer is our dentist. Open 09:00 to 20:00.", 0.9)
    assert is_grounded("Dr. Meera Iyer is available from 09:00.", [chunk])
    assert not is_grounded("Dr. John Smith is available.", [chunk])
    assert not is_grounded("A cleaning costs INR 999.", [chunk])


def test_llm_outage_falls_back_to_extractive_answer(client, knowledge):
    use_llm(FakeLLM(error=True))
    body = ask(client, "Where is the clinic located?")
    assert body["status"] == "fallback" and body["provider"] == "extractive-fallback"
    assert "Lakeside Avenue" in body["answer"]


def test_embedding_outage_returns_clear_503(client, knowledge):
    class BrokenEmbedder:
        model_id = "broken"

        def embed_query(self, text):
            raise EmbeddingError("down")

    app.dependency_overrides[get_embedder] = lambda: BrokenEmbedder()
    resp = client.post("/api/v1/chat", json={"message": "What are your opening hours?"})
    assert resp.status_code == 503
    assert "temporarily unavailable" in resp.json()["error"]["message"]


# --- Healthcare safety ------------------------------------------------------------------------------------


@pytest.mark.parametrize(
    "message",
    [
        "I have a rash on my arm, what cream should I use?",
        "Do I have an infection?",
        "Can you diagnose my tooth pain?",
        "What dosage of paracetamol should I take?",
        "My gums are bleeding, what's wrong with me?",
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
    assert any(a["href"] == "/appointments" for a in body["actions"])
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
    ["What dental treatments do you offer?", "Do you treat hair loss?", "Which doctors are available?",
     "What are the clinic timings?", "Is there a skin specialist?", "Do I have to bring my old reports?",
     "Could I have an appointment on Saturday?", "Can I have a copy of my bill?"],
)
def test_general_questions_are_not_blocked(message):
    assert screen_message(message).kind is None


def test_department_hint_for_redirect(client, knowledge):
    body = ask(client, "My tooth hurts, what should I take?")
    assert "Dental Care" in body["answer"]
    assert {"label": "Dental treatments", "href": "/services/dental"} in body["actions"]


# --- Input validation & misc ---------------------------------------------------------------------------------


def test_chat_input_validation(client):
    assert client.post("/api/v1/chat", json={"message": "   "}).status_code == 422
    too_long = "a" * (get_settings().chat_max_question_chars + 1)
    assert client.post("/api/v1/chat", json={"message": too_long}).status_code == 422
    assert client.post("/api/v1/chat", json={"message": "hi", "history": [{"role": "system", "content": "x"}]}).status_code == 422


def test_greeting(client, seeded):
    body = ask(client, "Hello!")
    assert body["status"] == "answered" and "Cedarline" in body["answer"]


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
