import type { ContributionRatio, MonthlyIncomeTotal, MyMoneyBreakdown, MyMoneyCategory } from '@/lib/types';

export type TransactionFlat = {
  accountId: string;
  accountType: 'PRIVATE' | 'SHARED';
  category: string;
  amount: number;
};

export type SavingsAllocationFlat = {
  accountId: string;
  accountType: 'PRIVATE' | 'SHARED';
  amount: number;
};

/**
 * Computes a "My Money" view: how the user's full income was spent across
 * personal and shared accounts this month.
 *
 * Personal account expenses are attributed 100%.
 * Shared account expenses are attributed proportionally by the user's
 * contribution ratio (myAmount / totalAmount for that account).
 *
 * Income = sum of the user's contribution plans + one-time income entries
 * recorded in any of their accounts for the month.
 */
export function computeMyMoneyBreakdown(params: {
  myContributions: ContributionRatio[];
  transactions: TransactionFlat[];
  monthlyIncomeEntries: MonthlyIncomeTotal[];
  savingsAllocations?: SavingsAllocationFlat[];
}): MyMoneyBreakdown {
  const { myContributions, transactions, monthlyIncomeEntries, savingsAllocations = [] } = params;

  const ratioMap = new Map(myContributions.map((c) => [c.accountId, c.ratio]));
  const myAccountIds = new Set(myContributions.map((c) => c.accountId));

  const totalContributions = myContributions.reduce((sum, c) => sum + c.myAmount, 0);
  const totalOneTime = monthlyIncomeEntries
    .filter((e) => myAccountIds.has(e.accountId))
    .reduce((sum, e) => sum + e.totalAmount, 0);
  const totalIncome = totalContributions + totalOneTime;

  const categoryMap = new Map<string, { personalPortion: number; sharedPortion: number }>();

  for (const t of transactions) {
    if (t.amount <= 0) continue;
    const isShared = t.accountType === 'SHARED';
    // For accounts without a contribution ratio (edge case), attribute fully
    const ratio = isShared ? (ratioMap.get(t.accountId) ?? 1) : 1;
    const attributedAmount = t.amount * ratio;

    const existing = categoryMap.get(t.category) ?? { personalPortion: 0, sharedPortion: 0 };
    if (isShared) {
      existing.sharedPortion += attributedAmount;
    } else {
      existing.personalPortion += attributedAmount;
    }
    categoryMap.set(t.category, existing);
  }

  const categories: MyMoneyCategory[] = Array.from(categoryMap.entries())
    .map(([name, { personalPortion, sharedPortion }]) => ({
      name,
      amount: personalPortion + sharedPortion,
      personalPortion,
      sharedPortion,
    }))
    .sort((a, b) => b.amount - a.amount);

  const totalAttributedExpenses = categories.reduce((sum, c) => sum + c.amount, 0);
  const balance = totalIncome - totalAttributedExpenses;

  let totalAttributedSavingsAllocations = 0;
  for (const s of savingsAllocations) {
    if (s.amount <= 0) continue;
    const isShared = s.accountType === 'SHARED';
    const ratio = isShared ? (ratioMap.get(s.accountId) ?? 1) : 1;
    totalAttributedSavingsAllocations += s.amount * ratio;
  }

  const freeBalance = totalIncome - totalAttributedExpenses - totalAttributedSavingsAllocations;

  return {
    totalIncome,
    totalAttributedExpenses,
    balance,
    categories,
    totalAttributedSavingsAllocations,
    freeBalance,
  };
}
