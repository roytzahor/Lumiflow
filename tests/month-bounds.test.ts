import { describe, expect, it } from 'vitest';
import { endOfMonthUtc, startOfMonthUtc } from '../lib/month-bounds';

describe('startOfMonthUtc', () => {
  it('returns UTC midnight on the first day of the given month', () => {
    const d = startOfMonthUtc(2024, 0);
    expect(d.getUTCFullYear()).toBe(2024);
    expect(d.getUTCMonth()).toBe(0);
    expect(d.getUTCDate()).toBe(1);
    expect(d.getUTCHours()).toBe(0);
    expect(d.getUTCMinutes()).toBe(0);
    expect(d.getUTCSeconds()).toBe(0);
    expect(d.getUTCMilliseconds()).toBe(0);
  });

  it('handles December (month 11) without rolling into the next year', () => {
    const d = startOfMonthUtc(2024, 11);
    expect(d.getUTCFullYear()).toBe(2024);
    expect(d.getUTCMonth()).toBe(11);
    expect(d.getUTCDate()).toBe(1);
  });

  it('produces the correct ISO string (UTC, no timezone drift)', () => {
    const d = startOfMonthUtc(2023, 5);
    expect(d.toISOString()).toBe('2023-06-01T00:00:00.000Z');
  });
});

describe('endOfMonthUtc', () => {
  it('returns 23:59:59.999 on the last day of a 31-day month (January 2024)', () => {
    const d = endOfMonthUtc(2024, 0);
    expect(d.getUTCFullYear()).toBe(2024);
    expect(d.getUTCMonth()).toBe(0);
    expect(d.getUTCDate()).toBe(31);
    expect(d.getUTCHours()).toBe(23);
    expect(d.getUTCMinutes()).toBe(59);
    expect(d.getUTCSeconds()).toBe(59);
    expect(d.getUTCMilliseconds()).toBe(999);
  });

  it('returns February 28 as the last day of a non-leap year (2023)', () => {
    const d = endOfMonthUtc(2023, 1);
    expect(d.getUTCFullYear()).toBe(2023);
    expect(d.getUTCMonth()).toBe(1);
    expect(d.getUTCDate()).toBe(28);
  });

  it('returns February 29 as the last day of a leap year (2024)', () => {
    const d = endOfMonthUtc(2024, 1);
    expect(d.getUTCFullYear()).toBe(2024);
    expect(d.getUTCMonth()).toBe(1);
    expect(d.getUTCDate()).toBe(29);
  });

  it('returns December 31 for month 11 without rolling into the next year', () => {
    const d = endOfMonthUtc(2024, 11);
    expect(d.getUTCFullYear()).toBe(2024);
    expect(d.getUTCMonth()).toBe(11);
    expect(d.getUTCDate()).toBe(31);
  });

  it('produces the correct ISO string for December 2024 (UTC, no timezone drift)', () => {
    const d = endOfMonthUtc(2024, 11);
    expect(d.toISOString()).toBe('2024-12-31T23:59:59.999Z');
  });

  it('end of month is strictly after start of month for the same month', () => {
    const start = startOfMonthUtc(2023, 3);
    const end = endOfMonthUtc(2023, 3);
    expect(start.getUTCMonth()).toBe(end.getUTCMonth());
    expect(end.getTime()).toBeGreaterThan(start.getTime());
  });

  it('produces correct ISO string for a 30-day month (April 2023)', () => {
    const d = endOfMonthUtc(2023, 3);
    expect(d.toISOString()).toBe('2023-04-30T23:59:59.999Z');
  });
});
