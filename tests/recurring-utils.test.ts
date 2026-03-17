import { describe, expect, it } from 'vitest';
import { getNextRunDateFromCurrent, resolveMonthlyDate } from '../lib/recurring-utils';

describe('resolveMonthlyDate', () => {
  it('rolls to last day when policy is ROLL_TO_LAST_DAY', () => {
    const result = resolveMonthlyDate(2026, 1, 31, 'ROLL_TO_LAST_DAY');
    expect(result).not.toBeNull();
    expect(result?.getFullYear()).toBe(2026);
    expect(result?.getMonth()).toBe(1);
    expect(result?.getDate()).toBe(28);
  });

  it('returns null when policy is SKIP_MONTH and day overflows', () => {
    const result = resolveMonthlyDate(2026, 1, 31, 'SKIP_MONTH');
    expect(result).toBeNull();
  });
});

describe('getNextRunDateFromCurrent', () => {
  it('moves to next month or further based on policy', () => {
    const current = new Date(2026, 0, 31);
    const nextRoll = getNextRunDateFromCurrent(current, 31, 'ROLL_TO_LAST_DAY');
    const nextSkip = getNextRunDateFromCurrent(current, 31, 'SKIP_MONTH');

    expect(nextRoll.getMonth()).toBe(1);
    expect(nextRoll.getDate()).toBe(28);

    expect(nextSkip.getMonth()).toBe(2);
    expect(nextSkip.getDate()).toBe(1);
  });
});
