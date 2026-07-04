# LumiFlow — ניהול כספים לזוגות, בצורה חכמה

LumiFlow is a **Hebrew-first (RTL) PWA** for couples and individuals to track, understand, and act on their finances — private accounts, shared household expenses, recurring bills, savings allocations, and AI-powered spending insights. The product feels like a native iOS app, not a web dashboard.

---

## Features

### Dashboard
The home screen updates every month automatically and shows:
- **Savings ring** — how much of the monthly income target has been saved so far
- **Per-account spending cards** — expandable tiles for each private and shared account
- **Budget health bar** — real-time progress toward the spending budget (needs + wants %)
- **Daily snapshot** — a contextual alert or nudge based on today's pace vs. budget
- **Spending trend** — this month vs. last month, at a glance
- **Recurring expenses panel** — collapsible list of all active recurring transactions and their next run dates
- **Savings allocation panel** — money moved to savings/investments this month, by label (pension, emergency fund, etc.)
- **Shared split card** (shared accounts only) — per-category breakdown of who spent what
- **Personal income summary** — net income minus contributions, shows discretionary headroom
- **Spending pie chart** — category breakdown, filterable by account

### Quick Add
Bottom-sheet transaction entry, accessible from every screen via the `+` button:
- Amount, description, date, category, account
- **Recurring toggle** — promotes a one-off into a `RecurringTransaction` with configurable day-of-month and short-month policy (`roll to last day` / `skip month`)
- **Installment mode** — splits one purchase into N monthly transactions; shows per-installment preview amount
- **Category auto-detection** — matches the description against a built-in Hebrew/English dictionary and suggests a category
- **Inline category creation** — add a custom category with emoji + name without leaving the sheet
- **Edit & delete** — opening the sheet with an existing transaction enables editing or deletion (with confirm dialog)

### History
- Full month-by-month transaction list with per-account and all-accounts views
- **Live search** — filter transactions by description or category name
- Toggle to show/hide projected recurring transactions alongside actuals
- Savings allocations shown inline in the feed
- Month navigation with swipe-friendly selectors

### Insights (AI)
- **Basic analysis** — monthly category totals and top overspend areas
- **Advanced analysis** — Google Gemini-powered narrative summary of the month's financial story
- **Anomaly detection** — flags categories that spiked vs. the 3-month average
- **Assistant chat** — ask free-form questions about your spending ("למה הוצאתי יותר החודש?")

### Settings
Collapsible sections — each persists its open/closed state per user:
- **Profile** — display name, theme (light/dark/system), avatar
- **Appearance** — theme toggle
- **Accounts** — create / rename / archive private and shared accounts; manage shared-account members; generate invite links
- **Budget** — 50/30/20 budget split, monthly income, savings goal + target amount
- **Categories** — view system categories, add custom categories with emoji
- **Recurring transactions** — list, edit, pause/resume, delete recurring transactions

### Multi-Account & Couples
- Any number of **PRIVATE** or **SHARED** accounts per user
- Shared accounts support multiple members via **invite links** (token-based, expiring)
- Per-member **contribution plans** define each partner's monthly share
- Expense attribution (`paidByUserId`, `attributedToUserId`) tracks who paid and who it's for
- The "My Money" view on the dashboard filters to the viewer's attributable transactions only

### Savings Allocations
- Separate model from `Transaction` — savings moves are not counted as expenses
- Labels: pension, emergency fund, investments, or custom user-defined labels
- **Standing-order flag** — marks recurring transfers to investments

### Auth
- Email + password sign-up (`bcrypt`)
- Google OAuth (optional — requires `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`)
- Protected routes via NextAuth v4 middleware
- **Welcome step** — post-sign-up screen to set display name and theme; a default private account is created automatically
- **Spotlight tour** — dismissible first-visit walkthrough (month selector, Quick Add, Settings)
- Pending invite gate — users who land on an invite link complete account creation before joining

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Framework | Next.js 15 (App Router, React 19, Server Components + Server Actions) |
| Language | TypeScript (strict — no `any`) |
| Styling | Tailwind CSS 3.4 + custom iOS design-token layer |
| Animation | Framer Motion v11 |
| Database | PostgreSQL via Prisma 6 ORM (Neon in prod, Docker locally on port 5433) |
| Auth | NextAuth v4 — Google OAuth + credentials |
| AI | Google Gemini (`lib/gemini-client.ts`) — insights & anomaly analysis |
| Icons | lucide-react |
| Toasts | sonner |
| Dark mode | next-themes |
| Tour | driver.js |
| Testing | Vitest (unit) · Cypress (E2E) |
| Deploy | Vercel — `vercel-build` runs `prisma migrate deploy` with advisory-lock guard |

---

## Architecture

```
app/
  page.tsx                        # Dashboard route
  history/                        # History route (RSC + HistoryView)
  insights/                       # Insights route (RSC + Gemini data section)
  settings/                       # Settings route (collapsible sections)
  welcome/                        # Post-sign-up welcome step
  auth/signin/ auth/signup/       # Auth pages
  actions/                        # Server Actions split by domain:
    transactions.ts  recurring.ts  savings.ts  income.ts
    accounts.ts  categories.ts  settings.ts  insights.ts
    invites.ts  profile.ts  onboarding.ts
  actions.ts                      # ⚠ Legacy god module (~legacy stubs) — still being split
  api/auth/                       # NextAuth route handler
  api/cron/recurring/             # Cron endpoint — materialises recurring transactions

components/
  Dashboard.tsx                   # Main dashboard orchestrator
  QuickAddSheet.tsx               # Bottom-sheet transaction entry
  TransactionFeed.tsx             # Grouped transaction list
  HistoryView.tsx                 # History page client
  HistoryControlsCard.tsx         # Account filter + search + recurring toggle
  PieChart.tsx                    # Spending category pie
  MonthSelector.tsx               # Month navigation
  BottomNav.tsx                   # Tab bar (Dashboard / History / Insights / Settings)
  BudgetHealthCard.tsx            # Budget progress bar
  DailySnapshotCard.tsx           # Daily alert + nudge
  SpendingTrendCard.tsx           # Month-over-month delta
  SharedSplitCard.tsx             # Per-category member split (shared accounts)
  PersonalIncomeSummaryCard.tsx   # Net income → discretionary headroom
  SavingsAllocationCard.tsx       # Savings panel (collapsible)
  SavingsAllocationSheet.tsx      # Add/edit savings allocation
  RecurringEditSheet.tsx          # Edit recurring transactions
  AccountInfoSheet.tsx            # Account details + member management
  AccountShareSheet.tsx           # Invite link generation
  ProfileEditSheet.tsx            # Profile name / theme edit
  WelcomeTour.tsx                 # First-visit spotlight tour (driver.js)
  settings/                       # Settings sub-sections (Profile, Budget, Categories, Appearance)
  ui/
    LiquidToggle.tsx              # Animated toggle (recurring / private-vs-shared)
    LockedTeaser.tsx              # Premium feature lock overlay
    Money.tsx                     # ₪ formatter component (always tabular-nums)

lib/
  server/                         # Server-only data loaders
    load-dashboard-data.ts
    recurring-query.ts
  types.ts                        # Shared TS types across client + server
  my-money-utils.ts               # Attribution maths (computeMyMoneyBreakdown)
  recurring-utils.ts              # Recurring date logic
  installment-utils.ts            # Installment split maths
  scope-account.ts                # Account scope URL param helpers
  formatters.ts                   # formatIlsAmount, formatUtcMonthYear, etc.
  date-only.ts                    # UTC-safe date helpers
  month-bounds.ts                 # Month start/end bounds
  category-dictionary.ts          # Hebrew/English → category auto-detection
  gemini-client.ts                # Gemini API wrapper
  prisma.ts                       # Prisma singleton
  server-user.ts                  # requireUserId, assertUserHasAccount, ensureUserBootstrap
  get-cached-server-session.ts    # Cached getServerSession wrapper

hooks/
  useHaptic.ts / use-haptics.ts   # Haptic feedback (navigator.vibrate)

prisma/schema.prisma              # 14 models, 4 enums (see Domain Model below)
```

### Domain Model

| Model | Purpose |
|-------|---------|
| `User` | Auth identity; stores theme + dashboard/settings collapsed-state booleans |
| `Account` | `PRIVATE` or `SHARED`; has income, balance, color, icon |
| `AccountMember` | Many-to-many User↔Account with `OWNER`/`MEMBER` role |
| `Transaction` | One expense; links to account, optional paidBy/attributedTo users, optional recurring parent, optional installment group |
| `RecurringTransaction` | Blueprint for monthly auto-materialised expenses; `nextRun`, `dayOfMonth`, `monthPolicy` |
| `IncomeEntry` | One-off or monthly income records per account |
| `SavingsLabel` | User-defined savings buckets (pension, emergency fund, etc.) |
| `SavingsAllocation` | Money moved to savings — excluded from expense totals |
| `BudgetSettings` | 50/30/20 split + monthly income target + optional savings goal |
| `AccountContributionPlan` | Partner A pays X% of shared expenses per month |
| `Category` | System + user-custom; `name`, `icon`, `type` (need/want/saving) |
| `AccountInvite` | Token-based invite link with expiry and accept tracking |

---

## Getting Started

### Prerequisites
- Node.js 18+
- Docker (for local Postgres) OR a hosted PostgreSQL (Neon, Supabase, etc.)

### Quick start — local with Docker

```bash
git clone <repo-url>
cd Lumiflow
yarn install
cp .env.example .env
# Edit .env: set NEXTAUTH_SECRET (e.g. openssl rand -base64 32)

yarn db:up          # Start Postgres on port 5433
yarn db:bootstrap   # Prisma client + all migrations (non-interactive)
yarn dev            # http://localhost:3000
```

For new migrations during development: `yarn prisma:migrate:dev`

### Environment Variables

```bash
DATABASE_URL="postgresql://lumiflow:lumiflow@localhost:5433/lumiflow?schema=public"
DIRECT_URL="postgresql://lumiflow:lumiflow@localhost:5433/lumiflow?schema=public"
NEXTAUTH_SECRET="<random-long-secret>"         # openssl rand -base64 32
NEXTAUTH_URL="http://localhost:3000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
CRON_SECRET="<optional-secret>"                # Protects /api/cron/recurring
GEMINI_API_KEY="<your-gemini-key>"             # Required for AI Insights
# Optional Google OAuth:
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
```

### Vercel deployment

1. Connect the repo in Vercel; set Framework Preset to **Next.js**.
2. Add environment variables for Production / Preview / Development:
   - `DATABASE_URL` — Neon pooled connection string
   - `DIRECT_URL` — Neon direct connection string (required for migrations on Neon)
   - `NEXTAUTH_SECRET`
   - `NEXTAUTH_URL` — must match the actual deployed URL in production
   - `NEXT_PUBLIC_APP_URL`
   - `GEMINI_API_KEY`
   - `CRON_SECRET`
3. Every deploy runs `yarn vercel-build` → `prisma migrate deploy` → `next build`.

To pull Vercel env vars locally for testing against the preview DB:
```bash
npx vercel login && npx vercel link && npx vercel env pull .env.local
```

### Key Dev Commands

```bash
yarn dev                    # Dev server (http://localhost:3000)
yarn db:up / db:down        # Start / stop local Postgres (Docker)
yarn db:seed:demo           # Load demo data
npx prisma studio           # DB GUI
yarn prisma:migrate:dev     # Create a new migration
yarn test:unit              # Vitest unit tests
yarn test:e2e               # Cypress E2E (requires running app)
yarn lint                   # ESLint
yarn build                  # Production build
```

### Deployment checklist

Before merging to `main`:
1. `yarn prisma:generate && yarn test && yarn build` all pass locally
2. Any Prisma schema changes have a migration file under `prisma/migrations/`
3. `.env.example` includes any new required variables
4. Vercel environment variables are set for all three environments

---

## Design Principles

- **iOS feel, non-negotiable** — concentric border-radius (`rounded-3xl` → `rounded-2xl` → `rounded-xl`), spring animations with `bounce: 0`, `shadow-card`/`shadow-sheet` elevation, ≥44×44px touch targets
- **Hebrew-first RTL** — all copy in Hebrew, `dir="rtl"`, logical CSS properties (`ps-`/`pe-`, `start`/`end`)
- **Color tokens only** — never raw hex in JSX; use `ios-bg`, `ios-card`, `ios-blue`, `ios-green`, etc. from `tailwind.config.ts`
- **Money rendering** — always via `<Money />` component or `formatIlsAmount()`, always `tabular-nums`
- **Reduced motion** — all animations respect `useReducedMotion()`
- **No `any`** — strict TypeScript throughout; shared types in `lib/types.ts`

---

## License

Private project.
