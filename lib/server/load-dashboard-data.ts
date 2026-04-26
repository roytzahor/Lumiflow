import {
  getAccountContributionTotals,
  getAccounts,
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
  ]);

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
  };
}
