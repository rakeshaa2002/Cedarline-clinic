#!/bin/sh
# Container entrypoint: migrate, optionally seed, then serve.
set -e

echo "Running database migrations..."
alembic upgrade head

if [ "${SEED_ON_START:-false}" = "true" ]; then
  echo "Seeding database (idempotent)..."
  python -m app.seed.run
fi

echo "Starting API on port ${PORT:-8000}"
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}" --proxy-headers --forwarded-allow-ips="*" --workers "${WEB_CONCURRENCY:-1}"
