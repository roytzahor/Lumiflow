import type { BudgetSettings, BudgetAlert, DailyNudge, TransactionListItem } from '@/lib/types';

export function buildRetentionSignals(input: {
  transactions: TransactionListItem[];
  /** Sum of per-account planned monthly inflows (preferred baseline). */
  totalMonthlyInflow?: number | null;
  /** Sum of one-time income entries for the current month. */
  totalOneTimeIncome?: number | null;
  budgetSettings?: BudgetSettings | null;
  now?: Date;
}): { alerts: BudgetAlert[]; nudges: DailyNudge[] } {
  const now = input.now ?? new Date();
  const recurringInflow =
    input.totalMonthlyInflow != null && Number.isFinite(input.totalMonthlyInflow) && input.totalMonthlyInflow > 0
      ? input.totalMonthlyInflow
      : null;
  const oneTimeIncome =
    input.totalOneTimeIncome != null && Number.isFinite(input.totalOneTimeIncome) && input.totalOneTimeIncome > 0
      ? input.totalOneTimeIncome
      : 0;
  const fromInflow = recurringInflow != null ? recurringInflow + oneTimeIncome : null;
  const budget = fromInflow ?? input.budgetSettings?.monthlyIncome ?? 21000;
  const spent = input.transactions.reduce((sum, row) => sum + row.amount, 0);
  const ratio = budget > 0 ? spent / budget : 0;

  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const dayOfMonth = now.getDate();
  const daysLeft = Math.max(daysInMonth - dayOfMonth, 0);
  const pace = dayOfMonth > 0 ? spent / dayOfMonth : 0;
  const projected = pace * daysInMonth;
  const projectedDelta = projected - budget;
  const remaining = budget - spent;

  const byCategory = new Map<string, number>();
  input.transactions.forEach((row) => {
    const key = row.category || 'כללי';
    byCategory.set(key, (byCategory.get(key) ?? 0) + row.amount);
  });
  const topCategory = Array.from(byCategory.entries()).sort((a, b) => b[1] - a[1])[0];
  const topCategoryRatio = spent > 0 && topCategory ? topCategory[1] / spent : 0;

  const alerts: BudgetAlert[] = [];
  if (ratio >= 1) {
    alerts.push({
      id: 'over-budget',
      severity: 'critical',
      message: `עברתם את התקציב החודשי ב־₪${Math.round(Math.abs(remaining)).toLocaleString()}.`,
    });
  } else if (ratio >= 0.85) {
    alerts.push({
      id: 'near-budget',
      severity: 'warning',
      message: `נשארו רק ₪${Math.round(remaining).toLocaleString()} עד תקרת התקציב.`,
    });
  } else {
    alerts.push({
      id: 'budget-healthy',
      severity: 'ok',
      message: `נשארו ₪${Math.round(remaining).toLocaleString()} לתקציב החודשי.`,
    });
  }

  if (projectedDelta > 0) {
    alerts.push({
      id: 'projection-warning',
      severity: ratio >= 0.95 ? 'critical' : 'warning',
      message: `בקצב הנוכחי צפויה חריגה של כ־₪${Math.round(projectedDelta).toLocaleString()} עד סוף החודש.`,
    });
  }

  const nudges: DailyNudge[] = [
    {
      id: 'days-left',
      title: 'תמונת מצב יומית',
      description: `נשארו ${daysLeft} ימים בחודש.`,
      tone: 'neutral',
    },
  ];

  if (topCategory && topCategoryRatio >= 0.35) {
    nudges.push({
      id: 'top-category-focus',
      title: `קטגוריה בולטת: ${topCategory[0]}`,
      description: `הקטגוריה אחראית לכ־${Math.round(topCategoryRatio * 100)}% מההוצאות. בדיקה יומית קצרה כאן תוריד סיכון לחריגה.`,
      tone: 'warning',
    });
  }

  if (projectedDelta <= 0) {
    nudges.push({
      id: 'good-pace',
      title: 'קצב הוצאות מאוזן',
      description: 'הקצב הנוכחי עומד במסגרת התקציב. שמרו על אותו דפוס גם בשבוע הבא.',
      tone: 'positive',
    });
  } else {
    nudges.push({
      id: 'trim-plan',
      title: 'פעולה מומלצת להיום',
      description: `כדי להישאר בתקציב נסו לצמצם ₪${Math.round(projectedDelta / Math.max(daysLeft, 1)).toLocaleString()} בממוצע ליום.`,
      tone: 'warning',
    });
  }

  if (input.transactions.length < 3 && dayOfMonth > 7) {
    nudges.push({
      id: 'logging-habit',
      title: 'דיוק נתונים',
      description: 'כדאי לרשום הוצאות קטנות מדי יום כדי שהתובנות יהיו מדויקות יותר.',
      tone: 'neutral',
    });
  }

  return { alerts: alerts.slice(0, 2), nudges: nudges.slice(0, 3) };
}
