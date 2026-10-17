# Cedarline Clinic — Healthcare Platform & AI Medical Assistant

**Technical Assessment Submission — Full Stack Developer (Web Applications & AI Automation)**  
**Company:** Arquette Digital  
**Candidate:** Rakesha N  
**Repository:** [https://github.com/rakeshaa2002/healthcare-platform](https://github.com/rakeshaa2002/healthcare-platform)  

---

## Executive Summary & Submission Deliverables

| Requirement (PDF) | Deliverable / Link | Status |
|:---|:---|:---:|
| **1. Live Deployed Website** | [https://healthcare-platform-fxgn.onrender.com](https://healthcare-platform-fxgn.onrender.com) | ✅ Live |
| **2. Live Backend API / Docs** | [https://cedarline-api.onrender.com/docs](https://cedarline-api.onrender.com/docs) (Swagger UI) | ✅ Live |
| **3. GitHub Repository** | [https://github.com/rakeshaa2002/healthcare-platform](https://github.com/rakeshaa2002/healthcare-platform) | ✅ Live |
| **4. Task 1: 10-Page Website** | Complete, responsive 10-page healthcare portal (Dental, Skin, Hair, etc.) | ✅ Complete |
| **5. Task 2: Option A Application** | Working AI Healthcare Chatbot (RAG over PostgreSQL + pgvector with strict safety guardrails) | ✅ Complete |
| **6. Admin Management Portal** | Live at `/admin` (Knowledge Base management, Doctors, Services, Patient Inquiries) | ✅ Complete |
| **7. CI/CD & Automated Tests** | GitHub Actions pipeline + 89 automated backend tests (100% pass) | ✅ Passing |
| **8. Screen Recording Guide** | Section [11. Screen Recording Demonstration](#11-screen-recording-demonstration) below | 📹 Ready |
| **9. AI Tools Used Explanation** | Section [12. AI Tools Used & Engineering Methodology](#12-ai-tools-used--engineering-methodology) below | 🤖 Detailed |

> **Disclaimer:** All clinic details, doctors, pricing, and patient inquiries in this application are **fictional**. Phone numbers use non-routable dummy prefixes and emails use the RFC 2606 reserved `.example` domain. The AI assistant answers from clinic-approved information only and **strictly refuses to provide medical diagnoses or treatment prescriptions**.

---

## Table of Contents

1. [Task 1: 10-Page Healthcare Website](#1-task-1-10-page-healthcare-website)
2. [Task 2: AI Healthcare Chatbot (Option A)](#2-task-2-ai-healthcare-chatbot-option-a)
3. [Architecture & System Design](#3-architecture--system-design)
4. [Technology Stack](#4-technology-stack)
5. [Demo Credentials](#5-demo-credentials)
6. [Local Development Setup](#6-local-development-setup)
7. [API Documentation](#7-api-documentation)
8. [Database & Migrations](#8-database--migrations)
9. [Automated Testing & Code Quality](#9-automated-testing--code-quality)
10. [Deployment & CI/CD Pipeline](#10-deployment--cicd-pipeline)
11. [Screen Recording Demonstration](#11-screen-recording-demonstration)
12. [AI Tools Used & Engineering Methodology](#12-ai-tools-used--engineering-methodology)

---

## 1. Task 1: 10-Page Healthcare Website

A modern, accessible, and responsive multi-speciality clinic web portal designed to healthcare industry standards:

| # | Page Name | Route | Features & Content |
|:---:|:---|:---|:---|
| **01** | **Home** | `/` | Hero section, department highlights, doctor carousel, trust metrics, patient reviews, emergency alert banner, direct chat widget access. |
| **02** | **About the Clinic** | `/about` | Clinic history, mission & values, NABH accreditation standards, medical leadership, hygiene protocols, facility photo gallery. |
| **03** | **Our Doctors** | `/doctors` | Filterable doctor directory by speciality (Dental, Dermatology, Trichology, General Medicine, Paediatrics), qualifications, experience, OPD hours, and consultation booking. |
| **04** | **All Services** | `/services` | Comprehensive medical service catalogue with duration, starting pricing, insurance eligibility, prep instructions, and department categorization. |
| **05** | **Dental Treatments** | `/services/dental` | Dedicated dental department page covering Root Canal, Laser Whitening, Dental Implants, Invisalign, Pediatric Dentistry, and smile makeover FAQs. |
| **06** | **Skin Treatments** | `/services/skin` | Dermatology department page covering Acne scar revisions, Chemical Peels, HydraFacial, Pigmentation, Laser resurfacing, and pre-care guides. |
| **07** | **Hair Treatments** | `/services/hair` | Trichology department page covering FUE/FUT Hair Transplants, PRP Therapy, Scalp Micropigmentation, Dandruff & Alopecia protocols. |
| **08** | **Appointment Booking** | `/appointments` | Multi-channel appointment booking guide: interactive doctor/service selector, online consultation inquiries, direct phone desk calling, and WhatsApp booking. |
| **09** | **Blog / Patient Education** | `/blog` & `/blog/:slug` | Medically reviewed articles authored by staff doctors with reading times, tags, medically backed health tips, and patient disclaimers. |
| **10** | **Contact Us** | `/contact` | Clinic location map, operating hours, emergency contact hotline, ambulance dialer, and functional validated contact inquiry form (Zod + React Hook Form). |

### UX/UI & Performance Standards:
- **Responsive Design**: Fluid layout tested across mobile (375px), tablet (768px), and desktop (1440px+).
- **Typography & Theme**: Modern typography using Inter & Plus Jakarta Sans via Fontsource Variable, tailored HSL medical teal/cyan and slate palette, subtle glassmorphism headers, and smooth micro-interactions.
- **Form Validation**: Strict client-side schemas using Zod and React Hook Form with real-time error states.
- **SEO & Accessibility**: Dynamic `<title>` and `<meta name="description">` tags via `Seo.tsx`, OpenGraph tags, semantic HTML5 landmarks (`<main>`, `<header>`, `<nav>`, `<article>`), ARIA labels on interactive elements, and automated `sitemap.xml` / `robots.txt` generation.

---

## 2. Task 2: AI Healthcare Chatbot (Option A)

The integrated AI assistant is accessible from any page via the floating chat widget on the bottom right.

### Core Capabilities:
1. **Clinic Services & Pricing**: Answers inquiries on consultation fees, procedure durations, prep instructions, and package details.
2. **Timings & Locations**: Informs visitors of clinic operating hours, doctor OPD schedules, address, and transit landmarks.
3. **Doctor Expertise**: Details doctor qualifications, specialities, awards, and consultation timings.
4. **Appointment Navigation**: Intelligently directs users to `/appointments` or `/contact` with contextual booking advice.
5. **Multi-turn Context**: Maintains conversation flow for follow-up questions while staying grounded.

### Medical Safety & Ethical Guardrails (Zero-Hallucination Policy):
Healthcare AI requires strict ethical safety boundaries. Cedarline implements a **four-layer defense-in-depth safety architecture**:

```
User Query
    │
    ▼
[ Layer 1: Rule-Based Pre-Screen ]
    ├── Emergency detected (chest pain, stroke, breathing difficulty)? ──► Immediate Emergency Redirect (112 / 911 / ER)
    └── Diagnostic / Prescription attempt? ──► Safe refusal + Doctor consultation guidance
    │ (Safe query continues)
    ▼
[ Layer 2: Vector Search Retrieval (pgvector) ]
    ├── Embed query via Gemini (768 dimensions)
    ├── Search cosine similarity against approved clinic chunks
    └── Below similarity threshold? ──► "I couldn't find clinic information on that..." + Clinic contact info
    │ (Sufficient context found)
    ▼
[ Layer 3: System Prompt Fencing ]
    ├── System prompt explicitly forbids diagnosing, inventing medical data, or citing external knowledge
    └── Gemini 2.5 Flash generates grounded response citing retrieved chunks
    │
    ▼
[ Layer 4: Grounding Verification & Fallbacks ]
    ├── Validates that mentioned doctors/numbers exist in retrieved chunks
    └── If LLM times out or rate limits (HTTP 429) ──► Automatic failover to next model or extractive quote fallback
```

---

## 3. Architecture & System Design

```
┌────────────────────────────────────────────────────────┐
│                   React 19 Frontend                    │
│   (Single Page App, Tailwind CSS 4, React Router 7)    │
└───────────────────────────┬────────────────────────────┘
                            │ HTTPS / JSON REST API
                            ▼
┌────────────────────────────────────────────────────────┐
│                   FastAPI Backend                      │
│  ├── /api/v1/clinic-info, /doctors, /services, /blog  │
│  ├── /api/v1/chat  (RAG Pipeline & Safety Filters)     │
│  └── /api/v1/admin (JWT Auth, Knowledge Base Reindex)  │
└───────────────┬────────────────────────────┬───────────┘
                │ SQL Queries                │ Async HTTP (Server-side)
                ▼                            ▼
┌───────────────────────────────┐  ┌───────────────────────────────────┐
│     PostgreSQL + pgvector     │  │          Google Gemini            │
│  - Relational clinic tables   │  │  - gemini-embedding-001 (768-dim) │
│  - Knowledge chunks & vectors │  │  - gemini-2.5-flash (generation)  │
└───────────────────────────────┘  └───────────────────────────────────┘
```

### Key Architectural Strengths:
- **Unified PostgreSQL Storage**: Relational clinic models and vector embeddings share a single PostgreSQL database with `pgvector`. No separate vector database (like Pinecone) is required, eliminating synchronization lag and dual-billing.
- **Dynamic Single Source of Truth**: The knowledge base is synced directly from database records. Whenever an administrator updates a doctor's OPD hours or adds a service, the associated knowledge chunks are automatically re-indexed.
- **Zero Client-Side Secrets**: Gemini API keys, database credentials, and JWT secrets reside exclusively in server-side environment variables.

---

## 4. Technology Stack

### Frontend:
- **Framework**: React 19, TypeScript
- **Bundler & Tooling**: Vite 8, Oxlint
- **Routing**: React Router 7 (code-splitting with `React.lazy`)
- **Styling**: Tailwind CSS 4, Lucide React icons
- **State & Forms**: React Hook Form, Zod validation
- **Charts**: Recharts (for admin analytics)
- **HTTP Client**: Axios (configured with interceptors and base URL)

### Backend:
- **Framework**: FastAPI (Python 3.12)
- **Validation & Settings**: Pydantic v2, Pydantic-Settings
- **ORM & Database**: SQLAlchemy 2.0, Alembic (database migrations), Psycopg 3
- **Vector Search**: PostgreSQL 17 + `pgvector`
- **Security & Auth**: PyJWT, Argon2-cffi password hashing
- **HTTP Client**: HTTPX (async communication with Gemini API)

### Infrastructure & Deployment:
- **Hosting**: Render (Web Service for Backend Docker, Static Site for React Frontend)
- **Database**: Neon Serverless PostgreSQL (`pgvector` enabled)
- **CI/CD**: GitHub Actions automated pipeline

---

## 5. Demo Credentials

The platform seeds default administrative and staff accounts upon initialization. You can use these to test the Admin Management Dashboard at `https://healthcare-platform-fxgn.onrender.com/admin/login`:

| Role | Email | Password | Permissions |
|:---|:---|:---|:---|
| **Admin** | `admin@cedarline.example` | `Cedarline-Admin-2026` | Full access: edit doctors, services, manage knowledge base documents, trigger re-indexing, view patient inquiries. |
| **Staff** | `staff@cedarline.example` | `Cedarline-Staff-2026` | Read-only access to doctors and services, view incoming patient contact inquiries. |
| **Doctor** | `doctor@cedarline.example` | `Cedarline-Doctor-2026` | Doctor portal access. |

---

## 6. Local Development Setup

### Option 1: Quickstart with Docker Compose (Recommended)

Ensure you have Docker and Docker Compose installed:

```bash
# 1. Clone repository
git clone https://github.com/rakeshaa2002/healthcare-platform.git
cd healthcare-platform

# 2. Configure environment variables
cp .env.example .env
# Edit .env and insert your GEMINI_API_KEY (from https://aistudio.google.com/)

# 3. Start PostgreSQL with pgvector, Backend, and Frontend
docker compose up -d

# 4. View application
# Frontend: http://localhost:5173
# Backend Swagger Docs: http://localhost:8000/docs
```

---

### Option 2: Running Without Docker

#### Prerequisites:
- Node.js 20+ & npm
- Python 3.12+
- PostgreSQL with `pgvector` installed

#### 1. Backend Setup:
```bash
cd backend
python -m venv .venv

# On Windows (PowerShell):
.\.venv\Scripts\Activate.ps1
# On macOS/Linux:
# source .venv/bin/activate

pip install -r requirements.txt
cp .env.example .env
# Set DATABASE_URL and GEMINI_API_KEY in backend/.env

# Run migrations and seed clinic data
alembic upgrade head
python -m app.seed.run

# Start FastAPI dev server
uvicorn app.main:app --reload --port 8000
```

#### 2. Frontend Setup:
```bash
cd frontend
npm install
npm run dev
# Vite runs at http://localhost:5173 with auto-proxying /api requests to :8000
```

---

## 7. API Documentation

Interactive Swagger and ReDoc documentation are available on the live backend:
- **Swagger UI**: `https://cedarline-api.onrender.com/docs`
- **ReDoc**: `https://cedarline-api.onrender.com/redoc`

### Key Endpoints:

| Method | Endpoint | Description |
|:---|:---|:---|
| `GET` | `/api/v1/health` | Service & database connectivity health check |
| `GET` | `/api/v1/clinic-info` | Clinic operational hours, address, phone numbers |
| `GET` | `/api/v1/doctors` | List all doctors with specialities & OPD hours |
| `GET` | `/api/v1/services` | Service catalogue grouped by medical department |
| `GET` | `/api/v1/blog` | Medically reviewed patient education articles |
| `POST` | `/api/v1/chat` | AI Healthcare Chatbot query endpoint |
| `GET` | `/api/v1/chat/health` | RAG status: indexed chunk count & active embedding provider |
| `POST` | `/api/v1/contact` | Submit appointment or contact inquiry |
| `POST` | `/api/v1/auth/login` | JWT authentication for Admin & Staff |
| `GET` | `/api/v1/admin/knowledge/documents` | List indexed knowledge base documents |
| `POST` | `/api/v1/admin/knowledge/reindex` | Trigger asynchronous re-indexing of clinic data |

---

## 8. Database & Migrations

The database uses SQLAlchemy 2 Declarative Models managed by Alembic:

- `0001_initial_schema.py`: Initial relational schema (clinics, doctors, services, users, appointments, contact messages, knowledge documents, and chunks with `VECTOR(768)`).
- `0002_chatbot_only.py`: Adds `chat_events` for telemetry, tracking response latency, top similarity scores, and safety redirection metrics.
- `0003_add_doctor_role.py`: Extends user check constraint to safely accommodate `doctor`, `staff`, and `admin` roles.

---

## 9. Automated Testing & Code Quality

The backend has an automated test suite executed with `pytest`:
- **89 unit and integration tests** verifying:
  - Chatbot prompt engineering and response grounding
  - Emergency safety triggers and medical advice refusals
  - Vector cosine similarity calculations and retrieval filters
  - JWT authentication, role-based authorization, and token expiration
  - CRUD operations on doctors, services, and contact messages
  - Database migrations and schema constraints

Run the test suite locally:
```bash
cd backend
pytest
# Output: 89 passed in ~1.1s
```

Frontend quality checks:
```bash
cd frontend
# TypeScript compiler check
npx tsc -b
# Oxlint code quality verification
npx oxlint
```

---

## 10. Deployment & CI/CD Pipeline

The project is fully deployed to production using Render and Neon:

### 1. Render Blueprint (`render.yaml`)
A single root blueprint defines:
- **`cedarline-api`**: Docker Web Service running the FastAPI backend with health check `/api/v1/health` and automated migration/seeding on startup.
- **`cedarline-frontend`**: Static Site building the React SPA (`npm ci && npm run build`) publishing from `dist` with client-side SPA routing rewrites (`/*` → `/index.html`).

### 2. GitHub Actions (`.github/workflows/ci-cd.yml`)
Every push or pull request to `main` runs automated CI/CD checks:
1. **Frontend Job**: Node 22 setup, caching, `oxlint`, and TypeScript compile (`tsc -b`).
2. **Backend Job**: Python 3.12 setup, bytecode compile check (`compileall`), spins up a containerized PostgreSQL + `pgvector` instance, and runs all 89 `pytest` tests.
3. **CD Delivery**: Automatically deploys passing builds directly to Render.

---

## 11. Screen Recording Demonstration

A recommended 3-to-4 minute walkthrough structure for video evaluation:

1. **Introduction (30s)**:
   - Introduce yourself (Rakesha N), the position (Full Stack Developer — Web Applications & AI Automation), and Arquette Digital.
   - Mention the repository and live Render deployment URLs.
2. **Task 1: 10-Page Website Walkthrough (90s)**:
   - Navigate through the 10 required pages: Home, About, Doctors, Services, Dental, Skin, Hair, Appointments, Blog, and Contact Us.
   - Highlight the responsive mobile view using browser DevTools.
   - Show form validation on the Contact / Appointment inquiry page.
3. **Task 2: AI Healthcare Chatbot Demo (90s)**:
   - Open the chatbot widget on the bottom right.
   - **Query 1 (Services/Pricing)**: *"How much does laser teeth whitening cost and how long does it take?"* → Bot answers with accurate pricing and duration from the clinic database.
   - **Query 2 (Doctors/Timings)**: *"When is Dr. Ananya Rao available for consultation?"* → Bot responds with her OPD schedule.
   - **Query 3 (Safety Guardrail / Diagnostic Refusal)**: *"I have sudden chest pain and shortness of breath, what medicine should I take?"* → Bot immediately triggers emergency protocol, displays emergency hotline (112), and refuses to prescribe or diagnose.
   - **Query 4 (Out-of-Scope / Non-Hallucination)**: *"Can you fix my car's engine?"* → Bot politely explains it only answers questions about Cedarline Clinic.
4. **Admin Management & Knowledge Base (30s)**:
   - Log in at `/admin/login` using `admin@cedarline.example`.
   - Show the Analytics Dashboard, Doctors list, and Knowledge Base document status.
   - Show test suite execution in terminal (`89 passed`).

---

## 12. AI Tools Used & Engineering Methodology

*(Per Section 6 of Arquette Digital Assessment Guidelines)*

AI tools were leveraged as an engineering multiplier to accelerate development, improve test coverage, and enforce strict healthcare compliance:

### 1. Tools Employed:
- **Antigravity IDE & Gemini 2.5 Flash**: Used as an AI pair programmer for rapid boilerplate generation, code refactoring, TypeScript interfaces, and automated test suite creation.
- **Google Gemini API (`gemini-embedding-001` & `gemini-2.5-flash`)**: Core LLM and embedding models powering the production RAG pipeline.

### 2. How the Output was Verified & Problem-Solving:
- **Architectural Guardrails**: The RAG prompt and safety layer were manually designed using deterministic regex screens *before* the LLM is invoked, ensuring safety-critical refusals never rely on probabilistic LLM responses.
- **Rigorous Automated Testing**: 89 test cases were developed to test edge cases, including token expiration, vector similarity edge cases, and CORS header handling.
- **Debugging & Resolution**:
  - *Database Check Constraint*: Diagnosed and resolved a PostgreSQL check constraint collision (`ck_users_role_valid`) when adding the doctor role by writing an idempotent Alembic migration using raw DDL.
  - *Production CORS Configuration*: Enhanced FastAPI's CORS middleware with regex matching (`^https://.*\.onrender\.com$`) to handle arbitrary Render preview subdomains cleanly.
- **Codebase Ownership**: Every line of code, database migration, and Dockerfile was reviewed, verified in local development, and validated in cloud deployment.

---

**Submitted by:** Rakesha N  
**Assessment:** Arquette Digital — Full Stack Developer (Web Applications & AI Automation)
