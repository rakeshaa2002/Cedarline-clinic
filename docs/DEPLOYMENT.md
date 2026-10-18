# Deployment Guide

This guide covers deploying the full-stack Cedarline Clinic platform (Database, FastAPI Backend API, React Frontend SPA) and setting up CI/CD with GitHub Actions.

```
┌─────────────────────────────────┐       ┌────────────────────────────────┐       ┌───────────────────────────────┐
│ React Frontend (Render / Vercel)│ ────► │ FastAPI Backend (Render Docker)│ ────► │ PostgreSQL + pgvector (Neon)  │
└─────────────────────────────────┘       └────────────────────────────────┘       └───────────────────────────────┘
```

---

## 1. Database: Neon (Recommended) or Render Postgres

The backend requires PostgreSQL with the `pgvector` extension enabled.

1. Create a free account at [neon.tech](https://neon.tech) and create a project/database named `clinic`.
2. Copy the pooled or direct connection string:
   ```
   postgresql://user:password@ep-xyz.region.aws.neon.tech/clinic?sslmode=require
   ```
3. The Alembic migrations in `backend/alembic` automatically run `CREATE EXTENSION IF NOT EXISTS vector` on boot.

*(Alternative: Render Postgres also supports `pgvector`. Note that Render free-tier databases expire after 30 days unless upgraded.)*

---

## 2. Deploy on Render (1-Click Blueprint or Manual)

### Option A: Render Blueprint (Recommended - Full Stack in 1 Click)

The repository includes a root `render.yaml` configuring both the backend API (Docker) and the frontend SPA (Static Site).

1. Push your repository to GitHub: `git push origin main`.
2. In the [Render Dashboard](https://dashboard.render.com/), click **New +** → **Blueprint**.
3. Select your GitHub repository (`healthcare-platform`).
4. Render automatically parses `render.yaml` and presents the two services:
   - `cedarline-api` (Docker web service)
   - `cedarline-frontend` (Static site)
5. Fill in the required environment variables:
   - `DATABASE_URL`: Your Neon PostgreSQL connection string.
   - `GEMINI_API_KEY`: Your Google Gemini API key.
   - `ADMIN_PASSWORD`: Secure password for `admin@cedarline.example`.
   - `STAFF_PASSWORD`: Secure password for `staff@cedarline.example`.
   - `DOCTOR_PASSWORD`: Secure password for `doctor@cedarline.example`.
   - `CORS_ORIGINS`: Your frontend URL (e.g. `https://cedarline-clinic.onrender.com`).
   - `VITE_API_URL`: Your backend API URL (e.g. `https://cedarline-api.onrender.com`).
   - `VITE_SITE_URL`: Your frontend URL (e.g. `https://cedarline-clinic.onrender.com`).
6. Click **Apply**. Render builds the backend Docker container, runs migrations & seeds automatically via `scripts/start.sh`, and builds the frontend static site with SPA routing.

### Option B: Manual Service Creation on Render

#### Backend API Service:
- **Type**: Web Service
- **Runtime**: Docker
- **Root Directory**: `backend`
- **Health Check Path**: `/api/v1/health`
- **Environment Variables**:
  - `ENVIRONMENT=production`
  - `DATABASE_URL=postgresql://...`
  - `JWT_SECRET=<long-random-string>`
  - `CORS_ORIGINS=https://cedarline-clinic.onrender.com`
  - `ADMIN_EMAIL=admin@cedarline.example`
  - `ADMIN_PASSWORD=<strong-password>`
  - `STAFF_EMAIL=staff@cedarline.example`
  - `STAFF_PASSWORD=<strong-password>`
  - `DOCTOR_EMAIL=doctor@cedarline.example`
  - `DOCTOR_PASSWORD=<strong-password>`
  - `EMBEDDING_PROVIDER=gemini`
  - `EMBEDDING_MODEL=gemini-embedding-001`
  - `EMBEDDING_DIM=768`
  - `LLM_PROVIDER=gemini`
  - `LLM_MODEL=gemini-2.5-flash`
  - `GEMINI_API_KEY=<your-key>`
  - `SEED_ON_START=true`

#### Frontend Static Site:
- **Type**: Static Site
- **Root Directory**: `frontend`
- **Build Command**: `npm ci && npm run build`
- **Publish Directory**: `./dist`
- **Redirects / Rewrites**:
  - `/*` -> `/index.html` (Rewrite for SPA router)
- **Environment Variables**:
  - `VITE_API_URL=https://<your-backend-api>.onrender.com`
  - `VITE_SITE_URL=https://<your-frontend-site>.onrender.com`

---

## 3. CI/CD with GitHub Actions

The repository includes `.github/workflows/ci-cd.yml` which triggers automatically on every push or pull request to `main`.

### CI Checks:
1. **Frontend Job**:
   - Node 22 setup with npm caching.
   - `npm ci`
   - `oxlint` code quality and linting.
   - TypeScript build (`tsc -b && vite build`).
2. **Backend Job**:
   - Python 3.12 setup with pip caching.
   - Spawns a real PostgreSQL + `pgvector` container (`pgvector/pgvector:pg17`).
   - Verifies Python bytecode compilation (`python -m compileall app`).
   - Runs the complete test suite with `pytest`.

### CD (Continuous Deployment) to Render:
- **Automatic Git Deploys**: Render automatically listens for new commits on the `main` branch and triggers a fresh deploy.
- **Optional Webhook Deploys**: Under your Render service settings, copy the **Deploy Hook** URL. Add it to GitHub repository secrets:
  - `RENDER_API_DEPLOY_HOOK`: Webhook URL for the backend API.
  - `RENDER_FRONTEND_DEPLOY_HOOK`: Webhook URL for the frontend static site.
  The workflow will automatically ping the hooks upon successful CI tests.

---

## 4. Verification After Deployment

Verify the backend:
```bash
# Health check
curl https://<api-host>/api/v1/health
# Expected: {"status":"ok","database":"ok"}

# AI & RAG health check
curl https://<api-host>/api/v1/chat/health
# Expected: indexed_chunks > 0, provider: gemini
```

Verify the frontend:
- Open `https://<frontend-host>/`
- Test patient appointment booking.
- Test the Medical AI chatbot widget.
- Navigate to `https://<frontend-host>/admin` and log in with your configured admin credentials.
