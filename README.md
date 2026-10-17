# Cedarline Clinic — Website & AI Healthcare Chatbot

A production-ready web platform for a fictional multi-speciality healthcare clinic (Dental, Dermatology, Trichology, General Medicine, Paediatrics) integrated with an **AI Medical Assistant** that answers visitor inquiries grounded exclusively in approved clinic information. It strictly never diagnoses, prescribes, or invents medical treatments.

Built for the **Arquette Digital** Full Stack Developer Assessment (Task 1: 10-Page Website, Task 2 Option A: AI Healthcare Chatbot).

> **Disclaimer:** All clinic details, doctors, pricing, and patient records are **fictional**. Phone numbers use invalid prefixes, and emails use the RFC-reserved `.example` domain.

---

## Quick Reference & Live Links

| Item | URL / Value |
|:---|:---|
| **Live Deployed Website** | [https://healthcare-platform-fxgn.onrender.com](https://healthcare-platform-fxgn.onrender.com) |
| **Backend API (Swagger Docs)** | [https://cedarline-api.onrender.com/docs](https://cedarline-api.onrender.com/docs) (ReDoc: [`/redoc`](https://cedarline-api.onrender.com/redoc)) |
| **GitHub Repository** | [https://github.com/rakeshaa2002/healthcare-platform](https://github.com/rakeshaa2002/healthcare-platform) |
| **Candidate** | **Rakesha N** — Full Stack Developer (Web Applications & AI Automation) |
| **Admin Portal** | [`/admin/login`](https://healthcare-platform-fxgn.onrender.com/admin/login) (`admin@cedarline.example` / `Cedarline-Admin-2026`) |
| **Staff Portal** | `staff@cedarline.example` / `Cedarline-Staff-2026` |
| **Doctor Portal** | `doctor@cedarline.example` / `Cedarline-Doctor-2026` |

---

## Contents

1. [Tech Stack](#tech-stack)
2. [Architecture](#architecture)
3. [How the Chatbot Answers a Question](#how-the-chatbot-answers-a-question)
4. [Getting Started (Local Development)](#getting-started-local-development)
5. [Codebase Tour](#codebase-tour)
6. [Common Tasks (How to Implement Features)](#common-tasks-how-to-implement-features)
7. [Testing](#testing)
8. [Configuration (.env Reference)](#configuration-env-reference)
9. [Conventions & Best Practices](#conventions--best-practices)
10. [API Reference](#api-reference)
11. [Deployment & CI/CD Pipeline](#deployment--cicd-pipeline)
12. [Troubleshooting Guide](#troubleshooting-guide)
13. [Task 1: 10-Page Website Compliance](#task-1-10-page-website-compliance)
14. [AI Tools Used & Engineering Methodology](#ai-tools-used--engineering-methodology)

More architectural details: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) · Step-by-step deployment: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) · Demo walkthrough script: [docs/DEMO_SCRIPT.md](docs/DEMO_SCRIPT.md).

---

## Tech Stack

| Layer | Technology | Purpose & Rationale |
|:---|:---|:---|
| **Frontend** | React 19, Vite 8, TypeScript, Tailwind CSS 4, React Router 7 | High performance, strict type-safety, modern component ergonomics, route-based code splitting. |
| **UI & Icons** | Lucide React, Fontsource (Inter & Plus Jakarta Sans), Recharts | Clean medical iconography, accessible font loading, admin analytics charts. |
| **Forms & Validation** | React Hook Form, Zod | Instant client-side validation with schema inference, mirroring backend constraints. |
| **Backend** | Python 3.12, FastAPI, Pydantic v2, Uvicorn | High-throughput asynchronous REST API with auto-generated OpenAPI / Swagger documentation. |
| **ORM & Migrations** | SQLAlchemy 2.0 (mapped columns), Alembic, Psycopg 3 | Deterministic database migrations, connection pooling with auto-ping, and PostgreSQL dialect. |
| **Database & Vector** | PostgreSQL 17 + `pgvector` | Single source of truth: app data and vector embeddings live together without dual-database lag. |
| **AI / RAG** | Google Gemini (`gemini-embedding-001`, `gemini-2.5-flash`), HTTPX | 768-dimensional embeddings, low-latency generation with automatic model fallback and offline mode. |
| **Auth & Security** | PyJWT, Argon2-cffi | Stateless Bearer token authentication, rate limiting, secure password hashing. |
| **Delivery & CI/CD** | Docker, Render Blueprint (`render.yaml`), GitHub Actions | Containerized reproducible deployments, zero-downtime builds, automated test verification. |

---

## Architecture

```
┌─────────────────────────┐     HTTPS / JSON      ┌──────────────────────────────┐       SQL        ┌───────────────────────────────┐
│   React 19 SPA (Client) │ ────────────────────► │       FastAPI Backend        │ ───────────────► │     PostgreSQL + pgvector     │
│   - 10 Public Pages     │                       │   - Public REST Endpoints    │                  │   - Clinics, Doctors, Services│
│   - Chatbot Widget      │ ◄──────────────────── │   - RAG Pipeline & Safety    │ ◄─────────────── │   - Knowledge Documents       │
│   - Admin Dashboard     │                       │   - JWT Auth & Rate Limiting │                  │   - Chunks + vector(768)      │
└─────────────────────────┘                       └──────────────┬───────────────┘                  └───────────────────────────────┘
   (Zero secrets here)                                           │ HTTPX (Async server-side)
                                                                 ▼
                                                  ┌──────────────────────────────┐
                                                  │       Google Gemini API      │
                                                  │   embeddings + generation    │
                                                  └──────────────────────────────┘
```

### Core Design Principles:
1. **The Database is the Single Source of Truth**: Doctors, services, hours, and blog posts are stored in PostgreSQL. The chatbot's knowledge chunks are *derived directly from these tables*. When an admin edits a doctor's OPD hours, the doctor's knowledge chunks are regenerated and re-embedded automatically.
2. **Secrets Stay on the Server**: The browser only communicates with `/api/v1`. The Gemini API key and database passwords never leave backend environment variables.
3. **Defense-in-Depth AI Safety**: Deterministic rule-based regex checks intercept medical-advice and emergency questions *before* calling the LLM. The LLM prompt restricts answers to retrieved chunks, and a grounding check validates that numbers and doctor names match the context.
4. **Resilient Fallback Hierarchy**: Overloaded model (HTTP 429) → Next fallback model → Extractive fallback (quotes text directly) → Helpful refusal with clinic contact phone and email.

---

## How the Chatbot Answers a Question

**Entry Point:** `POST /api/v1/chat` → [`routers/chat.py`](backend/app/api/v1/routers/chat.py) → `ChatService.answer()` in [`services/chatbot/service.py`](backend/app/services/chatbot/service.py).

| Step | Operation | Implementation Detail | Source File |
|:---:|:---|:---|:---|
| **1** | **Validate Input** | Collapses whitespace, enforces 1–500 character limit. | [`schemas/chat.py`](backend/app/schemas/chat.py) |
| **2** | **Safety Screen** | Detects emergencies (chest pain, stroke) or diagnostic queries → Returns fixed safe refusal. **AI is never called**. | [`chatbot/safety.py`](backend/app/services/chatbot/safety.py) |
| **3** | **Small Talk** | Handles greetings ("hi", "thanks") with pre-computed warm responses. | [`chatbot/service.py`](backend/app/services/chatbot/service.py) |
| **4** | **Embedding** | Embeds query into a 768-dimensional vector via Gemini (or lexical hashing in offline mode). | [`knowledge_base/embeddings.py`](backend/app/services/knowledge_base/embeddings.py) |
| **5** | **Vector Search** | `pgvector` finds top-K chunks using cosine distance (`<=>`). Chunks below threshold are dropped. | [`chatbot/retrieval.py`](backend/app/services/chatbot/retrieval.py) |
| **6** | **Prompt Assembly** | Injects clinic constraints, retrieved chunks, and the last 3 chat turns into system instructions. | [`chatbot/prompt.py`](backend/app/services/chatbot/prompt.py) |
| **7** | **LLM Generation** | Calls Gemini 2.5 Flash. On HTTP 429/5xx, tries `LLM_FALLBACK_MODELS`. On complete failure, quotes text verbatim. | [`chatbot/llm.py`](backend/app/services/chatbot/llm.py) |
| **8** | **Grounding Check** | Verifies generated text doesn't fabricate doctor names or prices absent from context. | [`chatbot/grounding.py`](backend/app/services/chatbot/grounding.py) |
| **9** | **Response Delivery**| Returns grounded prose, source citations, and navigation action chips (e.g. `/appointments`). | [`chatbot/service.py`](backend/app/services/chatbot/service.py) |
| **10** | **Telemetry** | Records latency, provider, and outcome to `chat_events`. **User question text is never stored**. | [`routers/chat.py`](backend/app/api/v1/routers/chat.py) |

### Knowledge Pipeline:
- **System Documents**: Generated from database tables (doctors, services, clinic info, articles) via `system_documents.py`.
- **Seed Documents**: Approved policy, FAQ, and how-to-book guides in [`backend/app/seed/knowledge/`](backend/app/seed/knowledge/).
- **Admin Uploads**: Custom PDF/TXT/MD documents uploaded via the admin dashboard.
- Every chunk records `embedding_model_id` so vectors from different models never clash.

---

## Getting Started (Local Development)

### Option A: Docker Compose (Fastest — One Command)

Requirements: Docker & Docker Compose.

```bash
# 1. Clone repository
git clone https://github.com/rakeshaa2002/healthcare-platform.git
cd healthcare-platform

# 2. Setup environment variables
cp .env.example .env
# Edit .env: Add your GEMINI_API_KEY (from https://aistudio.google.com/)

# 3. Launch stack (PostgreSQL + pgvector, Backend API, Frontend)
docker compose up --build
```

Access points:
- **Frontend App**: `http://localhost:8080` (or `http://localhost:5173`)
- **Backend Swagger API**: `http://localhost:8000/docs`
- **Admin Portal**: `http://localhost:8080/admin` (Log in with `admin@cedarline.example` / `Cedarline-Admin-2026`)

---

### Option B: Local Development with Hot Reload

Requirements: Python 3.12+, Node.js 20+, Docker (used to run PostgreSQL with `pgvector`).

#### 1. Start Database Container:
```bash
docker run -d --name clinic-pg \
  -e POSTGRES_USER=clinic \
  -e POSTGRES_PASSWORD=clinic_dev_password \
  -e POSTGRES_DB=clinic \
  -p 5434:5432 \
  pgvector/pgvector:pg17
```

#### 2. Start Backend API:
```bash
cd backend
python -m venv .venv

# Activate virtual environment
# Windows (PowerShell):
.\.venv\Scripts\Activate.ps1
# macOS/Linux:
# source .venv/bin/activate

pip install -r requirements-dev.txt
cp .env.example .env
# Set DATABASE_URL=postgresql+psycopg://clinic:clinic_dev_password@localhost:5434/clinic
# Set your GEMINI_API_KEY (or use EMBEDDING_PROVIDER=hashing, LLM_PROVIDER=extractive for offline mode)

# Run database migrations and seed data
alembic upgrade head
python -m app.seed.run

# Start Uvicorn reload server
uvicorn app.main:app --reload --port 8000
```

#### 3. Start Frontend App:
```bash
cd frontend
npm install
npm run dev
# Vite server starts at http://localhost:5173 and automatically proxies /api to http://127.0.0.1:8000
```

#### Health Check Verification:
- `http://localhost:8000/api/v1/health` → `{"status":"ok","database":"ok"}`
- `http://localhost:8000/api/v1/chat/health` → `indexed_chunks > 0`

---

## Codebase Tour

### Backend Layout (`backend/app/`)

```
backend/
├── alembic/                 # Database migrations (0001: initial schema, 0002: chat_events, 0003: doctor role)
├── app/
│   ├── main.py              # Application factory: CORS regex, GZip, error handlers, routers
│   ├── api/
│   │   ├── deps.py          # Dependencies: DbSession, CurrentUser, StaffUser, AdminUser guards
│   │   └── v1/
│   │       ├── router.py    # Master router grouping all endpoints under /api/v1
│   │       └── routers/     # health, clinic, chat, auth, admin, knowledge
│   ├── core/
│   │   ├── config.py        # Settings loaded from environment variables (Pydantic BaseSettings)
│   │   ├── security.py      # Argon2 password hashing and JWT token generation/verification
│   │   ├── rate_limit.py    # In-memory per-IP sliding-window rate limiter
│   │   ├── exceptions.py    # AppError hierarchy returning uniform structured JSON errors
│   │   └── logging.py       # Production structured logging configuration
│   ├── db/
│   │   ├── base.py          # SQLAlchemy Base with deterministic naming conventions
│   │   └── session.py       # Engine creation, connection pooling, and get_db dependency
│   ├── models/              # ORM entities: clinic, user, knowledge, chat_event
│   ├── schemas/             # Pydantic request/response schemas (API contract)
│   ├── services/
│   │   ├── chatbot/         # safety, retrieval, prompt, llm, grounding, service
│   │   └── knowledge_base/  # extraction, chunking, embeddings, ingestion, system_documents
│   └── seed/
│       ├── data.py          # Fictional clinic metadata, doctors, services, articles
│       ├── run.py           # Idempotent seed runner script (python -m app.seed.run)
│       └── knowledge/*.md   # Approved clinic knowledge markdown files
└── tests/                   # 89 pytest unit and integration test suites
```

**Architecture Rule:** Routers handle HTTP parsing, status codes, and authorization only. Domain logic belongs in `services/`. Routers return Pydantic schemas, never raw SQLAlchemy ORM instances.

---

### Frontend Layout (`frontend/src/`)

```
frontend/src/
├── main.tsx                 # Application bootstrap with AuthProvider and ToastProvider
├── router/index.tsx         # Route definitions with React.lazy code splitting
├── layouts/
│   ├── SiteLayout.tsx       # Public shell: Navbar, Footer, Floating Chatbot Widget, ScrollToTop
│   └── AdminLayout.tsx      # Admin dashboard shell with navigation sidebar and auth guards
├── pages/
│   ├── HomePage.tsx         # Modern landing page with interactive trust metrics & highlights
│   ├── AboutPage.tsx        # Accreditation, mission, medical leadership, hygiene standards
│   ├── DoctorsPage.tsx      # Filterable doctor directory by speciality & OPD schedule
│   ├── ServicesPage.tsx     # Comprehensive service catalogue grouped by department
│   ├── departments/         # DentalPage, SkinPage, HairPage powered by DepartmentPage template
│   ├── AppointmentsPage.tsx # Multi-channel booking guide (phone, WhatsApp, online inquiry)
│   ├── BlogPage.tsx         # Medically reviewed articles with category filters
│   ├── BlogPostPage.tsx     # Full article view with author bio and medical disclaimers
│   ├── ContactPage.tsx      # Interactive contact form (Zod + React Hook Form), maps, emergency hotline
│   └── admin/               # AdminDashboardPage, AdminDoctorsPage, AdminServicesPage, AdminKnowledgePage, AdminMessagesPage
├── components/
│   ├── ui/                  # Design system: Button, Input, Select, Card, Modal, Toast, Skeleton, Badge
│   ├── site/                # Navbar, Footer, PageHero, Seo, Cards, TrustBadges
│   └── chat/                # ChatWidget, ChatMessage, RichText (safe markdown), openChat helper
├── hooks/
│   ├── useApi.ts            # SWR-like data fetching with in-memory caching and request deduplication
│   ├── useClinic.ts         # High-level data hooks for clinic info, doctors, and services
│   └── useAuth.tsx          # JWT session management in sessionStorage with role inspection
├── services/
│   ├── api.ts               # Axios client instance with base URL, bearer tokens, and error handling
│   └── endpoints.ts         # Strictly typed API endpoints (clinicApi, chatApi, authApi, adminApi)
├── types/index.ts           # TypeScript interfaces matching backend Pydantic models
└── index.css                # Tailwind CSS 4 theme variables (ink, brand teal, accent orange)
```

---

## Common Tasks (How to Implement Features)

### 1. How to Modify Clinic Content (Doctors, Services, Hours)
- **From UI**: Log in as admin at `/admin/login`, open **Doctors** or **Services**, and edit. Saving automatically invokes a background task that regenerates and re-embeds the affected knowledge chunks.
- **In Seed Data**: Edit [`backend/app/seed/data.py`](backend/app/seed/data.py) and run `python -m app.seed.run`. The seeder upserts by slug and updates only modified content.

### 2. How to Teach the Chatbot New Information
- **Quick (Dashboard)**: Go to **Admin** → **Chatbot Knowledge** → upload a PDF, TXT, or MD document. It is parsed, chunked, embedded, and immediately searchable.
- **Permanent (Code)**: Add a Markdown file into [`backend/app/seed/knowledge/`](backend/app/seed/knowledge/) and run `python -m app.seed.run`. Start with `# Title`, use `## Question-style headings`, and mention the subject explicitly in sentences.

### 3. How to Adjust Safety Rules or System Prompts
- **Emergency / Medical Refusals**: Edit regex triggers in [`backend/app/services/chatbot/safety.py`](backend/app/services/chatbot/safety.py). Add corresponding test assertions in `tests/test_chatbot.py`.
- **System Tone & Prompt**: Edit the prompt template in [`backend/app/services/chatbot/prompt.py`](backend/app/services/chatbot/prompt.py).
- **Retrieval Threshold**: Change `RAG_SIMILARITY_THRESHOLD` in `.env` (default `0.55` for Gemini).

### 4. How to Add a New API Endpoint
1. Define Pydantic request and response schemas in `backend/app/schemas/`.
2. Add the endpoint route in `backend/app/api/v1/routers/`. Protect with `StaffUser` or `AdminUser` from `api/deps.py` if authorization is required.
3. Put business logic in `backend/app/services/`.
4. Write tests in `backend/tests/`.
5. On the frontend, add the type to `frontend/src/types/index.ts`, add the API call in `services/endpoints.ts`, and consume with `useApi('cache:key', fetcher)`.

### 5. How to Change the Database Schema
1. Modify or create a model in `backend/app/models/`. Import any new model in `backend/app/models/__init__.py`.
2. Generate migration: `alembic revision --autogenerate --rev-id 0004 -m "add new field"`.
3. Inspect the migration script in `backend/alembic/versions/`.
4. Apply migration: `alembic upgrade head`.

### 6. How to Open the Chatbot from Any React Component
```tsx
import { openChat } from '@/components/chat/openChat'

// Open empty widget
<button onClick={() => openChat()}>Need help?</button>

// Open pre-populated with a question
<button onClick={() => openChat('How much does dental laser whitening cost?')}>
  Ask about Whitening
</button>
```

---

## Testing

The backend includes a comprehensive automated test suite with **89 tests** exercising every layer against a real PostgreSQL + `pgvector` container:

```bash
cd backend
# Run complete test suite (~70 seconds)
pytest

# Run specific test module
pytest tests/test_chatbot.py -k safety
```

### What the Tests Verify:
- **Zero AI API Costs**: Gemini HTTP requests are mocked via `httpx.MockTransport` and `FakeLLM`. Tests run offline and deterministically without network egress or API keys.
- **Safety**: Emergency trigger detection, medical-advice refusals, and prevention of false-positive redirects.
- **Grounding**: Verification that the model rejects invented prices and fabricated doctor names.
- **Auth & Access Control**: JWT generation, expiry handling, and role-based route guard enforcement.
- **Chunking & Vector Ingestion**: Text extraction from PDFs and pgvector cosine distance ranking.

### Frontend Quality Checks:
```bash
cd frontend
# TypeScript type check
npx tsc -b
# Code quality & linting
npm run lint
# Production bundle verification
npm run build
```

---

## Configuration (.env Reference)

All configurations are validated on startup via Pydantic (`backend/app/core/config.py`):

| Variable | Default | Purpose |
|:---|:---|:---|
| `ENVIRONMENT` | `development` | Set to `production` in production (enforces secure secret length). |
| `DATABASE_URL` | `postgresql+psycopg://...` | PostgreSQL connection string (`postgresql://` is auto-normalized). |
| `JWT_SECRET` | *dev-secret* | Cryptographic key for signing JWT tokens (min 32 chars in production). |
| `CORS_ORIGINS` | `http://localhost:5173` | Comma-separated list of allowed origins. (Auto-regex handles all `.onrender.com` domains). |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | `admin@cedarline.example` | Initial admin account seeded on boot. |
| `STAFF_EMAIL` / `STAFF_PASSWORD` | `staff@cedarline.example` | Initial staff account seeded on boot. |
| `DOCTOR_EMAIL` / `DOCTOR_PASSWORD`| `doctor@cedarline.example` | Initial doctor account seeded on boot. |
| `EMBEDDING_PROVIDER` | `gemini` | `gemini` · `openai` · `hashing` (offline dev mode). |
| `EMBEDDING_MODEL` | `gemini-embedding-001` | Active embedding model. |
| `EMBEDDING_DIM` | `768` | Vector dimension (must match PostgreSQL `VECTOR(768)`). |
| `LLM_PROVIDER` | `gemini` | `gemini` · `openai` · `extractive` (offline quote fallback). |
| `LLM_MODEL` | `gemini-2.5-flash` | Primary generative LLM. |
| `LLM_FALLBACK_MODELS` | `gemini-flash-lite-latest` | Comma-separated fallback models tried on HTTP 429/5xx. |
| `GEMINI_API_KEY` | `""` | Google AI Studio API key (backend only). |
| `VITE_API_URL` | `""` | Production backend URL for frontend build (e.g. `https://cedarline-api.onrender.com`). |

---

## Conventions & Best Practices

- **Uniform Error Handling**: All API exceptions derive from `AppError` and yield consistent JSON `{ "error": { "code": "...", "message": "...", "details": [] } }`.
- **Dual-Layer Validation**: Frontend inputs validate immediately via Zod; backend endpoints re-validate via Pydantic schemas.
- **Privacy by Design**: Chat conversation text is stored only in the visitor's local tab session (`sessionStorage`). Server telemetry in `chat_events` logs only outcome status, latency, and similarity scores.
- **Tailwind Color Tokens**: UI strictly utilizes semantic tokens defined in `index.css` (`ink-*` neutrals, `brand-*` medical teal, `accent-*` coral) rather than hardcoded hex values.

---

## API Reference

Interactive documentation is available at `/docs` (Swagger UI) and `/redoc`.

| Method | Endpoint | Access | Description |
|:---|:---|:---|:---|
| `GET` | `/api/v1/health` | Public | Liveness probe and database connectivity verification. |
| `GET` | `/api/v1/clinic-info` | Public | Clinic metadata, operational timings, contact details. |
| `GET` | `/api/v1/services` | Public | Filterable services catalogue by department. |
| `GET` | `/api/v1/doctors` | Public | Doctors list with specialities, qualifications, and OPD hours. |
| `GET` | `/api/v1/blog` | Public | Paginated medically reviewed articles with author bios. |
| `POST` | `/api/v1/contact` | Public (Rate-limited) | Submits a patient inquiry or appointment booking request. |
| `POST` | `/api/v1/chat` | Public (Rate-limited) | AI Healthcare Chatbot query endpoint with conversation history. |
| `GET` | `/api/v1/chat/health` | Public | Chatbot diagnostic endpoint reporting indexed chunk count. |
| `POST` | `/api/v1/auth/login` | Public (Rate-limited) | Authenticates credentials and issues Bearer JWT. |
| `GET` | `/api/v1/admin/overview` | Staff / Admin | Dashboard statistics: daily chat outcomes, messages, KB size. |
| `GET` | `/api/v1/admin/messages` | Staff / Admin | Incoming patient appointment and contact requests. |
| `POST` | `/api/v1/admin/doctors` | Admin | Create or update doctor profile and auto-sync knowledge chunks. |
| `POST` | `/api/v1/admin/services`| Admin | Create or update service item and auto-sync knowledge chunks. |
| `POST` | `/api/v1/admin/knowledge/documents` | Admin | Upload PDF, TXT, or MD documents into the knowledge base. |
| `POST` | `/api/v1/admin/knowledge/reindex` | Admin | Asynchronously triggers full knowledge re-indexing. |

---

## Deployment & CI/CD Pipeline

The application is deployed to production across Render and Neon:

```
GitHub Push (main) ──► GitHub Actions CI/CD ──► Auto-Deploy to Render
                        ├── Frontend: oxlint + tsc
                        └── Backend: pgvector + 89 pytest tests
```

### 1. Render Blueprint (`render.yaml`)
The root `render.yaml` orchestrates the full-stack architecture:
- **`cedarline-api`** (Docker Web Service): Runs FastAPI on port 8000 with health check `/api/v1/health`. Automatically runs `alembic upgrade head` and `python -m app.seed.run` on every deployment.
- **`cedarline-frontend`** (Static Site): Builds React 19 SPA (`npm ci && npm run build`) with output directory `./dist` and SPA fallback routing rewrite (`/*` → `/index.html`).

### 2. GitHub Actions CI/CD (`.github/workflows/ci-cd.yml`)
Every push to `main` runs:
1. **Frontend Pipeline**: Node 22, dependency caching, Oxlint linter, and TypeScript compiler check.
2. **Backend Pipeline**: Python 3.12, syntax validation, spins up a PostgreSQL + `pgvector` container, and executes all 89 `pytest` test suites.

---

## Troubleshooting Guide

| Issue | Root Cause | Solution |
|:---|:---|:---|
| `psycopg.errors.CheckViolation: ck_users_role_valid` | Role 'doctor' not permitted by older check constraint. | Migration `0003_add_doctor_role.py` resolves this automatically using raw DDL. Run `alembic upgrade head`. |
| `CORS error` in browser network tab | Frontend domain not permitted by backend. | Configured `allow_origin_regex=r"^https://.*\.onrender\.com$"` in `app/main.py`. Any `.onrender.com` domain is automatically accepted. |
| `Publish directory dist does not exist!` | Build command was empty in Render static site settings. | Set Build Command to `npm install && npm run build` and Publish Directory to `dist`. |
| `ArgumentError: Could not parse SQLAlchemy URL` | Quotes (`'`) or `psql` copied inside `DATABASE_URL`. | Ensure `DATABASE_URL` starts cleanly with `postgresql://user:pass@host/db?sslmode=require` without quotes or `psql`. |
| `Chatbot always returns fallback refusal` | Knowledge base empty or API key missing. | Check `/api/v1/chat/health`. If `indexed_chunks: 0`, run `python -m app.seed.run`. Verify `GEMINI_API_KEY`. |
| `401 Unauthorized` on Admin pages | JWT token expired (120 min duration). | Re-authenticate at `/admin/login`. |

---

## Task 1: 10-Page Website Compliance

| Page | Route | Key Features |
|:---|:---|:---|
| **1. Home** | `/` | Hero section, department cards, doctor profiles, testimonials, emergency alerts, chatbot widget. |
| **2. About the Clinic** | `/about` | Clinic mission, NABH accreditation, medical leadership, hygiene standards, facilities. |
| **3. Our Doctors** | `/doctors` | Filterable doctor directory by speciality, credentials, experience, and OPD timings. |
| **4. All Services** | `/services` | Comprehensive medical service catalogue with pricing, duration, and preparation notes. |
| **5. Dental Treatments** | `/services/dental` | Specialized dental department page (Implants, Whitening, Root Canal, Orthodontics). |
| **6. Skin Treatments** | `/services/skin` | Dermatology department page (Acne scars, Chemical Peels, HydraFacial, Laser treatments). |
| **7. Hair Treatments** | `/services/hair` | Trichology department page (FUE/FUT Transplants, PRP Therapy, Alopecia protocols). |
| **8. Appointment Booking** | `/appointments` | Multi-channel appointment booking guide with doctor/service selectors and inquiry submission. |
| **9. Blog / Education** | `/blog` | Medically reviewed articles with category filtering, reading times, and patient disclaimers. |
| **10. Contact Us** | `/contact` | Validated contact form (Zod + React Hook Form), emergency hotline, and interactive location map. |

---

## AI Tools Used & Engineering Methodology

*(Per Criterion 6 of the Arquette Digital Assessment Guidelines)*

AI tools were utilized as an engineering pair-programmer to accelerate delivery, expand test coverage, and enforce strict healthcare compliance:

1. **AI Tools Employed**:
   - **Antigravity IDE & Gemini 2.5 Flash**: Rapid scaffolding of TypeScript interfaces, Pydantic schemas, and comprehensive pytest test fixtures.
   - **Google Gemini API (`gemini-embedding-001` & `gemini-2.5-flash`)**: Vector search embedding generation and grounded multi-turn patient dialogue.
2. **Human Engineering Verification & Problem Solving**:
   - **Deterministic Safety**: Implemented hard regex pre-screens so critical emergency refusals (chest pain, stroke) never depend on probabilistic LLM responses.
   - **Constraint Debugging**: Resolved PostgreSQL check constraint collisions by authoring idempotent Alembic migrations with raw SQL.
   - **Production Readiness**: Added dynamic CORS regex support (`^https://.*\.onrender\.com$`) to handle cloud preview domains cleanly without hardcoding URLs.
   - **Quality Assurance**: Every component and router was verified through 89 automated tests, type checks, and manual responsive browser testing.

---

**Developed & Maintained by:** Rakesha N  
**Technical Assessment:** Arquette Digital — Full Stack Developer (Web Applications & AI Automation)
