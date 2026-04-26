#!/usr/bin/env bash
# Run Cypress e2e against the Postgres service from docker-compose.yml (port 5433).
# Overrides DATABASE_URL / DIRECT_URL for this process tree so a broken remote DB in .env is ignored.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

LOCAL_DB_URL='postgresql://lumiflow:lumiflow@127.0.0.1:5433/lumiflow?schema=public'
export DATABASE_URL="$LOCAL_DB_URL"
export DIRECT_URL="$LOCAL_DB_URL"

echo "==> Starting local Postgres (docker compose)"
docker compose up -d postgres

echo "==> Waiting for Postgres on 127.0.0.1:5433"
if [[ -x "./node_modules/.bin/wait-on" ]]; then
  ./node_modules/.bin/wait-on "tcp:127.0.0.1:5433" -t 120000
else
  npx --no-install wait-on "tcp:127.0.0.1:5433" -t 120000
fi

echo "==> Prisma generate + migrate deploy (local DB)"
yarn prisma generate
yarn prisma migrate deploy

echo "==> Next dev + Cypress (DATABASE_URL still points at local Docker)"
yarn start-server-and-test "yarn dev" http://localhost:3000/auth/signup "yarn test:e2e"
