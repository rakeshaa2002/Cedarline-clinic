# Cedarline Clinic — Website & AI Healthcare Chatbot

A website for a fictional multi-speciality clinic (dental, skin, hair, general medicine, paediatrics) with an **AI assistant** that answers visitors' questions from the clinic's own approved information. It never diagnoses or recommends treatment.

The assistant uses **Retrieval-Augmented Generation (RAG)**:
1. Clinic information is split into chunks and turned into vectors with Google Gemini.
2. The vectors are stored in PostgreSQL with the **pgvector** extension.
3. For each question, the most relevant chunks are found and Gemini writes an answer using only those chunks.

Built for the Arquette Digital Full Stack Developer assessment (Task 1: website, Task 2 Option A: AI chatbot).

> All clinic details, doctors, prices and patients are **fictional**. Phone numbers use an invalid prefix, and emails use the reserved `.example` domain.

| | |
|---|---|
| Live website | _add your deployed URL_ |
| API docs (Swagger) | _add `https://<api-host>/docs`_ |
| Screen recording | _add link_ |

---

## Contents

1. [Tech stack](#tech-stack)
2. [Architecture](#architecture)
3. [How the chatbot answers a question](#how-the-chatbot-answers-a-question)
4. [Getting started](#getting-started)
5. [Codebase tour](#codebase-tour)
6. [Common tasks](#common-tasks)
7. [Testing](#testing)
8. [Configuration](#configuration)
9. [Conventions](#conventions)
10. [API reference](#api-reference)
11. [Deployment & CI/CD](#deployment--cicd)
12. [Troubleshooting](#troubleshooting)
13. [Known limitations](#known-limitations)
14. [AI tools used](#ai-tools-used)

More detail: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) (design decisions, safety layers, schema) · [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) (step-by-step hosting) · [docs/DEMO_SCRIPT.md](docs/DEMO_SCRIPT.md) (walkthrough).

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, TypeScript, Tailwind CSS 4, React Router 7, Axios, React Hook Form + Zod, Recharts, Lucide icons |
| Backend | Python 3.12, FastAPI, Pydantic v2, SQLAlchemy 2, Alembic, Psycopg 3, PyJWT, Argon2, httpx, pypdf |
| Database | PostgreSQL 17 + pgvector: one database holds both the app data and the vectors; there is no separate vector database |
| AI | Google Gemini: `gemini-embedding-001` (768 dimensions) for search, `gemini-2.5-flash` for answers. An OpenAI-compatible API also works, and an offline mode needs no API key |
| Tests | pytest against a real PostgreSQL + pgvector database (AI calls mocked); `tsc` + oxlint for the frontend |
| Delivery | Docker, Docker Compose, nginx; Render (API & Frontend Blueprint), GitHub Actions (CI/CD), Neon (Postgres), Vercel or Netlify (frontend) |

---

## Architecture

```
┌──────────────────────┐   /api/v1 (JSON)   ┌───────────────────────────┐  SQL   ┌─────────────────────────┐
│  React SPA (browser) │ ─────────────────► │  FastAPI backend          │ ─────► │ PostgreSQL + pgvector   │
│  - 10 public pages   │                    │  routers → services →     │        │  clinic data, users,    │
│  - chat widget       │ ◄───────────────── │  models                   │ ◄───── │  knowledge chunks with  │
│  - admin dashboard   │                    │                           │        │  vector(768) embeddings │
└──────────────────────┘                    └─────────────┬─────────────┘        └─────────────────────────┘
   no API keys here                                       │ httpx (server-side only)
                                                          ▼
                                            ┌───────────────────────────┐
                                            │ Gemini API                │
                                            │ embeddings + generation   │
                                            └───────────────────────────┘
```

Four ideas explain most of the design:

1. **The database is the single source of truth.** Doctors, services, opening hours and articles live in PostgreSQL. The website reads them through the API, and the chatbot's knowledge is *generated from the same tables*. When an admin edits a doctor, the chatbot's knowledge for that doctor is rebuilt automatically, so the two can never disagree.
2. **Secrets stay on the server.** The browser only talks to our API. Gemini is called from the backend, and nothing secret is ever given a `VITE_` prefix.
3. **The AI is fenced in.**
   - Safety rules catch medical-advice and emergency questions *before* the AI is called.
   - The prompt only allows answers from retrieved clinic text.
   - A grounding check rejects answers that contain numbers or doctor names not found in that text.
4. **Every AI failure has a fallback.**
   - An overloaded model → the next model is tried.
   - The model is still down → the bot quotes the matching clinic text.
   - Nothing relevant was found → the bot says so and gives the clinic's phone and email.

---

## How the chatbot answers a question

Entry point: `POST /api/v1/chat` → [`routers/chat.py`](backend/app/api/v1/routers/chat.py) → `ChatService.answer()` in [`services/chatbot/service.py`](backend/app/services/chatbot/service.py).

| Step | What happens | Code |
|---|---|---|
| 1. Validate | 1–500 characters, whitespace collapsed | `schemas/chat.py` |
| 2. Safety screen | Emergency or medical-advice wording → fixed safe reply. **The AI is never called.** | `chatbot/safety.py` |
| 3. Small talk | "hi", "thanks" → fixed reply | `chatbot/service.py` |
| 4. Embed question | Gemini turns the question into a 768-number vector | `knowledge_base/embeddings.py` |
| 5. Retrieve | pgvector finds the closest chunks (`embedding <=> :question`). Chunks below the similarity threshold are dropped. Nothing left → "I couldn't find that…" plus contact details | `chatbot/retrieval.py` |
| 6. Build prompt | Strict rules + retrieved chunks + the last few chat turns | `chatbot/prompt.py` |
| 7. Generate | Gemini writes the answer. HTTP 429/5xx → next model in `LLM_FALLBACK_MODELS`. Still failing → quote the chunks | `chatbot/llm.py` |
| 8. Check | `[[NO_ANSWER]]` → "couldn't find". A number or "Dr. X" not in the chunks → discard and quote the chunks instead | `chatbot/grounding.py` |
| 9. Respond | Answer + sources + suggested page links (e.g. "How to book") | `chatbot/service.py` |
| 10. Record | One `chat_events` row: outcome, provider, latency. **Never the text** | `routers/chat.py` |

Where the knowledge comes from ([`services/knowledge_base/`](backend/app/services/knowledge_base/)):

- **System documents:** generated from the database tables (hours, location, each doctor, each department's services, each article). See `system_documents.py`.
- **Seed documents:** approved Markdown in [`app/seed/knowledge/`](backend/app/seed/knowledge/) (FAQ, policies, how to book).
- **Uploads:** PDF/TXT/MD files added by an admin in the dashboard.

Each document is cleaned (`extraction.py`), split into chunks of about 800 characters with a 150-character overlap (`chunking.py`), embedded (`embeddings.py`), and stored (`ingestion.py`). Every chunk records which embedding model produced it, so vectors from different models are never mixed.

---

## Getting started

### Option 1 — Docker (everything in one command)

Requirements: Docker Desktop.

```bash
cp .env.example .env
# edit .env: set POSTGRES_PASSWORD, JWT_SECRET, ADMIN_PASSWORD
# optional: EMBEDDING_PROVIDER=gemini, LLM_PROVIDER=gemini, GEMINI_API_KEY=<your key>
docker compose up --build
```

| What | URL |
|---|---|
| Website | http://localhost:8080 |
| API + Swagger UI | http://localhost:8000/docs |
| Admin | http://localhost:8080/admin (log in with `ADMIN_EMAIL` / `ADMIN_PASSWORD`) |

On start, the backend container runs `alembic upgrade head`, seeds the fictional data, builds the chatbot knowledge, and starts the API ([`scripts/start.sh`](backend/scripts/start.sh)). Without a Gemini key it runs in **offline mode** (see [Configuration](#configuration)), so the chatbot still works.

### Option 2 — Local development (hot reload)

Requirements: Python 3.12+, Node 20+, Docker (for the database only).

**1. Database** (PostgreSQL 17 with pgvector, on port 5434):

```bash
docker run -d --name clinic-pg -e POSTGRES_USER=clinic -e POSTGRES_PASSWORD=clinic_dev_password \
  -e POSTGRES_DB=clinic -p 5434:5432 pgvector/pgvector:pg17
```

**2. Backend** (http://localhost:8000):

```bash
cd backend
python -m venv .venv
.venv/Scripts/activate            # Windows   (macOS/Linux: source .venv/bin/activate)
pip install -r requirements-dev.txt
cp .env.example .env              # then set JWT_SECRET, ADMIN_PASSWORD, and GEMINI_API_KEY or offline mode
alembic upgrade head              # creates the pgvector extension and all tables
python -m app.seed.run            # fictional data + chatbot knowledge (safe to re-run)
uvicorn app.main:app --reload --port 8000
```

**3. Frontend** (http://localhost:5173):

```bash
cd frontend
npm install
npm run dev                       # proxies /api to http://127.0.0.1:8000
```

**First-run checklist:**
- `GET http://localhost:8000/api/v1/health` returns `{"status":"ok","database":"ok"}`.
- `GET http://localhost:8000/api/v1/chat/health` shows `indexed_chunks` above 0.
- Open the site, click **Ask Cedarline** (bottom right), and ask "What are the clinic timings?".

**Logins.** The seed creates initial accounts from `.env`. There is no public sign-up page.

| Role | Can do |
|---|---|
| `admin` (`ADMIN_EMAIL` / `ADMIN_PASSWORD`) | Everything: dashboard, messages, edit doctors and services, upload/delete chatbot documents, re-index |
| `staff` (`STAFF_EMAIL` / `STAFF_PASSWORD`) | Dashboard, messages, view doctors and services |
| `doctor` (`DOCTOR_EMAIL` / `DOCTOR_PASSWORD`) | Doctor portal, appointment schedules, patient medical records |

The login page is at `/admin/login`; it isn't linked from the public site.

---

## Codebase tour

### Backend — `backend/app/`

```
main.py                  App factory: CORS, gzip, error handlers, routers
api/
  deps.py                Shared dependencies: DbSession, current user, StaffUser / AdminUser role guards
  v1/router.py           Registers every router under /api/v1
  v1/routers/
    health.py            Liveness + database check
    clinic.py            Public content: clinic info, services, doctors, blog, contact form
    chat.py              The chatbot endpoint + chat_events recording + /chat/health
    auth.py              Login (JWT) and /auth/me
    admin.py             Dashboard overview, doctors, services, contact messages
    knowledge.py         Upload / list / delete documents, re-index (admin only)
core/
  config.py              All settings, read from environment variables (pydantic-settings)
  security.py            Argon2 password hashing, JWT create/verify
  rate_limit.py          In-memory per-IP sliding-window limiter
  exceptions.py          AppError family → uniform JSON errors
  logging.py             Log format
db/                      SQLAlchemy Base (with constraint naming rules) and session
models/                  ORM tables: clinic.py, knowledge.py, chat.py, user.py
schemas/                 Pydantic request/response models (the API contract)
services/
  knowledge_base/        extraction → chunking → embeddings → ingestion; system_documents (DB → knowledge)
  chatbot/               safety, retrieval, prompt, llm, grounding, service (orchestrates the steps)
seed/
  data.py                Fictional clinic, doctors, services, articles
  knowledge/*.md         Approved FAQ / policy / how-to-book documents
  run.py                 Idempotent seeder (python -m app.seed.run)
```

Other backend folders: `alembic/versions/` (migrations: `0001` initial schema + pgvector, `0002` chat_events), `tests/` (pytest), `scripts/start.sh` (container entrypoint).

**Layering rule.** Routers deal with HTTP only (parsing, status codes, auth). Logic lives in `services/`. Routers return Pydantic schemas, never ORM objects.

### Frontend — `frontend/src/`

```
main.tsx                 Entry: router + providers (auth, toasts)
router/index.tsx         All routes; every page except Home is lazy-loaded
layouts/
  SiteLayout.tsx         Public shell: navbar, footer, chat widget, scroll handling
  AdminLayout.tsx        Admin shell: sidebar, auth guard, admin-only route guard
pages/                   One file per public page (+ departments/ template, admin/ pages)
components/
  ui/                    Design system: Button, Form fields, Card, Modal, Toast, loading/error/empty states
  site/                  Navbar, Footer, PageHero, Seo, Doctor/Service/Blog cards, CTA banner
  chat/                  ChatWidget, RichText (safe Markdown), openChat() helper
services/
  api.ts                 Axios instance: base URL, JWT header, error normalisation
  endpoints.ts           Every API call, typed (clinicApi, chatApi, authApi, adminApi)
hooks/
  useApi.ts              Fetch + in-memory cache + request de-duplication; invalidate(prefix)
  useClinic.ts           useClinicInfo / useDoctors / useServices + hours helpers
  useAuth.tsx            Admin session (JWT in sessionStorage)
types/index.ts           TypeScript types mirroring the backend schemas
content/site.ts          Static marketing copy (departments, testimonials, values)
utils/format.ts          Dates, times, prices, labels, cn() class helper
index.css                Tailwind theme tokens (ink / brand / accent colours, fonts)
```

**Pages:** `/`, `/about`, `/doctors`, `/services`, `/services/dental`, `/services/skin`, `/services/hair` (the three share [`DepartmentPage.tsx`](frontend/src/pages/departments/DepartmentPage.tsx) driven by a config object), `/appointments` (how to book), `/blog` + `/blog/:slug`, `/contact`, and `/admin/*`.

---

## Common tasks

### Change clinic content (doctors, services, hours)
- **In a running app:** log in as admin → **Doctors** or **Services**. Saving triggers a background task that regenerates and re-embeds only the affected chatbot documents.
- **In the seed:** edit [`backend/app/seed/data.py`](backend/app/seed/data.py), then run `python -m app.seed.run`. The seeder upserts by slug and re-embeds only documents whose text changed.

### Teach the chatbot something new
- **Quick:** admin → **Chatbot knowledge** → upload a PDF, TXT or MD file. It is searchable immediately.
- **Permanent:** add a Markdown file to [`backend/app/seed/knowledge/`](backend/app/seed/knowledge/) and run `python -m app.seed.run`. Start the file with `# Title`. Use `## Question-style headings` and make each fact name its subject (e.g. "The price **for Teeth Whitening** starts at…"); this noticeably improves retrieval.

### Change what the chatbot refuses or how it behaves
- **Refusal and emergency rules:** regex patterns in [`chatbot/safety.py`](backend/app/services/chatbot/safety.py). Add a test case both ways in `tests/test_chatbot.py`: it must catch the unsafe question *and* still answer a normal one.
- **Answering rules and tone:** the system prompt in [`chatbot/prompt.py`](backend/app/services/chatbot/prompt.py).
- **How strict retrieval is:** `RAG_SIMILARITY_THRESHOLD` (default 0.55 for Gemini). Raise it if the bot answers off-topic; lower it if it says "couldn't find" too often. Each response's `sources[].similarity` shows the scores.

### Switch AI provider or model
Set these in `backend/.env`, restart the API, then re-embed:
- `EMBEDDING_PROVIDER`, `EMBEDDING_MODEL`
- `LLM_PROVIDER`, `LLM_MODEL`, `LLM_FALLBACK_MODELS`

To re-embed, run `python -m app.seed.run`, which updates only out-of-date documents, or use admin → **Re-index**. Chunks from the old model are ignored automatically. The vector column is 768 dimensions; a model with a different size needs a migration (see below).

### Add an API endpoint
1. Define the request/response models in `backend/app/schemas/`.
2. Add the route to a router in `backend/app/api/v1/routers/`. For a new router file, register it in `api/v1/router.py`. Protect it with `StaffUser` or `AdminUser` from `api/deps.py` if needed.
3. Put real logic in `backend/app/services/`. Raise `NotFoundError`, `ConflictError` and similar from `core/exceptions.py` for errors.
4. Add a test in `backend/tests/`.
5. In the frontend, add the type to `types/index.ts` and the call to `services/endpoints.ts`. Then use it with `useApi('some:key', () => api.call())`. After a write, call `invalidate('some:')` so cached lists refresh.

### Change the database schema
1. Edit the model in `backend/app/models/`. New model files must be imported in `models/__init__.py`.
2. Generate a migration: `alembic revision --autogenerate --rev-id 0003 -m "describe change"`.
3. **Read the generated file.** Autogenerate misses some things (e.g. partial indexes, extensions).
4. Apply it with `alembic upgrade head`. Test the rollback with `alembic downgrade -1 && alembic upgrade head`.
5. Run `alembic check`. It should report *No new upgrade operations detected*.

### Add a public page
1. Create `frontend/src/pages/MyPage.tsx`. Start it with `<Seo title=… description=… path="/my-page" />` and usually a `<PageHero>`.
2. Add a lazy route in `router/index.tsx`.
3. Link it from `components/site/Navbar.tsx` and/or `Footer.tsx`.
4. Add the path to `PUBLIC_ROUTES` in `vite.config.ts` so it appears in `sitemap.xml`.

### Open the chatbot from any component

```tsx
import { openChat } from '@/components/chat/openChat'
<button onClick={() => openChat('Which doctor does braces?')}>Ask</button>   // question is optional
```

---

## Testing

```bash
cd backend
pytest                     # ~70 s; needs the pgvector container from "Getting started"
pytest tests/test_chatbot.py -k safety     # run a subset
```

- **Database:** tests use a separate `clinic_test` database (created automatically) and run the real Alembic migrations, so they exercise actual pgvector queries. Set `TEST_DATABASE_URL` to use another server.
- **No AI calls:** `conftest.py` forces the offline embedder, and `FakeLLM` stands in for Gemini. Gemini's HTTP request/response handling is tested with `httpx.MockTransport`. The test run needs no network access, costs nothing and gives the same results every time.
- **Coverage:** grounded answers, "couldn't find" without calling the LLM, rejecting made-up hours and doctors, safety redirects (and no false positives), model fallback and retries, file upload limits, chunking, pgvector storage, auth and roles, and the dashboard counts.

Frontend checks (run all three before pushing):

```bash
cd frontend
npx tsc -b && npm run lint && npm run build
```

---

## Configuration

Settings are read from environment variables (or `backend/.env`) by [`core/config.py`](backend/app/core/config.py). Annotated templates: [`backend/.env.example`](backend/.env.example), [`frontend/.env.example`](frontend/.env.example), [`.env.example`](.env.example) (Docker Compose).

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string. `postgres://` / `postgresql://` are normalised automatically |
| `JWT_SECRET` | Signs login tokens. In production the API refuses to start unless it is at least 32 characters and not the dev default |
| `CORS_ORIGINS` | Comma-separated frontend origins allowed to call the API |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `STAFF_EMAIL`, `STAFF_PASSWORD`, `DOCTOR_EMAIL`, `DOCTOR_PASSWORD` | Accounts created by the seeder |
| `EMBEDDING_PROVIDER` | `gemini` · `openai` · `hashing` (offline) |
| `EMBEDDING_MODEL`, `EMBEDDING_DIM` | Embedding model and vector size. **`EMBEDDING_DIM` must be 768** to match the database column |
| `LLM_PROVIDER` | `gemini` · `openai` · `extractive` (offline: quotes the matching text instead of writing prose) |
| `LLM_MODEL`, `LLM_FALLBACK_MODELS` | Main answer model, then comma-separated backups tried when it is overloaded |
| `GEMINI_API_KEY`, `OPENAI_API_KEY`, `OPENAI_BASE_URL` | Provider credentials. **Backend only** |
| `RAG_CHUNK_SIZE`, `RAG_CHUNK_OVERLAP`, `RAG_TOP_K`, `RAG_SIMILARITY_THRESHOLD` | Retrieval tuning |
| `RATE_LIMIT_CHAT_PER_MINUTE`, `RATE_LIMIT_LOGIN_PER_MINUTE`, `RATE_LIMIT_CONTACT_PER_MINUTE` | Per-IP request limits |
| `VITE_API_URL` | Frontend → API URL in production (leave empty in development; Vite proxies `/api`) |
| `VITE_SITE_URL` | Public site URL for canonical tags and the sitemap |

**Offline mode** (`EMBEDDING_PROVIDER=hashing`, `LLM_PROVIDER=extractive`) runs the same pipeline and the same pgvector search with no API key. It is useful for development and is what the tests use. Answers quote clinic text rather than being written by an AI.

---

## Conventions

- **Errors.** Every API error has the shape `{"error": {"code", "message", "details"}}`. The frontend's `api.ts` turns it into an `ApiError`, and form pages map `details[].field` onto the matching inputs.
- **Validation in both places.** Forms validate with Zod for instant feedback; Pydantic re-validates on the server. The server is the authority.
- **Secrets.** Never commit `.env` files (they are git-ignored). Never prefix a secret with `VITE_`, because anything prefixed `VITE_` is bundled into public JavaScript.
- **Privacy.** The server does not store chat text. Chat history lives in the visitor's browser tab (`sessionStorage`), and `chat_events` records only outcomes; a test enforces this.
- **Styling.** Use Tailwind with the theme tokens in `index.css` (`ink-*` neutrals, `brand-*` teal, `accent-*` orange) rather than raw hex values. Page sections use the `container-page` and `section` utility classes.
- **Accessibility.** Use the `components/ui` primitives: they handle labels, `aria-invalid`, focus traps and focus rings. Never convey information by colour alone.
- **Data fetching.** Always go through `useApi` + `endpoints.ts`, not raw Axios calls in components. Cache keys are namespaced strings (`'admin:overview'`, `'blog:skin:1'`).
- **Fictional data only.** Keep names, numbers and emails fake (`.example` domains, invalid phone prefixes).

---

## API reference

Interactive docs: `/docs` (Swagger UI) and `/redoc` on the API host.

| Method & path | Auth | Purpose |
|---|---|---|
| `GET /api/v1/health` | – | Liveness + database check |
| `GET /api/v1/clinic-info` | – | Clinic details and opening hours |
| `GET /api/v1/services[?department=]`, `GET /api/v1/services/{id}` | – | Services |
| `GET /api/v1/doctors[?department=&service_id=]`, `GET /api/v1/doctors/{id}` | – | Doctors |
| `GET /api/v1/blog[?page=&page_size=&category=]`, `/blog/categories`, `/blog/{slug}` | – | Articles |
| `POST /api/v1/contact` | – (rate-limited) | Contact form |
| `POST /api/v1/chat` | – (rate-limited) | Ask the chatbot (`{message, history}`) |
| `GET /api/v1/chat/health` | – | Provider, model and number of indexed chunks |
| `POST /api/v1/auth/login`, `GET /api/v1/auth/me` | – / Bearer | Log in (rate-limited), current user |
| `GET /api/v1/admin/overview` | staff | Dashboard: chatbot usage per day and by outcome, knowledge health, unread messages |
| `GET /api/v1/admin/messages`, `PATCH /api/v1/admin/messages/{id}/read` | staff | Contact messages |
| `GET\|POST /api/v1/admin/doctors`, `PUT /api/v1/admin/doctors/{id}` | admin (GET: staff) | Manage doctors |
| `GET\|POST /api/v1/admin/services`, `PUT /api/v1/admin/services/{id}` | admin (GET: staff) | Manage services |
| `GET\|POST /api/v1/admin/knowledge/documents`, `DELETE …/documents/{id}`, `POST /api/v1/admin/knowledge/reindex` | admin | Chatbot knowledge base |

---

## Deployment & CI/CD

### 1-Click Full-Stack Deployment on Render

This repository includes a production-ready Render Blueprint [`render.yaml`](render.yaml) that provisions and coordinates both services on Render:

| Service | Type | Runtime | Root Dir | Build / Start Command | Notes |
|---|---|---|---|---|---|
| **`cedarline-api`** | Web Service | Docker | `backend` | `./scripts/start.sh` | Health check `/api/v1/health`, runs migrations & seeds automatically, pgvector ready |
| **`cedarline-frontend`** | Static Site | Static | `frontend` | `npm ci && npm run build` | Static publish path `./dist`, SPA routing rewrite `/*` → `/index.html` |

#### How to Deploy to Render in 1 Click:
1. Push this repository to GitHub: `git push origin main`.
2. Open the [Render Dashboard](https://dashboard.render.com/) and click **New +** → **Blueprint**.
3. Select your repository (`healthcare-platform`).
4. Enter the required environment variables:
   - `DATABASE_URL`: Connection string from [Neon](https://neon.tech) (`postgresql://user:pass@ep-xyz.neon.tech/clinic?sslmode=require`) or Render PostgreSQL.
   - `GEMINI_API_KEY`: API key from Google AI Studio.
   - `ADMIN_PASSWORD`, `STAFF_PASSWORD`, `DOCTOR_PASSWORD`: Secure credentials for seed accounts.
   - `CORS_ORIGINS`: Your frontend URL (e.g. `https://cedarline-frontend.onrender.com`).
   - `VITE_API_URL`: Your backend API URL (e.g. `https://cedarline-api.onrender.com`).
   - `VITE_SITE_URL`: Your frontend URL (e.g. `https://cedarline-frontend.onrender.com`).
5. Click **Apply**. Render will automatically build the backend Docker container, run migrations and seeds, and build the frontend static SPA.

*(Alternative: The frontend can also be deployed to **Vercel** or **Netlify** with root directory `frontend` and publish directory `dist`.)*

### CI/CD Pipeline (GitHub Actions)

Continuous Integration and Continuous Deployment are automated via [`.github/workflows/ci-cd.yml`](.github/workflows/ci-cd.yml) on every push and pull request to `main`:

- **Frontend CI**: Sets up Node 22 with dependency caching, runs `oxlint` linting, and validates TypeScript build compilation (`tsc -b && vite build`).
- **Backend CI**: Sets up Python 3.12, verifies Python syntax & bytecode compilation (`compileall`), spins up a PostgreSQL + `pgvector` container (`pgvector/pgvector:pg17`), and runs the full `pytest` suite.
- **Continuous Deployment (CD)**:
  - Render automatically deploys new commits pushed to `main`.
  - Optionally, Render Deploy Webhooks can be triggered immediately by configuring `RENDER_API_DEPLOY_HOOK` and `RENDER_FRONTEND_DEPLOY_HOOK` in your GitHub repository secrets.

For full step-by-step instructions, see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `type "vector" does not exist` | The database has no pgvector. Use the `pgvector/pgvector` image (or a host that supports it), then `alembic upgrade head` |
| Chatbot always says it "couldn't find" the answer | Check `GET /api/v1/chat/health`. If `indexed_chunks` is 0, run `python -m app.seed.run` or use admin → Re-index. After changing embedding provider, re-index |
| `Embedding API returned HTTP 429` while seeding | Gemini's free tier limits requests per minute. Indexing already waits and retries; run the seed again and it continues where it stopped |
| Chat answers are quotes instead of prose | `LLM_PROVIDER` is `extractive`, or every model failed (the response's `provider` shows `extractive-fallback`). Check `GEMINI_API_KEY` and the API logs |
| `Embedding has 3072 dimensions but the database expects 768` | Set `EMBEDDING_DIM=768` |
| CORS error in the browser | Add the exact frontend origin (no trailing slash) to `CORS_ORIGINS` |
| `401` in the admin after a while | The login token expired (`JWT_EXPIRE_MINUTES`). Sign in again |
| Port already in use | Change `DB_PORT` / `BACKEND_PORT` / `FRONTEND_PORT` in `.env`, or run Vite with `--port` |
| Tests can't connect | Start the pgvector container, or set `TEST_DATABASE_URL` |

---

## Known limitations

- **No online booking.** By design (Task 2 Option A), `/appointments` explains how to book by phone, email or at reception, and the chatbot guides visitors there.
- **Rate limits** are kept in memory per process. Use Redis or a gateway limit when running several API instances.
- **On the Gemini free tier**, heavy simultaneous use can hit per-minute limits; the bot then quotes clinic text.
- **Offline mode** matches words, not meaning. Use Gemini (or OpenAI) embeddings in production.
- **Admin sessions** use a JWT in `sessionStorage`. A production clinic system should use httpOnly cookies with CSRF protection, audit logging and MFA.
- **Embedding size** is fixed at 768 by the migration. Changing it needs a new migration and a re-index.

---

## AI tools used

> **Draft:** edit this section so it accurately describes your own process before submitting.

**Claude Code (Anthropic)** was used as an AI pair-programmer for architecture, code, tests and documentation, working from a specification I wrote.

How the output was checked:
- The 89 backend tests run against real PostgreSQL + pgvector.
- The frontend passes type-check, lint and build.
- The chatbot was tested against the live Gemini API.
- The main pages were checked in a real browser at phone and desktop sizes.

Design decisions are explained in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
