# Lumiflow Test Plan

## Goals
- Prevent regressions in critical user journeys.
- Verify auth + welcome/first-run + invite flows.
- Validate recurring month policy behavior.
- Keep CI fast enough for every PR.

## Test Layers

### 1) Unit tests (Vitest)
- `lib/recurring-utils`
  - month-end policy behavior (`ROLL_TO_LAST_DAY` / `SKIP_MONTH`)
  - next run date calculations
- `lib/invite-utils`
  - token hashing deterministic behavior

### 2) E2E tests (Cypress)
- `auth-onboarding.cy.ts`
  - sign up → `/welcome` → dashboard
  - monthly contribution via Settings (replaces old onboarding income step)
- `invite-popup.cy.ts`
  - owner creates invite link
  - invited user signs up via callback URL
  - invite confirmation popup appears and accept succeeds
- `recurring-short-month.cy.ts`
  - recurring toggle on
  - short-month policy hidden for day 28
  - short-month policy shown for day 30

## CI execution strategy
- Run on PR and push to `main`.
- Order:
  1. install deps
  2. prisma migrate deploy
  3. unit tests
  4. build
  5. e2e tests (start app + Cypress run)
- Use PostgreSQL service in GitHub Actions to keep tests realistic.

## Next incremental improvements
- Add API-level integration tests for invite acceptance and account membership.
- Add visual regression snapshots for major screens.
- Add flaky test retry policy (`retries`) for CI-only instability.
