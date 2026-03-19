import type { RecurringMonthPolicy } from '@prisma/client';

export function dayCountInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

export function resolveMonthlyDate(
  year: number,
  month: number,
  dayOfMonth: number,
  policy: RecurringMonthPolicy
): Date | null {
  const maxDay = dayCountInMonth(year, month);
  if (dayOfMonth <= maxDay) return new Date(Date.UTC(year, month, dayOfMonth, 0, 0, 0, 0));
  if (policy === 'ROLL_TO_LAST_DAY') return new Date(Date.UTC(year, month, maxDay, 0, 0, 0, 0));
  return null;
}

export function getNextRunDateFromCurrent(current: Date, dayOfMonth: number, policy: RecurringMonthPolicy) {
  const year = current.getUTCFullYear();
  const month = current.getUTCMonth() + 1;
  return resolveMonthlyDate(year, month, dayOfMonth, policy) ?? new Date(Date.UTC(year, month + 1, 1, 0, 0, 0, 0));
}
