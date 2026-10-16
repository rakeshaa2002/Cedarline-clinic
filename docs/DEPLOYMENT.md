# Deployment guide

The database, API and frontend are deployed separately. The plan below uses free tiers that persist data and support pgvector.

```
Vercel / Netlify (static SPA)  ──►  Render web service (Docker, FastAPI)  ──►  Neon Postgres (pgvector)
```

## 1. Database: Neon

1. Create a project at neon.tech, with a database named `clinic`.
2. Copy the connection string (`postgresql://user:pass@ep-xxx.<region>.aws.neon.tech/clinic?sslmode=require`).
3. Nothing else is needed. The Alembic migration runs `CREATE EXTENSION IF NOT EXISTS vector`, and Neon supports pgvector on every plan.

Alternatives: Render Postgres (pgvector supported; the free instance expires) or Supabase (pgvector supported).

## 2. API: Render

**Option A: Blueprint.** Push the repo to GitHub. In Render, choose New → Blueprint and select the repo. Render reads `render.yaml`, then asks for:

| Variable | Value |
|---|---|
| `DATABASE_URL` | the Neon string from step 1 (`postgresql://` is normalised automatically) |
| `CORS_ORIGINS` | your frontend URL, e.g. `https://cedarline-clinic.vercel.app` |
| `ADMIN_PASSWORD`, `STAFF_PASSWORD` | strong passwords |
| `GEMINI_API_KEY` | a key from Google AI Studio |

`JWT_SECRET` is generated automatically.

**Option B: Manual.** Create a Web Service with Runtime **Docker**, root directory `backend`, and health check path `/api/v1/health`. Then set the variables above, plus `ENVIRONMENT=production`, `EMBEDDING_PROVIDER=gemini`, `LLM_PROVIDER=gemini` and `SEED_ON_START=true`.

On every boot, `scripts/start.sh`:
1. Runs `alembic upgrade head`.
2. Seeds the database idempotently. If the AI provider is down, the error is logged and the API still starts.
3. Starts uvicorn on `$PORT`.

Check that it worked:

```bash
curl https://<api-host>/api/v1/health        # {"status":"ok","database":"ok"}
curl https://<api-host>/api/v1/chat/health   # indexed_chunks > 0, embedding_model gemini:...
```

Free Render services sleep when idle, so the first request after a while can take about 30–60 seconds.

## 3. Frontend: Vercel (or Netlify)

1. Import the repo into Vercel, with root directory `frontend`, framework **Vite**, build command `npm run build` and output directory `dist`.
2. Set these environment variables:
   - `VITE_API_URL=https://<api-host>` (no trailing slash, no `/api/v1`)
   - `VITE_SITE_URL=https://<your-vercel-domain>` (used for canonical tags, `sitemap.xml` and `robots.txt`)
3. Deploy. `vercel.json` rewrites client routes (for example `/services/dental`) to `index.html`.
4. Add the final frontend URL to the API's `CORS_ORIGINS` and redeploy the API.

On Netlify, use the same settings; `public/_redirects` handles the SPA fallback.

## 4. After deploying

- Sign in at `https://<frontend>/admin` with `ADMIN_EMAIL` / `ADMIN_PASSWORD`.
- Go to Chatbot knowledge, check the status shows **Ready**, and run **Re-index everything** once if you changed providers.
- Ask the chatbot a few questions (see the README), then check they appear on the dashboard.
- Set `GEMINI_API_KEY` only in the Render dashboard. Never put it in a frontend variable or commit it.

## Switching embedding models later

The vector column is `vector(768)`. Models that can output 768 dimensions (such as `gemini-embedding-001` with `outputDimensionality`, or `text-embedding-3-small` with `dimensions`) work without a migration; just run a re-index. For a different size, add an Alembic migration that alters `knowledge_chunks.embedding`, set `EMBEDDING_DIM`, and re-index.
