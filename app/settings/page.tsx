import { getBudgetSettings, getCategories, getAccounts, getRecurringTransactions } from '../actions';
import SettingsContent from './SettingsContent';
import BottomNav from '@/components/BottomNav';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
    const [budgetSettings, categories, accounts, recurring] = await Promise.all([
        getBudgetSettings(),
        getCategories(),
        getAccounts(),
        getRecurringTransactions()
    ]);

    return (
        <div className="min-h-screen pb-28 font-sans text-gray-900" dir="rtl">
            {/* Header */}
            <header className="pt-safe px-5 pt-8 pb-4">
                <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
                    הגדרות
                </h1>
                <p className="text-sm text-gray-400 mt-0.5">ניהול חשבון והעדפות</p>
            </header>

            <main className="max-w-md mx-auto px-5 py-2 space-y-6">
                <SettingsContent
                    initialBudget={budgetSettings}
                    initialCategories={categories}
                    initialAccounts={accounts}
                    initialRecurring={recurring}
                />

                {/* Footer */}
                <section className="pt-4 pb-4">
                    <p className="text-xs text-center text-gray-400">LumiFlow v2.0</p>
                </section>
            </main>

            <BottomNav />
        </div>
    );
}
