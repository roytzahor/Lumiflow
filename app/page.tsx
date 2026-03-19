import Dashboard from "@/components/Dashboard";
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

export const dynamic = 'force-dynamic';

export default async function Home() {
    await redirectToOnboardingIfNeeded();
    const now = new Date();
    const [transactions, budgetSettings, categories, accounts, recurringTransactions, contributionTotals] = await Promise.all([
        getTransactions('All', now.getFullYear(), now.getMonth()),
        getBudgetSettings(),
        getCategories(),
        getAccounts(),
        getRecurringTransactions(),
        getAccountContributionTotals(),
    ]);

    return (
        <main className="min-h-screen bg-ios-bg dark:bg-ios-dark-bg transition-colors">
            <Dashboard
                initialTransactions={transactions}
                budgetSettings={budgetSettings}
                categories={categories}
                accounts={accounts}
                recurringTransactions={recurringTransactions}
                contributionTotals={contributionTotals}
            />
            <BottomNav />
        </main>
    );
}
