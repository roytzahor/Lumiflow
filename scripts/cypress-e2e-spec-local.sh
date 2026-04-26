#!/usr/bin/env bash
# Run one Cypress spec with local Docker Postgres + Next dev (same as cypress-e2e-local.sh).
# Usage: bash scripts/cypress-e2e-spec-local.sh cypress/e2e/onboarding-resilience.cy.ts
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

SPEC_FILE="${1:-}"
if [[ -z "$SPEC_FILE" ]]; then
  echo "Usage: bash scripts/cypress-e2e-spec-local.sh <path-to-spec.cy.ts>" >&2
  echo "Example: bash scripts/cypress-e2e-spec-local.sh cypress/e2e/onboarding-resilience.cy.ts" >&2
  exit 1
fi

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

echo "==> Next dev + Cypress spec: ${SPEC_FILE}"
yarn start-server-and-test "yarn dev" http://localhost:3000/auth/signup "yarn cypress run --spec \"${SPEC_FILE}\""
