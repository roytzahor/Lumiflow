import { describe, expect, it } from 'vitest';
import { computeMyMoneyBreakdown } from '../lib/my-money-utils';

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
