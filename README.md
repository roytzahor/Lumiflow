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
DATABASE_URL="postgresql://user:password@localhost:5432/lumiflow"
NEXTAUTH_SECRET="<random-long-secret>"
NEXTAUTH_URL="http://localhost:3000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
CRON_SECRET="<optional-secret-for-cron-endpoint>"
```

### Database Setup

```bash
# Generate Prisma client and run migrations
yarn prisma migrate dev
```

### Development

```bash
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production

```bash
yarn build
yarn start
```

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
