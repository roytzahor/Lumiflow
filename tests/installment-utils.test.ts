import { describe, expect, it } from 'vitest';
import { splitInstallmentAmounts, addCalendarMonthsUtc } from '../lib/installment-utils';

/** Sum a split back to agorot (integer cents) to avoid float drift in assertions. */
const sumCents = (parts: number[]) => parts.reduce((acc, p) => acc + Math.round(p * 100), 0);
const toCents = (parts: number[]) => parts.map((p) => Math.round(p * 100));

describe('splitInstallmentAmounts', () => {
  it('returns an empty array for count < 1', () => {
    expect(splitInstallmentAmounts(100, 0)).toEqual([]);
    expect(splitInstallmentAmounts(100, -3)).toEqual([]);
  });

  it('returns an empty array for a non-finite total', () => {
    expect(splitInstallmentAmounts(Number.NaN, 3)).toEqual([]);
    expect(splitInstallmentAmounts(Number.POSITIVE_INFINITY, 3)).toEqual([]);
  });

  it('returns the whole amount for a single installment', () => {
    expect(toCents(splitInstallmentAmounts(99.99, 1))).toEqual([9999]);
  });

  it('splits evenly when the total divides cleanly', () => {
    expect(toCents(splitInstallmentAmounts(10, 4))).toEqual([250, 250, 250, 250]);
  });

  it('distributes the remainder to the earliest installments', () => {
    // 100.00 / 3 = 10000 agorot → 3334, 3333, 3333
    expect(toCents(splitInstallmentAmounts(100, 3))).toEqual([3334, 3333, 3333]);
  });

  it('handles a fractional total with a one-agora remainder', () => {
    // 99.99 / 2 = 9999 agorot → 5000, 4999
    expect(toCents(splitInstallmentAmounts(99.99, 2))).toEqual([5000, 4999]);
  });

  it('always sums back exactly to the original total (invariant)', () => {
    for (const [total, count] of [
      [100, 3],
      [99.99, 7],
      [1234.56, 12],
      [0.05, 4],
    ] as const) {
      expect(sumCents(splitInstallmentAmounts(total, count))).toBe(Math.round(total * 100));
    }
  });
});

describe('addCalendarMonthsUtc', () => {
  const parts = (d: Date) => [d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()];

  it('keeps the day-of-month when the target month is long enough', () => {
    expect(parts(addCalendarMonthsUtc(new Date(Date.UTC(2026, 0, 15)), 2))).toEqual([2026, 2, 15]);
  });

  it('rolls to the last day of a short target month', () => {
    // Jan 31 2026 + 1 → Feb (28 days, non-leap)
    expect(parts(addCalendarMonthsUtc(new Date(Date.UTC(2026, 0, 31)), 1))).toEqual([2026, 1, 28]);
  });

  it('rolls to Feb 29 in a leap year', () => {
    expect(parts(addCalendarMonthsUtc(new Date(Date.UTC(2024, 0, 31)), 1))).toEqual([2024, 1, 29]);
  });

  it('rolls the year forward across December', () => {
    expect(parts(addCalendarMonthsUtc(new Date(Date.UTC(2026, 11, 10)), 1))).toEqual([2027, 0, 10]);
  });

  it('supports negative deltas (back across the year boundary)', () => {
    expect(parts(addCalendarMonthsUtc(new Date(Date.UTC(2026, 2, 10)), -3))).toEqual([2025, 11, 10]);
  });

  it('is a no-op on the calendar date for delta 0', () => {
    expect(parts(addCalendarMonthsUtc(new Date(Date.UTC(2026, 5, 20)), 0))).toEqual([2026, 5, 20]);
  });
});
