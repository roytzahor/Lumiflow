import type {
  AccountMemberRatio,
  CategoryMemberSplit,
  ContributionRatio,
  MonthlyIncomeTotal,
  MyMoneyBreakdown,
  MyMoneyCategory,
} from '@/lib/types';

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

/**
 * Computes, for ALL members of a shared account, their attributed share of
 * each spending category for one month — e.g. "Food: ₪300 total — Roy ₪200
 * (67%), Dana ₪100 (33%)".
 *
 * Unlike `computeMyMoneyBreakdown` (which attributes spend to a single user),
 * this fans a category's total out across every member by their contribution
 * ratio. If no members are passed, or every member's ratio is 0 (nobody has
 * pledged a contribution yet), categories are still returned with the
 * correct `total` but an empty `members` array — no division by zero, no
 * phantom attribution.
 */
export function computeAccountMemberSplit(params: {
  /** Transactions already filtered to ONE account and ONE month. */
  transactions: Array<{ category: string; amount: number }>;
  /** All members of that account, each with their ratio (sums to 1 across members when account total > 0). */
  members: AccountMemberRatio[];
}): CategoryMemberSplit[] {
  const { transactions, members } = params;

  const categoryTotals = new Map<string, number>();
  for (const t of transactions) {
    if (t.amount <= 0) continue;
    categoryTotals.set(t.category, (categoryTotals.get(t.category) ?? 0) + t.amount);
  }

  const hasContributingMembers = members.some((m) => m.ratio > 0);

  return Array.from(categoryTotals.entries())
    .map(([category, total]) => ({
      category,
      total,
      members: hasContributingMembers
        ? members.map((m) => ({
            userId: m.userId,
            name: m.name,
            amount: total * m.ratio,
            ratio: m.ratio,
          }))
        : [],
    }))
    .sort((a, b) => b.total - a.total);
}
