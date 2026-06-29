# LumiFlow — Improvement Sprint (cheap-agent execution plan)

A product-led sprint decomposed into **small, self-contained tasks** that a cheaper model
(Haiku / Sonnet subagent) can execute one at a time with minimal context. Each task names its
files, gives explicit acceptance criteria, a verification command, and a "do not touch" boundary.

## How to run this with cheap agents
- **Model tiers:** `Haiku` = mechanical/pattern-following (renames, token swaps, aria labels, test
  scaffolds). `Sonnet` = localized logic (extract a component, write a util + test). `Opus` = the
  one architecture task (W2-T1, the actions split) — reserve the expensive model for it only.
- **Dispatch one wave at a time.** Tasks *within* a wave touch disjoint files, so they run in
  parallel safely. Don't start a wave until the previous one's verification passes.
- **Every task ends with:** `yarn lint && yarn test:unit` must stay green. UI tasks also build:
  `yarn build`. The agent must report the command output, not just claim success.
- **Boundary rule for every task:** change only the files listed. No drive-by refactors, no
  dependency bumps, no Prisma schema edits unless the task says so.

---

## Theme A — Design-system consistency (highest visible ROI, lowest risk)

### Wave 1 — primitives (parallel · Haiku/Sonnet)

**A1-T1 · `<Money>` component** — *Sonnet*
- Files: new `components/ui/Money.tsx`; do not edit call sites yet.
- Build a presentational component wrapping `formatIlsAmount()` with `tabular-nums`, optional
  sign/colour (`positive`/`negative`/`neutral`), and `₪`/`-₪` prefix logic. Props: `amount: number`,
  `tone?`, `className?`. No business logic.
- Accept: renders identical strings to current inline usage; unit test `Money.test.tsx` covers
  positive, negative, zero, rounding.
- Verify: `yarn test:unit`.

**A1-T2 · `<LockedTeaser>` component** — *Sonnet*
- Files: new `components/ui/LockedTeaser.tsx`.
- Extract the repeated blurred-content + glass-overlay + lock-icon pattern (currently duplicated in
  `Dashboard.tsx` 3× and `SavingsAllocationCard.tsx`). Props: `children` (blurred content),
  `title`, optional `cta`. Use the existing classes verbatim (`backdrop-blur-xl`, `text-pretty`, etc.).
- Accept: visual parity with one current instance.
- Verify: `yarn build`.

**A1-T3 · design-token lint sweep** — *Haiku*
- Files: any `components/*.tsx` containing raw hex colours in `className`/`style` (grep
  `#[0-9A-Fa-f]{6}` excluding `tailwind.config.ts`, `PieChart.tsx` chart palette, and SVG `stroke`).
- Replace raw hex with the nearest `ios-*` token. List every replacement in a before/after table.
- Accept: no new hex in JSX className strings; build green.
- Verify: `yarn build`.

### Wave 2 — adopt primitives (after Wave 1 · Haiku)

**A2-T1…Tn · swap inline money → `<Money>`** — *Haiku*, one task per file
- Files (one each): `Dashboard.tsx`, `TransactionFeed.tsx`, `SavingsAllocationCard.tsx`,
  `PieChart.tsx`, `HistoryControlsCard.tsx`, `insights-anomaly-card.tsx`.
- Replace inline `₪{formatIlsAmount(x)}` patterns with `<Money amount={x} tone=… />`. Keep exact
  colour semantics.
- Accept: no behavioural change; `yarn build` + existing Cypress money assertions pass.
- Verify: `yarn build`.

---

## Theme B — Accessibility & RTL hardening (parallel · Haiku/Sonnet)

**B-T1 · aria/label audit** — *Haiku*, batch by 5 components
- Files: the components that today lack `aria-label`/`sr-only` (only 13 of ~40 have them).
- Add `aria-label` to icon-only buttons, `aria-expanded`/`aria-controls` to collapsible sections,
  `role`/`aria-live` to toast and dynamic totals. Hebrew labels.
- Accept: every interactive icon-only element has an accessible name. No visual change.
- Verify: `yarn build`; spot-check with the existing Cypress a11y selectors.

**B-T2 · logical-property sweep** — *Haiku*
- Files: components using physical `left/right`, `ml-/mr-`, `pl-/pr-`, `text-left/right`.
- Convert to logical (`start/end`, `ms-/me-`, `ps-/pe-`, `text-start/end`) so RTL stays correct.
- Accept: grep shows no physical-direction utilities in `components/`; build green.
- Verify: `yarn build`.

---

## Theme C — Test coverage backfill (parallel · Sonnet)

**C-T1…Tn · unit tests for `lib/` utils** — *Sonnet*, one task per util
- Files (one each, add `*.test.ts` beside): `scope-account.ts`, `month-bounds.ts`, `date-only.ts`,
  `installment-utils.ts`, `category-dictionary.ts`. (`my-money-utils`, `recurring-utils`,
  `retention-signals` already tested.)
- Write table-driven tests covering edge cases (month boundaries, leap years, RTL category names,
  installment rounding remainder). Pure functions only — no DB.
- Accept: each new file ≥ 6 cases; `yarn test:unit` green.
- Verify: `yarn test:unit`.

**C-T2 · Cypress smoke for Insights** — *Sonnet*
- Files: extend `cypress/e2e/insights.cy.ts` only.
- Add specs for empty-state, anomaly card render, and the AI-assistant gated state. Mock Gemini
  network calls — do not hit the real API.
- Accept: spec passes in `yarn test:e2e:local`.

---

## Theme D — Architecture (sequential · Opus, then verify cheap)

**D-T1 · split `app/actions.ts`** — *Opus* (single biggest task; do alone, own branch)
- Files: `app/actions.ts` → new `app/actions/` domain modules: `transactions.ts`, `accounts.ts`,
  `recurring.ts`, `savings.ts`, `income.ts`, `onboarding.ts`, `settings.ts`. Keep `app/actions.ts`
  as a barrel re-export so import sites don't change.
- Rules: pure move + re-export. No logic changes. `requireUserId`/`assertUserHasAccount`/
  `refreshAllViews` stay shared (move to `app/actions/_shared.ts`).
- Accept: `yarn build && yarn test` green, zero import-path changes elsewhere, each new file < 400 lines.
- Verify: `yarn build && yarn test:unit && yarn lint`.

**D-T2 · prune dead scripts** — *Haiku* (after D-T1)
- Files: root `check_*.js`, `debug-data.js`, redundant `seed_accounts*.js` / `seed_v3_full.js`.
- Cross-check against `package.json` scripts; **only** delete files referenced by no script and not
  imported anywhere. Produce a deletion list for human approval before removing.
- Accept: `yarn db:seed:demo` and all `yarn` scripts still resolve.

---

## Suggested order
1. **Wave 1 (Theme A primitives)** + **Theme B** + **Theme C** in parallel — all low-risk, disjoint files.
2. **Wave 2 (Theme A adoption)** once primitives land.
3. **Theme D-T1** alone on its own branch (Opus), then **D-T2**.

## Definition of done (whole sprint)
- `yarn lint && yarn test && yarn build` all green.
- No raw hex or physical-direction utilities in `components/`.
- Every icon-only control has an accessible Hebrew name.
- `app/actions.ts` is a thin barrel; no domain file exceeds 400 lines.
- Unit-test count roughly doubles; Insights has E2E smoke coverage.
