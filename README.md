# Cedarline Clinic — Multi-Speciality Healthcare Platform & AI Assistant

A full-stack, production-ready web platform for **Cedarline Multispeciality Clinic**, an outpatient healthcare facility based in Indiranagar, Bengaluru. The clinic provides multi-department care across Dental, Dermatology, Trichology, General Medicine, and Paediatrics.

The platform includes an **AI Medical Assistant** that uses Retrieval-Augmented Generation (RAG) over PostgreSQL with `pgvector`. It helps patients with OPD consultation schedules, doctor credentials, indicative procedure costs, and clinic guidelines. The assistant enforces deterministic safety guardrails so it never hallucinates medical diagnoses, never prescribes medications, and immediately routes medical emergencies to emergency numbers.

---

## Live Links & Demo Credentials

| Resource | URL / Credentials | Description |
| :--- | :--- | :--- |
| **Live Website** | [https://cedarline-clinic.onrender.com](https://cedarline-clinic.onrender.com) | Production frontend React 19 SPA (Render Static Site) |
| **API Documentation** | [https://cedarline-api.onrender.com/docs](https://cedarline-api.onrender.com/docs) | Interactive Swagger UI (ReDoc: [`/redoc`](https://cedarline-api.onrender.com/redoc)) |
| **Source Code** | [https://github.com/rakeshaa2002/healthcare-platform](https://github.com/rakeshaa2002/healthcare-platform) | Full-stack monorepo with CI/CD workflows |
| **Admin Portal** | [`/admin/login`](https://cedarline-clinic.onrender.com/admin/login) | `admin@cedarline.example` / `Cedarline-Admin-2026` |
| **Staff Portal** | [`/admin/login`](https://cedarline-clinic.onrender.com/admin/login) | `staff@cedarline.example` / `Cedarline-Staff-2026` |
| **Doctor Portal** | [`/doctor/login`](https://cedarline-clinic.onrender.com/doctor/login) | `doctor@cedarline.example` / `Cedarline-Doctor-2026` |

---

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [System Architecture](#system-architecture)
3. [AI Chatbot & RAG Pipeline](#ai-chatbot--rag-pipeline)
4. [SEO & Search Engine Indexing](#seo--search-engine-indexing)
5. [Local Development Setup](#local-development-setup)
6. [Codebase Tour](#codebase-tour)
7. [Common Developer Workflows](#common-developer-workflows)
8. [Automated Testing](#automated-testing)
9. [Configuration Reference](#configuration-reference)
10. [Production Deployment](#production-deployment)
11. [Troubleshooting Guide](#troubleshooting-guide)

---

## Tech Stack

### Frontend
- **Framework**: React 19, TypeScript (~6.0), Vite 8, React Router 7
- **Styling**: Tailwind CSS v4 with custom semantic tokens (`brand`, `ink`, `accent`)
- **Typography & Icons**: `@fontsource-variable/inter`, `@fontsource-variable/plus-jakarta-sans`, Lucide React
- **Forms & Validation**: React Hook Form with Zod schema resolvers
- **Analytics & Charts**: Recharts (code-split for the admin dashboard)
- **Linter**: Oxlint (Rust-based linter for high performance and zero warnings)

### Backend
- **Framework**: Python 3.12, FastAPI, Pydantic v2, Uvicorn (ASGI)
- **Database & ORM**: PostgreSQL 17 with `pgvector`, SQLAlchemy 2.0 (mapped columns), Alembic migrations, Psycopg 3
- **AI & Embeddings**: Google Gemini API (`gemini-2.5-flash` for answers; `gemini-embedding-001` for 768-dim embeddings) with offline fallback support
- **Auth & Security**: Stateless Bearer tokens (PyJWT) with Argon2-cffi password hashing
- **HTTP Client**: HTTPX (async client with connection pooling and timeouts)
- **Rate Limiting**: In-memory sliding-window per-IP rate limiter for sensitive endpoints

### Infrastructure & Operations
- **Hosting**: Render (Static Site for frontend, Docker Web Service for FastAPI backend)
- **Cloud Database**: Neon Serverless PostgreSQL with native `pgvector` extension
- **CI/CD**: GitHub Actions (Oxlint, TypeScript checks, Docker builds, 89 unit/integration tests)

---

## System Architecture

```
┌─────────────────────────────────┐           HTTPS / JSON          ┌──────────────────────────────────┐
│      React 19 SPA (Client)      │ ──────────────────────────────► │         FastAPI Backend          │
│  - 10 Public Pages              │                                 │  - Public REST Endpoints         │
│  - Floating AI Chatbot Widget   │ ◄────────────────────────────── │  - RAG Retrieval & Safety Logic  │
│  - Staff / Admin Dashboard      │                                 │  - JWT Auth & Rate Limiting      │
└─────────────────────────────────┘                                 └───────────────┬──────────────────┘
                 │                                                                  │
                 │ (React 19 Head Hoisting)                                         │ SQL / pgvector
                 ▼                                                                  ▼
┌─────────────────────────────────┐                                 ┌──────────────────────────────────┐
│      Search Engines & Crawlers  │                                 │      PostgreSQL 17 + pgvector    │
│  - Google Search Console        │                                 │  - Clinic, Doctors, Services     │
│  - JSON-LD Structured Data      │                                 │  - Knowledge Documents & Chunks  │
│  - sitemap.xml & robots.txt     │                                 │  - vector(768) Cosine Index (<=>)│
└─────────────────────────────────┘                                 └──────────────────────────────────┘
                                                                                    │
                                                                                    │ HTTPX (Async server-side)
                                                                                    ▼
                                                                    ┌──────────────────────────────────┐
                                                                    │        Google Gemini API         │
                                                                    │  - gemini-embedding-001 (Embed)  │
                                                                    │  - gemini-2.5-flash (Generate)   │
                                                                    └──────────────────────────────────┘
```

### Core Architecture Decisions

1. **Relational Database as the Single Source of Truth**: Doctors, services, hours, and blog posts live in relational tables. Vector embeddings for the chatbot are derived directly from these tables. When an admin updates a doctor's consultation hours, the vector chunks update in the same transaction.
2. **Secrets Never Reach the Client**: The browser communicates solely with `/api/v1`. Database credentials and the Gemini API key are kept strictly in backend environment variables.
3. **Deterministic Safety over Probabilistic AI**: Medical emergencies (chest pain, stroke, breathing difficulty) and diagnostic queries are intercepted by regex patterns **before** invoking the LLM. The model never has the opportunity to guess in life-threatening situations.
4. **Resilient LLM Cascades**: If Gemini encounters rate limits (HTTP 429), the backend cascades: `gemini-2.5-flash` → fallback model → extractive quotation fallback → safe refusal with clinic contact numbers.

---

## AI Chatbot & RAG Pipeline

The chatbot pipeline is defined in [`backend/app/services/chatbot/service.py`](backend/app/services/chatbot/service.py):

| Step | Stage | What Happens | Source File |
| :---: | :--- | :--- | :--- |
| **1** | **Input Sanitization** | Collapses whitespace, strips control characters, enforces 1–500 character limit. | [`schemas/chat.py`](backend/app/schemas/chat.py) |
| **2** | **Safety Guardrails** | Scans for emergency keywords or symptom diagnosis queries. Returns an immediate static refusal with emergency instructions. **No LLM is called**. | [`chatbot/safety.py`](backend/app/services/chatbot/safety.py) |
| **3** | **Small Talk Handling** | Intercepts greetings ("hi", "thank you", "who are you?") with friendly pre-compiled responses. | [`chatbot/service.py`](backend/app/services/chatbot/service.py) |
| **4** | **Query Embedding** | Converts user query into a 768-dimensional float vector via Gemini Embeddings (or lexical hashing in offline test mode). | [`knowledge_base/embeddings.py`](backend/app/services/knowledge_base/embeddings.py) |
| **5** | **Vector Search** | PostgreSQL `pgvector` performs cosine distance search (`<=>`) across indexed chunks. Chunks below similarity threshold (`0.55`) are filtered out. | [`chatbot/retrieval.py`](backend/app/services/chatbot/retrieval.py) |
| **6** | **Prompt Assembly** | Combines system rules, clinic identity, retrieved knowledge chunks, and the last 3 conversation turns into a strict prompt. | [`chatbot/prompt.py`](backend/app/services/chatbot/prompt.py) |
| **7** | **LLM Generation** | Calls `gemini-2.5-flash`. If rate-limited or unavailable, tries configured fallback models. | [`chatbot/llm.py`](backend/app/services/chatbot/llm.py) |
| **8** | **Grounding Check** | Verifies the response does not hallucinate doctor names, specialties, or prices absent from retrieved context. | [`chatbot/grounding.py`](backend/app/services/chatbot/grounding.py) |
| **9** | **Action Chips** | Parses answer context to append interactive navigation chips (e.g. `[Book Appointment → /appointments]`). | [`chatbot/service.py`](backend/app/services/chatbot/service.py) |
| **10** | **Telemetry** | Logs latency, model used, and outcome status to `chat_events`. **User question text is never stored** for privacy. | [`routers/chat.py`](backend/app/api/v1/routers/chat.py) |

---

## SEO & Search Engine Indexing

The platform implements an end-to-end Technical and On-Page SEO architecture verified on **Google Search Console**:

### 1. Verified Search Console Property
- **Property**: `https://cedarline-clinic.onrender.com/` (URL prefix property).
- **Verification**: Verified via [`frontend/public/googleb954cad4e13dd8ff.html`](frontend/public/googleb954cad4e13dd8ff.html), served directly from the root with `200 OK`.

### 2. Automated Build-Time Sitemap & Robots
In [`frontend/vite.config.ts`](frontend/vite.config.ts), a custom build plugin (`seoFiles`) automatically compiles and outputs production-ready XML and TXT files into `dist/`:
- **`sitemap.xml`**: Indexes all 18 public pages including core pages (`/`, `/about`, `/doctors`, `/services`, `/appointments`, `/contact`), department hubs (`/services/dental`, `/services/skin`, `/services/hair`), and all 8 doctor-written patient health articles.
- **`robots.txt`**: Grants full public crawling while shielding `/admin`, `/doctor`, and `/api/` endpoints from indexation. References the live sitemap URL.

### 3. Dynamic Structured Data (Schema.org / JSON-LD)
Using [`frontend/src/components/site/Seo.tsx`](frontend/src/components/site/Seo.tsx) and React 19 head hoisting, each page injects rich, machine-readable JSON-LD schemas:
- **`MedicalClinic`** ([`index.html`](frontend/index.html)): Formal clinic entity definition with physical address in Indiranagar, geo-coordinates, telephone, currencies accepted, and operating hours.
- **`MedicalWebPage`** ([`BlogPostPage.tsx`](frontend/src/pages/BlogPostPage.tsx)): Doctor author attribution (`Physician`), publication timestamps, article excerpts, and medical disclaimers adhering to Google's strict **YMYL** guidelines.
- **`ItemList` of `Physician`** ([`DoctorsPage.tsx`](frontend/src/pages/DoctorsPage.tsx)): Complete directory of consultants with qualifications (MBBS, MDS, MD), medical specialties, and languages.
- **`FAQPage`** ([`DepartmentPage.tsx`](frontend/src/pages/departments/DepartmentPage.tsx)): Dynamically maps question-and-answer pairs for high-CTR expandable accordions in Google search results.

---

## Local Development Setup

### Option A: Docker Compose (Recommended)

**Prerequisites:** Docker & Docker Compose installed.

```bash
# 1. Clone repository
git clone https://github.com/rakeshaa2002/healthcare-platform.git
cd healthcare-platform

# 2. Configure environment
cp .env.example .env
# Add your GEMINI_API_KEY (from https://aistudio.google.com/)

# 3. Boot database, backend API, and frontend
docker compose up --build
```

**Local Ports:**
- **Frontend**: [http://localhost:8080](http://localhost:8080)
- **Backend API Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Database**: `localhost:5434` (`clinic` / `clinic_dev_password`)

---

### Option B: Native Development Setup

**Prerequisites:** Python 3.12+, Node.js 20+, Docker (used to run PostgreSQL + `pgvector`).

#### 1. Start Database Container
```bash
docker run -d --name clinic-pg \
  -e POSTGRES_USER=clinic \
  -e POSTGRES_PASSWORD=clinic_dev_password \
  -e POSTGRES_DB=clinic \
  -p 5434:5432 \
  pgvector/pgvector:pg17
```

#### 2. Start Backend API
```bash
cd backend
python -m venv .venv

# Activate virtual environment
# Windows PowerShell:
.\.venv\Scripts\Activate.ps1
# macOS / Linux:
# source .venv/bin/activate

pip install -r requirements-dev.txt
cp .env.example .env

# Run database migrations and seed clinic data
alembic upgrade head
python -m app.seed.run

# Start development server
uvicorn app.main:app --reload --port 8000
```

#### 3. Start Frontend Development Server
```bash
cd frontend
npm install
npm run dev
# Vite runs at http://localhost:5173 and automatically proxies /api requests to http://127.0.0.1:8000
```

#### Verification Endpoints:
- API Liveness: [http://localhost:8000/api/v1/health](http://localhost:8000/api/v1/health) → `{"status":"ok","database":"ok"}`
- Vector Index Diagnostic: [http://localhost:8000/api/v1/chat/health](http://localhost:8000/api/v1/chat/health) → `indexed_chunks > 0`

---

## Codebase Tour

```
healthcare-platform/
├── .github/workflows/ci-cd.yml      # CI/CD: Oxlint, TypeScript, Docker, 89 Pytest suites
├── render.yaml                      # Infrastructure-as-code blueprint for Render
├── backend/
│   ├── alembic/                     # Database migrations (0001: init, 0002: telemetry, 0003: doctor role)
│   ├── app/
│   │   ├── main.py                  # App factory, CORS regex, GZip, exception handlers
│   │   ├── api/                     # REST routers (health, clinic, chat, auth, admin, knowledge)
│   │   ├── core/                    # App settings (Pydantic), security, rate-limiting, logging
│   │   ├── db/                      # SQLAlchemy session engine and declarative base
│   │   ├── models/                  # ORM entities (Clinic, Doctor, Service, Article, Knowledge, ChatEvent)
│   │   ├── schemas/                 # Strict Pydantic v2 validation contracts
│   │   ├── services/
│   │   │   ├── chatbot/             # Safety, vector retrieval, prompt building, LLM execution, grounding
│   │   │   └── knowledge_base/      # Document parsing, chunking, embeddings, re-indexing
│   │   └── seed/                    # Idempotent database seeder (data.py, run.py, markdown knowledge)
│   └── tests/                       # 89 automated tests exercising API, RAG, and safety layers
└── frontend/
    ├── public/                      # Static assets, Google verification token, fallback robots & sitemap
    ├── src/
    │   ├── main.tsx                 # App entry point with Auth and Toast context providers
    │   ├── router/index.tsx         # Route registry with React.lazy code splitting
    │   ├── layouts/                 # SiteLayout (public header/footer/chat) & AdminLayout (dashboard)
    │   ├── pages/                   # 10 public pages, department pages, and admin management pages
    │   ├── components/              # Design system (ui/), marketing (site/), and chatbot widget (chat/)
    │   ├── hooks/                   # useApi (SWR caching), useClinic, useAuth
    │   ├── services/                # Axios API client and typed endpoint wrappers
    │   ├── content/site.ts          # Static marketing copy, clinic values, and SEO site constants
    │   ├── types/index.ts           # Shared TypeScript interfaces mirroring backend models
    │   └── index.css                # Tailwind CSS v4 design tokens and utility classes
    └── vite.config.ts               # Bundler config with automated SEO sitemap & robots generator
```

---

## Common Developer Workflows

### 1. Modifying Doctors, Services, or Pricing
- **Through UI**: Log in at `/admin/login`, navigate to **Doctors** or **Services**, and make edits. Saving triggers a background process that automatically regenerates and re-embeds the updated knowledge chunks.
- **In Seed Data**: Edit [`backend/app/seed/data.py`](backend/app/seed/data.py) and execute `python -m app.seed.run`. The runner upserts by unique slug without wiping database state.

### 2. Adding Knowledge Documents for the Chatbot
- **Via Admin UI**: Go to **Admin** → **Chatbot Knowledge** and upload a PDF, TXT, or Markdown file. It is immediately parsed, split into 500-token chunks with 50-token overlap, embedded, and indexed.
- **Via Code**: Place a `.md` file into [`backend/app/seed/knowledge/`](backend/app/seed/knowledge/) and execute `python -m app.seed.run`.

### 3. Adding a New API Endpoint
1. Define request and response schemas in `backend/app/schemas/`.
2. Add router endpoint in `backend/app/api/v1/routers/`. Protect with `StaffUser` or `AdminUser` from `api/deps.py` if authentication is needed.
3. Implement business logic inside `backend/app/services/`.
4. Add a test in `backend/tests/`.
5. Add the endpoint caller in `frontend/src/services/endpoints.ts` and consume with `useApi()`.

### 4. Updating the Database Schema
```bash
# 1. Modify models in backend/app/models/
# 2. Generate migration
alembic revision --autogenerate -m "describe changes"
# 3. Review migration file in backend/alembic/versions/
# 4. Apply migration
alembic upgrade head
```

---

## Automated Testing

The backend includes **89 automated tests** covering security, database constraints, vector retrieval, and AI safety:

```bash
cd backend
# Run full test suite with coverage
pytest
```

### Key Test Guarantees:
- **Zero Gemini API Cost**: Outgoing HTTP calls to Gemini are mocked using `httpx.MockTransport` and `FakeLLM`. Tests run completely offline, quickly, and deterministically.
- **Emergency Interception**: Verifies that queries containing emergency triggers (e.g. *"severe chest pain"*, *"stroke signs"*) return deterministic refusals in <10ms.
- **Grounding Verification**: Tests ensure that if an LLM response mentions an ungrounded price or invented doctor, the response is discarded in favor of verified facts.
- **Role-Based Access**: Verifies that unauthorized users cannot access admin endpoints or mutate documents.

### Frontend Validation:
```bash
cd frontend
# TypeScript compiler check
npx tsc -b
# Code linting
npm run lint
# Production build check
npm run build
```

---

## Configuration Reference

### Backend Configuration (`backend/.env`)
Validated at startup using Pydantic BaseSettings ([`backend/app/core/config.py`](backend/app/core/config.py)):

| Variable | Default | Description |
| :--- | :--- | :--- |
| `ENVIRONMENT` | `development` | Set to `production` in live deployments (enforces secret strength). |
| `DATABASE_URL` | `postgresql+psycopg://...` | Connection URI. Supports `postgresql://` (auto-normalized to psycopg3). |
| `JWT_SECRET` | *dev-key* | Secret used to sign authentication tokens (minimum 32 characters in production). |
| `CORS_ORIGINS` | `http://localhost:5173` | Allowed origins. Regex in `main.py` automatically permits `*.onrender.com`. |
| `EMBEDDING_PROVIDER` | `gemini` | `gemini` (production), `openai`, or `hashing` (offline test mode). |
| `EMBEDDING_MODEL` | `gemini-embedding-001` | Embedding model identifier (produces 768-dim vectors). |
| `LLM_PROVIDER` | `gemini` | `gemini` (production), `openai`, or `extractive` (offline test mode). |
| `LLM_MODEL` | `gemini-2.5-flash` | Primary reasoning and generation LLM. |
| `LLM_FALLBACK_MODELS` | `gemini-flash-lite-latest` | Comma-separated list of fallback models tried on HTTP 429/5xx errors. |
| `GEMINI_API_KEY` | `""` | Google AI Studio API key (kept strictly backend-side). |

### Frontend Configuration (`frontend/.env`)
| Variable | Default | Description |
| :--- | :--- | :--- |
| `VITE_API_URL` | `""` | Base URL for FastAPI backend (empty in dev to leverage Vite proxy). |
| `VITE_SITE_URL` | `https://cedarline-clinic.onrender.com` | Canonical website domain used for sitemaps, Open Graph, and schemas. |

---

## Production Deployment

The project is continuously deployed to production using **Render** and **Neon**:

```
git push origin main
      │
      ├──► GitHub Actions: Oxlint + TypeScript + 89 Pytest Suites
      │
      └──► Render Webhooks:
             ├── cedarline-api (Docker Web Service) ➔ Auto-runs migrations & seed
             └── cedarline-frontend (Static Site)   ➔ Vite build & publish to CDN
```

- **Backend Docker Service**: Builds from [`backend/Dockerfile`](backend/Dockerfile), runs database migrations on startup via [`scripts/start.sh`](backend/scripts/start.sh), seeds initial data idempotently, and starts Uvicorn with GZip compression.
- **Frontend Static Site**: Built with `npm ci && npm run build`. Render serves the `./dist` folder with SPA client-side routing rewrites (`/*` → `/index.html`).

---

## Troubleshooting Guide

| Issue | Root Cause | Solution |
| :--- | :--- | :--- |
| `x-render-routing: no-server` (404) | Service suspended or incorrect domain entered in Search Console. | Verify the active URL in your Render dashboard: `https://cedarline-clinic.onrender.com`. |
| `Publish directory dist does not exist!` | Render static site build command was left empty. | In Render Settings → Build & Deploy: set **Build Command** to `npm run build` and **Publish Directory** to `dist`. |
| `CORS Error` on API requests | Frontend domain not permitted by backend. | Configured `allow_origin_regex=r"^https://.*\.onrender\.com$"` in [`app/main.py`](backend/app/main.py) to accept all Render subdomains. |
| `Chatbot returns fallback response` | Vector index empty or API key missing. | Check `/api/v1/chat/health`. If `indexed_chunks: 0`, run `python -m app.seed.run`. Check `GEMINI_API_KEY`. |
| `Sitemap contains localhost URLs` | Build ran without production `VITE_SITE_URL`. | [`vite.config.ts`](frontend/vite.config.ts) has been patched to default directly to `https://cedarline-clinic.onrender.com`. |

---

**Maintained by:** Rakesha N  
**Repository:** [https://github.com/rakeshaa2002/healthcare-platform](https://github.com/rakeshaa2002/healthcare-platform)
