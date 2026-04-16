import { describe, expect, it } from 'vitest';
import { buildRetentionSignals } from '../lib/retention-signals';

describe('buildRetentionSignals', () => {
  it('returns warning/critical style outputs near budget limits', () => {
    const output = buildRetentionSignals({
      totalMonthlyInflow: 1000,
      now: new Date('2026-03-20T00:00:00.000Z'),
      transactions: [
        {
          id: '1',
          amount: 600,
          category: 'מזון',
          date: new Date('2026-03-02T00:00:00.000Z'),
          accountId: 'a1',
          paidByUserId: 'u',
          attributedToUserId: 'u',
          description: null,
          recurringTransactionId: null,
          installmentGroupId: null,
          installmentNumber: null,
          installmentTotal: null,
          createdAt: new Date('2026-03-02T00:00:00.000Z'),
          account: {
            id: 'a1',
            name: 'חשבון',
            type: 'PRIVATE',
            income: 0,
            balance: 0,
            color: null,
            icon: null,
            isArchived: false,
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            updatedAt: new Date('2026-01-01T00:00:00.000Z'),
          },
        },
        {
          id: '2',
          amount: 320,
          category: 'מזון',
          date: new Date('2026-03-10T00:00:00.000Z'),
          accountId: 'a1',
          paidByUserId: 'u',
          attributedToUserId: 'u',
          description: null,
          recurringTransactionId: null,
          installmentGroupId: null,
          installmentNumber: null,
          installmentTotal: null,
          createdAt: new Date('2026-03-10T00:00:00.000Z'),
          account: {
            id: 'a1',
            name: 'חשבון',
            type: 'PRIVATE',
            income: 0,
            balance: 0,
            color: null,
            icon: null,
            isArchived: false,
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            updatedAt: new Date('2026-01-01T00:00:00.000Z'),
          },
        },
      ],
    });

    expect(output.alerts.length).toBeGreaterThan(0);
    expect(output.nudges.length).toBeGreaterThan(0);
    expect(output.alerts.some((a) => a.severity === 'warning' || a.severity === 'critical')).toBe(true);
  });
});
