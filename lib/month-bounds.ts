/** UTC midnight at the first instant of a calendar month (month 0–11). */
export function startOfMonthUtc(year: number, month: number): Date {
  return new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
}

/** UTC last millisecond of a calendar month (month 0–11). */
export function endOfMonthUtc(year: number, month: number): Date {
  return new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));
}
