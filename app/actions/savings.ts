'use server';

import { parseDateInputToUtc } from '@/lib/date-only';
import { endOfMonthUtc as endOfMonth, startOfMonthUtc as startOfMonth } from '@/lib/month-bounds';
import { prisma } from '@/lib/prisma';
import { ensureUserBootstrap, getUserAccountIds, requireUserId } from '@/lib/server-user';
import { revalidateTag, unstable_cache } from 'next/cache';
import { assertUserHasAccount, logActionMetric, refreshAllViews } from './_shared';

export async function getSavingsLabels() {
  try {
    const userId = await requireUserId();
    await ensureUserBootstrap(userId);
    return unstable_cache(
      async () =>
        prisma.savingsLabel.findMany({
          where: { userId },
          orderBy: { name: 'asc' },
        }),
      ['getSavingsLabels', userId],
      { revalidate: 60, tags: [`lumiflow-savings-labels-${userId}`] },
    )();
  } catch {
    return [];
  }
}

export async function getSavingsAllocations(year?: number, month?: number) {
  try {
    const userId = await requireUserId();
    await ensureUserBootstrap(userId);
    const accountIds = await getUserAccountIds(userId);
    if (accountIds.length === 0) return [];

    const where: {
      userId: string;
      accountId: { in: string[] };
      date?: { gte: Date; lte: Date };
    } = {
      userId,
      accountId: { in: accountIds },
    };

    if (year != null && month != null) {
      where.date = { gte: startOfMonth(year, month), lte: endOfMonth(year, month) };
    }

    return prisma.savingsAllocation.findMany({
      where,
      orderBy: { date: 'desc' },
      select: {
        id: true,
        amount: true,
        standingOrderToInvestment: true,
        label: true,
        description: true,
        date: true,
        accountId: true,
        account: { select: { id: true, name: true, type: true } },
      },
    });
  } catch {
    return [];
  }
}

export async function addSavingsAllocation(formData: FormData) {
  try {
    const userId = await requireUserId();
    await ensureUserBootstrap(userId);

    const amount = parseFloat(String(formData.get('amount') ?? '0'));
    const label = String(formData.get('label') ?? '').trim();
    const description = String(formData.get('description') ?? '').trim();
    const rawDate = String(formData.get('date') ?? '');
    const date = parseDateInputToUtc(rawDate);
    let accountId = String(formData.get('accountId') ?? '');
    const standingOrderToInvestment = String(formData.get('standingOrderToInvestment') ?? '') === 'true';

    const accountIds = await getUserAccountIds(userId);
    if (!accountId) accountId = accountIds[0] ?? '';
    if (!amount || Number.isNaN(amount) || amount <= 0 || !label || !accountId || !date) {
      return { success: false, error: 'Missing required fields' };
    }
    if (!accountIds.includes(accountId)) return { success: false, error: 'Forbidden' };

    await assertUserHasAccount(userId, accountId);

    await prisma.savingsAllocation.create({
      data: {
        amount,
        standingOrderToInvestment,
        label,
        description: description || null,
        date,
        accountId,
        userId,
      },
    });

    await logActionMetric('savings_allocation_created', userId, { accountId, label });
    refreshAllViews(userId);
    return { success: true };
  } catch {
    return { success: false, error: 'Failed to add savings allocation' };
  }
}

export async function updateSavingsAllocation(id: string, formData: FormData) {
  try {
    const userId = await requireUserId();
    const existing = await prisma.savingsAllocation.findFirst({ where: { id, userId } });
    if (!existing) return { success: false, error: 'Not found' };

    const amount = parseFloat(String(formData.get('amount') ?? '0'));
    const label = String(formData.get('label') ?? '').trim();
    const description = String(formData.get('description') ?? '').trim();
    const rawDate = String(formData.get('date') ?? '');
    const date = parseDateInputToUtc(rawDate);
    const accountId = String(formData.get('accountId') ?? '');
    const standingOrderToInvestment = String(formData.get('standingOrderToInvestment') ?? '') === 'true';

    if (!amount || Number.isNaN(amount) || amount <= 0 || !label || !accountId || !date) {
      return { success: false, error: 'Missing required fields' };
    }

    await assertUserHasAccount(userId, accountId);

    await prisma.savingsAllocation.update({
      where: { id },
      data: {
        amount,
        standingOrderToInvestment,
        label,
        description: description || null,
        date,
        accountId,
      },
    });

    refreshAllViews(userId);
    return { success: true };
  } catch {
    return { success: false, error: 'Failed to update savings allocation' };
  }
}

export async function deleteSavingsAllocation(id: string) {
  try {
    const userId = await requireUserId();
    const deleted = await prisma.savingsAllocation.deleteMany({ where: { id, userId } });
    if (deleted.count === 0) return { success: false, error: 'Not found' };
    refreshAllViews(userId);
    return { success: true };
  } catch {
    return { success: false, error: 'Failed to delete' };
  }
}

export async function addSavingsLabel(name: string, icon: string) {
  try {
    const userId = await requireUserId();
    await ensureUserBootstrap(userId);
    const trimmed = name.trim();
    if (!trimmed) return { success: false, error: 'שם נדרש' };

    await prisma.savingsLabel.create({
      data: {
        userId,
        name: trimmed,
        icon: icon.trim() || '💰',
        isCustom: true,
        hidden: false,
      },
    });
    refreshAllViews(userId);
    revalidateTag(`lumiflow-savings-labels-${userId}`);
    return { success: true };
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: string }).code === 'P2002'
    ) {
      return { success: false, error: 'יעד בשם הזה כבר קיים' };
    }
    return { success: false, error: 'הוספה לא הצליחה' };
  }
}

export async function deleteSavingsLabel(id: string) {
  try {
    const userId = await requireUserId();
    const deleted = await prisma.savingsLabel.deleteMany({ where: { id, userId, isCustom: true } });
    if (deleted.count === 0) return { success: false, error: 'לא ניתן למחוק יעד זה' };
    refreshAllViews(userId);
    revalidateTag(`lumiflow-savings-labels-${userId}`);
    return { success: true };
  } catch {
    return { success: false, error: 'מחיקה נכשלה' };
  }
}

export async function setSavingsLabelHidden(id: string, hidden: boolean) {
  try {
    const userId = await requireUserId();
    const label = await prisma.savingsLabel.findFirst({ where: { id, userId } });
    if (!label) return { success: false, error: 'לא נמצא' };
    if (label.isCustom) {
      return { success: false, error: 'יעדים מותאמים אישית נמחקים במקום להסתיר' };
    }
    await prisma.savingsLabel.updateMany({
      where: { id, userId, isCustom: false },
      data: { hidden },
    });
    refreshAllViews(userId);
    revalidateTag(`lumiflow-savings-labels-${userId}`);
    return { success: true };
  } catch {
    return { success: false, error: 'עדכון נכשל' };
  }
}

export async function getSavingsAllocationInsights() {
  try {
    const userId = await requireUserId();
    await ensureUserBootstrap(userId);
    const accountIds = await getUserAccountIds(userId);
    if (accountIds.length === 0) return null;

    const now = new Date();
    const thisYear = now.getUTCFullYear();
    const thisMonth = now.getUTCMonth();

    const prev = new Date(Date.UTC(thisYear, thisMonth - 1, 15));
    const prevYear = prev.getUTCFullYear();
    const prevMonth = prev.getUTCMonth();

    const [plans, thisAlloc, prevAlloc, thisOneTime, prevOneTime] = await Promise.all([
      prisma.accountContributionPlan.findMany({
        where: { accountId: { in: accountIds } },
        select: { monthlyAmount: true },
      }),
      prisma.savingsAllocation.aggregate({
        where: {
          userId,
          accountId: { in: accountIds },
          date: { gte: startOfMonth(thisYear, thisMonth), lte: endOfMonth(thisYear, thisMonth) },
        },
        _sum: { amount: true },
      }),
      prisma.savingsAllocation.aggregate({
        where: {
          userId,
          accountId: { in: accountIds },
          date: { gte: startOfMonth(prevYear, prevMonth), lte: endOfMonth(prevYear, prevMonth) },
        },
        _sum: { amount: true },
      }),
      prisma.incomeEntry.aggregate({
        where: {
          userId,
          accountId: { in: accountIds },
          date: { gte: startOfMonth(thisYear, thisMonth), lte: endOfMonth(thisYear, thisMonth) },
        },
        _sum: { amount: true },
      }),
      prisma.incomeEntry.aggregate({
        where: {
          userId,
          accountId: { in: accountIds },
          date: { gte: startOfMonth(prevYear, prevMonth), lte: endOfMonth(prevYear, prevMonth) },
        },
        _sum: { amount: true },
      }),
    ]);

    const totalContributions = plans.reduce((s, p) => s + p.monthlyAmount, 0);
    const thisMonthIncome = totalContributions + (thisOneTime._sum.amount ?? 0);
    const prevMonthIncome = totalContributions + (prevOneTime._sum.amount ?? 0);

    const thisMonthTotal = thisAlloc._sum.amount ?? 0;
    const prevMonthTotal = prevAlloc._sum.amount ?? 0;

    const percentOfIncomeThisMonth =
      thisMonthIncome > 0 ? Math.round((thisMonthTotal / thisMonthIncome) * 1000) / 10 : null;

    return {
      thisMonthTotal,
      prevMonthTotal,
      thisMonthIncome,
      prevMonthIncome,
      percentOfIncomeThisMonth,
    };
  } catch {
    return null;
  }
}
