# Demo script (screen recording, about 6–8 minutes)

This project implements **Task 2, Option A: the AI chatbot**. The chatbot is the centrepiece; the website around it is Task 1.

Before recording: run the seed, sign out of admin, clear the chat, and use a desktop browser window about 1440 px wide. Have the mobile view ready in DevTools (iPhone 14, 390 px).

## 1. Website tour (≈2 min)
1. **Home.** Scroll slowly through the hero ("Clinic hours today" comes from the API), the quick-info strip, introduction, departments, doctors, why-choose-us, how-to-book steps, testimonials and the latest articles.
2. **Services menu → Dental Treatments.** Show the shared department template: overview, live services with prices, the "what to expect" steps, the department's doctors, and the FAQ accordion.
3. **Our Doctors.** Filter by Skin, search "Tamil", open a profile modal (weekly schedule), close it with Esc.
4. **Blog.** Filter by a category, open an article; point out the author box and disclaimer.
5. **Contact.** Submit an empty form to show validation, then send a valid message.
6. **Mobile.** Switch to 390 px: hamburger menu, stacked layouts, full-screen chat.
7. Briefly mention SEO: each page has its own title (visible in the browser tab), and there is a sitemap and JSON-LD.

## 2. How to book (≈1 min)
1. Open **Appointments**. Show the three ways to book (phone, email, front desk) and the ready-to-fill email.
2. Scroll to **Which doctor, which day?**, filter by department, and show each doctor's consultation days.
3. Click a doctor card's **Book** button elsewhere on the site: it lands here with that doctor highlighted.
4. Point out that the site deliberately doesn't take bookings itself. The chatbot guides visitors to these options.

## 3. Chatbot (≈3 min)
On the Appointments page, click a **Try asking** question: it opens the assistant and asks it. Then ask:
1. "What are the clinic timings?" — answer and source chips.
2. "Which doctors are available on Saturday?" / "When does Dr. Sara Thomas consult?"
3. "How do I book an appointment?" and "Can I book online?" — phone, email and front-desk options, then click the **How to book** button.
4. "Which doctor does braces and clear aligners?" — Dr. Arjun Nair.
5. "What is the capital of France?" — it declines and gives contact details.
6. "I have a rash, which cream should I use?" — safety redirect, no advice given.
7. "I have chest pain" — urgent-care message.

Explain the pipeline: safety screen → embed → pgvector cosine search → threshold → grounded prompt → Gemini (with a fallback model) → grounding check → sources.

## 4. Admin (≈1.5 min)
1. Go to `/admin`: you are redirected to login. Try a wrong password, then sign in.
2. **Dashboard:** the questions you just asked, counted by outcome (answered, couldn't answer, medical advice declined, emergency), plus knowledge-base health. Mention that only outcomes are stored, never the text.
3. **Chatbot knowledge:** status card (model, chunk count, threshold). Upload a small TXT, e.g. "Cedarline runs a free monsoon skin-care camp every July", then ask the chatbot about it.
4. **Doctors:** edit a doctor's consultation days, then ask the chatbot about that doctor. The knowledge base refreshes automatically.

## 5. Code walkthrough (optional, ≈1 min)
- `backend/app/services/chatbot/service.py`: the pipeline in one readable function.
- `backend/app/services/chatbot/safety.py` and `grounding.py`: the two guardrails around the LLM.
- `backend/app/services/chatbot/llm.py`: the model fallback on HTTP 429/5xx.
- `backend/tests/`: run `pytest` (89 tests).
