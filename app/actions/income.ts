'use server';

import { parseDateInputToUtc } from '@/lib/date-only';
import { endOfMonthUtc as endOfMonth, startOfMonthUtc as startOfMonth } from '@/lib/month-bounds';
import { prisma } from '@/lib/prisma';
import { ensureUserBootstrap, getUserAccountIds, requireUserId } from '@/lib/server-user';
import { assertUserHasAccount, logActionMetric, refreshAllViews } from './_shared';

export async function addIncomeEntry(formData: FormData) {
  try {
    const userId = await requireUserId();
    await ensureUserBootstrap(userId);

    const amount = parseFloat(String(formData.get('amount') ?? '0'));
    const description = String(formData.get('description') ?? '').trim();
    const rawDate = String(formData.get('date') ?? '');
    const date = parseDateInputToUtc(rawDate);
    const accountId = String(formData.get('accountId') ?? '');

    if (!amount || isNaN(amount) || amount <= 0) return { success: false, error: 'סכום לא תקין' };
    if (!accountId) return { success: false, error: 'יש לבחור חשבון' };
    if (!date) return { success: false, error: 'יש לבחור תאריך' };

    await assertUserHasAccount(userId, accountId);

    await prisma.incomeEntry.create({
      data: {
        amount,
        description: description || null,
        date,
        accountId,
        userId,
      },
    });

    await logActionMetric('income_entry_created', userId, { accountId, hasDescription: Boolean(description) });
    refreshAllViews(userId);
    return { success: true };
  } catch {
    return { success: false, error: 'הוספת ההכנסה נכשלה' };
  }
}

export async function getIncomeEntries(accountId?: string, year?: number, month?: number) {
  try {
    const userId = await requireUserId();
    const accountIds = await getUserAccountIds(userId);
    if (accountIds.length === 0) return [];

    const targetAccountIds =
      accountId && accountIds.includes(accountId) ? [accountId] : accountIds;

    const where: Record<string, unknown> = {
      userId,
      accountId: { in: targetAccountIds },
    };

    if (year != null && month != null) {
      where.date = { gte: startOfMonth(year, month), lte: endOfMonth(year, month) };
    }

    const entries = await prisma.incomeEntry.findMany({
      where,
      include: { account: { select: { name: true } } },
      orderBy: { date: 'desc' },
      take: 50,
    });

    return entries.map((e) => ({
      id: e.id,
      amount: e.amount,
      description: e.description,
      date: e.date,
      accountId: e.accountId,
      accountName: e.account.name,
    }));
  } catch {
    return [];
  }
}

export async function deleteIncomeEntry(id: string) {
  try {
    const userId = await requireUserId();
    const entry = await prisma.incomeEntry.findUnique({
      where: { id },
      select: { account: { select: { members: { select: { userId: true } } } } },
    });
    if (!entry) return { success: false, error: 'רשומה לא נמצאה' };
    if (!entry.account.members.some((m) => m.userId === userId)) {
      return { success: false, error: 'אין הרשאה למחוק רשומה זו' };
    }
    await prisma.incomeEntry.delete({ where: { id } });
    refreshAllViews(userId);
    return { success: true };
  } catch {
    return { success: false, error: 'מחיקת ההכנסה נכשלה' };
  }
}

export async function getMonthlyIncomeEntries(year: number, month: number) {
  try {
    const userId = await requireUserId();
    const accountIds = await getUserAccountIds(userId);
    if (accountIds.length === 0) return [];

    const entries = await prisma.incomeEntry.findMany({
      where: {
        userId,
        accountId: { in: accountIds },
        date: { gte: startOfMonth(year, month), lte: endOfMonth(year, month) },
      },
      select: { accountId: true, amount: true },
    });

    const byAccount = new Map<string, number>();
    for (const e of entries) {
      byAccount.set(e.accountId, (byAccount.get(e.accountId) ?? 0) + e.amount);
    }

    return Array.from(byAccount.entries()).map(([accountId, totalAmount]) => ({
      accountId,
      totalAmount,
    }));
  } catch {
    return [];
  }
}
