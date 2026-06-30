import {
  getAccountContributionTotals,
  getAccounts,
  getAllAccountContributionRatios,
  getBudgetSettings,
  getCategories,
  getCurrentUserProfile,
  getMonthlyIncomeEntries,
  getMyContributionRatios,
  getSavingsAllocations,
  getSavingsLabels,
  getTransactions,
} from '@/app/actions';
import { fetchActiveRecurringForAccounts } from '@/lib/server/recurring-query';
import { ensureUserBootstrap, getUserAccountIds, requireUserId } from '@/lib/server-user';

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
  };
}
