import type { AccountMemberRatio, ContributionRatio } from '@/lib/types';

/** One AccountContributionPlan row, flattened for pure computation. */
export type ContributionPlanFlat = {
  userId: string;
  accountId: string;
  monthlyAmount: number;
};

/** A member's plan with the display name already resolved. */
export type MemberPlanFlat = {
  userId: string;
  name: string;
  monthlyAmount: number;
};

/**
 * Derives the given user's contribution ratio per account from ALL plans of
 * the accounts they belong to.
 *
 * When an account's total pledged amount is 0 (e.g. the user is the only
 * member and pledged 0), the ratio falls back to 1 — shared expenses are then
 * attributed fully to the user, matching the `?? 1` fallback in
 * `computeMyMoneyBreakdown` for accounts with no plan at all.
 */
export function computeMyContributionRatios(
  allPlans: ContributionPlanFlat[],
  userId: string
): ContributionRatio[] {
  const totalsByAccount = new Map<string, number>();
  for (const p of allPlans) {
    totalsByAccount.set(p.accountId, (totalsByAccount.get(p.accountId) ?? 0) + p.monthlyAmount);
  }

  return allPlans
    .filter((p) => p.userId === userId)
    .map((p) => {
      const totalAmount = totalsByAccount.get(p.accountId) ?? 0;
      return {
        accountId: p.accountId,
        myAmount: p.monthlyAmount,
        totalAmount,
        ratio: totalAmount > 0 ? p.monthlyAmount / totalAmount : 1,
      };
    });
}

/**
 * Derives every member's ratio for ONE account from that account's plans.
 *
 * Unlike `computeMyContributionRatios`, a 0 account total yields ratio 0 for
 * every member (nobody has pledged → nobody is attributed anything), which is
 * what `computeAccountMemberSplit` relies on to return empty member lists.
 * Input order is preserved.
 */
export function computeMemberContributionRatios(plans: MemberPlanFlat[]): AccountMemberRatio[] {
  const total = plans.reduce((sum, p) => sum + p.monthlyAmount, 0);

  return plans.map((p) => ({
    userId: p.userId,
    name: p.name,
    monthlyAmount: p.monthlyAmount,
    ratio: total > 0 ? p.monthlyAmount / total : 0,
  }));
}
