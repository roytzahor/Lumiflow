#!/usr/bin/env bash
# Run the full Cypress suite against a PRODUCTION build (next build + next start) with the
# local Docker Postgres. Per LESSONS.md (2026-07-04): suite-level green/red verdicts must come
# from a production build — `next dev` on-demand compilation flakes under 20-test load.
# The dev-mode scripts remain for the dev-only failure-injection test and single-spec iteration.
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

echo "==> Production build"
yarn build

echo "==> next start + Cypress (production build, local DB)"
export CYPRESS_PROD_BUILD=1
yarn start-server-and-test "yarn start" http://localhost:3000/auth/signup "yarn test:e2e"
