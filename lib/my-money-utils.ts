import type { ContributionRatio, MonthlyIncomeTotal, MyMoneyBreakdown, MyMoneyCategory } from '@/lib/types';

export type TransactionFlat = {
  accountId: string;
  accountType: 'PRIVATE' | 'SHARED';
  category: string;
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
}): MyMoneyBreakdown {
  const { myContributions, transactions, monthlyIncomeEntries } = params;

  const ratioMap = new Map(myContributions.map((c) => [c.accountId, c.ratio]));
  const myAccountIds = new Set(myContributions.map((c) => c.accountId));

  const totalContributions = myContributions.reduce((sum, c) => sum + c.myAmount, 0);
  const totalOneTime = monthlyIncomeEntries
    .filter((e) => myAccountIds.has(e.accountId))
    .reduce((sum, e) => sum + e.totalAmount, 0);
  const totalIncome = totalContributions + totalOneTime;

  const categoryMap = new Map<string, { amount: number; source: 'personal' | 'shared' }>();

  for (const t of transactions) {
    if (t.amount <= 0) continue;
    const isShared = t.accountType === 'SHARED';
    // For accounts without a contribution ratio (edge case), attribute fully
    const ratio = isShared ? (ratioMap.get(t.accountId) ?? 1) : 1;
    const attributedAmount = t.amount * ratio;

    const existing = categoryMap.get(t.category);
    if (existing) {
      existing.amount += attributedAmount;
    } else {
      categoryMap.set(t.category, {
        amount: attributedAmount,
        source: isShared ? 'shared' : 'personal',
      });
    }
  }

  const categories: MyMoneyCategory[] = Array.from(categoryMap.entries())
    .map(([name, { amount, source }]) => ({ name, amount, source }))
    .sort((a, b) => b.amount - a.amount);

  const totalAttributedExpenses = categories.reduce((sum, c) => sum + c.amount, 0);
  const balance = totalIncome - totalAttributedExpenses;

  return { totalIncome, totalAttributedExpenses, balance, categories };
}
