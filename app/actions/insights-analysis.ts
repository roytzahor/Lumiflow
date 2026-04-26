import { runGeminiPrompt } from '@/lib/gemini-client';
import { endOfMonthUtc as endOfMonth, startOfMonthUtc as startOfMonth } from '@/lib/month-bounds';
import { prisma } from '@/lib/prisma';
import type { CategoryAnomaly } from '@/lib/types';
import { getUserAccountIds, requireUserId } from '@/lib/server-user';

function summarizeByCategory(rows: { category: string; amount: number }[]) {
  const totals = new Map<string, number>();
  rows.forEach((row) => totals.set(row.category, (totals.get(row.category) ?? 0) + row.amount));
  return Array.from(totals.entries())
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total);
}

function buildMonthBucket(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export async function getInsightsBasicAnalysis() {
  try {
    const userId = await requireUserId();
    const now = new Date();
    const from = startOfMonth(now.getFullYear(), now.getMonth());
    const to = endOfMonth(now.getFullYear(), now.getMonth());
    const prevFrom = startOfMonth(now.getFullYear(), now.getMonth() - 1);
    const prevTo = endOfMonth(now.getFullYear(), now.getMonth() - 1);
    const accountIds = await getUserAccountIds(userId);
    if (accountIds.length === 0) return { success: true, analysis: 'אין נתונים לניתוח כרגע.' };

    const [transactions, prevTransactions, recurring] = await Promise.all([
      prisma.transaction.findMany({
        where: {
          accountId: { in: accountIds },
          date: { gte: from, lte: to },
        },
        select: {
          amount: true,
          category: true,
          date: true,
        },
        orderBy: { date: 'desc' },
      }),
      prisma.transaction.findMany({
        where: {
          accountId: { in: accountIds },
          date: { gte: prevFrom, lte: prevTo },
        },
        select: { amount: true, category: true },
      }),
      prisma.recurringTransaction.findMany({
        where: {
          accountId: { in: accountIds },
          active: true,
        },
        select: { amount: true, category: true },
      }),
    ]);

    const total = transactions.reduce((sum, row) => sum + row.amount, 0);
    const prevTotal = prevTransactions.reduce((sum, row) => sum + row.amount, 0);
    const monthlyDeltaPercent = prevTotal > 0 ? ((total - prevTotal) / prevTotal) * 100 : 0;
    const byCategory = summarizeByCategory(transactions);
    const topCategoryTotal = byCategory[0]?.total ?? 0;
    const concentration = total > 0 ? (topCategoryTotal / total) * 100 : 0;
    const topCategories = byCategory
      .slice(0, 5)
      .map((row) => `${row.category}: ₪${Math.round(row.total).toLocaleString()}`)
      .join(', ');
    const average = transactions.length ? total / transactions.length : 0;
    const recurringBurden = recurring.reduce((sum, row) => sum + row.amount, 0);

    const prompt = `אתה אנליסט פיננסי אישי. נתח נתוני חודש נוכחי ותן תובנות בעברית, חדות ופרקטיות.
נתונים:
- סה"כ הוצאות חודש נוכחי: ₪${Math.round(total).toLocaleString()}
- סה"כ הוצאות חודש קודם: ₪${Math.round(prevTotal).toLocaleString()}
- שינוי חודשי באחוזים: ${monthlyDeltaPercent.toFixed(1)}%
- מספר פעולות: ${transactions.length}
- ממוצע לפעולה: ₪${Math.round(average).toLocaleString()}
- קטגוריות מובילות: ${topCategories || 'אין'}
- ריכוז בקטגוריה מובילה: ${concentration.toFixed(1)}%
- עומס הוצאות חוזרות פעילות: ₪${Math.round(recurringBurden).toLocaleString()}
פורמט תשובה קשיח:
## תקציר
2-3 משפטים.
## ממצאים
3-5 בולטים עם תובנות.
## פעולות מומלצות
3-4 צעדים, כל צעד עם השפעה משוערת בטווח חודשי.`;

    const ai = await runGeminiPrompt(prompt);
    if (!ai.success) {
      return {
        success: true,
        analysis: `## תקציר\nהחודש בוצעו ${transactions.length} פעולות בסך ₪${Math.round(total).toLocaleString()}, שינוי של ${monthlyDeltaPercent.toFixed(1)}% מול חודש קודם.\n\n## ממצאים\n- קטגוריה מובילה: ${byCategory[0]?.category ?? 'אין נתונים'}.\n- עומס הוצאות חוזרות: ₪${Math.round(recurringBurden).toLocaleString()}.\n- ריכוז קטגוריה מובילה: ${concentration.toFixed(1)}%.\n\n## פעולות מומלצות\n- לקבוע תקרה לקטגוריה המובילה.\n- לעבור על חיובים קבועים פעילים ולבחון הפחתה.\n- לבצע מעקב שבועי קצר למניעת חריגות.`,
      };
    }

    return { success: true, analysis: ai.text };
  } catch {
    return { success: false, error: 'ניתוח בסיסי נכשל' };
  }
}

export async function getInsightsAdvancedAnalysis() {
  try {
    const userId = await requireUserId();
    const accountIds = await getUserAccountIds(userId);
    if (accountIds.length === 0) return { success: true, analysis: 'אין נתונים לניתוח מתקדם כרגע.' };

    const [transactions, recurring, contributionPlans] = await Promise.all([
      prisma.transaction.findMany({
        where: { accountId: { in: accountIds } },
        select: { amount: true, category: true, date: true, description: true },
        orderBy: { date: 'desc' },
        take: 1600,
      }),
      prisma.recurringTransaction.findMany({
        where: { active: true, accountId: { in: accountIds } },
        select: { amount: true, category: true, dayOfMonth: true, monthPolicy: true },
      }),
      prisma.accountContributionPlan.findMany({
        where: { userId },
        select: { monthlyAmount: true },
      }),
    ]);

    const now = new Date();
    const cutoff3m = new Date(now);
    cutoff3m.setMonth(now.getMonth() - 3);
    const cutoff6m = new Date(now);
    cutoff6m.setMonth(now.getMonth() - 6);
    const recentRows = transactions.filter((t) => new Date(t.date) >= cutoff3m);
    const rows6m = transactions.filter((t) => new Date(t.date) >= cutoff6m);

    const totalAll = transactions.reduce((sum, row) => sum + row.amount, 0);
    const totalRecent = recentRows.reduce((sum, row) => sum + row.amount, 0);
    const recurringTotal = recurring.reduce((sum, row) => sum + row.amount, 0);

    const monthTotals = new Map<string, number>();
    rows6m.forEach((row) => {
      const key = buildMonthBucket(new Date(row.date));
      monthTotals.set(key, (monthTotals.get(key) ?? 0) + row.amount);
    });
    const monthTrend = Array.from(monthTotals.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, total]) => `${month}: ₪${Math.round(total).toLocaleString()}`)
      .join(', ');

    const categoriesRecent = summarizeByCategory(recentRows)
      .slice(0, 8)
      .map((row) => `${row.category}: ₪${Math.round(row.total).toLocaleString()}`)
      .join(', ');
    const recurringSummary = recurring
      .slice(0, 10)
      .map((row) => `${row.category}: ₪${Math.round(row.amount).toLocaleString()} ביום ${row.dayOfMonth}`)
      .join(', ');
    const concentrationRisk =
      totalRecent > 0 ? ((summarizeByCategory(recentRows)[0]?.total ?? 0) / totalRecent) * 100 : 0;
    const totalPlannedMonthlyInflow = contributionPlans.reduce((sum, row) => sum + row.monthlyAmount, 0);

    const prompt = `אתה אנליסט פיננסי מתקדם מאוד. נתח עומק בעברית ברמת מקבל החלטות.
נתוני בסיס:
- הוצאות כוללות: ₪${Math.round(totalAll).toLocaleString()}
- הוצאות 3 חודשים אחרונים: ₪${Math.round(totalRecent).toLocaleString()}
- מגמת 6 חודשים: ${monthTrend || 'אין'}
- מספר פעולות כולל: ${transactions.length}
- סה"כ תרומות חודשיות לחשבונות (אם הוגדרו): ₪${Math.round(totalPlannedMonthlyInflow).toLocaleString()}
- קטגוריות מובילות לאחרונה: ${categoriesRecent || 'אין'}
- ריכוז בקטגוריה מובילה ב-3 חודשים: ${concentrationRisk.toFixed(1)}%
- הוראות קבע פעילות: ${recurring.length}
- סך הוצאות חוזרות פעילות: ₪${Math.round(recurringTotal).toLocaleString()}
- פירוט חוזרות: ${recurringSummary || 'אין'}
פורמט תשובה קשיח:
## תקציר מנהלים
## תובנות עומק
4-6 בולטים.
## המלצות לפי עדיפות
5 צעדים, לכל צעד: למה, מה לעשות, והשפעה כספית משוערת.
## סיכונים לחודש הבא
3 בולטים.`;

    const ai = await runGeminiPrompt(prompt);
    if (!ai.success) {
      return {
        success: true,
        analysis: `## תקציר מנהלים\nנמצאו ${transactions.length} פעולות והוצאה של ₪${Math.round(totalAll).toLocaleString()}.\n\n## תובנות עומק\n- הוצאה ל-3 חודשים: ₪${Math.round(totalRecent).toLocaleString()}.\n- ריכוז קטגוריה מובילה: ${concentrationRisk.toFixed(1)}%.\n- עומס חוזרות: ₪${Math.round(recurringTotal).toLocaleString()}.\n\n## המלצות לפי עדיפות\n1. קבעו תקרה חודשית לקטגוריה המובילה.\n2. בצעו מעבר על חיובים חוזרים והפחתת שירותים לא חיוניים.\n3. קבעו בדיקת תקציב שבועית קצרה.\n\n## סיכונים לחודש הבא\n- החרפה בקטגוריה המובילה.\n- חריגה מצטברת אם החיובים החוזרים ימשיכו לגדול.\n- היעדר בקרה שבועית עלול לייצר סטייה משמעותית.`,
      };
    }

    return { success: true, analysis: ai.text };
  } catch {
    return { success: false, error: 'ניתוח מתקדם נכשל' };
  }
}

export async function getCategoryAnomalies(): Promise<{
  anomalies: CategoryAnomaly[];
  hasEnoughHistory: boolean;
}> {
  try {
    const userId = await requireUserId();
    const accountIds = await getUserAccountIds(userId);
    if (accountIds.length === 0) return { anomalies: [], hasEnoughHistory: false };

    const now = new Date();
    const currentFrom = startOfMonth(now.getFullYear(), now.getMonth());
    const currentTo = endOfMonth(now.getFullYear(), now.getMonth());

    const histFrom = startOfMonth(now.getFullYear(), now.getMonth() - 6);
    const histTo = new Date(currentFrom.getTime() - 1);

    const [currentTxns, historicalTxns, accounts] = await Promise.all([
      prisma.transaction.findMany({
        where: { accountId: { in: accountIds }, date: { gte: currentFrom, lte: currentTo } },
        select: { amount: true, category: true, accountId: true, date: true },
      }),
      prisma.transaction.findMany({
        where: { accountId: { in: accountIds }, date: { gte: histFrom, lte: histTo } },
        select: { amount: true, category: true, accountId: true, date: true },
      }),
      prisma.account.findMany({
        where: { id: { in: accountIds }, isArchived: false },
        select: { id: true, name: true },
      }),
    ]);

    const accountNameById = new Map(accounts.map((a) => [a.id, a.name]));

    const accountMonthSets = new Map<string, Set<string>>();
    historicalTxns.forEach((t) => {
      const bucket = buildMonthBucket(new Date(t.date));
      if (!accountMonthSets.has(t.accountId)) accountMonthSets.set(t.accountId, new Set());
      accountMonthSets.get(t.accountId)!.add(bucket);
    });

    const globalMonthCount = Math.max(...Array.from(accountMonthSets.values()).map((s) => s.size), 0);
    if (globalMonthCount < 2) return { anomalies: [], hasEnoughHistory: false };

    const histTotals = new Map<string, number>();
    const histMonthCounts = new Map<string, Set<string>>();
    historicalTxns.forEach((t) => {
      const key = `${t.accountId}::${t.category}`;
      const bucket = buildMonthBucket(new Date(t.date));
      histTotals.set(key, (histTotals.get(key) ?? 0) + t.amount);
      if (!histMonthCounts.has(key)) histMonthCounts.set(key, new Set());
      histMonthCounts.get(key)!.add(bucket);
    });

    const currTotals = new Map<string, number>();
    currentTxns.forEach((t) => {
      const key = `${t.accountId}::${t.category}`;
      currTotals.set(key, (currTotals.get(key) ?? 0) + t.amount);
    });

    const anomalies: CategoryAnomaly[] = [];

    currTotals.forEach((currentAmount, key) => {
      const [accountId, category] = key.split('::');
      const monthsWithData = histMonthCounts.get(key)?.size ?? 0;
      if (monthsWithData < 2) return;

      const historicalTotal = histTotals.get(key) ?? 0;
      const monthlyAverage = historicalTotal / monthsWithData;
      const difference = currentAmount - monthlyAverage;
      const percentChange = monthlyAverage > 0 ? (difference / monthlyAverage) * 100 : 0;

      if (Math.abs(difference) < 100 || Math.abs(percentChange) < 30) return;

      anomalies.push({
        accountName: accountNameById.get(accountId) ?? accountId,
        category: category || 'כללי',
        currentAmount,
        monthlyAverage,
        difference,
        percentChange,
        direction: difference > 0 ? 'up' : 'down',
      });
    });

    anomalies.sort((a, b) => Math.abs(b.difference) - Math.abs(a.difference));

    return { anomalies: anomalies.slice(0, 5), hasEnoughHistory: true };
  } catch {
    return { anomalies: [], hasEnoughHistory: false };
  }
}

export async function queryInsightsAssistant(input: { question: string; advanced?: boolean }) {
  try {
    const question = input.question?.trim();
    if (!question) return { success: false, error: 'שאלה נדרשת' };

    const userId = await requireUserId();
    const accountIds = await getUserAccountIds(userId);
    if (accountIds.length === 0) return { success: true, answer: 'אין מספיק נתונים כדי לענות כרגע.' };

    const limit = input.advanced ? 600 : 250;
    const rows = await prisma.transaction.findMany({
      where: {
        accountId: { in: accountIds },
      },
      select: {
        amount: true,
        category: true,
        date: true,
        description: true,
      },
      orderBy: { date: 'desc' },
      take: limit,
    });
    const total = rows.reduce((sum, row) => sum + row.amount, 0);
    const top = summarizeByCategory(rows)
      .slice(0, 6)
      .map((row) => `${row.category}: ₪${Math.round(row.total).toLocaleString()}`)
      .join(', ');
    const prompt = `ענה בעברית קצרה ומעשית לשאלה על נתוני משתמש.
שאלה: ${question}
נתוני הקשר:
- מספר פעולות שנבדקו: ${rows.length}
- סך הוצאות במדגם: ₪${Math.round(total).toLocaleString()}
- קטגוריות בולטות: ${top || 'אין'}
הנחיות:
- תשובה עניינית בלבד.
- אם חסר מידע, ציין מה חסר.`;

    const ai = await runGeminiPrompt(prompt);
    if (!ai.success) {
      return { success: false, error: ai.error };
    }

    return { success: true, answer: ai.text };
  } catch {
    return { success: false, error: 'מענה עוזר ניתוח נכשל' };
  }
}
