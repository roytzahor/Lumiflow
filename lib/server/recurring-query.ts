import { prisma } from '@/lib/prisma';

const activeRecurringSelect = {
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
} as const;

export type ActiveRecurringRow = Awaited<ReturnType<typeof fetchActiveRecurringForAccounts>>[number];

export async function fetchActiveRecurringForAccounts(accountIds: string[]) {
  if (accountIds.length === 0) return [];
  return prisma.recurringTransaction.findMany({
    where: { active: true, accountId: { in: accountIds } },
    select: activeRecurringSelect,
    orderBy: { nextRun: 'asc' },
  });
}
