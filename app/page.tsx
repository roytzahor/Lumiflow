import Dashboard from "@/components/Dashboard";
import DashboardLoadError from "@/components/DashboardLoadError";
import {
  getTransactions,
  getCategories,
  getAccounts,
  getRecurringTransactions,
  getAccountContributionTotals,
  getCurrentUserProfile,
  getMonthlyIncomeEntries,
  getMyContributionRatios,
} from "./actions";
import BottomNav from "@/components/BottomNav";
import { redirectToOnboardingIfNeeded } from "@/lib/onboarding";

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
    const parsedYear = params.year ? parseInt(params.year as string, 10) : now.getFullYear();
    const parsedMonth = params.month ? parseInt(params.month as string, 10) : now.getMonth();
    const year = Number.isFinite(parsedYear) && parsedYear >= 2020 && parsedYear <= 2100 ? parsedYear : now.getFullYear();
    const month = Number.isFinite(parsedMonth) && parsedMonth >= 0 && parsedMonth <= 11 ? parsedMonth : now.getMonth();
    const selectedMonthIso = new Date(Date.UTC(year, month, 1)).toISOString();

    const [transactions, categories, accounts, recurringTransactions, contributionTotals, currentUser, monthlyIncomeEntries, myContributionRatios] = await Promise.all([
      getTransactions('All', year, month),
      getCategories(),
      getAccounts(),
      getRecurringTransactions(),
      getAccountContributionTotals(),
      getCurrentUserProfile(),
      getMonthlyIncomeEntries(year, month),
      getMyContributionRatios(),
    ]);
    return (
      <main className="min-h-screen bg-ios-bg dark:bg-ios-dark-bg transition-colors">
        <Dashboard
          initialTransactions={transactions}
          nowIso={now.toISOString()}
          selectedMonthIso={selectedMonthIso}
          categories={categories}
          accounts={accounts}
          recurringTransactions={recurringTransactions}
          contributionTotals={contributionTotals}
          monthlyIncomeEntries={monthlyIncomeEntries}
          myContributionRatios={myContributionRatios}
          viewerName={currentUser?.name ?? null}
          initialRecurringSectionExpanded={currentUser?.dashboardRecurringSectionExpanded ?? true}
        />
        <BottomNav />
      </main>
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown dashboard load error';
    return <DashboardLoadError message={message} />;
  }
}
