import type { RecurringMonthPolicy } from '@prisma/client';

export function dayCountInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

export function resolveMonthlyDate(
  year: number,
  month: number,
  dayOfMonth: number,
  policy: RecurringMonthPolicy
): Date | null {
  const maxDay = dayCountInMonth(year, month);
  if (dayOfMonth <= maxDay) return new Date(year, month, dayOfMonth, 0, 0, 0, 0);
  if (policy === 'ROLL_TO_LAST_DAY') return new Date(year, month, maxDay, 0, 0, 0, 0);
  return null;
}

export function getNextRunDateFromCurrent(current: Date, dayOfMonth: number, policy: RecurringMonthPolicy) {
  const year = current.getFullYear();
  const month = current.getMonth() + 1;
  return resolveMonthlyDate(year, month, dayOfMonth, policy) ?? new Date(year, month + 1, 1, 0, 0, 0, 0);
}
