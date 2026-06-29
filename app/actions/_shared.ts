// Shared internals for the action modules: auth/revalidation helpers,
// metric logging, recurring decoration, and settings/account view types.
// Server-only by construction (imports prisma / next cache).

import { prisma } from '@/lib/prisma';
import { resolveMonthlyDate } from '@/lib/recurring-utils';
import { revalidatePath, revalidateTag } from 'next/cache';
import { after } from 'next/server';
import type { AccountMemberRole, AccountType, RecurringMonthPolicy, Transaction } from '@prisma/client';
import type { AccountSummary } from '@/lib/types';

export function startOfUtcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0));
}

export function resolveNextRecurringRun(startDate: Date, dayOfMonth: number, monthPolicy: RecurringMonthPolicy, fromDate = new Date()) {
  const threshold = startOfUtcDay(fromDate);
  const firstAllowed = startOfUtcDay(startDate);
  const baseYear = threshold.getUTCFullYear();
  const baseMonth = threshold.getUTCMonth();
  for (let offset = 0; offset < 24; offset += 1) {
    const candidate = resolveMonthlyDate(baseYear, baseMonth + offset, dayOfMonth, monthPolicy);
    if (!candidate) continue;
    if (candidate >= threshold && candidate >= firstAllowed) {
      return candidate;
    }
  }

  return new Date(Date.UTC(baseYear, baseMonth + 1, Math.min(dayOfMonth, 28)));
}

export function isSameDay(a: Date, b: Date) {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}

export async function assertUserHasAccount(userId: string, accountId: string) {
  const member = await prisma.accountMember.findUnique({
    where: {
      userId_accountId: { userId, accountId },
    },
  });
  if (!member) throw new Error('Forbidden');
  return member;
}

export function userDataCacheTags(userId: string) {
  return [
    `lumiflow-categories-${userId}`,
    `lumiflow-accounts-${userId}`,
    `lumiflow-recurring-${userId}`,
    `lumiflow-savings-labels-${userId}`,
  ] as const;
}

export function refreshAllViews(userId: string) {
  revalidatePath('/', 'layout');
  revalidatePath('/', 'page');
  revalidatePath('/history');
  revalidatePath('/settings');
  revalidatePath('/insights');
  for (const tag of userDataCacheTags(userId)) {
    revalidateTag(tag);
  }
}

/** Revalidation must not run during RSC render (e.g. `/welcome` calling `ensureDefaultWorkspace`). */
export function deferRefreshAllViews(userId: string) {
  after(() => {
    refreshAllViews(userId);
  });
}

export async function logActionMetric(eventName: string, userId: string, payload: Record<string, unknown> = {}) {
  const line = JSON.stringify({
    eventName,
    userId,
    payload,
    timestamp: new Date().toISOString(),
  });
  console.info(`[metric] ${line}`);
}

export async function decorateRecurringFlags<
  T extends Transaction & { recurringTransactionId: string | null; account: { id: string; name: string; type: AccountType } },
>(transactions: T[]) {
  return transactions.map((t) => ({
    ...t,
    isRecurring: Boolean(t.recurringTransactionId),
  }));
}

export type SettingsSectionKey = 'profile' | 'appearance' | 'accounts' | 'categories';

export async function recalculateAccountIncome(accountId: string) {
  const aggregate = await prisma.accountContributionPlan.aggregate({
    where: { accountId },
    _sum: { monthlyAmount: true },
  });
  await prisma.account.update({
    where: { id: accountId },
    data: { income: aggregate._sum.monthlyAmount ?? 0 },
  });
}

export type AccountMemberSummary = {
  userId: string;
  role: AccountMemberRole;
  name: string | null;
  email: string;
};

export type AccountWithMembersForSettings = AccountSummary & {
  members: AccountMemberSummary[];
};

export function normalizeInviteEmail(email?: string | null) {
  const normalized = email?.trim().toLowerCase();
  return normalized ? normalized : null;
}
