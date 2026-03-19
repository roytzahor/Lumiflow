import { getBudgetSettings, getCategories, getAccounts, getCurrentUserProfile, getContributionPlans } from '../actions';
import SettingsContent from './SettingsContent';
import BottomNav from '@/components/BottomNav';
import { redirectToOnboardingIfNeeded } from '@/lib/onboarding';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
    await redirectToOnboardingIfNeeded();
    const [budgetSettings, categories, accounts, contributionPlans, currentUser] = await Promise.all([
        getBudgetSettings(),
        getCategories(),
        getAccounts(),
        getContributionPlans(),
        getCurrentUserProfile(),
    ]);

    return (
        <div className="min-h-screen pb-28 font-sans text-ios-text dark:text-ios-dark-text bg-ios-bg dark:bg-ios-dark-bg transition-colors" dir="rtl">
            {/* Header */}
            <header className="pt-safe px-5 pt-8 pb-4">
                <h1 className="text-3xl font-bold text-ios-text dark:text-ios-dark-text tracking-tight">
                    הגדרות
                </h1>
                <p className="text-sm text-ios-subtle dark:text-ios-dark-subtle mt-0.5">ניהול חשבון והעדפות</p>
            </header>

            <main className="max-w-md mx-auto px-5 py-2 space-y-6">
                <SettingsContent
                    initialBudget={budgetSettings}
                    initialCategories={categories}
                    initialAccounts={accounts}
                    initialContributionPlans={contributionPlans}
                    currentUser={currentUser}
                />

                {/* Footer */}
                <section className="pt-4 pb-4">
                    <p className="text-xs text-center text-ios-subtle dark:text-ios-dark-subtle">LumiFlow v2.0</p>
                </section>
            </main>

            <BottomNav />
        </div>
    );
}
