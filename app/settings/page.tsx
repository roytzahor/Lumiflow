import { getCategories } from '../actions/categories';
import { getAccountsWithMembersForSettings, getContributionPlans } from '../actions/accounts';
import { getCurrentUserProfile } from '../actions/profile';
import { getSavingsLabels } from '../actions/savings';
import { getBudgetSettings } from '../actions/settings';
import SettingsContent from './SettingsContent';
import AppNav from '@/components/AppNav';
import { redirectToOnboardingIfNeeded } from '@/lib/onboarding';

export default async function SettingsPage() {
  await redirectToOnboardingIfNeeded();
  const [categories, accounts, contributionPlans, currentUser, savingsLabels, budgetSettings] = await Promise.all([
    getCategories(),
    getAccountsWithMembersForSettings(),
    getContributionPlans(),
    getCurrentUserProfile(),
    getSavingsLabels(),
    getBudgetSettings(),
  ]);

  return (
    <div className="min-h-screen pb-28 lg:pb-8 font-sans text-ios-text dark:text-ios-dark-text bg-ios-bg dark:bg-ios-dark-bg transition-colors lg:ps-64" dir="rtl">
      <div className="w-full max-w-md mx-auto">
        {/* Header */}
        <header className="pt-safe px-5 pt-8 pb-4">
          <h1 className="text-3xl font-bold text-ios-text dark:text-ios-dark-text tracking-tight">
            הגדרות
          </h1>
          <p className="text-sm text-ios-subtle dark:text-ios-dark-subtle mt-0.5">ניהול חשבון והעדפות</p>
        </header>

        <main className="px-5 py-2 space-y-6">
          <SettingsContent
            initialCategories={categories}
            initialAccounts={accounts}
            initialContributionPlans={contributionPlans}
            initialSavingsLabels={savingsLabels}
            currentUser={currentUser}
            initialBudgetSettings={budgetSettings ?? null}
          />

          {/* Footer */}
          <section className="pt-4 pb-4">
            <p className="text-xs text-center text-ios-subtle dark:text-ios-dark-subtle">LumiFlow v2.0</p>
          </section>
        </main>
      </div>

      <AppNav />
    </div>
  );
}
