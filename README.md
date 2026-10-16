# Cedarline Multispeciality Clinic — Website & AI Healthcare Chatbot

Technical assessment for **Arquette Digital — Full Stack Developer (Web Applications & AI Automation)**.

A 10-page healthcare clinic website for a fictional multi-speciality clinic (Task 1), with **Task 2 – Option A: an AI healthcare chatbot** built on genuine Retrieval-Augmented Generation:

- **Google Gemini** embeddings and generation.
- **PostgreSQL + pgvector** similarity search.
- Medical-safety guardrails that never let the AI diagnose or recommend treatment.

Everything runs end to end against a real FastAPI + PostgreSQL backend, with an authenticated admin dashboard for the chatbot's knowledge base and usage.

> All clinic details, doctors, qualifications, prices, testimonials and patients are **fictional**. Phone numbers use an invalid prefix and emails use the reserved `.example` domain. Photos are royalty-free Unsplash stock images and do not depict the named people.

| | |
|---|---|
| Live website | _add your deployed URL_ |
| API docs (Swagger) | _add `https://<api-host>/docs`_ |
| Repository | _add GitHub URL_ |
| Screen recording | _add link_ |

---

## Contents
1. [Features](#features)
2. [Technology stack](#technology-stack)
3. [Project structure](#project-structure)
4. [Quick start (Docker)](#quick-start-docker)
5. [Local development without Docker](#local-development-without-docker)
6. [Environment variables](#environment-variables)
7. [Database, migrations and seed data](#database-migrations-and-seed-data)
8. [Testing](#testing)
9. [How to try the chatbot](#how-to-try-the-chatbot)
10. [API overview](#api-overview)
11. [Deployment](#deployment)
12. [Troubleshooting](#troubleshooting)
13. [AI tools used](#ai-tools-used)
14. [Known limitations](#known-limitations)

Deeper documentation: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) (RAG pipeline, safety design, database schema) · [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) · [docs/DEMO_SCRIPT.md](docs/DEMO_SCRIPT.md).

---

## Features

### AI healthcare chatbot (Task 2 – Option A)

How each requirement in the brief is met:

| Requirement | How it is met |
|---|---|
| Answer general questions about clinic services | RAG over the clinic's own approved information: services with durations and indicative prices, FAQs, policies and patient-education articles |
| Provide clinic timings, location and doctor information | Hours, address, contact details and every doctor's specialty and consultation days are generated from the database, so the chatbot always matches the website |
| Guide visitors to the appointment booking page | Booking questions are answered with the phone, email and front-desk options, plus a **How to book** button that links to `/appointments` |
| Handle questions it cannot answer without inventing information | A similarity threshold, a `[[NO_ANSWER]]` token and a grounding check (every number and doctor name must appear in the retrieved text). Otherwise it says it doesn't know and gives the real contact details |
| Use an AI API | Google Gemini: `gemini-embedding-001` (768-d) for retrieval, `gemini-2.5-flash` for answers, with an automatic fallback model when the main one is overloaded |
| No diagnoses or personalised treatment | Diagnosis, treatment, medicine and dosage questions get a fixed, safe redirect to a doctor. Possible emergencies get an urgent-care message (112). **These never reach the LLM.** |

**Pipeline:** safety screen → query embedding → **pgvector cosine search with a similarity threshold** → grounded prompt → LLM → answer validation → sources and suggested links.

**Widget, on every public page:**
- Welcome message and suggested questions.
- Typing indicator.
- Source chips and action buttons ("How to book", department pages, "Contact us").
- Retry on error and clear chat.
- A full-screen sheet on mobile.
- History kept only in the browser tab; the server never stores what visitors type.

**Other pages open it directly.** For example, the "Try asking" questions on the How to book page open the widget and ask that question.

**Knowledge base management (admin):**
- Upload PDF/TXT/MD documents (type and size validated). They are extracted, chunked, embedded and searchable immediately.
- Delete documents and re-index.
- Doctor, service, hours and article data become knowledge documents automatically and are refreshed after every admin edit.

**Resilience:**
- If Gemini is overloaded (HTTP 429/5xx), the next model in `LLM_FALLBACK_MODELS` is tried.
- If generation fails entirely, the assistant quotes the relevant clinic text instead of erroring.
- Indexing waits out per-minute API quotas.
- An **offline mode** (lexical hashing embeddings + extractive answers) still performs real pgvector retrieval, so the demo works without an API key.

### Admin dashboard
JWT authentication, Argon2 password hashing, and two roles: admin and staff.
- **Dashboard:**
  - Chatbot questions per day.
  - Outcome breakdown: answered, couldn't answer, medical advice declined, emergency guidance.
  - Share answered from clinic information, and average reply time.
  - Knowledge-base health and unread messages.
  - Only the *outcome* of each reply is recorded, never the visitor's text.
- **Chatbot knowledge** (admin): upload, delete and re-index documents.
- **Doctors and Services** (admin): edits flow straight into the chatbot's knowledge.
- **Messages:** submissions from the contact form.

### Website (Task 1)
| # | Page | Route |
|---|------|-------|
| 01 | Home | `/` |
| 02 | About the Clinic | `/about` |
| 03 | Our Doctors (filters, search, profile modal) | `/doctors` |
| 04 | All Services | `/services` |
| 05 | Dental Treatments | `/services/dental` |
| 06 | Skin Treatments | `/services/skin` |
| 07 | Hair Treatments | `/services/hair` |
| 08 | Appointments: how to book (phone, email, front desk), each doctor's consultation days, AI assistant shortcuts | `/appointments` |
| 09 | Blog / Patient Education (+ article pages) | `/blog`, `/blog/:slug` |
| 10 | Contact Us (working form + map) | `/contact` |

- **Responsive:** fluid layout from 320 px phones to 2560 px monitors. An automated sweep of every route at 12 widths finds no horizontal overflow and no console errors.
- **Design system:** Button, Field/Input/Select/Textarea, Card, Badge, SectionHeading, Breadcrumbs, Modal (focus trap), Toasts, Pagination, Skeleton/Spinner loading states, Alert/Error/Empty states, page hero and CTA banner.
- **Single source of truth:** doctors, services, hours, articles and contact details all come from the API, shared by the website and the chatbot.
- **Forms:** validated with React Hook Form + Zod and re-validated by Pydantic. Server field errors are mapped back onto the inputs.
- **SEO:**
  - A unique `<title>`, meta description, canonical and Open Graph tags per page (React 19 native head tags).
  - Semantic headings and `MedicalClinic` JSON-LD.
  - `sitemap.xml` and `robots.txt` generated at build time.
- **Accessibility:**
  - Skip link, landmark regions, and labelled inputs with `aria-invalid`/`aria-describedby`.
  - Keyboard-operable menus and dialogs, with visible focus rings.
  - `prefers-reduced-motion` support.
  - Information is never conveyed by colour alone.
- **Performance:** route-level code splitting, self-hosted variable fonts, WebP images with explicit dimensions and lazy loading, a preloaded hero image, and Recharts isolated in the admin-only chunk.

---

## Technology stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite 8, TypeScript 6, Tailwind CSS 4, React Router 7, Axios, Lucide React, Recharts, React Hook Form + Zod |
| Backend | Python 3.12, FastAPI, Pydantic v2, SQLAlchemy 2 ORM, Alembic, Psycopg 3, PyJWT, Argon2 (argon2-cffi), httpx, pypdf |
| Database & vectors | PostgreSQL 17 + **pgvector** (`vector(768)` column, HNSW index, cosine distance `<=>`) |
| AI | Google Gemini API (embeddings + generation) via REST; OpenAI-compatible alternative; offline fallback |
| Testing | pytest against real PostgreSQL + pgvector (89 tests; AI APIs mocked); oxlint and `tsc` for the frontend |
| Delivery | Docker, Docker Compose, nginx; Render (API) + Neon (Postgres + pgvector) + Vercel/Netlify (frontend) |

---

## Project structure

```
healthcare-platform/
├── backend/
│   ├── app/
│   │   ├── api/v1/routers/      # health, auth, clinic, chat, admin, knowledge
│   │   ├── core/                # config, security (JWT/Argon2), rate limiting, error handlers
│   │   ├── db/                  # SQLAlchemy base + session
│   │   ├── models/              # ORM models (clinic, knowledge, chat events, user)
│   │   ├── schemas/             # Pydantic request/response models
│   │   ├── services/
│   │   │   ├── knowledge_base/  # extraction, chunking, embeddings, ingestion, DB->documents
│   │   │   └── chatbot/         # safety, retrieval, prompt, LLM providers, grounding, orchestration
│   │   ├── seed/                # fictional data + approved FAQ markdown + seed runner
│   │   └── main.py
│   ├── alembic/                 # migrations (creates the pgvector extension)
│   ├── tests/                   # pytest suite
│   ├── scripts/start.sh         # container entrypoint: migrate → seed → serve
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/          # ui/ (design system), site/, chat/
│   │   ├── pages/               # 10 public pages, blog article, admin/
│   │   ├── layouts/ hooks/ services/ types/ utils/ router/ content/
│   ├── public/images/           # optimised WebP imagery
│   ├── nginx.conf  vercel.json  Dockerfile
├── docs/                        # architecture, deployment, demo script
├── docker-compose.yml
├── render.yaml
└── .env.example
```

---

## Quick start (Docker)

Requirements: Docker Desktop.

```bash
cp .env.example .env        # set POSTGRES_PASSWORD, JWT_SECRET, ADMIN_PASSWORD and GEMINI_API_KEY
docker compose up --build
```

| | |
|---|---|
| Website | http://localhost:8080 |
| API / Swagger UI | http://localhost:8000/docs |
| Admin | http://localhost:8080/admin — sign in with `ADMIN_EMAIL` / `ADMIN_PASSWORD` |

On start, the backend:
1. Runs `alembic upgrade head`.
2. Seeds the fictional data (safe to repeat).
3. Builds the knowledge base.
4. Serves on port 8000.

nginx serves the single-page app and proxies `/api` to the backend.

To use Gemini, set `EMBEDDING_PROVIDER=gemini`, `LLM_PROVIDER=gemini` and `GEMINI_API_KEY` in `.env`, then restart. The seed re-embeds automatically, because each vector records the model that produced it. Without a key, the Compose defaults run the offline mode.

---

## Local development without Docker

You need Python 3.12+, Node 20+, and a PostgreSQL database with pgvector. The easiest way to get the database is still Docker:

```bash
docker run -d --name clinic-pg -e POSTGRES_USER=clinic -e POSTGRES_PASSWORD=clinic_dev_password \
  -e POSTGRES_DB=clinic -p 5434:5432 pgvector/pgvector:pg17
```

**Backend**

```bash
cd backend
python -m venv .venv
.venv/Scripts/activate            # Windows  (macOS/Linux: source .venv/bin/activate)
pip install -r requirements-dev.txt
cp .env.example .env              # edit DATABASE_URL, JWT_SECRET, ADMIN_PASSWORD, GEMINI_API_KEY
alembic upgrade head              # creates the vector extension + all tables
python -m app.seed.run            # fictional data + knowledge base
uvicorn app.main:app --reload --port 8000
```

**Frontend**

```bash
cd frontend
npm install
npm run dev                       # http://localhost:5173 (proxies /api → 127.0.0.1:8000)
```

Other scripts: `npm run build`, `npm run lint`, `npm run preview`.

---

## Environment variables

Full annotated lists: [`backend/.env.example`](backend/.env.example), [`frontend/.env.example`](frontend/.env.example), [`.env.example`](.env.example) (Compose).

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL URL. `postgres://` and `postgresql://` are normalised to the psycopg driver automatically. |
| `JWT_SECRET` | Token signing secret. The API refuses to start in production with the dev default or anything shorter than 32 characters. |
| `CORS_ORIGINS` | Comma-separated frontend origins allowed by the API |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD`, `STAFF_EMAIL` / `STAFF_PASSWORD` | Accounts created by the seed script |
| `EMBEDDING_PROVIDER` | `gemini` \| `openai` \| `hashing` (offline) |
| `EMBEDDING_MODEL`, `EMBEDDING_DIM` | Model name and vector size. **`EMBEDDING_DIM` must match the pgvector column (768).** |
| `LLM_PROVIDER`, `LLM_MODEL` | `gemini` \| `openai` \| `extractive`, and the chat model name (default `gemini-2.5-flash`) |
| `LLM_FALLBACK_MODELS` | Comma-separated models tried in order when the main one is overloaded (default `gemini-flash-lite-latest`) |
| `GEMINI_API_KEY`, `OPENAI_API_KEY`, `OPENAI_BASE_URL` | Provider credentials (server-side only) |
| `RAG_CHUNK_SIZE`, `RAG_CHUNK_OVERLAP`, `RAG_TOP_K`, `RAG_SIMILARITY_THRESHOLD` | Retrieval tuning |
| `RATE_LIMIT_*_PER_MINUTE` | Per-IP limits for chat, login and the contact form |
| `VITE_API_URL` | Frontend → API base URL in production (empty in development) |
| `VITE_SITE_URL` | Public site URL for canonical tags and the sitemap |

API keys exist only on the backend. Nothing secret is prefixed `VITE_`, so the browser never sees a key.

---

## Database, migrations and seed data

```bash
alembic upgrade head                        # apply migrations (enables pgvector)
alembic downgrade base                      # drop everything
python -m app.seed.run                      # idempotent seed (safe to re-run)
python -m app.seed.run --reindex            # re-chunk + re-embed all documents (after changing model/chunking)
python -m app.seed.run --skip-knowledge     # data only, no embedding calls
```

Tables:
- `users`, `clinic_info`, `doctors`, `services`, `blog_posts`, `contact_messages`.
- `knowledge_documents` and `knowledge_chunks`, with `embedding vector(768)` and an HNSW `vector_cosine_ops` index.
- `chat_events`: one row per chatbot reply. It records only the outcome, provider, latency and best similarity, never the question or answer text.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md#database-schema) for columns, constraints and indexes.

The seed creates:
- Clinic details and weekly hours.
- 9 doctors with consultation days, 20 services with indicative prices, and 8 patient-education articles.
- 3 approved FAQ/policy documents, including the "How to book" guide.
- Admin and staff accounts from the environment variables. In development, a missing password is generated and printed once.

---

## Testing

```bash
cd backend
pytest                    # needs the pgvector Postgres running; uses/creates database `clinic_test`
```

`TEST_DATABASE_URL` overrides the test database. The suite runs the real Alembic migrations, then exercises:

| Area | What is covered |
|---|---|
| Health & clinic API | Services/doctors listing and filters, blog pagination and 404s, contact form validation |
| Chatbot | Grounded answers with sources, booking guidance, prompt contains retrieved context, history passed through, **no-context reply without calling the LLM**, `[[NO_ANSWER]]` handling, **hallucinated hours/doctor rejected**, LLM outage fallback, embedding outage → 503, **diagnosis/medication/dosage requests redirected without calling the LLM**, emergencies, no false positives on normal questions, rate limit, Gemini request/response parsing, **fallback model on HTTP 503**, embedding retry on 429 (all with mocked HTTP) |
| Knowledge base | TXT/MD/PDF extraction, rejected file types, size limit (413), chunk size/overlap/heading behaviour, embedding dimension and normalisation, upload → pgvector `vector_dims = 768` → retrievable, model isolation, cascade delete, re-index |
| Auth & admin | Login, rate limiting, 401 on every admin route, staff vs admin (403), **dashboard outcome counts**, `chat_events` holds no message text, doctor edit validation |

Latest run: **89 passed**. The frontend passes `tsc -b`, has zero `oxlint` findings, and `vite build` succeeds. The chatbot, the How to book page and the admin dashboard were also checked in a real browser with Playwright, and against the live Gemini API.

---

## How to try the chatbot

Click **Ask Cedarline** (bottom right) on any page, or a "Try asking" question on `/appointments`:

| Ask | What you should see |
|---|---|
| "What are the clinic timings?" / "Is the clinic open on Sunday?" | The opening hours, with sources |
| "Where is the clinic located?" | The address, plus a Contact link |
| "Which doctors are available?" / "When does Dr. Sara Thomas consult?" | Doctor information and consultation days |
| "What dental treatments do you offer?" / "How much does teeth whitening cost?" | Services and the indicative price |
| "Which doctor does braces and clear aligners?" | Dr. Arjun Nair, the orthodontist |
| "How do I book an appointment?" / "Can I book online?" | Phone, email and front-desk options, plus a **How to book** button |
| "What is the capital of France?" | "I couldn't find that in the clinic's approved information…" plus contact details |
| "I have a rash, which cream should I use?" | A safety redirect to a dermatologist; no advice is given |
| "I have chest pain" | An urgent-care message (112) |

Then sign in at `/admin` and open the **Dashboard** to see those questions counted by outcome.

---

## API overview

Interactive docs live at `/docs` (Swagger UI) and `/redoc`. Every error has the shape `{"error": {"code", "message", "details"}}`.

| Method & path | Auth | Description |
|---|---|---|
| `GET /api/v1/health` | – | Liveness + DB check |
| `GET /api/v1/clinic-info` | – | Clinic details and hours |
| `GET /api/v1/services[?department=]`, `GET /api/v1/services/{id}` | – | Services |
| `GET /api/v1/doctors[?department=&service_id=]`, `GET /api/v1/doctors/{id}` | – | Doctors |
| `GET /api/v1/blog[?page=&page_size=&category=]`, `GET /api/v1/blog/categories`, `GET /api/v1/blog/{slug}` | – | Articles |
| `POST /api/v1/contact` | – (rate-limited) | Contact form |
| `POST /api/v1/chat`, `GET /api/v1/chat/health` | – (rate-limited) | RAG chatbot; provider and index status |
| `POST /api/v1/auth/login`, `GET /api/v1/auth/me` | – / Bearer | JWT login (rate-limited), current user |
| `GET /api/v1/admin/overview` | staff | Dashboard: chatbot usage by day and outcome, knowledge-base health, unread messages |
| `GET /api/v1/admin/messages`, `PATCH /api/v1/admin/messages/{id}/read` | staff | Contact messages |
| `GET\|POST /api/v1/admin/doctors`, `PUT /api/v1/admin/doctors/{id}` | admin (GET: staff) | Manage doctors |
| `GET\|POST /api/v1/admin/services`, `PUT /api/v1/admin/services/{id}` | admin (GET: staff) | Manage services |
| `GET\|POST /api/v1/admin/knowledge/documents`, `DELETE /api/v1/admin/knowledge/documents/{id}`, `POST /api/v1/admin/knowledge/reindex` | admin | Knowledge base |

---

## Deployment

The three tiers deploy independently. The recommended free-tier setup is below; step-by-step instructions are in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

| Tier | Recommended | Why |
|---|---|---|
| Database | **Neon** Postgres | pgvector is available on every plan (`CREATE EXTENSION vector`) and storage is persistent |
| API | **Render** web service (Docker, `render.yaml` included) | Runs the same container as local, with health checks on `/api/v1/health`. Set `GEMINI_API_KEY` in the Render dashboard. |
| Frontend | **Vercel** or **Netlify** (`vercel.json` / `_redirects` included) | Static hosting with SPA rewrites; set `VITE_API_URL` and `VITE_SITE_URL` |

Render Postgres also supports pgvector. Neon is recommended because Render's free database expires. pgvector support was checked against the [Neon](https://neon.com/docs/extensions/pgvector) and [Render](https://render.com/docs/postgresql-extensions) documentation.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| `type "vector" does not exist` | The database lacks pgvector. Use the `pgvector/pgvector` image, or a host that supports it, and re-run `alembic upgrade head` (the migration runs `CREATE EXTENSION IF NOT EXISTS vector`). |
| `Embedding has 3072 dimensions but the database expects 768` | Set `EMBEDDING_DIM=768` (Gemini supports reduced dimensions), or create a migration that changes the column and then re-index. |
| `Embedding API returned HTTP 429` while seeding | The Gemini free tier limits requests per minute. Indexing already waits and retries; run `python -m app.seed.run` again and it continues with the documents that are still missing. |
| Chatbot always says it can't find information | Check `GET /api/v1/chat/health`. `indexed_chunks: 0` means you should run `python -m app.seed.run`, or use **Admin → Chatbot knowledge → Re-index**. After switching embedding provider, re-index; vectors from other models are ignored by design. |
| Chatbot answers are quotes, not prose | `LLM_PROVIDER=extractive`, or every LLM model failed (`provider` shows `extractive-fallback`). Set `LLM_PROVIDER=gemini` and `GEMINI_API_KEY`, and check the API logs. |
| Browser shows CORS errors in production | Add the exact frontend origin (scheme + host, no trailing slash) to `CORS_ORIGINS`. |
| `401` on admin pages after a while | The JWT expired (`JWT_EXPIRE_MINUTES`); sign in again. |
| Port already in use | Change `FRONTEND_PORT` / `BACKEND_PORT` / `DB_PORT` in `.env`, or run Vite with `--port`. |
| Tests can't connect | Start the pgvector container, or set `TEST_DATABASE_URL`. The `clinic_test` database is created automatically. |

---

## AI tools used

> **Draft:** edit this section so it accurately describes your own process before submitting.

- **Claude Code (Anthropic Claude)** was the main AI pair-programmer.
  - It inspected the empty workspace, proposed the architecture, and generated most of the code, tests, seed content and documentation from a detailed specification I wrote.
  - I asked it to work in phases and to run the tests, builds, Docker stack and browser checks rather than only describe them.
- **How the output was checked:**
  - 89 backend tests run against real PostgreSQL + pgvector.
  - The frontend passes type-check, lint and build.
  - The chatbot was tested against the live Gemini API.
  - Main journeys were automated in a browser at desktop and mobile sizes.
- **Problems found and fixed during development:**
  - **A wrong price in a chat answer.** Chunk overlap separated a service's price from its name, so the extractive answer showed the root-canal price for teeth whitening. Fixed with self-describing facts, paragraph-level extraction and overlap kept as its own paragraph.
  - **A retrieval miss.** A hash collision cancelled out a key term ("orthodontist"). Fixed by hashing each feature into two buckets.
  - **Safety-filter false positives.** Questions like "Do I have to bring reports?" were being refused.
  - **Gemini overload and rate limits.** The default model returned HTTP 503 under load, and bulk indexing hit the free-tier 429 limit. Fixed with a fallback model list and quota-aware retries.
  - **A mobile layout bug.** A CSS conflict caused horizontal overflow.
- All design decisions are documented in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) so they can be explained and modified.

---

## Known limitations

- **The website does not take bookings itself.** Option A was chosen for Task 2, so `/appointments` explains how to book by phone, email or at the front desk, and the chatbot guides visitors there.
- **Rate limiting** is in memory and per process. With several API instances, use Redis or a gateway limit.
- **The offline `hashing` embedder** is lexical, not semantic. It exists so the demo and tests work without an API key; use Gemini or OpenAI embeddings in production.
- **On the Gemini free tier**, heavy simultaneous use can hit per-minute limits. The assistant then falls back to quoting clinic information.
- **Opening hours** are shown in the clinic's local schedule; the visitor's "open today" badge uses the browser's weekday.
- **Admin sessions:** JWTs are stored in `sessionStorage`, which suits a demo. A production clinic system would use httpOnly cookies with CSRF protection, audit logging, and MFA for staff.
- **Embedding size:** the pgvector dimension is fixed by the migration (768). Changing it needs a new migration plus a re-index.
