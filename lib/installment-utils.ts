import type { RecurringMonthPolicy } from '@prisma/client';
import { resolveMonthlyDate } from '@/lib/recurring-utils';

const INSTALLMENT_MONTH_POLICY: RecurringMonthPolicy = 'ROLL_TO_LAST_DAY';

/** Split a total amount in ILS across `count` parts so the rounded parts sum exactly to the total (agorot). */
export function splitInstallmentAmounts(totalAmount: number, count: number): number[] {
  if (count < 1 || !Number.isFinite(totalAmount)) return [];
  const totalCents = Math.round(totalAmount * 100);
  const base = Math.floor(totalCents / count);
  const remainder = totalCents % count;
  return Array.from({ length: count }, (_, i) => (base + (i < remainder ? 1 : 0)) / 100);
}

/** Advance a calendar date by `deltaMonths` in UTC, keeping the day-of-month when possible (short months roll to last day). */
export function addCalendarMonthsUtc(date: Date, deltaMonths: number): Date {
  const anchorDay = date.getUTCDate();
  const total = date.getUTCFullYear() * 12 + date.getUTCMonth() + deltaMonths;
  const y = Math.floor(total / 12);
  const m = ((total % 12) + 12) % 12;
  const resolved = resolveMonthlyDate(y, m, anchorDay, INSTALLMENT_MONTH_POLICY);
  if (!resolved) {
    return new Date(Date.UTC(y, m, 1, 0, 0, 0, 0));
  }
  return resolved;
}
