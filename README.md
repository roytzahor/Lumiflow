# LumiFlow

Flexible budgeting for individuals and groups. A mobile-first app for tracking private and shared accounts with recurring expenses.

## Features

- **Dashboard** — Monthly savings ring, per-account spending cards, and an interactive pie chart breakdown by category
- **Quick Add** — Bottom-sheet transaction entry with category and account selection
- **History** — Browse any month with actual and projected recurring transactions
- **Settings** — Manage accounts, budget settings, categories, recurring transactions, and invite links
- **Multi-Account** — Any number of private or shared accounts
- **Recurring Transactions** — Monthly automation with short-month policy (`roll to last day` or `skip month`)
- **Auth** — Email/password sign-in with protected app routes
- **RTL / Hebrew** — Fully right-to-left interface with Hebrew locale

## Tech Stack

| Layer | Tech |
|-------|------|
| Framework | [Next.js 15](https://nextjs.org/) (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Animations | Framer Motion |
| Database | PostgreSQL via [Prisma](https://www.prisma.io/) |
| UI | Custom iOS-style components, Lucide icons, Sonner toasts |

## Getting Started

### Prerequisites

- Node.js 18+
- A PostgreSQL database

### סביבה מהירה — לוקאלי ו-Vercel

**לוקאלי (מומלץ עם Docker):**

```bash
yarn install
cp .env.example .env
# ערכו ב-.env את NEXTAUTH_SECRET (למשל: openssl rand -base64 32)

yarn db:up              # Postgres על פורט 5433
yarn db:bootstrap       # Prisma client + כל המיגרציות (ללא אינטראקציה)
yarn dev                # http://localhost:3000
```

לפיתוח עם מיגרציות חדשות (יצירת קבצי migration): `yarn prisma:migrate:dev`.

**Vercel (פרוד / Preview):**

1. חברו את הריפו ב-Vercel ובחרו Framework Preset: Next.js.
2. ב-Project → Settings → Environment Variables הוסיפו לפחות (לכל סביבה שצריך: Production, Preview, Development):

   | משתנה | הערות |
   |--------|--------|
   | `DATABASE_URL` | Neon pooled (או Postgres אחר) |
   | `DIRECT_URL` | Neon direct — חובה למיגרציות ב-Neon |
   | `NEXTAUTH_SECRET` | אותו סוד בכל הסביבות או נפרד לכל אחת |
   | `NEXTAUTH_URL` | בפרוד: `https://<הדומיין-שלכם>` ; ב-Preview לרוב כדאי להגדיר את כתובת ה-Preview או להשתמש ב-[Vercel `NEXTAUTH_URL` dynamic](https://next-auth.js.org/deployment#vercel) — לפחות בפרוד חייב להתאים ל-URL האמיתי |
   | `NEXT_PUBLIC_APP_URL` | כמו `NEXTAUTH_URL` — משפיע על קישורי הזמנה לחשבון משותף |

3. כל deploy מריץ `yarn vercel-build` (מיגרציות + build). ודאו ש-`DATABASE_URL` / `DIRECT_URL` זמינים בזמן הבנייה.

**לבדוק מקומית מול אותו DB כמו ב-Vercel (אופציונלי):**

```bash
npx vercel login
npx vercel link
npx vercel env pull .env.local
# .env.local דורס ערכים מ-.env — הריצו yarn dev ותתחברו ל-Preview/Prod DB
```

זהירות: אל תבצעו `migrate dev` מקומית מול בסיס פרודקשן.

### Installation

```bash
# Clone the repo
git clone <repo-url>
cd Lumiflow

# Install dependencies
yarn install
```

### Environment Variables

Create a `.env` file in the project root:

```
DATABASE_URL="postgresql://lumiflow:lumiflow@localhost:5433/lumiflow?schema=public"
DIRECT_URL="postgresql://lumiflow:lumiflow@localhost:5433/lumiflow?schema=public"
NEXTAUTH_SECRET="<random-long-secret>"
AUTH_SECRET=""
NEXTAUTH_URL="http://localhost:3000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
CRON_SECRET="<optional-secret-for-cron-endpoint>"
```

You can bootstrap from:

```bash
cp .env.example .env
```

### Database Setup

Option A (recommended): local PostgreSQL via Docker

```bash
# Start local Postgres
yarn db:up

# Generate Prisma client + run local migrations
yarn prisma:generate
yarn prisma:migrate:dev
```

If you already run PostgreSQL locally on `5432` (e.g. Homebrew), this project intentionally uses Docker on `5433` to avoid port conflicts.

Option B: use an existing hosted PostgreSQL database and set `DATABASE_URL` accordingly.

### Neon Setup (Vercel-friendly)

If you choose Neon now (and keep the option to switch later), use Prisma's two-URL setup:

- `DATABASE_URL`: pooled Neon connection string (recommended for app runtime)
- `DIRECT_URL`: direct/non-pooled Neon connection string (recommended for migrations)

In Neon dashboard:

1. Create a project and database.
2. Copy both connection strings from **Connection Details**.
3. Set them in `.env` locally and in Vercel env vars per environment (`Development`, `Preview`, `Production`).

Then run:

```bash
yarn prisma:generate
yarn prisma:migrate:dev
```

For production/CI deploys:

```bash
yarn prisma:migrate:deploy
```

### Development

```bash
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Tests

```bash
# Unit tests
yarn test:unit

# E2E tests (requires app running)
yarn test:e2e
```

### Production

```bash
yarn build
yarn start
```

`yarn build` runs `prisma generate` before `next build` (important for Vercel cached installs).

On Vercel, `vercel.json` uses `yarn vercel-build`, which runs `prisma migrate deploy` then `prisma generate` then `next build`, so the database schema stays in sync on each deployment.

## Vercel Environments (Local + Preview + Prod)

Use a separate `DATABASE_URL` per environment:

- `Development` -> local or dedicated dev DB
- `Preview` -> preview/staging DB
- `Production` -> production DB

In Vercel Project Settings -> Environment Variables, set at least:

- `DATABASE_URL`
- `NEXTAUTH_SECRET` (or `AUTH_SECRET`)
- `NEXTAUTH_URL`
- `NEXT_PUBLIC_APP_URL`
- `CRON_SECRET` (if using cron route protection)
- `GEMINI_API_KEY` (if using AI insights)

Run schema changes safely:

- Local development: `yarn prisma:migrate:dev`
- Deployment/production: `yarn prisma:migrate:deploy`

## Deployment Checklist (Vercel)

Before merging to `main`:

1. Run locally:
   - `yarn prisma:generate`
   - `yarn test`
   - `yarn build`
2. If Prisma schema changed, ensure migration files were added under `prisma/migrations`.
3. Confirm `.env.example` includes any newly required variables.

In Vercel project settings:

1. Set environment variables for `Development`, `Preview`, and `Production`.
2. Use separate database URLs for each environment.
3. Ensure `DATABASE_URL` points to PostgreSQL (Neon/Supabase/etc.).

After deploy:

1. Verify auth flow (sign in/sign up).
2. Verify dashboard and settings load data.
3. Verify key mutations (create transaction, update settings, invite flow).

## Project Structure

```
app/
  layout.tsx          # Root layout (RTL, Assistant font, Sonner)
  auth/               # Sign-in / sign-up pages
  api/auth/           # Auth endpoints
  page.tsx            # Dashboard page
  actions.ts          # Auth-scoped server actions
  history/            # History page
  settings/           # Settings page
components/
  Dashboard.tsx       # Main dashboard with savings ring & charts
  QuickAddSheet.tsx   # Bottom-sheet for adding/editing transactions
  TransactionFeed.tsx # Grouped transaction list
  HistoryView.tsx     # Monthly history view
  PieChart.tsx        # Spending breakdown chart
  MonthSelector.tsx   # Month navigation
  BottomNav.tsx       # Tab bar navigation
prisma/
  schema.prisma       # Users, accounts, memberships, recurring, invites
```

## License

Private project.
