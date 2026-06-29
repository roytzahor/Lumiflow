'use server';

import { endOfMonthUtc as endOfMonth, startOfMonthUtc as startOfMonth } from '@/lib/month-bounds';
import { prisma } from '@/lib/prisma';
import { resolveMonthlyDate } from '@/lib/recurring-utils';
import { ensureUserBootstrap, getUserAccountIds, requireUserId } from '@/lib/server-user';
import { isSameDay } from './_shared';

export async function getMonthlyStats(year: number, month: number) {
  try {
    const userId = await requireUserId();
    await ensureUserBootstrap(userId);
    const accountIds = await getUserAccountIds(userId);
    if (accountIds.length === 0) {
      return { total: 0, accountTotals: [], transactions: [], savingsAllocations: [], savingsTotal: 0 };
    }

    const userAccounts = await prisma.account.findMany({
      where: {
        id: { in: accountIds },
        isArchived: false,
      },
      select: {
        id: true,
        name: true,
      },
      orderBy: { name: 'asc' },
    });

    const from = startOfMonth(year, month);
    const to = endOfMonth(year, month);

    const savingsAllocations = await prisma.savingsAllocation.findMany({
      where: {
        userId,
        accountId: { in: accountIds },
        date: { gte: from, lte: to },
      },
      select: {
        id: true,
        amount: true,
        standingOrderToInvestment: true,
        label: true,
        description: true,
        date: true,
        accountId: true,
        account: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
      },
      orderBy: { date: 'desc' },
    });

    const transactions = await prisma.transaction.findMany({
      where: {
        accountId: { in: accountIds },
        date: { gte: from, lte: to },
      },
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
      orderBy: { date: 'desc' },
    });

    const recurring = await prisma.recurringTransaction.findMany({
      where: {
        active: true,
        accountId: { in: accountIds },
        startDate: { lte: to },
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
        const occurrence = resolveMonthlyDate(year, month, r.dayOfMonth, r.monthPolicy);
        if (!occurrence) return null;
        if (occurrence < from || occurrence > to) return null;
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

    const actualDecorated = transactions.map((t) => ({
      ...t,
      isRecurring: Boolean(t.recurringTransactionId),
      isProjected: false,
    }));

    const all = [...actualDecorated, ...projected].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    const totalsMap = new Map<string, { accountId: string; accountName: string; total: number }>();
    userAccounts.forEach((account) => {
      totalsMap.set(account.id, {
        accountId: account.id,
        accountName: account.name,
        total: 0,
      });
    });

    all.forEach((t) => {
      const current = totalsMap.get(t.accountId) ?? {
        accountId: t.accountId,
        accountName: t.account.name,
        total: 0,
      };
      current.total += t.amount;
      totalsMap.set(t.accountId, current);
    });

    return {
      total: all.reduce((sum, row) => sum + row.amount, 0),
      accountTotals: Array.from(totalsMap.values()).sort((a, b) => {
        if (b.total !== a.total) return b.total - a.total;
        return a.accountName.localeCompare(b.accountName, 'he');
      }),
      transactions: all,
      savingsAllocations,
      savingsTotal: savingsAllocations.reduce((sum, row) => sum + row.amount, 0),
    };
  } catch {
    return { total: 0, accountTotals: [], transactions: [], savingsAllocations: [], savingsTotal: 0 };
  }
}
