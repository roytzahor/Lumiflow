# LumiFlow — Couple Finance, Simplified

LumiFlow is a Hebrew-first (RTL), mobile-web personal & couple finance app. It automates monthly
tracking, attribution of shared expenses between partners, recurring/installment handling, savings
allocation, and AI-assisted insights. The product target is an **iOS-native-feeling PWA** — every
surface should read like a polished native iOS screen, not a generic web dashboard.

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

## Architecture Map
```
app/
  page.tsx                 # Dashboard route (home)
  history/ insights/        # feature routes (RSC pages → data loaders → client views)
  settings/ onboarding/ welcome/ auth/
  actions.ts               # ⚠ 2,500-line server-action god module (split candidate)
  actions/insights-analysis.ts
  api/auth/ api/cron/recurring/   # NextAuth handler + recurring-transaction cron
components/                 # all UI (client components, "use client")
  ui/                       # primitives (LiquidToggle, ...)
lib/                        # business logic, pure utils, types
  server/                   # server-only data loaders (load-dashboard-data, recurring-query)
  prisma.ts get-cached-server-session.ts server-user.ts session-user.ts
  my-money-utils.ts recurring-utils.ts installment-utils.ts scope-account.ts
  formatters.ts date-only.ts month-bounds.ts types.ts
hooks/                      # useHaptic, use-haptics
prisma/schema.prisma        # 14 models, 4 enums
```

**Data flow:** RSC `page.tsx` → server data loader in `lib/server/` (or `app/actions.ts`) →
client `*View`/`Dashboard` component → dynamic-imported sheets/cards. Mutations go through Server
Actions in `app/actions.ts`, which call `requireUserId` / `assertUserHasAccount` for authz, then
`refreshAllViews()` to revalidate.

**Domain model (Prisma):** `User`, `Account` (PRIVATE | SHARED) + `AccountMember` (roles),
`Transaction` (+ installments), `RecurringTransaction` (short-month policy), `IncomeEntry`,
`SavingsLabel` + `SavingsAllocation`, `BudgetSettings`, `AccountContributionPlan` (shared-expense
attribution %), `Category`, `AccountInvite`.

## Coding Standards
- Functional components + hooks only. Client components must declare `"use client"`.
- **Strict TypeScript — no `any`.** Share types from `lib/types.ts`.
- Business logic lives in `lib/` (unit-testable, no React). UI lives in `components/`. Don't mix.
- Server-only code goes in `lib/server/` or files that import `prisma`; never import `prisma` into a client component.
- Every mutation is a Server Action that (1) resolves the user via `requireUserId`, (2) authorizes the account via `assertUserHasAccount`, (3) writes, (4) calls `refreshAllViews()`.
- Money is integer ILS; render exclusively through `formatIlsAmount()` (lib/formatters.ts). Never hand-format `₪`.
- Dates are UTC-safe — use `lib/date-only.ts` / `lib/month-bounds.ts`, never `new Date()` math in components.
- Icons: `lucide-react` only.

## Design System (iOS feel — non-negotiable)
- **Color tokens** (tailwind.config.ts): `ios-bg/card/fill`, semantic `ios-blue/green/red/orange/indigo/teal/purple`, `ios-gray-1…6`, dark variants `ios-dark-bg/card/fill/text/subtle`. Use tokens, never raw hex in JSX.
- **Surfaces:** `rounded-3xl` cards → `rounded-2xl`/`rounded-xl` inner tiles → `rounded-lg` (concentric radius: outer = inner + padding).
- **Elevation:** use `shadow-card` / `shadow-elevated` / `shadow-sheet`, not hard borders.
- **Type:** font is `Assistant` (Hebrew+Latin). Root applies `antialiased`. Use `tabular-nums` on every dynamic number, `text-balance` on headings, `text-pretty` on multi-line body copy.
- **Motion:** `framer-motion` springs with **`bounce: 0`**; respect `useReducedMotion`. Press feedback is `active:scale-[0.96]`. **Never `transition-all`** — list exact properties. `AnimatePresence` uses `initial={false}` for default-state elements.
- **Touch:** interactive targets ≥ 44×44px. `pt-safe`/`pb-safe` for notches.
- **RTL:** UI is `dir="rtl"`, Hebrew copy. Use logical properties (`ps-`/`pe-`, `start`/`end`), never `left`/`right`.

## Key Commands
- `yarn dev` — dev server
- `yarn db:up` / `db:down` / `db:seed:demo` — local Postgres via Docker + demo data
- `npx prisma studio` — DB GUI · `yarn prisma:migrate:dev` — new migration
- `yarn test` / `yarn test:unit` — Vitest · `yarn test:e2e` — Cypress
- `yarn lint` — ESLint (next/core-web-vitals)

## Known Hotspots (from dependency-graph analysis)
- `app/actions.ts` (~2,560 lines) and the "Server Actions & Insights" / "Account & History UI" modules have **very low cohesion (~0.05)** — grab-bag modules, prime refactor targets.
- `requireUserId` (68 edges) and `formatIlsAmount()` (17 edges) are cross-cutting hubs — change them with care.
- Many one-off `scripts/*.js` (seed/check/debug) clutter the root; several are redundant.
- Test coverage is thin (6 unit specs, 9 E2E) relative to the domain surface.
