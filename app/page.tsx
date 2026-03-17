import Dashboard from "@/components/Dashboard";
import { getTransactions, getBudgetSettings, getCategories, getAccounts, getRecurringTransactions } from "./actions";
import BottomNav from "@/components/BottomNav";

export const dynamic = 'force-dynamic';

export default async function Home() {
    const now = new Date();
    const [transactions, budgetSettings, categories, accounts, recurringTransactions] = await Promise.all([
        getTransactions('All', now.getFullYear(), now.getMonth()),
        getBudgetSettings(),
        getCategories(),
        getAccounts(),
        getRecurringTransactions(),
    ]);

    return (
        <main className="min-h-screen bg-ios-bg">
            <Dashboard
                initialTransactions={transactions}
                budgetSettings={budgetSettings}
                categories={categories}
                accounts={accounts}
                recurringTransactions={recurringTransactions}
            />
            <BottomNav />
        </main>
    );
}
