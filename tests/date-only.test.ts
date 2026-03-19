import { describe, expect, it } from 'vitest';
import { parseDateInputToUtc, toDateInputValueFromUtc } from '../lib/date-only';

describe('parseDateInputToUtc', () => {
  it('parses a valid date-only input into UTC date', () => {
    const parsed = parseDateInputToUtc('2026-04-30');
    expect(parsed).not.toBeNull();
    expect(parsed?.toISOString()).toBe('2026-04-30T00:00:00.000Z');
  });

  it('rejects invalid date values', () => {
    expect(parseDateInputToUtc('2026-02-31')).toBeNull();
    expect(parseDateInputToUtc('2026/02/01')).toBeNull();
    expect(parseDateInputToUtc('')).toBeNull();
  });
});

describe('toDateInputValueFromUtc', () => {
  it('formats UTC date to yyyy-mm-dd', () => {
    const value = toDateInputValueFromUtc(new Date('2026-01-02T13:40:00.000Z'));
    expect(value).toBe('2026-01-02');
  });
});
