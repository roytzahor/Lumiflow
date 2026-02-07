import Dashboard from "@/components/Dashboard";
import { getTransactions, getBudgetSettings, getCategories, getAccounts } from "./actions";
import BottomNav from "@/components/BottomNav";

export default async function Home() {
    const now = new Date();
    const [transactions, budgetSettings, categories, accounts] = await Promise.all([
        getTransactions('All', now.getFullYear(), now.getMonth()),
        getBudgetSettings(),
        getCategories(),
        getAccounts(),
    ]);

    return (
        <main className="min-h-screen bg-ios-bg">
            <Dashboard
                initialTransactions={transactions}
                budgetSettings={budgetSettings}
                categories={categories}
                accounts={accounts}
            />
            <BottomNav />
        </main>
    );
}
