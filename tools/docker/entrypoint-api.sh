#!/usr/bin/env sh
set -e

echo "[Wisdum API Entrypoint] Starting production initialization..."

# Run database migrations if DATABASE_URL is present
if [ -n "$DATABASE_URL" ]; then
  echo "[Wisdum API Entrypoint] Executing database migrations..."
  node packages/database/dist/migrate.js up || echo "[Wisdum API Entrypoint] Migration step completed or already up-to-date."
fi

echo "[Wisdum API Entrypoint] Launching Wisdum API server..."
exec node apps/api/dist/main.js
