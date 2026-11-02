# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Monorepo for a multispeciality clinic website: `backend/` (FastAPI + SQLAlchemy 2 + PostgreSQL/pgvector) and `frontend/` (React 19 + Vite + Tailwind v4 SPA). The backend serves `/api/v1`; the frontend never talks to anything else. Deep design notes live in `docs/ARCHITECTURE.md` (its "Booking" section is stale — a full booking engine now exists, see below).

## Commands

Development is on Windows; the backend venv is `backend/.venv` (`.venv\Scripts\python`).

**Database** — PostgreSQL 17 + pgvector in Docker, host port **5434** (container `clinic-pg`, user `clinic`). Start it with `docker start clinic-pg` (or `docker compose up db`).

**Backend** (from `backend/`):
```bash
alembic upgrade head                       # migrations
python -m app.seed.run                     # idempotent seed (upserts by slug, re-embeds only changed knowledge docs)
uvicorn app.main:app --reload --port 8000  # dev server (backend/main.py is a shim so `uvicorn main:app` also works)
alembic revision --autogenerate -m "..."   # new migration; review the file in alembic/versions/
```

**Backend tests** need the Postgres container running. `tests/conftest.py` creates the `clinic_test` database if missing (override with `TEST_DATABASE_URL`), runs `alembic downgrade base` then `upgrade head` once per session, and TRUNCATEs every table before each test.
```bash
pytest                                                    # full suite
pytest tests/test_appointments.py                         # one file
pytest tests/test_appointments.py::test_double_booking_is_rejected
pytest -k "deleting_a_doctor"
```

**Frontend** (from `frontend/`):
```bash
npm run dev      # Vite on :5173, proxies /api -> http://127.0.0.1:8000 (override with VITE_DEV_API_PROXY)
npm run lint     # oxlint
npx tsc -b       # type-check (may OOM here; use NODE_OPTIONS=--max-old-space-size=4096)
npm run build    # tsc -b && vite build
```

CI (`.github/workflows/ci-cd.yml`) runs `npm run lint` + `npm run build` for the frontend and `python -m compileall app` + `pytest` against a pgvector service for the backend. Ruff settings (line length 120) are in `pyproject.toml`, but ruff is not in the requirements.

## Backend architecture

- **Layering:** `api/v1/routers/*` (HTTP only) → `services/*` (domain logic) → `models/*` (ORM). Request/response bodies are Pydantic models in `schemas/`; ORM objects are never returned directly.
- **Auth/roles:** JWT bearer tokens. `api/deps.py` exposes `StaffUser` (admin, staff, **doctor**) and `AdminUser` (admin only). A `doctor` user is linked to a doctor through `users.doctor_id` and sees only that doctor's appointments.
- **Errors:** raise `AppError` subclasses from `core/exceptions.py` (`NotFoundError`, `ConflictError`, …). Every error is returned as `{"error": {"code", "message", "details": [{field, message}] | null}}`. A subclass can override `code` so the UI can branch on it (e.g. `doctor_has_appointments` in `routers/admin.py`).
- **Settings:** `core/config.py` (Pydantic settings, cached). The API refuses to start in production with a weak `JWT_SECRET`.

### Database is the source of truth for the chatbot
The chatbot's knowledge base is partly *generated from relational tables*: `services/knowledge_base/system_documents.py` writes documents from `clinic_info`, `doctors`, `services` and `blog_posts`. Any admin endpoint that changes catalogue data must schedule `tasks.add_task(refresh_knowledge_base)`, as the existing ones in `routers/admin.py` do. Otherwise the chatbot will contradict the website. Other document sources are seed markdown in `app/seed/knowledge/` and admin uploads. Each chunk stores its `embedding_model`, and retrieval filters on the active model, so switching provider means re-indexing.

### Chat pipeline (`services/chatbot/service.py`)
1. Validate the message.
2. **Pre-LLM safety regexes** (`safety.py`: emergencies, diagnosis and dosage requests) return fixed replies and **never reach the LLM**.
3. Small talk.
4. Live-data answers from the DB (`directory.py`: doctors, fees, open-now, who's in today).
5. Embed the question and run pgvector cosine search with a similarity threshold (`retrieval.py`).
6. Build a strict prompt (`prompt.py`).
7. Call the LLM with a model fallback cascade on 429/5xx (`llm.py`).
8. **Grounding check** (`grounding.py`): numbers and `Dr. X` names in the answer must appear in the retrieved context, or the answer falls back to extractive quotes.

`chat_events` stores only outcome, provider and latency — never message text. A test enforces this.

### Booking engine (`services/appointments.py`)
- Slots come from each doctor's `consultation_days`, `start_time`/`end_time` and `slot_minutes`, plus clinic opening hours, the booking window and the minimum-notice settings.
- Double booking is prevented by the partial unique index `uq_appointments_active_slot` (doctor, date, start_time where status is pending/confirmed). Don't replace it with application-level checks.
- `appointments.doctor_id` is `ON DELETE RESTRICT`; deleting a doctor who has appointments requires `?delete_appointments=true`.
- Patient emails (`services/email/`) build HTML plus .ics invites. Every attempt is logged in `appointment_emails` as `sent` / `failed` / `skipped` (skipped when `SMTP_HOST` is unset).
- Uploads (`services/media.py`) go to Cloudinary when configured, otherwise into Postgres.

### Tests
- Tests are fully offline: `EMBEDDING_PROVIDER=hashing`, `LLM_PROVIDER=extractive`, and `FakeLLM` / `httpx.MockTransport` instead of Gemini.
- Useful fixtures in `conftest.py`:
  - `seeded`: real seed catalogue
  - `knowledge`: seeded and indexed
  - `admin_headers`, `staff_headers`
  - `outbox`: captures SMTP; defined in `test_appointments.py`
- **When adding a table, add it to `TABLES` in `conftest.py`.** Because the suite starts with `downgrade base`, migration downgrades must work.

## Frontend architecture

- **Data:** `services/api.ts` holds the single Axios instance. `toApiError` normalises errors into `ApiError { status, code, fieldErrors }`, where `fieldErrors` comes from `details[]`. `services/endpoints.ts` has typed wrappers, and `types/index.ts` mirrors the backend schemas by hand, so keep both in sync with backend changes.
- **Caching:** `hooks/useApi.ts` is a keyed in-memory cache. After a mutation, call `invalidate('<key prefix>')` (e.g. `invalidate('doctors:')`) and `reload()`.
- **Public site = RUA Skin & Hair Center, frontend-only.** All public pages render from static content in `src/content/rua/` (brand, centres, doctors, the 7 service categories and 22 treatment pages). They do not call the backend; only the admin panel does. The public booking wizard (`pages/BookAppointmentPage.tsx`) hands the booking to RUA's WhatsApp (wa.me) with a reference and an .ics download — it does not use the backend booking engine.
- **Content modules use relative imports only** (no `@/`, no `import.meta.env`, no browser APIs): `vite.config.ts` imports them at build time.
- **SEO:** `content/rua/seo.ts` builds every page's title, description, canonical and schema.org graph (MedicalOrganization, MedicalClinic per centre, Physician, MedicalWebPage/MedicalProcedure, FAQPage, BreadcrumbList). Pages render it with `<Seo meta={...} />`. The `rua-seo-pages` plugin in `vite.config.ts` uses the same data to emit `sitemap.xml`, `robots.txt` and a pre-rendered HTML file per route (`path/index.html` and `path.html`) with head tags marked `data-seo` plus readable text inside `#root`. `main.tsx` removes the `data-seo` tags on load so React owns them. A new public page needs a meta builder in `seo.ts` added to `allPageMetas`.
- **Routing:** `router/index.tsx` — public pages are imported eagerly; admin pages are lazy. Treatment URLs are `/services/:category/:treatment`; `TreatmentPage` redirects a wrong category segment to the canonical URL. `SiteLayout` covers public pages (`components/rua/chrome.tsx`: header, footer, mobile action bar, WhatsApp button) and `AdminLayout` covers `/admin/*`. `/doctor/login` reuses the admin login, and `/doctor` redirects to `/admin`.
- **Analytics:** `utils/analytics.ts` pushes `page_view`, `click_call`, `click_whatsapp`, `booking_*`, `book_appointment` and `generate_lead` to `window.dataLayer`; set `VITE_GTM_ID` to load Google Tag Manager. Links can carry `data-centre` for attribution.
- **Canonical domain:** `SITE_URL` (`content/site.ts`) and the build use `VITE_SITE_URL`, defaulting to `https://www.ruaskinandhair.com`; localhost values are ignored.
- **Theming:**
  - Design tokens live in `src/index.css` `@theme`: `brand-*` (cocoa `#592F23` = brand-800, walnut `#8E5430` = brand-600), `ink-*`, `accent-*` (gold — use dark text on it, white fails contrast), `cream`, `ivory`, `sand`. Fonts: Fraunces (display), Inter (body), Plus Jakarta Sans (`font-label` eyebrows).
  - Brand utilities in `index.css`: `.surface-cocoa`, `.slats` (the clinic's wood-slat facade), `.arch`, `.hairline-gold`, `.text-gold-gradient`, `.reveal` (used by `components/rua/ui.tsx` `Reveal`).
  - `cn()` only joins class names (no tailwind-merge), so a `hidden` passed to a component that already sets `inline-flex` will lose — wrap it in an element instead.
  - Brand assets are in `public/images/rua/` (logo lockup/mark/wordmark in cream and cocoa, doctor cutouts, founders photo, equipment, share image). `components/site/Logo.tsx` uses them.
  - The admin-selected theme (`clinic_info.theme`) is applied at runtime by `theme/themes.ts` and `ThemeSync`, which override only the `--color-brand-*` variables. The `cedar` theme ("RUA Brown") means "use the stylesheet defaults".
  - The backend seed data, chatbot knowledge and admin panel still describe the old Cedarline demo clinic.
- **Chat:** chatbot output is rendered as React elements by a small Markdown subset renderer (`components/chat/RichText.tsx`); `dangerouslySetInnerHTML` is never used.

## Environment

- **Docker Compose:** reads the root `.env`; see `.env.example`.
- **Native backend:** reads `backend/.env`. `EMBEDDING_PROVIDER`/`LLM_PROVIDER` select `gemini`, `openai`, or the offline `hashing`/`extractive` modes.
- **Frontend:** `frontend/.env` has `VITE_API_URL`, empty in dev so the Vite proxy is used, and `VITE_SITE_URL`.
- **Deployment:** Render (`render.yaml`). The backend container runs `scripts/start.sh`: migrate, seed when `SEED_ON_START=true`, then uvicorn.
