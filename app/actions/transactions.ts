'use server';

import { parseDateInputToUtc } from '@/lib/date-only';
import { addCalendarMonthsUtc, splitInstallmentAmounts } from '@/lib/installment-utils';
import { endOfMonthUtc as endOfMonth, startOfMonthUtc as startOfMonth } from '@/lib/month-bounds';
import { prisma } from '@/lib/prisma';
import { resolveMonthlyDate } from '@/lib/recurring-utils';
import { ensureUserBootstrap, getUserAccountIds, requireUserId } from '@/lib/server-user';
import { randomUUID } from 'crypto';
import { type ActiveRecurringRow } from '@/lib/server/recurring-query';
import type { RecurringMonthPolicy } from '@prisma/client';
import { assertUserHasAccount, decorateRecurringFlags, isSameDay, logActionMetric, refreshAllViews } from './_shared';

export async function addTransaction(formData: FormData) {
  try {
    const userId = await requireUserId();
    await ensureUserBootstrap(userId);

    const amount = parseFloat(String(formData.get('amount') ?? '0'));
    const description = String(formData.get('description') ?? '').trim();
    const rawDate = String(formData.get('date') ?? '');
    const date = parseDateInputToUtc(rawDate);
    const category = String(formData.get('category') ?? '').trim();
    const isRecurring = formData.get('isRecurring') === 'true';
    const monthPolicy = (formData.get('monthPolicy') as RecurringMonthPolicy | null) ?? 'ROLL_TO_LAST_DAY';
    let accountId = String(formData.get('accountId') ?? '');
    const rawInstallmentCount = parseInt(String(formData.get('installmentCount') ?? '1'), 10);
    const installmentCount = Number.isFinite(rawInstallmentCount)
      ? Math.min(60, Math.max(1, Math.floor(rawInstallmentCount)))
      : 1;
    const useInstallments = !isRecurring && installmentCount >= 2;

    const accountIds = await getUserAccountIds(userId);
    if (!accountId) accountId = accountIds[0] ?? '';
    if (!amount || Number.isNaN(amount) || amount <= 0 || !category || !accountId || !date) {
      return { success: false, error: 'Missing required fields' };
    }
    if (!accountIds.includes(accountId)) return { success: false, error: 'Forbidden' };

    if (useInstallments) {
      const groupId = randomUUID();
      const parts = splitInstallmentAmounts(amount, installmentCount);
      await prisma.transaction.createMany({
        data: parts.map((partAmount, index) => ({
          amount: partAmount,
          description: description || null,
          date: addCalendarMonthsUtc(date, index),
          accountId,
          category,
          paidByUserId: userId,
          attributedToUserId: userId,
          installmentGroupId: groupId,
          installmentNumber: index + 1,
          installmentTotal: installmentCount,
        })),
      });
      await logActionMetric('installment_plan_created', userId, {
        accountId,
        category,
        installmentCount,
        hasDescription: Boolean(description),
      });
      refreshAllViews(userId);
      return { success: true };
    }

    let recurringTransactionId: string | undefined;
    if (isRecurring) {
      const dayOfMonth = date.getUTCDate();
      const nextRun = resolveMonthlyDate(date.getUTCFullYear(), date.getUTCMonth() + 1, dayOfMonth, monthPolicy) ??
        new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 2, 1));

      const recurring = await prisma.recurringTransaction.create({
        data: {
          amount,
          description: description || null,
          category,
          accountId,
          startDate: date,
          nextRun,
          dayOfMonth,
          monthPolicy,
          active: true,
        },
      });
      recurringTransactionId = recurring.id;
    }

    const transaction = await prisma.transaction.create({
      data: {
        amount,
        description: description || null,
        date,
        accountId,
        category,
        paidByUserId: userId,
        attributedToUserId: userId,
        recurringTransactionId,
      },
    });

    await logActionMetric('transaction_created', userId, {
      accountId,
      category,
      isRecurring,
      hasDescription: Boolean(description),
    });
    refreshAllViews(userId);
    return { success: true, transaction };
  } catch {
    return { success: false, error: 'Failed to add transaction' };
  }
}

export async function getTransactions(
  filter: string = 'All',
  year?: number,
  month?: number,
  options?: { recurringRows?: ActiveRecurringRow[] },
) {
  try {
    const userId = await requireUserId();
    await ensureUserBootstrap(userId);
    const accountIds = await getUserAccountIds(userId);
    if (accountIds.length === 0) return [];

    const where: Record<string, unknown> = {
      accountId: { in: accountIds },
    };
    const accountFilterId = filter !== 'All' && accountIds.includes(filter) ? filter : null;

    if (accountFilterId) {
      where.accountId = accountFilterId;
    }

    const hasMonthFilter = year != null && month != null;
    const from = hasMonthFilter ? startOfMonth(year, month) : null;
    const to = hasMonthFilter ? endOfMonth(year, month) : null;

    if (year != null && month != null) {
      where.date = { gte: from!, lte: to! };
    }

    const transactions = await prisma.transaction.findMany({
      where,
      orderBy: { date: 'desc' },
      select: {
        id: true,
        amount: true,
        category: true,
        date: true,
        accountId: true,
        paidByUserId: true,
        attributedToUserId: true,
        description: true,
        recurringTransactionId: true,
        installmentGroupId: true,
        installmentNumber: true,
        installmentTotal: true,
        createdAt: true,
        account: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
        paidByUser: { select: { id: true, name: true, email: true } },
      },
    });

    const actualDecorated = await decorateRecurringFlags(transactions);

    if (!hasMonthFilter) return actualDecorated;

    const recurring: ActiveRecurringRow[] =
      options?.recurringRows != null
        ? options.recurringRows.filter((r) => {
            if (accountFilterId && r.accountId !== accountFilterId) return false;
            return r.startDate <= to!;
          })
        : await prisma.recurringTransaction.findMany({
            where: {
              active: true,
              accountId: accountFilterId ? accountFilterId : { in: accountIds },
              startDate: { lte: to! },
            },
            select: {
              id: true,
              amount: true,
              category: true,
              description: true,
              accountId: true,
              startDate: true,
              nextRun: true,
              dayOfMonth: true,
              monthPolicy: true,
              active: true,
              lastRun: true,
              account: {
                select: {
                  id: true,
                  name: true,
                  type: true,
                },
              },
            },
          });

    const projected = recurring
      .map((r) => {
        const occurrence = resolveMonthlyDate(year!, month!, r.dayOfMonth, r.monthPolicy);
        if (!occurrence) return null;
        if (occurrence < from! || occurrence > to!) return null;
        if (occurrence < r.startDate) return null;

        const exists = transactions.some(
          (t) => t.recurringTransactionId === r.id && isSameDay(new Date(t.date), occurrence)
        );
        if (exists) return null;

        return {
          id: `projected-${r.id}-${year}-${month}`,
          amount: r.amount,
          category: r.category,
          date: occurrence,
          accountId: r.accountId,
          paidByUserId: null,
          attributedToUserId: null,
          description: r.description,
          recurringTransactionId: r.id,
          installmentGroupId: null,
          installmentNumber: null,
          installmentTotal: null,
          createdAt: occurrence,
          account: r.account,
          isRecurring: true,
          isProjected: true,
        };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item));

    return [...actualDecorated, ...projected].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  } catch {
    return [];
  }
}

export async function updateTransaction(id: string, formData: FormData) {
  try {
    const userId = await requireUserId();
    const amount = parseFloat(String(formData.get('amount') ?? '0'));
    const description = String(formData.get('description') ?? '').trim();
    const rawDate = String(formData.get('date') ?? '');
    const date = parseDateInputToUtc(rawDate);
    const accountId = String(formData.get('accountId') ?? '');
    const category = String(formData.get('category') ?? '');
    const isRecurring = formData.get('isRecurring') === 'true';
    const monthPolicy = (formData.get('monthPolicy') as RecurringMonthPolicy | null) ?? 'ROLL_TO_LAST_DAY';
    if (!date || !accountId || !category || !Number.isFinite(amount) || amount <= 0) {
      return { success: false, error: 'Missing required fields' };
    }

    const existing = await prisma.transaction.findUnique({
      where: { id },
      select: {
        paidByUserId: true,
        attributedToUserId: true,
        recurringTransactionId: true,
        installmentGroupId: true,
        installmentNumber: true,
        installmentTotal: true,
        account: {
          select: {
            members: { select: { userId: true } },
          },
        },
      },
    });
    if (!existing) return { success: false, error: 'Transaction not found' };
    if (!existing.account.members.some((m) => m.userId === userId)) return { success: false, error: 'Forbidden' };
    await assertUserHasAccount(userId, accountId);

    const isInstallmentRow =
      existing.installmentGroupId != null &&
      existing.installmentNumber != null &&
      existing.installmentTotal != null;
    if (isInstallmentRow && isRecurring) {
      return { success: false, error: 'Installment rows cannot be marked as recurring' };
    }

    let recurringTransactionId = existing.recurringTransactionId;
    if (isRecurring && !recurringTransactionId) {
      const dayOfMonth = date.getUTCDate();
      const nextRun = resolveMonthlyDate(date.getUTCFullYear(), date.getUTCMonth() + 1, dayOfMonth, monthPolicy) ??
        new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 2, 1));
      const created = await prisma.recurringTransaction.create({
        data: {
          amount,
          description: description || null,
          category,
          accountId,
          startDate: date,
          nextRun,
          dayOfMonth,
          monthPolicy,
          active: true,
        },
      });
      recurringTransactionId = created.id;
    }

    if (isRecurring && recurringTransactionId) {
      const dayOfMonth = date.getUTCDate();
      const nextRun = resolveMonthlyDate(date.getUTCFullYear(), date.getUTCMonth() + 1, dayOfMonth, monthPolicy) ??
        new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 2, 1));
      await prisma.recurringTransaction.update({
        where: { id: recurringTransactionId },
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
    }

    if (!isRecurring && recurringTransactionId) {
      await prisma.recurringTransaction.delete({ where: { id: recurringTransactionId } });
      recurringTransactionId = null;
    }

    await prisma.transaction.update({
      where: { id },
      data: {
        amount,
        description: description || null,
        date,
        accountId,
        category,
        paidByUserId: existing.paidByUserId ?? userId,
        attributedToUserId: existing.attributedToUserId ?? userId,
        recurringTransactionId,
      },
    });

    await logActionMetric('transaction_updated', userId, {
      accountId,
      category,
      isRecurring,
      transactionId: id,
    });
    refreshAllViews(userId);
    return { success: true };
  } catch {
    return { success: false, error: 'Failed to update transaction' };
  }
}

export async function deleteTransaction(id: string, scope: 'single' | 'installment_group' = 'single') {
  try {
    const userId = await requireUserId();
    const existing = await prisma.transaction.findUnique({
      where: { id },
      select: {
        installmentGroupId: true,
        account: {
          select: {
            members: { select: { userId: true } },
          },
        },
      },
    });
    if (!existing) return { success: false, error: 'Transaction not found' };
    if (!existing.account.members.some((m) => m.userId === userId)) return { success: false, error: 'Forbidden' };

    if (scope === 'installment_group' && existing.installmentGroupId) {
      const accountIds = await getUserAccountIds(userId);
      await prisma.transaction.deleteMany({
        where: {
          installmentGroupId: existing.installmentGroupId,
          accountId: { in: accountIds },
        },
      });
      await logActionMetric('installment_group_deleted', userId, {
        installmentGroupId: existing.installmentGroupId,
      });
    } else {
      await prisma.transaction.delete({ where: { id } });
      await logActionMetric('transaction_deleted', userId, { transactionId: id });
    }
    refreshAllViews(userId);
    return { success: true };
  } catch {
    return { success: false, error: 'Failed to delete transaction' };
  }
}
