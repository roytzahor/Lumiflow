import { describe, expect, it } from 'vitest';
import { normalizeAmountInput } from '../lib/amount-input';
import { splitInstallmentAmounts } from '../lib/installment-utils';

describe('normalizeAmountInput', () => {
  it('converts a comma decimal separator (iOS Hebrew keyboard) to a period', () => {
    expect(normalizeAmountInput('12,50')).toBe('12.50');
  });

  it('leaves a period decimal unchanged', () => {
    expect(normalizeAmountInput('12.50')).toBe('12.50');
  });

  it('leaves integer amounts unchanged', () => {
    expect(normalizeAmountInput('120')).toBe('120');
  });

  it('trims surrounding whitespace from pasted values', () => {
    expect(normalizeAmountInput(' 99,90 ')).toBe('99.90');
  });

  it('returns an empty string for empty or whitespace-only input', () => {
    expect(normalizeAmountInput('')).toBe('');
    expect(normalizeAmountInput('   ')).toBe('');
  });

  it('keeps non-numeric input detectable via parseFloat → NaN', () => {
    expect(Number.isNaN(parseFloat(normalizeAmountInput('abc')))).toBe(true);
  });

  it('produces a parseFloat-compatible value for comma decimals', () => {
    expect(parseFloat(normalizeAmountInput('1000,50'))).toBe(1000.5);
  });
});

describe('normalizeAmountInput + installment preview integration', () => {
  it('a comma amount split into installments sums back exactly to the total', () => {
    const total = parseFloat(normalizeAmountInput('1000,50'));
    const parts = splitInstallmentAmounts(total, 3);
    const sumCents = parts.reduce((acc, p) => acc + Math.round(p * 100), 0);
    expect(parts).toHaveLength(3);
    expect(sumCents).toBe(100050);
  });
});
