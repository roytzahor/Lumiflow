# LumiFlow

Couple finance, simplified. A mobile-first budgeting app designed for partners to track shared and personal expenses together.

## Features

- **Dashboard** — Monthly savings ring, per-account spending cards, and an interactive pie chart breakdown by category
- **Quick Add** — Bottom-sheet transaction entry with category and account selection
- **History** — Browse past months with joint vs. private spending summaries
- **Settings** — Configure monthly income, budget split (needs / wants / savings), manage categories, and recurring transactions
- **Multi-Account** — Joint and individual accounts with separate tracking
- **Recurring Transactions** — Automatic monthly charges (standing orders)
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
npm install
```

### Environment Variables

Create a `.env` file in the project root:

```
DATABASE_URL="postgresql://user:password@localhost:5432/lumiflow"
```

### Database Setup

```bash
# Generate Prisma client and run migrations
npx prisma migrate dev
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production

```bash
npm run build
npm start
```

## Project Structure

```
app/
  layout.tsx          # Root layout (RTL, Assistant font, Sonner)
  page.tsx            # Dashboard page
  actions.ts          # Server actions (CRUD)
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
  schema.prisma       # Database schema
```

## License

Private project.
