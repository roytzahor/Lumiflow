const DATE_ONLY_REGEX = /^(\d{4})-(\d{2})-(\d{2})$/;

export function toDateInputValueFromUtc(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getTodayDateInputValue(): string {
  return toDateInputValueFromUtc(new Date());
}

export function parseDateInputToUtc(dateInput: string): Date | null {
  const match = DATE_ONLY_REGEX.exec(dateInput.trim());
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  const date = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date;
}

export function formatDateInputForDisplay(dateInput: string, localeTag: string): string {
  const date = parseDateInputToUtc(dateInput);
  if (!date) return '';

  return new Intl.DateTimeFormat(localeTag || 'he-IL', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}
