import { describe, expect, it } from 'vitest';
import { computeMemberContributionRatios } from '../lib/contribution-ratios';
import { computeAccountMemberSplit, computeMyMoneyBreakdown } from '../lib/my-money-utils';

describe('computeMyMoneyBreakdown', () => {
  it('includes attributed savings allocations and freeBalance', () => {
    const result = computeMyMoneyBreakdown({
      myContributions: [
        { accountId: 'a1', myAmount: 3000, totalAmount: 6000, ratio: 0.5 },
        { accountId: 'a2', myAmount: 2000, totalAmount: 2000, ratio: 1 },
      ],
      transactions: [
        { accountId: 'a1', accountType: 'SHARED', category: 'מזון', amount: 400 },
        { accountId: 'a2', accountType: 'PRIVATE', category: 'דיור', amount: 500 },
      ],
      monthlyIncomeEntries: [],
      savingsAllocations: [
        { accountId: 'a1', accountType: 'SHARED', amount: 200 },
        { accountId: 'a2', accountType: 'PRIVATE', amount: 100 },
      ],
    });

    expect(result.totalIncome).toBe(5000);
    expect(result.totalAttributedExpenses).toBe(700);
    expect(result.balance).toBe(4300);
    expect(result.totalAttributedSavingsAllocations).toBe(200);
    expect(result.freeBalance).toBe(4100);
  });

  it('attributes shared expenses fully (ratio 1) when the account has no contribution plan', () => {
    const result = computeMyMoneyBreakdown({
      myContributions: [],
      transactions: [
        { accountId: 'orphan-shared', accountType: 'SHARED', category: 'מזון', amount: 300 },
      ],
      monthlyIncomeEntries: [],
    });

    expect(result.totalAttributedExpenses).toBe(300);
    expect(result.categories).toEqual([
      { name: 'מזון', amount: 300, personalPortion: 0, sharedPortion: 300 },
    ]);
  });

  it('counts one-time income only for accounts the user has a contribution plan in', () => {
    const result = computeMyMoneyBreakdown({
      myContributions: [{ accountId: 'mine', myAmount: 1000, totalAmount: 1000, ratio: 1 }],
      transactions: [],
      monthlyIncomeEntries: [
        { accountId: 'mine', totalAmount: 500 },
        { accountId: 'not-mine', totalAmount: 9999 },
      ],
    });

    expect(result.totalIncome).toBe(1500);
  });

  it('ignores zero and negative amounts in both transactions and savings allocations', () => {
    const result = computeMyMoneyBreakdown({
      myContributions: [{ accountId: 'a1', myAmount: 1000, totalAmount: 2000, ratio: 0.5 }],
      transactions: [
        { accountId: 'a1', accountType: 'SHARED', category: 'מזון', amount: 0 },
        { accountId: 'a1', accountType: 'SHARED', category: 'מזון', amount: -200 },
        { accountId: 'a1', accountType: 'SHARED', category: 'מזון', amount: 100 },
      ],
      monthlyIncomeEntries: [],
      savingsAllocations: [
        { accountId: 'a1', accountType: 'SHARED', amount: -50 },
        { accountId: 'a1', accountType: 'SHARED', amount: 0 },
        { accountId: 'a1', accountType: 'SHARED', amount: 60 },
      ],
    });

    expect(result.totalAttributedExpenses).toBe(50);
    expect(result.totalAttributedSavingsAllocations).toBe(30);
  });

  it('returns all-zero totals and no categories for an empty month', () => {
    const result = computeMyMoneyBreakdown({
      myContributions: [],
      transactions: [],
      monthlyIncomeEntries: [],
    });

    expect(result).toEqual({
      totalIncome: 0,
      totalAttributedExpenses: 0,
      balance: 0,
      categories: [],
      totalAttributedSavingsAllocations: 0,
      freeBalance: 0,
    });
  });

  it('merges the same category across private and shared accounts, keeping portions separate', () => {
    const result = computeMyMoneyBreakdown({
      myContributions: [
        { accountId: 'shared', myAmount: 3000, totalAmount: 6000, ratio: 0.5 },
        { accountId: 'private', myAmount: 2000, totalAmount: 2000, ratio: 1 },
      ],
      transactions: [
        { accountId: 'private', accountType: 'PRIVATE', category: 'מזון', amount: 150 },
        { accountId: 'shared', accountType: 'SHARED', category: 'מזון', amount: 400 },
      ],
      monthlyIncomeEntries: [],
    });

    expect(result.categories).toEqual([
      { name: 'מזון', amount: 350, personalPortion: 150, sharedPortion: 200 },
    ]);
  });

  it('sorts categories by attributed amount descending', () => {
    const result = computeMyMoneyBreakdown({
      myContributions: [{ accountId: 'p', myAmount: 1000, totalAmount: 1000, ratio: 1 }],
      transactions: [
        { accountId: 'p', accountType: 'PRIVATE', category: 'בידור', amount: 50 },
        { accountId: 'p', accountType: 'PRIVATE', category: 'דיור', amount: 1000 },
        { accountId: 'p', accountType: 'PRIVATE', category: 'מזון', amount: 300 },
      ],
      monthlyIncomeEntries: [],
    });

    expect(result.categories.map((c) => c.name)).toEqual(['דיור', 'מזון', 'בידור']);
  });

  it('treats omitted savingsAllocations as 0, so freeBalance equals balance', () => {
    const result = computeMyMoneyBreakdown({
      myContributions: [{ accountId: 'p', myAmount: 2000, totalAmount: 2000, ratio: 1 }],
      transactions: [{ accountId: 'p', accountType: 'PRIVATE', category: 'מזון', amount: 500 }],
      monthlyIncomeEntries: [],
    });

    expect(result.totalAttributedSavingsAllocations).toBe(0);
    expect(result.freeBalance).toBe(result.balance);
    expect(result.balance).toBe(1500);
  });

  it('invariant: categories sum to totalAttributedExpenses, and balance identities hold', () => {
    const result = computeMyMoneyBreakdown({
      myContributions: [
        { accountId: 's1', myAmount: 1000, totalAmount: 7000, ratio: 1 / 7 },
        { accountId: 's2', myAmount: 2500, totalAmount: 4000, ratio: 0.625 },
        { accountId: 'p1', myAmount: 3000, totalAmount: 3000, ratio: 1 },
      ],
      transactions: [
        { accountId: 's1', accountType: 'SHARED', category: 'מזון', amount: 700 },
        { accountId: 's2', accountType: 'SHARED', category: 'מזון', amount: 320 },
        { accountId: 's2', accountType: 'SHARED', category: 'דיור', amount: 4000 },
        { accountId: 'p1', accountType: 'PRIVATE', category: 'בידור', amount: 99 },
      ],
      monthlyIncomeEntries: [{ accountId: 'p1', totalAmount: 250 }],
      savingsAllocations: [
        { accountId: 's1', accountType: 'SHARED', amount: 140 },
        { accountId: 'p1', accountType: 'PRIVATE', amount: 300 },
      ],
    });

    const categorySum = result.categories.reduce((sum, c) => sum + c.amount, 0);
    expect(categorySum).toBeCloseTo(result.totalAttributedExpenses, 9);
    for (const c of result.categories) {
      expect(c.personalPortion + c.sharedPortion).toBeCloseTo(c.amount, 9);
    }
    expect(result.balance).toBeCloseTo(result.totalIncome - result.totalAttributedExpenses, 9);
    expect(result.freeBalance).toBeCloseTo(
      result.balance - result.totalAttributedSavingsAllocations,
      9
    );

    // Spot-check the attribution math itself: 700×(1/7) + 320×0.625 + 4000×0.625 + 99×1
    expect(result.totalAttributedExpenses).toBeCloseTo(100 + 200 + 2500 + 99, 9);
    expect(result.totalIncome).toBe(1000 + 2500 + 3000 + 250);
  });
});

describe('computeAccountMemberSplit', () => {
  it('splits two members 60/40 across two categories', () => {
    const result = computeAccountMemberSplit({
      transactions: [
        { category: 'מזון', amount: 200 },
        { category: 'מזון', amount: 100 },
        { category: 'דיור', amount: 1000 },
      ],
      members: [
        { userId: 'roy', name: 'Roy', monthlyAmount: 600, ratio: 0.6 },
        { userId: 'dana', name: 'Dana', monthlyAmount: 400, ratio: 0.4 },
      ],
    });

    expect(result).toHaveLength(2);

    const housing = result.find((r) => r.category === 'דיור');
    expect(housing?.total).toBe(1000);
    expect(housing?.members).toEqual([
      { userId: 'roy', name: 'Roy', amount: 600, ratio: 0.6 },
      { userId: 'dana', name: 'Dana', amount: 400, ratio: 0.4 },
    ]);

    const food = result.find((r) => r.category === 'מזון');
    expect(food?.total).toBe(300);
    expect(food?.members).toEqual([
      { userId: 'roy', name: 'Roy', amount: 180, ratio: 0.6 },
      { userId: 'dana', name: 'Dana', amount: 120, ratio: 0.4 },
    ]);
  });

  it('supports three members with uneven ratios (50/30/20)', () => {
    const result = computeAccountMemberSplit({
      transactions: [{ category: 'מזון', amount: 500 }],
      members: [
        { userId: 'a', name: 'Alice', monthlyAmount: 500, ratio: 0.5 },
        { userId: 'b', name: 'Bob', monthlyAmount: 300, ratio: 0.3 },
        { userId: 'c', name: 'Carl', monthlyAmount: 200, ratio: 0.2 },
      ],
    });

    expect(result).toEqual([
      {
        category: 'מזון',
        total: 500,
        members: [
          { userId: 'a', name: 'Alice', amount: 250, ratio: 0.5 },
          { userId: 'b', name: 'Bob', amount: 150, ratio: 0.3 },
          { userId: 'c', name: 'Carl', amount: 100, ratio: 0.2 },
        ],
      },
    ]);
  });

  it('attributes 0 to a member who has not pledged yet, while others total correctly', () => {
    const result = computeAccountMemberSplit({
      transactions: [{ category: 'מזון', amount: 300 }],
      members: [
        { userId: 'roy', name: 'Roy', monthlyAmount: 300, ratio: 1 },
        { userId: 'dana', name: 'Dana', monthlyAmount: 0, ratio: 0 },
      ],
    });

    expect(result[0].total).toBe(300);
    const dana = result[0].members.find((m) => m.userId === 'dana');
    const roy = result[0].members.find((m) => m.userId === 'roy');
    expect(dana?.amount).toBe(0);
    expect(roy?.amount).toBe(300);
  });

  it('returns members: [] per category when members array is empty', () => {
    const result = computeAccountMemberSplit({
      transactions: [
        { category: 'מזון', amount: 300 },
        { category: 'דיור', amount: 100 },
      ],
      members: [],
    });

    expect(result).toEqual([
      { category: 'מזון', total: 300, members: [] },
      { category: 'דיור', total: 100, members: [] },
    ]);
  });

  it('returns [] for empty transactions', () => {
    const result = computeAccountMemberSplit({
      transactions: [],
      members: [{ userId: 'roy', name: 'Roy', monthlyAmount: 100, ratio: 1 }],
    });

    expect(result).toEqual([]);
  });

  it('excludes negative or zero amount transactions from totals', () => {
    const result = computeAccountMemberSplit({
      transactions: [
        { category: 'מזון', amount: 200 },
        { category: 'מזון', amount: -50 },
        { category: 'מזון', amount: 0 },
      ],
      members: [{ userId: 'roy', name: 'Roy', monthlyAmount: 200, ratio: 1 }],
    });

    expect(result).toEqual([
      { category: 'מזון', total: 200, members: [{ userId: 'roy', name: 'Roy', amount: 200, ratio: 1 }] },
    ]);
  });

  it('sorts categories by total descending', () => {
    const result = computeAccountMemberSplit({
      transactions: [
        { category: 'בידור', amount: 50 },
        { category: 'דיור', amount: 1000 },
        { category: 'מזון', amount: 300 },
      ],
      members: [{ userId: 'roy', name: 'Roy', monthlyAmount: 100, ratio: 1 }],
    });

    expect(result.map((r) => r.category)).toEqual(['דיור', 'מזון', 'בידור']);
  });

  it('does not throw or produce NaN with float-precision ratios', () => {
    const result = computeAccountMemberSplit({
      transactions: [{ category: 'מזון', amount: 99.99 }],
      members: [
        { userId: 'a', name: 'Alice', monthlyAmount: 1, ratio: 0.333333 },
        { userId: 'b', name: 'Bob', monthlyAmount: 1, ratio: 0.333333 },
        { userId: 'c', name: 'Carl', monthlyAmount: 1, ratio: 0.333334 },
      ],
    });

    expect(result[0].total).toBe(99.99);
    for (const m of result[0].members) {
      expect(Number.isFinite(m.amount)).toBe(true);
      expect(Number.isNaN(m.amount)).toBe(false);
    }
    const sum = result[0].members.reduce((s, m) => s + m.amount, 0);
    expect(sum).toBeCloseTo(99.99, 5);
  });

  it('attributes 100% to a single member', () => {
    const result = computeAccountMemberSplit({
      transactions: [{ category: 'מזון', amount: 730 }],
      members: [{ userId: 'roy', name: 'Roy', monthlyAmount: 5000, ratio: 1 }],
    });

    expect(result).toEqual([
      {
        category: 'מזון',
        total: 730,
        members: [{ userId: 'roy', name: 'Roy', amount: 730, ratio: 1 }],
      },
    ]);
  });

  it('returns members: [] when every member has ratio 0 (nobody pledged)', () => {
    const result = computeAccountMemberSplit({
      transactions: [{ category: 'מזון', amount: 300 }],
      members: [
        { userId: 'roy', name: 'Roy', monthlyAmount: 0, ratio: 0 },
        { userId: 'dana', name: 'Dana', monthlyAmount: 0, ratio: 0 },
      ],
    });

    expect(result).toEqual([{ category: 'מזון', total: 300, members: [] }]);
  });

  it('invariant: member amounts sum to the category total for ratios derived from integer pledges', () => {
    const pledgeSets = [
      [6000, 4000],
      [1, 2, 4],
      [333, 333, 334],
      [1, 1, 1],
      [9999, 1],
      [500, 300, 200],
    ];
    const totals = [1, 7, 100, 999, 12345, 100000];

    for (const pledges of pledgeSets) {
      const members = computeMemberContributionRatios(
        pledges.map((monthlyAmount, i) => ({ userId: `u${i}`, name: `U${i}`, monthlyAmount }))
      );
      for (const total of totals) {
        const result = computeAccountMemberSplit({
          transactions: [{ category: 'מזון', amount: total }],
          members,
        });

        expect(result[0].total).toBe(total);
        const attributedSum = result[0].members.reduce((sum, m) => sum + m.amount, 0);
        expect(attributedSum).toBeCloseTo(total, 9);
        for (const m of result[0].members) {
          expect(m.amount).toBeGreaterThanOrEqual(0);
          expect(m.amount).toBeLessThanOrEqual(total);
        }
      }
    }
  });

  it('produces exact integer amounts when ratios are binary-exact fractions', () => {
    const result = computeAccountMemberSplit({
      transactions: [{ category: 'דיור', amount: 1000 }],
      members: [
        { userId: 'a', name: 'Alice', monthlyAmount: 500, ratio: 0.5 },
        { userId: 'b', name: 'Bob', monthlyAmount: 250, ratio: 0.25 },
        { userId: 'c', name: 'Carl', monthlyAmount: 250, ratio: 0.25 },
      ],
    });

    expect(result[0].members.map((m) => m.amount)).toEqual([500, 250, 250]);
    for (const m of result[0].members) {
      expect(Number.isInteger(m.amount)).toBe(true);
    }
  });
});
