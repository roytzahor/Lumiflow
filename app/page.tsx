import Dashboard from "@/components/Dashboard";
import DashboardLoadError from "@/components/DashboardLoadError";
import {
  getTransactions,
  getBudgetSettings,
  getCategories,
  getAccounts,
  getRecurringTransactions,
  getAccountContributionTotals,
} from "./actions";
import BottomNav from "@/components/BottomNav";
import { redirectToOnboardingIfNeeded } from "@/lib/onboarding";
import { buildRetentionSignals } from "@/lib/retention-signals";

export const dynamic = 'force-dynamic';

export default async function Home({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  await redirectToOnboardingIfNeeded();

  try {
    const params = searchParams ? await searchParams : {};
    if (process.env.NODE_ENV !== 'production' && params.dashboardFail === '1') {
      throw new Error('Simulated dashboard load failure');
    }

    const now = new Date();
    const [transactions, budgetSettings, categories, accounts, recurringTransactions, contributionTotals] = await Promise.all([
      getTransactions('All', now.getFullYear(), now.getMonth()),
      getBudgetSettings(),
      getCategories(),
      getAccounts(),
      getRecurringTransactions(),
      getAccountContributionTotals(),
    ]);
    const retentionSignals = buildRetentionSignals({ transactions, budgetSettings, now });

    return (
      <main className="min-h-screen bg-ios-bg dark:bg-ios-dark-bg transition-colors">
        <Dashboard
          initialTransactions={transactions}
          budgetSettings={budgetSettings}
          categories={categories}
          accounts={accounts}
          recurringTransactions={recurringTransactions}
          contributionTotals={contributionTotals}
          retentionSignals={retentionSignals}
        />
        <BottomNav />
      </main>
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown dashboard load error';
    return <DashboardLoadError message={message} />;
  }
}
