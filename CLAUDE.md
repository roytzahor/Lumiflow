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
  actions.ts               # ⚠ Legacy stubs only — real logic split into app/actions/*
  actions/                 # Domain-split Server Actions (transactions, recurring, savings,
                           #   income, accounts, categories, settings, insights,
                           #   invites, profile, onboarding)
  actions/insights-analysis.ts
  api/auth/ api/cron/recurring/   # NextAuth handler + recurring-transaction cron
components/                 # all UI (client components, "use client")
  ui/                       # primitives (LiquidToggle, LockedTeaser, Money)
lib/                        # business logic, pure utils, types
  server/                   # server-only data loaders (load-dashboard-data, recurring-query)
  prisma.ts get-cached-server-session.ts server-user.ts session-user.ts
  my-money-utils.ts recurring-utils.ts installment-utils.ts scope-account.ts
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
- `yarn test` / `yarn test:unit` — Vitest · `yarn test:e2e` — Cypress
- `yarn lint` — ESLint (next/core-web-vitals)

---

## Sprint History

| Sprint | Theme | Key Deliverables |
|--------|-------|-----------------|
| Design System | Visual foundations | iOS design tokens, `<Money>`, `<LockedTeaser>`, RTL a11y pass, Framer Motion polish |
| Refactor | Architecture | Split `app/actions.ts` god module into per-domain action files |
| Sprint 2 | Resilience | Budget health card, Settings sections split, error boundaries |
| Sprint 3 | Budget + Trend | Budget setup in settings, spending trend card, settings/sheet splits |
| Sprint 4 | Couple features | Per-member contribution visibility, attribution math, personal income card, shared-account category split |
| Sprint 5 | Onboarding | Branching welcome wizard, daily snapshot card, tour covers new dashboard sections |
| Sprint 6 | Reliability | Network-failure resilience, History search, cron hardening |
| Sprint 6 bugfixes | Stability | Authorization fix, two race conditions, stale E2E helper |

---

## Current Feature State (as of Sprint 6)

### Working well
- Dashboard with 8+ contextual cards, all collapsible, state persisted per user
- Quick Add with recurring, installments, category auto-detection, inline category creation
- History with search, per-account filter, recurring toggle
- Insights with Gemini basic + advanced analysis, anomaly detection, assistant chat
- Shared accounts — invite flow, contribution plans, per-category member split
- Savings allocations with labels (separate from expense tracking)
- Budget 50/30/20 setup in Settings
- Google OAuth + credentials auth, welcome step, spotlight tour
- Dark mode, RTL, haptic feedback, `useReducedMotion` support

### Known UX pain points (input for Sprint 7)
- **Budget not set = broken dashboard** — users who skip budget setup see empty/misleading cards with no clear prompt to fix this
- **Income entry is buried** — monthly income is a field in Settings → Budget, not surfaced on dashboard; new users don't know it exists
- **Amount input friction** — Hebrew keyboard on iOS outputs `,` not `.` for decimals; the field rejects it silently
- **No confirmation of what was saved** — after Quick Add closes, there's no visual anchor showing the new transaction
- **Installment total not previewed** — user types "5 payments" but doesn't see "5 × ₪200 = ₪1,000 total" until they go to History
- **Stale category auto-detect** — the detection highlights no feedback that a category was auto-suggested (vs. user-chosen)
- **Accidental dismiss on Quick Add** — swipe-to-dismiss loses all form state with no warning
- **Empty states are generic** — History with no transactions shows nothing; Insights with no budget shows nothing actionable
- **Savings labels only visible in sheet** — there's no browsable list of savings labels or their totals in settings

---

## Sprint 7 Plan — Smart Input & Financial Clarity

**Theme:** Make data entry forgiving and fast; make the financial picture understandable to users who are not finance experts.

### S7-1 · Amount input accepts comma as decimal separator
**Why:** iOS Hebrew keyboard outputs `,` not `.`; the input silently rejects it, causing user confusion.  
**What:** In `QuickAddSheet`, normalise the amount string before parsing — replace `,` with `.`. Add a Vitest unit test.  
**Scope:** `components/QuickAddSheet.tsx`, `lib/installment-utils.ts` (used for the preview calc).

### S7-2 · Installment total preview
**Why:** Users don't know how much they're committing to until they see the History feed.  
**What:** When `installmentCount > 1`, show a summary line below the count picker: `"5 תשלומים × ₪200 = ₪1,000 סה״כ"`. Use `splitInstallmentAmounts()` from `lib/installment-utils.ts` for exact math.  
**Scope:** `components/QuickAddSheet.tsx`.

### S7-3 · Swipe-to-dismiss guard (confirm before closing dirty form)
**Why:** Accidental swipe loses all Quick Add state with no recovery.  
**What:** If the form is dirty (amount or description filled), replace direct swipe-dismiss with a confirmation prompt (native `confirm` or an inline "לסגור?" mini-banner). Clean forms dismiss normally.  
**Scope:** `components/QuickAddSheet.tsx` — add a `isDirty` computed flag; intercept the `PanInfo` drag-end handler.

### S7-4 · Category auto-suggestion visual indicator
**Why:** Users can't tell if the category was auto-detected or is a default, which erodes trust.  
**What:** When `detectAllCategoryMatches()` fires and sets a category, show a small `"זוהה אוטומטית"` chip next to the category name (dismissable, disappears on manual category change).  
**Scope:** `components/QuickAddSheet.tsx`, `components/CategoryPickerSection.tsx`.

### S7-5 · Budget setup prompt card on dashboard
**Why:** `monthlyIncome === 0` makes BudgetHealthCard, DailySnapshotCard, and SavingsAllocationCard return `null`, leaving a confusing blank dashboard.  
**What:** When budget is not set, render a prominent CTA card: `"הגדרת תקציב חודשי תפתח את כל כרטיסי הדשבורד"` with a button linking to `/settings?section=budget`. Hide only when budget is configured.  
**Scope:** `components/Dashboard.tsx`, new `components/BudgetSetupPromptCard.tsx`.

### S7-6 · Income entry surfaced on dashboard
**Why:** The `IncomeEntry` model exists but the only way to log income is via Settings, which new users never discover.  
**What:** Add a subtle `"+ הכנסה"` action button to `PersonalIncomeSummaryCard` (visible when the card is expanded). Tapping it opens a minimal income entry sheet.  
**Scope:** New `components/IncomeEntrySheet.tsx`, `components/PersonalIncomeSummaryCard.tsx`.

### S7-7 · Transaction saved confirmation animation
**Why:** After Quick Add closes, there's no visual feedback confirming the transaction was recorded.  
**What:** After a successful save, trigger a haptic feedback and briefly animate the first transaction row as it appears in the feed (scale-in from 0.9 + fade-in, 300 ms). Use existing `AnimatePresence` in `TransactionFeed`.  
**Scope:** `components/TransactionFeed.tsx` (add `layoutId` / entrance animation), `components/QuickAddSheet.tsx` (pass new-transaction id back via router state or callback).

### S7-8 · History empty state with CTA
**Why:** Empty history is a blank white space — it's unclear whether there's no data, a load error, or a filter applied.  
**What:** Show a contextual empty state: if a search filter is active → `"אין תוצאות לחיפוש"` + clear button. If the month has no transactions → `"לא הוגדרו הוצאות החודש"` + Quick Add button.  
**Scope:** `components/HistoryView.tsx` (or `TransactionFeed.tsx`).

### S7-9 · Insights empty state with budget nudge
**Why:** Users without a budget see blank Insights with no indication of what to do.  
**What:** When `monthlyIncome === 0` in the Insights loader, replace the body with a `"הגדר תקציב כדי לקבל תובנות מותאמות אישית"` card + link to Settings.  
**Scope:** `app/insights/insights-data-section.tsx`.

### S7-10 · Savings goal progress card
**Why:** `BudgetSettings.savingsGoalAmount` is stored but never visualised.  
**What:** When `savingsGoalAmount > 0` and a `savingsGoal` name is set, render a progress bar in `SavingsAllocationCard` showing total-allocated-this-month / goal-amount with a `"X% מהיעד החודשי"` label.  
**Scope:** `components/SavingsAllocationCard.tsx`, `lib/server/load-dashboard-data.ts` (pass goal fields through).

### Testing targets for Sprint 7
- Vitest unit: amount normalisation (comma→period), installment preview math, dirty-form detection logic
- Cypress E2E: Quick Add with comma amount, installment preview display, budget prompt card visibility toggle, History empty state search clear

---

## Known Hotspots (architecture)
- `app/actions.ts` (~legacy stubs) — domain actions are now in `app/actions/`; the root file should eventually be deleted.
- `requireUserId` (68 call sites) and `formatIlsAmount()` (17 call sites) are cross-cutting hubs — change them with care.
- `lib/server/load-dashboard-data.ts` — single large data loader; will need splitting when dashboard adds more card types.
- Test coverage is thin (6 unit specs, 9 E2E) relative to the domain surface. Sprint 7 adds tests in parallel with new features.
