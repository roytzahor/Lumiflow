import { describe, expect, it } from 'vitest';
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
});
