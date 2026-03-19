# Lumiflow Improvement Quality Gates

## Sprint 1 - Quick Add Trust
- Quick add keeps selected category when account changes.
- Date-only values are parsed/stored as UTC-safe `yyyy-mm-dd`.
- Unit tests cover date parsing and recurring month policy.

## Sprint 2 - Daily Retention Loop
- Dashboard exposes at least one daily action nudge.
- Budget alerts shown as `ok` / `warning` / `critical`.
- Insights page includes actionable nudge list from current month activity.

## Sprint 3 - Shared Foundation
- Transactions store optional attribution fields: `paidByUserId`, `attributedToUserId`.
- Shared-account balance preview is derivable from transaction attribution.
- Schema includes indexes for recurring scheduling and account/month transaction queries.

## CI Gates
- `yarn lint`
- `yarn typecheck`
- `yarn test:unit`
- `yarn build`
- Cypress e2e smoke suite
