import {
  getAccountContributionTotals,
  getAccounts,
  getAllAccountContributionRatios,
  getMyContributionRatios,
} from '@/app/actions/accounts';
import { getBudgetSettings } from '@/app/actions/settings';
import { getCategories } from '@/app/actions/categories';
import { getCurrentUserProfile } from '@/app/actions/profile';
import { getMonthlyIncomeEntries } from '@/app/actions/income';
import { getSavingsAllocations, getSavingsLabels } from '@/app/actions/savings';
import { getTransactions } from '@/app/actions/transactions';
import { fetchActiveRecurringForAccounts } from '@/lib/server/recurring-query';
import { ensureUserBootstrap, getUserAccountIds, requireUserId } from '@/lib/server-user';
import { buildRetentionSignals } from '@/lib/retention-signals';
import type { BudgetAlert, DailyNudge } from '@/lib/types';

/** Single orchestration for `/` to dedupe recurring fetch vs `getTransactions` projection. */
export async function loadDashboardPageData(year: number, month: number) {
  const userId = await requireUserId();
  await Promise.all([ensureUserBootstrap(userId), getUserAccountIds(userId)]);
  const accountIds = await getUserAccountIds(userId);
  const recurringRows = await fetchActiveRecurringForAccounts(accountIds);

  const prevMonth = month === 0 ? 11 : month - 1;
  const prevYear = month === 0 ? year - 1 : year;

  const [
    transactions,
    categories,
    accounts,
    contributionTotals,
    currentUser,
    monthlyIncomeEntries,
    myContributionRatios,
    savingsAllocations,
    savingsLabels,
    budgetSettings,
    prevTransactions,
    allAccountContributionRatios,
  ] = await Promise.all([
    getTransactions('All', year, month, { recurringRows }),
    getCategories(),
    getAccounts(),
    getAccountContributionTotals(),
    getCurrentUserProfile(),
    getMonthlyIncomeEntries(year, month),
    getMyContributionRatios(),
    getSavingsAllocations(year, month),
    getSavingsLabels(),
    getBudgetSettings(),
    getTransactions('All', prevYear, prevMonth),
    getAllAccountContributionRatios(),
  ]);

  // No recurringRows passed → no projected items; sum all returned amounts directly.
  const prevMonthTotal = prevTransactions.reduce((s, t) => s + t.amount, 0);

  const totalMonthlyInflow = contributionTotals.reduce((sum, row) => sum + row.totalMonthlyInflow, 0);
  const totalOneTimeIncome = monthlyIncomeEntries.reduce((sum, entry) => sum + entry.totalAmount, 0);

  const { alerts, nudges } = buildRetentionSignals({
    transactions,
    totalMonthlyInflow,
    totalOneTimeIncome,
    budgetSettings,
  });

  // Prefer a non-"ok" alert (warning/critical) if one exists — that's the more
  // actionable signal; otherwise fall back to the single "ok" alert.
  const dailyAlert: BudgetAlert | null =
    alerts.find((a) => a.severity !== 'ok') ?? alerts[0] ?? null;
  // Prefer a "warning"-tone nudge (most actionable) over positive/neutral ones,
  // otherwise just take the first nudge produced.
  const dailyNudge: DailyNudge | null =
    nudges.find((n) => n.tone === 'warning') ?? nudges[0] ?? null;

  return {
    transactions,
    categories,
    accounts,
    recurringTransactions: recurringRows,
    contributionTotals,
    currentUser,
    monthlyIncomeEntries,
    myContributionRatios,
    savingsAllocations,
    savingsLabels,
    budgetSettings,
    prevMonthTotal,
    allAccountContributionRatios,
    dailyAlert,
    dailyNudge,
  };
}
