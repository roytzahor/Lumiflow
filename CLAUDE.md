# LumiFlow — Couple Finance, Simplified

LumiFlow is a Hebrew-first (RTL), mobile-web personal & couple finance app. It automates monthly
tracking, attribution of shared expenses between partners, recurring/installment handling, savings
allocation, and AI-assisted insights. The product target is an **iOS-native-feeling PWA** — every
surface should read like a polished native iOS screen, not a generic web dashboard.

---

## Agentic Behavior & Fable 5 Autonomy Rules

1. **Context Mapping (Repomix):** Before starting any major refactor, architectural change, or cross-file feature implementation, you MUST run `repomix` via the terminal to generate a holistic view of the codebase. Do not guess the architecture.
2. **Self-Correction & Learning (LESSONS.md):** You must maintain and consult a `LESSONS.md` file in the root directory. If a test fails, a build breaks, or an architectural assumption is proven wrong, stop immediately. Document the mistake, the root cause, and the strict rule to prevent it in `LESSONS.md` before attempting a fix. Always read `LESSONS.md` at the beginning of your session.
3. **Plan First:** For complex tasks, use `Plan Mode` first to outline the component relationships and data flow before generating code.
4. **Safety Boundaries:** When refactoring, NEVER bypass `requireUserId` or `assertUserHasAccount`. Ensure the shared-expense attribution math (AccountContributionPlan) remains intact and strictly tested.
5. **Token Efficiency & Atomic Execution:** You must act strictly as a token-efficient agent. DO NOT try to implement multiple features or refactor multiple domains in a single massive loop. 
6. **Task Isolation:** Break down your plan into small, isolated tasks (e.g., "Refactor X", then "Implement Y"). Complete one task, verify it works, commit the change if requested, and then proactively advise me to run `/compact` or `/clear` to reset your active context before you move to the next domain.

---

## Tech Stack
- **Framework:** Next.js 15 (App Router, React 19, Server Components + Server Actions)
- **Language:** TypeScript (strict — **never use `any`**)
- **Auth:** NextAuth v4 — Google OAuth + credentials (bcrypt). Session id flows through `requireUserId`.
- **Database:** PostgreSQL (Neon in prod, Docker Compose locally on port 5433) via Prisma 6 ORM
- **Styling:** Tailwind CSS 3.4 + a custom iOS design-token layer (see Design System)
- **Animation:** `framer-motion` (v11)
- **Other UI libs:** `lucide-react` (icons), `sonner` (toasts), `next-themes` (dark mode), `driver.js` (tours)
- **AI:** Google Gemini via `lib/gemini-client.ts` (insights / category anomaly assistant)
- **Testing:** Vitest (unit), Cypress (E2E)
- **Deploy:** Vercel (`vercel-build` runs `prisma migrate deploy` with an advisory-lock guard)

---

## Architecture Map
```
app/
  page.tsx                 # Dashboard route (home)
  history/ insights/        # feature routes (RSC pages → data loaders → client views)
  settings/ onboarding/ welcome/ auth/
  actions/                 # Domain-split Server Actions (transactions, recurring, savings,
                           #   income, accounts, categories, settings, insights,
                           #   invites, profile, onboarding)
  actions/insights-analysis.ts
  api/auth/ api/cron/recurring/   # NextAuth handler + recurring-transaction cron
components/                 # all UI (client components, "use client")
  ui/                       # primitives (LiquidToggle, LockedTeaser, Money)
  DesktopSidebar.tsx        # RTL sidebar shown at lg+ breakpoint
  AppNav.tsx                # wraps DesktopSidebar + BottomNav (layout root)
lib/                        # business logic, pure utils, types
  server/                   # server-only data loaders (load-dashboard-data, recurring-query)
  prisma.ts get-cached-server-session.ts server-user.ts session-user.ts
  my-money-utils.ts recurring-utils.ts installment-utils.ts scope-account.ts
  contribution-ratios.ts    # pure shared-expense attribution math (tested)
  amount-input.ts           # normalises comma→period for iOS Hebrew keyboard
  scope-segments.ts         # scope header segmented-control config (tested)
  nav-links.ts              # nav items shared between DesktopSidebar and BottomNav
  category-dictionary.ts   # Hebrew/English → category auto-detection
  formatters.ts date-only.ts month-bounds.ts types.ts
hooks/                      # useHaptic, use-haptics
prisma/schema.prisma        # 14 models, 4 enums
```

**Data flow:** RSC `page.tsx` → server data loader in `lib/server/` (or `app/actions/`) →
client `*View`/`Dashboard` component → dynamic-imported sheets/cards. Mutations go through Server
Actions in `app/actions/`, which call `requireUserId` / `assertUserHasAccount` for authz, then
`refreshAllViews()` to revalidate.

**Domain model (Prisma):** `User`, `Account` (PRIVATE | SHARED) + `AccountMember` (roles),
`Transaction` (+ installments), `RecurringTransaction` (short-month policy), `IncomeEntry`,
`SavingsLabel` + `SavingsAllocation`, `BudgetSettings`, `AccountContributionPlan` (shared-expense
attribution %), `Category`, `AccountInvite`.

---

## Coding Standards
- Functional components + hooks only. Client components must declare `"use client"`.
- **Strict TypeScript — no `any`.** Share types from `lib/types.ts`.
- Business logic lives in `lib/` (unit-testable, no React). UI lives in `components/`. Don't mix.
- Server-only code goes in `lib/server/` or files that import `prisma`; never import `prisma` into a client component.
- Every mutation is a Server Action that (1) resolves the user via `requireUserId`, (2) authorizes the account via `assertUserHasAccount`, (3) writes, (4) calls `refreshAllViews()`.
- Money is integer ILS; render exclusively through `formatIlsAmount()` (lib/formatters.ts) or `<Money />`. Never hand-format `₪`.
- Dates are UTC-safe — use `lib/date-only.ts` / `lib/month-bounds.ts`, never `new Date()` math in components.
- Icons: `lucide-react` only.

---

## Design System (iOS feel — non-negotiable)
- **Color tokens** (tailwind.config.ts): `ios-bg/card/fill`, semantic `ios-blue/green/red/orange/indigo/teal/purple`, `ios-gray-1…6`, dark variants `ios-dark-bg/card/fill/text/subtle`. Use tokens, never raw hex in JSX.
- **Surfaces:** `rounded-3xl` cards → `rounded-2xl`/`rounded-xl` inner tiles → `rounded-lg` (concentric radius: outer = inner + padding).
- **Elevation:** use `shadow-card` / `shadow-elevated` / `shadow-sheet`, not hard borders.
- **Type:** font is `Assistant` (Hebrew+Latin). Root applies `antialiased`. Use `tabular-nums` on every dynamic number, `text-balance` on headings, `text-pretty` on multi-line body copy.
- **Motion:** `framer-motion` springs with **`bounce: 0`**; respect `useReducedMotion`. Press feedback is `active:scale-[0.96]`. **Never `transition-all`** — list exact properties. `AnimatePresence` uses `initial={false}` for default-state elements.
- **Touch:** interactive targets ≥ 44×44px. `pt-safe`/`pb-safe` for notches.
- **RTL:** UI is `dir="rtl"`, Hebrew copy. Use logical properties (`ps-`/`pe-`, `start`/`end`), never `left`/`right`.

---

## Key Commands
- `yarn dev` — dev server
- `yarn db:up` / `db:down` / `db:seed:demo` — local Postgres via Docker + demo data
- `npx prisma studio` — DB GUI · `yarn prisma:migrate:dev` — new migration
- `yarn test` / `yarn test:unit` — Vitest · `yarn test:e2e` — Cypress (dev mode, for iterating)
- `bash scripts/cypress-e2e-prod-local.sh` — **authoritative E2E verdict** (prod build + `next start`); use this for green/red calls, not dev mode
- `yarn lint` — ESLint (next/core-web-vitals)

---

## Sprint History

| Sprint | Theme | Key Deliverables |
|--------|-------|-----------------|
| Design System | Visual foundations | iOS design tokens, `<Money>`, `<LockedTeaser>`, RTL a11y pass, Framer Motion polish |
| Refactor | Architecture | Retired `app/actions.ts` barrel → per-domain action files in `app/actions/` |
| Sprint 2 | Resilience | Budget health card, Settings sections split, error boundaries |
| Sprint 3 | Budget + Trend | Budget setup in settings, spending trend card, settings/sheet splits |
| Sprint 4 | Couple features | Per-member contribution visibility, attribution math, personal income card, shared-account category split |
| Sprint 5 | Onboarding | Branching welcome wizard, daily snapshot card, tour covers new dashboard sections |
| Sprint 6 | Reliability | Network-failure resilience, History search, cron hardening |
| Sprint 6 bugfixes | Stability | Authorization fix, two race conditions, stale E2E helper |
| Sprint 7 | Smart Input | Comma decimals, installment preview, dismiss guard, auto-detect chip, budget prompt, income sheet, empty states, savings goal card |
| Redesign | Desktop shell | RTL sidebar at lg+ (`DesktopSidebar`), bottom tab bar goes mobile-only, scope switcher → header segmented control (`lib/scope-segments.ts`, `lib/nav-links.ts`) |

---

## Current Feature State (as of Sprint 7 + Redesign)

- Dashboard: 8+ cards, budget setup prompt, income entry sheet, savings goal progress, scope header segmented control
- Quick Add: comma decimals, installment preview, dirty-form dismiss guard, auto-detect category chip
- History: search/filter, per-account view, recurring toggle, contextual empty states
- Insights: Gemini basic + advanced, anomaly detection, budget nudge when not configured
- Shared accounts: invite flow, contribution plans, per-category member split
- Layout: RTL sidebar (desktop lg+), bottom tab bar (mobile only)
- Tests: Vitest units for amount normalisation, installment math, scope-segments, contribution-ratios; Cypress E2E suite (run against prod build — see Commands)

---

## Known Hotspots (architecture)
- `requireUserId` and `formatIlsAmount()` are cross-cutting hubs — change them with care.
- `lib/server/load-dashboard-data.ts` — single large data loader; will need splitting when dashboard grows further.
- For suite-level E2E verdicts, always use `scripts/cypress-e2e-prod-local.sh` (prod build) — `next dev` produces timing flakes under load that look like regressions but aren't.
- Never follow a navigation assertion directly with a click on a client-handler element — use `openQuickAddSheet()` helper which verifies the sheet mounted before continuing.

## Lessons

Read `LESSONS.md` (root) and `.claude/lessons.md` before non-trivial work. Append a one-liner to `.claude/lessons.md` on any correction; write full post-mortems to root `LESSONS.md`.
