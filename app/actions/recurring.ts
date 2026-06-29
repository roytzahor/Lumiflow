'use server';

import { parseDateInputToUtc } from '@/lib/date-only';
import { prisma } from '@/lib/prisma';
import { getUserAccountIds, requireUserId } from '@/lib/server-user';
import { unstable_cache } from 'next/cache';
import { fetchActiveRecurringForAccounts } from '@/lib/server/recurring-query';
import type { RecurringMonthPolicy } from '@prisma/client';
import { assertUserHasAccount, logActionMetric, refreshAllViews, resolveNextRecurringRun } from './_shared';

export async function getRecurringTransactions() {
  try {
    const userId = await requireUserId();
    const accountIds = await getUserAccountIds(userId);
    if (accountIds.length === 0) return [];
    return unstable_cache(
      async () => fetchActiveRecurringForAccounts(accountIds),
      ['getRecurringTransactions', userId],
      { revalidate: 30, tags: [`lumiflow-recurring-${userId}`] },
    )();
  } catch {
    return [];
  }
}

export async function deleteRecurringTransaction(id: string) {
  try {
    const userId = await requireUserId();
    const recurring = await prisma.recurringTransaction.findUnique({
      where: { id },
      select: {
        account: {
          select: {
            members: { select: { userId: true } },
          },
        },
      },
    });
    if (!recurring) return { success: false, error: 'Not found' };
    if (!recurring.account.members.some((m) => m.userId === userId)) return { success: false, error: 'Forbidden' };

    await prisma.recurringTransaction.delete({ where: { id } });
    refreshAllViews(userId);
    return { success: true };
  } catch {
    return { success: false, error: 'Failed to delete recurring transaction' };
  }
}

export async function updateRecurringTransaction(id: string, formData: FormData) {
  try {
    const userId = await requireUserId();
    const recurring = await prisma.recurringTransaction.findUnique({
      where: { id },
      select: {
        account: {
          select: {
            members: { select: { userId: true } },
          },
        },
      },
    });
    if (!recurring) return { success: false, error: 'Not found' };
    if (!recurring.account.members.some((m) => m.userId === userId)) return { success: false, error: 'Forbidden' };

    const amount = parseFloat(String(formData.get('amount') ?? '0'));
    const description = String(formData.get('description') ?? '').trim();
    const rawDate = String(formData.get('date') ?? '');
    const date = parseDateInputToUtc(rawDate);
    const accountId = String(formData.get('accountId') ?? '').trim();
    const category = String(formData.get('category') ?? '').trim();
    const monthPolicy = (formData.get('monthPolicy') as RecurringMonthPolicy | null) ?? 'ROLL_TO_LAST_DAY';
    if (!date || !accountId || !category || !Number.isFinite(amount) || amount <= 0) {
      return { success: false, error: 'Missing required fields' };
    }

    await assertUserHasAccount(userId, accountId);
    const dayOfMonth = date.getUTCDate();
    const nextRun = resolveNextRecurringRun(date, dayOfMonth, monthPolicy);

    await prisma.recurringTransaction.update({
      where: { id },
      data: {
        amount,
        description: description || null,
        category,
        accountId,
        startDate: date,
        dayOfMonth,
        monthPolicy,
        nextRun,
        active: true,
      },
    });

    await logActionMetric('recurring_transaction_updated', userId, {
      recurringTransactionId: id,
      accountId,
      category,
    });
    refreshAllViews(userId);
    return { success: true };
  } catch {
    return { success: false, error: 'Failed to update recurring transaction' };
  }
}
