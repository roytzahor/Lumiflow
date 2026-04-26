
'use server';

import { parseDateInputToUtc } from '@/lib/date-only';
import { addCalendarMonthsUtc, splitInstallmentAmounts } from '@/lib/installment-utils';
import { hashInviteToken } from '@/lib/invite-utils';
import { endOfMonthUtc as endOfMonth, startOfMonthUtc as startOfMonth } from '@/lib/month-bounds';
import { prisma } from '@/lib/prisma';
import { resolveMonthlyDate } from '@/lib/recurring-utils';
import { fetchActiveRecurringForAccounts, type ActiveRecurringRow } from '@/lib/server/recurring-query';
import { logServerDev } from '@/lib/server-log';
import { ensureUserBootstrap, getUserAccountIds, requireUserId } from '@/lib/server-user';
import type { AccountMemberRole, AccountType, RecurringMonthPolicy, Transaction } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { randomBytes, randomUUID } from 'crypto';
import { revalidatePath, revalidateTag, unstable_cache } from 'next/cache';
import type { AccountSummary } from '@/lib/types';
import {
  getCategoryAnomalies as getCategoryAnomaliesImpl,
  getInsightsAdvancedAnalysis as getInsightsAdvancedAnalysisImpl,
  getInsightsBasicAnalysis as getInsightsBasicAnalysisImpl,
  queryInsightsAssistant as queryInsightsAssistantImpl,
} from './actions/insights-analysis';

function startOfUtcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0));
}

function resolveNextRecurringRun(startDate: Date, dayOfMonth: number, monthPolicy: RecurringMonthPolicy, fromDate = new Date()) {
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

function isSameDay(a: Date, b: Date) {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}

/** Creates a default private account + membership when missing; heals missing onboardingCompletedAt. Idempotent. */
export async function ensureDefaultWorkspace() {
  try {
    const userId = await requireUserId();
    await ensureUserBootstrap(userId);

    const memberCount = await prisma.accountMember.count({ where: { userId } });
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { onboardingCompletedAt: true },
    });

    if (memberCount > 0) {
      if (!user?.onboardingCompletedAt) {
        await prisma.user.update({
          where: { id: userId },
          data: { onboardingCompletedAt: new Date() },
        });
      }
      refreshAllViews(userId);
      return { ok: true as const, createdAccount: false };
    }

    let newAccountId = '';
    await prisma.$transaction(async (tx) => {
      const personal = await tx.account.create({
        data: {
          name: 'החשבון האישי שלי',
          type: 'PRIVATE',
          income: 0,
        },
      });
      newAccountId = personal.id;
      await tx.accountMember.create({
        data: {
          userId,
          accountId: personal.id,
          role: 'OWNER',
        },
      });
      await tx.user.update({
        where: { id: userId },
        data: { onboardingCompletedAt: new Date() },
      });
    });

    await recalculateAccountIncome(newAccountId);
    refreshAllViews(userId);
    return { ok: true as const, createdAccount: true };
  } catch (error) {
    logServerDev('ensure_default_workspace_failed', error);
    return { ok: false as const, createdAccount: false };
  }
}

export async function markWelcomeTourCompleted() {
  try {
    const userId = await requireUserId();
    await prisma.user.update({
      where: { id: userId },
      data: { welcomeTourCompletedAt: new Date() },
    });
    refreshAllViews(userId);
    return { success: true as const };
  } catch {
    return { success: false as const, error: 'Failed to save tour state' };
  }
}

async function assertUserHasAccount(userId: string, accountId: string) {
  const member = await prisma.accountMember.findUnique({
    where: {
      userId_accountId: { userId, accountId },
    },
  });
  if (!member) throw new Error('Forbidden');
  return member;
}

function userDataCacheTags(userId: string) {
  return [
    `lumiflow-categories-${userId}`,
    `lumiflow-accounts-${userId}`,
    `lumiflow-recurring-${userId}`,
    `lumiflow-savings-labels-${userId}`,
  ] as const;
}

function refreshAllViews(userId: string) {
  revalidatePath('/', 'layout');
  revalidatePath('/', 'page');
  revalidatePath('/history');
  revalidatePath('/settings');
  revalidatePath('/insights');
  for (const tag of userDataCacheTags(userId)) {
    revalidateTag(tag);
  }
}

async function logActionMetric(eventName: string, userId: string, payload: Record<string, unknown> = {}) {
  const line = JSON.stringify({
    eventName,
    userId,
    payload,
    timestamp: new Date().toISOString(),
  });
  console.info(`[metric] ${line}`);
}

async function decorateRecurringFlags<
  T extends Transaction & { recurringTransactionId: string | null; account: { id: string; name: string; type: AccountType } },
>(transactions: T[]) {
  return transactions.map((t) => ({
    ...t,
    isRecurring: Boolean(t.recurringTransactionId),
  }));
}

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

export async function getBudgetSettings() {
  try {
    const userId = await requireUserId();
    await ensureUserBootstrap(userId);
    return prisma.budgetSettings.findUnique({ where: { userId } });
  } catch {
    return null;
  }
}

export async function updateBudgetSettings(data: {
  monthlyIncome: number;
  needsPercent: number;
  wantsPercent: number;
  savingsPercent: number;
  savingsGoal?: string;
  savingsGoalAmount?: number;
}) {
  try {
    const userId = await requireUserId();
    await ensureUserBootstrap(userId);

    await prisma.budgetSettings.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });

    revalidatePath('/settings');
    revalidatePath('/');
    return { success: true };
  } catch {
    return { success: false, error: 'Failed to update settings' };
  }
}

export async function getCurrentUserProfile() {
  try {
    const userId = await requireUserId();
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        themePreference: true,
        dashboardRecurringSectionExpanded: true,
        dashboardSavingsSectionExpanded: true,
        dashboardSpendingSectionExpanded: true,
        historyShowRecurringTransactions: true,
        settingsProfileSectionExpanded: true,
        settingsAppearanceSectionExpanded: true,
        settingsAccountsSectionExpanded: true,
        settingsCategoriesSectionExpanded: true,
        isPremiumMock: true,
        welcomeTourCompletedAt: true,
      },
    });
    return user;
  } catch {
    return null;
  }
}

export async function updateCurrentUserProfile(input: { name?: string; email?: string }) {
  try {
    const userId = await requireUserId();
    const email = input.email?.trim().toLowerCase();
    const name = input.name?.trim();

    if (email) {
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing && existing.id !== userId) {
        return { success: false, error: 'האימייל כבר בשימוש' };
      }
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        email: email || undefined,
        name: name || null,
      },
    });

    revalidatePath('/settings');
    revalidatePath('/welcome');
    return { success: true };
  } catch {
    return { success: false, error: 'עדכון הפרופיל נכשל' };
  }
}

export async function updateCurrentUserPassword(input: { currentPassword: string; newPassword: string }) {
  try {
    const userId = await requireUserId();
    if (!input.newPassword || input.newPassword.length < 6) {
      return { success: false, error: 'סיסמה חדשה חייבת להכיל לפחות 6 תווים' };
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return { success: false, error: 'משתמש לא נמצא' };

    if (user.passwordHash) {
      const matches = await bcrypt.compare(input.currentPassword, user.passwordHash);
      if (!matches) return { success: false, error: 'הסיסמה הנוכחית שגויה' };
    }

    const passwordHash = await bcrypt.hash(input.newPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    return { success: true };
  } catch {
    return { success: false, error: 'עדכון הסיסמה נכשל' };
  }
}

export async function updateThemePreference(themePreference: 'LIGHT' | 'DARK' | 'SYSTEM') {
  try {
    const userId = await requireUserId();
    await prisma.user.update({
      where: { id: userId },
      data: { themePreference },
    });
    revalidatePath('/settings');
    revalidatePath('/welcome');
    revalidatePath('/');
    return { success: true };
  } catch {
    return { success: false, error: 'עדכון תצוגה נכשל' };
  }
}

export async function updateDashboardRecurringSectionExpanded(expanded: boolean) {
  try {
    const userId = await requireUserId();
    await prisma.user.update({
      where: { id: userId },
      data: { dashboardRecurringSectionExpanded: expanded },
    });
    revalidatePath('/');
    return { success: true };
  } catch {
    return { success: false, error: 'עדכון העדפת תצוגה נכשל' };
  }
}

export async function updateDashboardSavingsSectionExpanded(expanded: boolean) {
  try {
    const userId = await requireUserId();
    await prisma.user.update({
      where: { id: userId },
      data: { dashboardSavingsSectionExpanded: expanded },
    });
    revalidatePath('/');
    return { success: true };
  } catch {
    return { success: false, error: 'עדכון העדפת תצוגה נכשל' };
  }
}

export async function updateDashboardSpendingSectionExpanded(expanded: boolean) {
  try {
    const userId = await requireUserId();
    await prisma.user.update({
      where: { id: userId },
      data: { dashboardSpendingSectionExpanded: expanded },
    });
    revalidatePath('/');
    return { success: true };
  } catch {
    return { success: false, error: 'עדכון העדפת תצוגה נכשל' };
  }
}

export async function updateHistoryShowRecurringTransactions(show: boolean) {
  try {
    const userId = await requireUserId();
    await prisma.user.update({
      where: { id: userId },
      data: { historyShowRecurringTransactions: show },
    });
    revalidatePath('/history');
    return { success: true };
  } catch {
    return { success: false, error: 'עדכון העדפת היסטוריה נכשל' };
  }
}

export type SettingsSectionKey = 'profile' | 'appearance' | 'accounts' | 'categories';

export async function updateSettingsSectionExpanded(section: SettingsSectionKey, expanded: boolean) {
  try {
    const userId = await requireUserId();
    const data =
      section === 'profile'
        ? { settingsProfileSectionExpanded: expanded }
        : section === 'appearance'
          ? { settingsAppearanceSectionExpanded: expanded }
          : section === 'accounts'
            ? { settingsAccountsSectionExpanded: expanded }
            : { settingsCategoriesSectionExpanded: expanded };
    await prisma.user.update({
      where: { id: userId },
      data,
    });
    revalidatePath('/settings');
    return { success: true };
  } catch {
    return { success: false, error: 'עדכון תצוגת הגדרות נכשל' };
  }
}

export async function getPremiumMockStatus() {
  try {
    const userId = await requireUserId();
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { isPremiumMock: true },
    });
    return { success: true, isPremiumMock: Boolean(user?.isPremiumMock) };
  } catch {
    return { success: false, isPremiumMock: false };
  }
}

export async function setPremiumMockStatus(isPremiumMock: boolean) {
  try {
    const userId = await requireUserId();
    await prisma.user.update({
      where: { id: userId },
      data: { isPremiumMock },
    });
    revalidatePath('/insights');
    return { success: true };
  } catch {
    return { success: false, error: 'עדכון סטטוס פרימיום נכשל' };
  }
}

export async function updateAccountNames(updates: { id: string; name: string }[]) {
  try {
    const userId = await requireUserId();
    for (const update of updates) {
      await assertUserHasAccount(userId, update.id);
      await prisma.account.update({
        where: { id: update.id },
        data: { name: update.name.trim() || 'Untitled account' },
      });
    }
    refreshAllViews(userId);
    return { success: true };
  } catch {
    return { success: false, error: 'Failed to update account names' };
  }
}

async function recalculateAccountIncome(accountId: string) {
  const aggregate = await prisma.accountContributionPlan.aggregate({
    where: { accountId },
    _sum: { monthlyAmount: true },
  });
  await prisma.account.update({
    where: { id: accountId },
    data: { income: aggregate._sum.monthlyAmount ?? 0 },
  });
}

export async function createAccount(input: { name: string; type: AccountType; color?: string; icon?: string }) {
  try {
    const userId = await requireUserId();
    const account = await prisma.account.create({
      data: {
        name: input.name.trim() || 'New account',
        type: input.type,
        income: 0,
        color: input.color ?? null,
        icon: input.icon ?? null,
      },
    });

    await prisma.accountMember.create({
      data: {
        userId,
        accountId: account.id,
        role: 'OWNER',
      },
    });

    refreshAllViews(userId);
    return { success: true, account };
  } catch {
    return { success: false, error: 'Failed to create account' };
  }
}

export async function updateAccount(accountId: string, input: { name?: string; type?: AccountType; color?: string; icon?: string }) {
  try {
    const userId = await requireUserId();
    await assertUserHasAccount(userId, accountId);

    const updateData: {
      name?: string;
      type?: AccountType;
      color?: string;
      icon?: string;
    } = {
      name: input.name?.trim(),
      type: input.type,
      color: input.color,
      icon: input.icon,
    };

    await prisma.account.update({
      where: { id: accountId },
      data: updateData,
    });
    refreshAllViews(userId);
    return { success: true };
  } catch {
    return { success: false, error: 'Failed to update account' };
  }
}

export async function archiveAccount(accountId: string) {
  try {
    const userId = await requireUserId();
    const member = await assertUserHasAccount(userId, accountId);
    if (member.role !== 'OWNER') return { success: false, error: 'Only owner can archive' };

    await prisma.account.update({
      where: { id: accountId },
      data: { isArchived: true },
    });
    refreshAllViews(userId);
    return { success: true };
  } catch {
    return { success: false, error: 'Failed to archive account' };
  }
}

export async function getAccounts(): Promise<AccountSummary[]> {
  try {
    const userId = await requireUserId();
    await ensureUserBootstrap(userId);
    return unstable_cache(
      async () =>
        prisma.account.findMany({
          where: {
            isArchived: false,
            members: { some: { userId } },
          },
          orderBy: [{ type: 'asc' }, { name: 'asc' }],
          select: {
            id: true,
            name: true,
            type: true,
            income: true,
          },
        }),
      ['getAccounts', userId],
      { revalidate: 60, tags: [`lumiflow-accounts-${userId}`] },
    )();
  } catch {
    return [];
  }
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

export async function getAccountsWithMembersForSettings(): Promise<AccountWithMembersForSettings[]> {
  try {
    const userId = await requireUserId();
    await ensureUserBootstrap(userId);
    const rows = await prisma.account.findMany({
      where: {
        isArchived: false,
        members: { some: { userId } },
      },
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        type: true,
        income: true,
        members: {
          select: {
            userId: true,
            role: true,
            createdAt: true,
            user: { select: { id: true, name: true, email: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    return rows.map((account) => {
      const { members: memberRows, ...rest } = account;
      return {
        ...rest,
        members: memberRows.map((m) => ({
          userId: m.userId,
          role: m.role,
          name: m.user.name,
          email: m.user.email,
        })),
      };
    });
  } catch {
    return [];
  }
}

export async function removeAccountMember(accountId: string, memberUserId: string) {
  try {
    const userId = await requireUserId();
    const actor = await assertUserHasAccount(userId, accountId);
    if (actor.role !== 'OWNER') {
      return { success: false, error: 'רק בעל החשבון יכול להסיר משתמשים' };
    }
    if (memberUserId === userId) {
      return { success: false, error: 'לא ניתן להסיר את עצמך דרך פעולה זו' };
    }

    const target = await prisma.accountMember.findUnique({
      where: { userId_accountId: { userId: memberUserId, accountId } },
    });
    if (!target) {
      return { success: false, error: 'המשתמש אינו חבר בחשבון זה' };
    }
    if (target.role === 'OWNER') {
      return { success: false, error: 'לא ניתן להסיר בעל חשבון' };
    }

    await prisma.$transaction([
      prisma.accountContributionPlan.deleteMany({
        where: { userId: memberUserId, accountId },
      }),
      prisma.accountMember.delete({
        where: { userId_accountId: { userId: memberUserId, accountId } },
      }),
    ]);

    await recalculateAccountIncome(accountId);
    refreshAllViews(userId);
    return { success: true };
  } catch {
    return { success: false, error: 'הסרת המשתמש נכשלה' };
  }
}

export async function getContributionPlans() {
  try {
    const userId = await requireUserId();
    const accountIds = await getUserAccountIds(userId);
    if (accountIds.length === 0) return [];

    return prisma.accountContributionPlan.findMany({
      where: {
        userId,
        accountId: { in: accountIds },
      },
      select: {
        accountId: true,
        monthlyAmount: true,
      },
      orderBy: { accountId: 'asc' },
    });
  } catch {
    return [];
  }
}

export async function upsertContributionPlan(input: { accountId: string; monthlyAmount: number }) {
  try {
    const userId = await requireUserId();
    await assertUserHasAccount(userId, input.accountId);
    if (!Number.isFinite(input.monthlyAmount) || input.monthlyAmount < 0) {
      return { success: false, error: 'סכום חודשי לא תקין' };
    }

    await prisma.accountContributionPlan.upsert({
      where: {
        userId_accountId: {
          userId,
          accountId: input.accountId,
        },
      },
      create: {
        userId,
        accountId: input.accountId,
        monthlyAmount: input.monthlyAmount,
      },
      update: {
        monthlyAmount: input.monthlyAmount,
      },
    });
    await recalculateAccountIncome(input.accountId);

    refreshAllViews(userId);
    return { success: true };
  } catch {
    return { success: false, error: 'שמירת התרומה החודשית נכשלה' };
  }
}

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
    const entry = await prisma.incomeEntry.findFirst({ where: { id, userId } });
    if (!entry) return { success: false, error: 'רשומה לא נמצאה' };
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

export async function getMyContributionRatios() {
  try {
    const userId = await requireUserId();
    const accountIds = await getUserAccountIds(userId);
    if (accountIds.length === 0) return [];

    const allPlans = await prisma.accountContributionPlan.findMany({
      where: { accountId: { in: accountIds } },
      select: { userId: true, accountId: true, monthlyAmount: true },
    });

    const myPlans = allPlans.filter((p) => p.userId === userId);

    const totalsByAccount = new Map<string, number>();
    for (const p of allPlans) {
      totalsByAccount.set(p.accountId, (totalsByAccount.get(p.accountId) ?? 0) + p.monthlyAmount);
    }

    return myPlans.map((p) => ({
      accountId: p.accountId,
      myAmount: p.monthlyAmount,
      totalAmount: totalsByAccount.get(p.accountId) ?? 0,
      ratio:
        (totalsByAccount.get(p.accountId) ?? 0) > 0
          ? p.monthlyAmount / (totalsByAccount.get(p.accountId) ?? 1)
          : 1,
    }));
  } catch {
    return [];
  }
}

export async function getAccountContributionTotals() {
  try {
    const userId = await requireUserId();
    const accountIds = await getUserAccountIds(userId);
    if (accountIds.length === 0) return [];

    const plans = await prisma.accountContributionPlan.findMany({
      where: { accountId: { in: accountIds } },
      include: {
        account: {
          select: { id: true, name: true, type: true },
        },
      },
    });

    const totals = new Map<string, { accountId: string; accountName: string; accountType: AccountType; totalMonthlyInflow: number }>();
    plans.forEach((plan) => {
      const current = totals.get(plan.accountId) ?? {
        accountId: plan.accountId,
        accountName: plan.account.name,
        accountType: plan.account.type,
        totalMonthlyInflow: 0,
      };
      current.totalMonthlyInflow += plan.monthlyAmount;
      totals.set(plan.accountId, current);
    });

    return Array.from(totals.values()).sort((a, b) => b.totalMonthlyInflow - a.totalMonthlyInflow);
  } catch {
    return [];
  }
}

export async function getSharedAccountBalancePreview(accountId: string) {
  try {
    const userId = await requireUserId();
    await assertUserHasAccount(userId, accountId);

    const account = await prisma.account.findUnique({
      where: { id: accountId },
      select: {
        id: true,
        type: true,
        members: {
          select: {
            userId: true,
            user: { select: { name: true, email: true } },
          },
        },
      },
    });
    if (!account || account.type !== 'SHARED') {
      return { success: true, balances: [] as Array<{ userId: string; label: string; net: number }> };
    }

    const rows = await prisma.transaction.findMany({
      where: { accountId },
      select: {
        amount: true,
        paidByUserId: true,
        attributedToUserId: true,
      },
    });

    const totals = new Map<string, number>();
    account.members.forEach((m) => totals.set(m.userId, 0));
    rows.forEach((row) => {
      if (row.paidByUserId && totals.has(row.paidByUserId)) {
        totals.set(row.paidByUserId, (totals.get(row.paidByUserId) ?? 0) + row.amount);
      }
      if (row.attributedToUserId && totals.has(row.attributedToUserId)) {
        totals.set(row.attributedToUserId, (totals.get(row.attributedToUserId) ?? 0) - row.amount);
      }
    });

    const balances = account.members.map((member) => ({
      userId: member.userId,
      label: member.user.name ?? member.user.email,
      net: totals.get(member.userId) ?? 0,
    }));

    return { success: true, balances };
  } catch {
    return { success: false, balances: [] as Array<{ userId: string; label: string; net: number }> };
  }
}

export async function getCategories() {
  try {
    const userId = await requireUserId();
    await ensureUserBootstrap(userId);
    return unstable_cache(
      async () =>
        prisma.category.findMany({
          where: { userId },
          orderBy: { name: 'asc' },
        }),
      ['getCategories', userId],
      { revalidate: 60, tags: [`lumiflow-categories-${userId}`] },
    )();
  } catch {
    return [];
  }
}

export async function addCategory(name: string, icon: string, type: string) {
  try {
    const userId = await requireUserId();
    await prisma.category.create({
      data: { userId, name: name.trim(), icon, type, isCustom: true },
    });
    refreshAllViews(userId);
    return { success: true };
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: string }).code === 'P2002'
    ) {
      return { success: false, error: 'קטגוריה בשם הזה כבר קיימת' };
    }
    return { success: false, error: 'Failed to add category' };
  }
}

export async function updateCategory(input: { id: string; name: string; icon: string; type?: string }) {
  try {
    const userId = await requireUserId();
    const nextName = input.name.trim();
    if (!nextName) return { success: false, error: 'שם קטגוריה נדרש' };

    await prisma.category.updateMany({
      where: { id: input.id, userId },
      data: {
        name: nextName,
        icon: input.icon.trim() || '✨',
        type: input.type ?? 'expense',
      },
    });

    revalidatePath('/settings');
    revalidatePath('/');
    revalidatePath('/history');
    revalidatePath('/insights');
    revalidateTag(`lumiflow-categories-${userId}`);
    return { success: true };
  } catch {
    return { success: false, error: 'עדכון קטגוריה נכשל' };
  }
}

export async function deleteCategory(id: string) {
  try {
    const userId = await requireUserId();
    await prisma.category.deleteMany({ where: { id, userId } });
    revalidatePath('/settings');
    revalidatePath('/');
    revalidatePath('/history');
    revalidatePath('/insights');
    revalidateTag(`lumiflow-categories-${userId}`);
    return { success: true };
  } catch {
    return { success: false, error: 'Failed to delete category' };
  }
}

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

export async function getInsightsBasicAnalysis() {
  return getInsightsBasicAnalysisImpl();
}

export async function getInsightsAdvancedAnalysis() {
  return getInsightsAdvancedAnalysisImpl();
}

export async function getCategoryAnomalies() {
  return getCategoryAnomaliesImpl();
}

export async function queryInsightsAssistant(input: { question: string; advanced?: boolean }) {
  return queryInsightsAssistantImpl(input);
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

function normalizeInviteEmail(email?: string | null) {
  const normalized = email?.trim().toLowerCase();
  return normalized ? normalized : null;
}

export async function createAccountInvite(input: { accountId: string; invitedEmail?: string | null }) {
  try {
    const userId = await requireUserId();
    const member = await assertUserHasAccount(userId, input.accountId);
    if (member.role !== 'OWNER') return { success: false, error: 'Only owners can invite' };
    const account = await prisma.account.findUnique({ where: { id: input.accountId } });
    if (!account) return { success: false, error: 'Account not found' };

    const rawToken = randomBytes(24).toString('hex');
    const tokenHash = hashInviteToken(rawToken);
    const expiresInMinutes = 30;
    const expiresAt = new Date(Date.now() + 1000 * 60 * expiresInMinutes);
    const invitedEmail = normalizeInviteEmail(input.invitedEmail);

    await prisma.accountInvite.create({
      data: {
        accountId: input.accountId,
        createdById: userId,
        invitedEmail,
        tokenHash,
        expiresAt,
      },
    });

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXTAUTH_URL ?? 'http://localhost:3000';
    const inviteUrl = `${baseUrl}/settings?invite=${rawToken}`;
    return { success: true, inviteUrl, accountName: account.name, expiresInMinutes, invitedEmail };
  } catch {
    return { success: false, error: 'Failed to create invite link' };
  }
}

export async function getInvitePreview(rawToken: string) {
  try {
    await requireUserId();
    const tokenHash = hashInviteToken(rawToken);
    const invite = await prisma.accountInvite.findUnique({
      where: { tokenHash },
      include: {
        account: true,
        createdBy: true,
      },
    });
    if (!invite) return { success: false, error: 'Invalid invite' };
    if (invite.acceptedAt) return { success: false, error: 'Invite already used' };
    if (invite.expiresAt < new Date()) return { success: false, error: 'Invite expired' };

    return {
      success: true,
      invite: {
        accountName: invite.account.name,
        invitedByName: invite.createdBy.name ?? invite.createdBy.email,
        expiresAt: invite.expiresAt.toISOString(),
      },
    };
  } catch {
    return { success: false, error: 'Failed to load invite' };
  }
}

export async function acceptAccountInvite(rawToken: string) {
  try {
    const userId = await requireUserId();
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    const userEmail = user?.email?.toLowerCase() ?? '';
    const tokenHash = hashInviteToken(rawToken);

    const invite = await prisma.accountInvite.findUnique({ where: { tokenHash } });
    if (!invite) return { success: false, error: 'Invalid invite' };
    if (invite.acceptedAt) return { success: false, error: 'Invite already used' };
    if (invite.expiresAt < new Date()) return { success: false, error: 'Invite expired' };
    if (invite.invitedEmail && invite.invitedEmail !== userEmail) {
      return { success: false, error: 'Invite is assigned to a different email' };
    }

    const acceptedAt = new Date();
    const consumed = await prisma.$transaction(async (tx) => {
      const mark = await tx.accountInvite.updateMany({
        where: { id: invite.id, acceptedAt: null },
        data: { acceptedAt, acceptedById: userId },
      });
      if (mark.count !== 1) return false;
      await tx.accountMember.upsert({
        where: { userId_accountId: { userId, accountId: invite.accountId } },
        create: {
          userId,
          accountId: invite.accountId,
          role: 'MEMBER',
        },
        update: {},
      });
      return true;
    });

    if (!consumed) {
      return { success: false, error: 'Invite already used' };
    }

    refreshAllViews(userId);
    return { success: true };
  } catch {
    return { success: false, error: 'Failed to accept invite' };
  }
}

export async function getPendingAccountInvites() {
  try {
    const userId = await requireUserId();
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    const userEmail = user?.email?.toLowerCase();
    if (!userEmail) return { success: true, invites: [] };

    const invites = await prisma.accountInvite.findMany({
      where: {
        invitedEmail: userEmail,
        acceptedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: {
        account: true,
        createdBy: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      success: true,
      invites: invites.map((invite) => ({
        id: invite.id,
        accountName: invite.account.name,
        invitedByName: invite.createdBy.name ?? invite.createdBy.email,
        expiresAt: invite.expiresAt.toISOString(),
      })),
    };
  } catch {
    return { success: false, invites: [] as Array<{ id: string; accountName: string; invitedByName: string; expiresAt: string }> };
  }
}

export async function acceptPendingAccountInvite(inviteId: string) {
  try {
    const userId = await requireUserId();
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    const userEmail = user?.email?.toLowerCase() ?? '';

    const invite = await prisma.accountInvite.findUnique({ where: { id: inviteId } });
    if (!invite) return { success: false, error: 'Invite not found' };
    if (invite.acceptedAt) return { success: false, error: 'Invite already used' };
    if (invite.expiresAt < new Date()) return { success: false, error: 'Invite expired' };
    if (!invite.invitedEmail || invite.invitedEmail !== userEmail) {
      return { success: false, error: 'Invite does not match your email' };
    }

    const acceptedAt = new Date();
    const consumed = await prisma.$transaction(async (tx) => {
      const mark = await tx.accountInvite.updateMany({
        where: { id: invite.id, acceptedAt: null },
        data: { acceptedAt, acceptedById: userId },
      });
      if (mark.count !== 1) return false;
      await tx.accountMember.upsert({
        where: { userId_accountId: { userId, accountId: invite.accountId } },
        create: {
          userId,
          accountId: invite.accountId,
          role: 'MEMBER',
        },
        update: {},
      });
      return true;
    });

    if (!consumed) {
      return { success: false, error: 'Invite already used' };
    }

    refreshAllViews(userId);
    return { success: true };
  } catch {
    return { success: false, error: 'Failed to accept invite' };
  }
}

export async function completeOnboarding(input: {
  createPersonal?: boolean;
  createShared?: boolean;
  sharedAccountName?: string;
  accounts?: Array<{
    draftId?: string;
    name: string;
    type: AccountType;
  }>;
  inviteAccountDraftId?: string | null;
  invitedEmail?: string;
  monthlyIncomeNet?: number | null;
  autoSplitContributions?: boolean;
  personalContributionAmount?: number | null;
}) {
  try {
    const userId = await requireUserId();
    const normalizedSharedName = input.sharedAccountName?.trim() || 'חשבון משותף';
    const normalizedInvitedEmail = normalizeInviteEmail(input.invitedEmail);
    const hasMonthlyIncomeInput = input.monthlyIncomeNet != null && Number.isFinite(input.monthlyIncomeNet) && input.monthlyIncomeNet >= 0;
    const normalizedMonthlyIncome = hasMonthlyIncomeInput ? Number(input.monthlyIncomeNet) : null;
    const shouldAutoSplitContributions = Boolean(input.autoSplitContributions);
    const normalizedAccounts = Array.isArray(input.accounts)
      ? input.accounts
        .filter((account) => account && (account.type === 'PRIVATE' || account.type === 'SHARED'))
        .map((account) => {
          return {
            draftId: typeof account.draftId === 'string' && account.draftId ? account.draftId : null,
            name: account.name.trim(),
            type: account.type as AccountType,
          };
        })
        .filter((account) => account.name.length > 0)
      : [];
    const hasAccountsPayload = normalizedAccounts.length > 0;
    const shouldCreatePersonal = hasAccountsPayload
      ? normalizedAccounts.some((account) => account.type === 'PRIVATE')
      : Boolean(input.createPersonal);
    const shouldCreateShared = hasAccountsPayload
      ? normalizedAccounts.some((account) => account.type === 'SHARED')
      : Boolean(input.createShared);
    const hasCustomSplitAmountInput =
      input.personalContributionAmount != null &&
      Number.isFinite(input.personalContributionAmount);
    const normalizedPersonalContributionAmount = hasCustomSplitAmountInput
      ? Math.max(0, Number(input.personalContributionAmount))
      : null;

    if (!shouldCreatePersonal && !shouldCreateShared) {
      return { success: false, error: 'Choose at least one option', code: 'INVALID_INPUT' as const };
    }

    const result = await prisma.$transaction(async (tx) => {
      const createdAccounts: { id: string; name: string; type: AccountType }[] = [];
      const createdAccountDraftMap = new Map<string, { id: string; name: string; type: AccountType }>();
      let inviteUrl: string | null = null;

      if (hasAccountsPayload) {
        const duplicateAccountKeys = new Set<string>();
        for (let i = 0; i < normalizedAccounts.length; i += 1) {
          const account = normalizedAccounts[i];
          const duplicateKey = `${account.type}:${account.name.toLowerCase()}`;
          if (duplicateAccountKeys.has(duplicateKey)) {
            return { createdAccounts: [], inviteUrl: null, error: 'Duplicate account names are not allowed by type' };
          }
          duplicateAccountKeys.add(duplicateKey);
        }

        for (let i = 0; i < normalizedAccounts.length; i += 1) {
          const accountInput = normalizedAccounts[i];
          let account = await tx.account.findFirst({
            where: {
              type: accountInput.type,
              isArchived: false,
              name: accountInput.name,
              members: {
                some: {
                  userId,
                  role: 'OWNER',
                },
              },
            },
          });

          if (!account) {
            account = await tx.account.create({
              data: {
                name: accountInput.name,
                type: accountInput.type,
                income: 0,
              },
            });
          }

          await tx.accountMember.upsert({
            where: { userId_accountId: { userId, accountId: account.id } },
            create: { userId, accountId: account.id, role: 'OWNER' },
            update: { role: 'OWNER' },
          });

          const created = { id: account.id, name: account.name, type: account.type };
          createdAccounts.push(created);
          if (accountInput.draftId) {
            createdAccountDraftMap.set(accountInput.draftId, created);
          }
        }
      } else {
        if (shouldCreatePersonal) {
          let personal = await tx.account.findFirst({
            where: {
              type: 'PRIVATE',
              isArchived: false,
              members: { some: { userId } },
            },
          });

          if (!personal) {
            personal = await tx.account.create({
              data: {
                name: 'החשבון האישי שלי',
                type: 'PRIVATE',
              },
            });
          }

          await tx.accountMember.upsert({
            where: { userId_accountId: { userId, accountId: personal.id } },
            create: { userId, accountId: personal.id, role: 'OWNER' },
            update: { role: 'OWNER' },
          });

          createdAccounts.push({ id: personal.id, name: personal.name, type: personal.type });
        }

        if (shouldCreateShared) {
          let shared = await tx.account.findFirst({
            where: {
              type: 'SHARED',
              isArchived: false,
              name: normalizedSharedName,
              members: {
                some: {
                  userId,
                  role: 'OWNER',
                },
              },
            },
          });

          if (!shared) {
            shared = await tx.account.create({
              data: {
                name: normalizedSharedName,
                type: 'SHARED',
              },
            });
          }

          await tx.accountMember.upsert({
            where: { userId_accountId: { userId, accountId: shared.id } },
            create: { userId, accountId: shared.id, role: 'OWNER' },
            update: { role: 'OWNER' },
          });

          createdAccounts.push({ id: shared.id, name: shared.name, type: shared.type });
        }
      }

      const sharedInviteTarget = (() => {
        if (!shouldCreateShared) return null;
        if (input.inviteAccountDraftId && createdAccountDraftMap.has(input.inviteAccountDraftId)) {
          const selected = createdAccountDraftMap.get(input.inviteAccountDraftId);
          return selected?.type === 'SHARED' ? selected : null;
        }
        return createdAccounts.find((account) => account.type === 'SHARED') ?? null;
      })();

      if (sharedInviteTarget) {
        const rawToken = randomBytes(24).toString('hex');
        const tokenHash = hashInviteToken(rawToken);
        const expiresInMinutes = 30;
        const expiresAt = new Date(Date.now() + 1000 * 60 * expiresInMinutes);

        await tx.accountInvite.create({
          data: {
            accountId: sharedInviteTarget.id,
            createdById: userId,
            invitedEmail: normalizedInvitedEmail,
            tokenHash,
            expiresAt,
          },
        });

        const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXTAUTH_URL ?? 'http://localhost:3000';
        inviteUrl = `${baseUrl}/settings?invite=${rawToken}`;
      }

      if (createdAccounts.length === 0) {
        return { createdAccounts: [], inviteUrl, error: 'No accounts were created' };
      }

      if (createdAccounts.length > 0) {
        const incomeInCents = hasMonthlyIncomeInput && normalizedMonthlyIncome != null
          ? Math.max(Math.round(normalizedMonthlyIncome * 100), 0)
          : 0;
        const contributionByAccountId = new Map<string, number>();

        if (hasMonthlyIncomeInput && normalizedMonthlyIncome != null) {
          if (createdAccounts.length === 1) {
            contributionByAccountId.set(createdAccounts[0].id, incomeInCents / 100);
          } else if (shouldAutoSplitContributions) {
            const personalAccount = createdAccounts.find((account) => account.type === 'PRIVATE');
            const sharedAccount = createdAccounts.find((account) => account.type === 'SHARED');
            const canApplyPersonalSharedSplit = Boolean(personalAccount && sharedAccount);

            if (canApplyPersonalSharedSplit && personalAccount && sharedAccount) {
              const desiredPersonalInCents = normalizedPersonalContributionAmount != null
                ? Math.round(normalizedPersonalContributionAmount * 100)
                : Math.round(incomeInCents / 2);
              const personalInCents = Math.max(0, Math.min(desiredPersonalInCents, incomeInCents));
              const sharedInCents = Math.max(incomeInCents - personalInCents, 0);
              contributionByAccountId.set(personalAccount.id, personalInCents / 100);
              contributionByAccountId.set(sharedAccount.id, sharedInCents / 100);
            } else {
              const basePerAccountInCents = Math.floor(incomeInCents / createdAccounts.length);
              const remainderInCents = incomeInCents % createdAccounts.length;
              for (let i = 0; i < createdAccounts.length; i += 1) {
                const account = createdAccounts[i];
                const monthlyAmount = (basePerAccountInCents + (i < remainderInCents ? 1 : 0)) / 100;
                contributionByAccountId.set(account.id, monthlyAmount);
              }
            }
          }
        }

        if (contributionByAccountId.size > 0) {
          for (let i = 0; i < createdAccounts.length; i += 1) {
            const account = createdAccounts[i];
            const monthlyAmount = contributionByAccountId.get(account.id);
            if (monthlyAmount == null) continue;
            await tx.accountContributionPlan.upsert({
              where: {
                userId_accountId: {
                  userId,
                  accountId: account.id,
                },
              },
              create: {
                userId,
                accountId: account.id,
                monthlyAmount,
              },
              update: {
                monthlyAmount,
              },
            });
          }
        }
      }

      await tx.user.update({
        where: { id: userId },
        data: { onboardingCompletedAt: new Date() },
      });

      return { createdAccounts, inviteUrl };
    }, { timeout: 30000, maxWait: 30000 });

    if ('error' in result && result.error) {
      return {
        success: false,
        error: 'השלמת האשף נכשלה. יש לעדכן את החשבונות ולנסות שוב.',
        code: 'INVALID_INPUT' as const,
      };
    }

    await Promise.all(result.createdAccounts.map((account) => recalculateAccountIncome(account.id)));

    refreshAllViews(userId);
    return {
      success: true,
      createdAccounts: result.createdAccounts,
      inviteUrl: result.inviteUrl,
      code: null,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('completeOnboarding failed', {
      error: errorMessage,
      input: {
        createPersonal: Boolean(input.createPersonal),
        createShared: Boolean(input.createShared),
        hasSharedAccountName: Boolean(input.sharedAccountName?.trim()),
      },
    });

    const lowerMessage = errorMessage.toLowerCase();
    const errorCode = lowerMessage.includes('unauthorized')
      ? 'AUTH_STALE'
      : lowerMessage.includes('constraint')
        ? 'DB_CONSTRAINT'
        : lowerMessage.includes('invite')
          ? 'INVITE_CREATE_FAILED'
          : 'UNKNOWN';

    if (process.env.NODE_ENV !== 'production') {
      return {
        success: false,
        error: `השלמת האשף נכשלה: ${errorMessage}`,
        code: errorCode,
      };
    }

    return {
      success: false,
      error: 'השלמת האשף נכשלה. נסה/י שוב בעוד רגע.',
      code: errorCode,
    };
  }
}
