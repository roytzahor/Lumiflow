
'use server';

import { authOptions } from '@/auth';
import { parseDateInputToUtc } from '@/lib/date-only';
import { hashInviteToken } from '@/lib/invite-utils';
import { prisma } from '@/lib/prisma';
import { resolveMonthlyDate } from '@/lib/recurring-utils';
import { resolveOrRestoreSessionUserId } from '@/lib/session-user';
import type { AccountMemberRole, AccountType, RecurringMonthPolicy, Transaction } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { getServerSession } from 'next-auth';
import { revalidatePath } from 'next/cache';

const DEFAULT_CATEGORIES = [
  { name: 'כללי', icon: '✨', type: 'expense' },
  { name: 'מזון', icon: '🍽️', type: 'expense' },
  { name: 'דיור', icon: '🏠', type: 'expense' },
  { name: 'תחבורה', icon: '🚗', type: 'expense' },
  { name: 'בילויים', icon: '🎉', type: 'expense' },
];

async function requireUserId() {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error('Unauthorized');

  return resolveOrRestoreSessionUserId({
    userId: session.user.id,
    email: session.user.email,
    name: session.user.name,
  });
}

function startOfMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
}

function endOfMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));
}

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

async function ensureUserBootstrap(userId: string) {
  const budgetExists = await prisma.budgetSettings.findUnique({ where: { userId } });
  if (!budgetExists) {
    await prisma.budgetSettings.create({
      data: {
        userId,
        monthlyIncome: 0,
        needsPercent: 50,
        wantsPercent: 30,
        savingsPercent: 20,
      },
    });
  }

  const categoryCount = await prisma.category.count({ where: { userId } });
  if (categoryCount === 0) {
    await prisma.category.createMany({
      data: DEFAULT_CATEGORIES.map((category) => ({
        ...category,
        isCustom: false,
        userId,
      })),
    });
  }
}

async function getUserAccountIds(userId: string) {
  const memberships = await prisma.accountMember.findMany({
    where: { userId, account: { isArchived: false } },
    select: { accountId: true },
  });
  return memberships.map((m) => m.accountId);
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

function refreshAllViews() {
  revalidatePath('/', 'layout');
  revalidatePath('/', 'page');
  revalidatePath('/history');
  revalidatePath('/settings');
  revalidatePath('/insights');
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

async function decorateRecurringFlags(transactions: (Transaction & { recurringTransactionId: string | null; account: { id: string; name: string; type: AccountType; income: number; balance: number; color: string | null; icon: string | null; isArchived: boolean; createdAt: Date; updatedAt: Date } })[]) {
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

    const accountIds = await getUserAccountIds(userId);
    if (!accountId) accountId = accountIds[0] ?? '';
    if (!amount || Number.isNaN(amount) || amount <= 0 || !category || !accountId || !date) {
      return { success: false, error: 'Missing required fields' };
    }
    if (!accountIds.includes(accountId)) return { success: false, error: 'Forbidden' };

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
    refreshAllViews();
    return { success: true, transaction };
  } catch {
    return { success: false, error: 'Failed to add transaction' };
  }
}

export async function getTransactions(filter: string = 'All', year?: number, month?: number) {
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
      include: { account: true },
    });

    const actualDecorated = await decorateRecurringFlags(transactions);

    if (!hasMonthFilter) return actualDecorated;

    const recurring = await prisma.recurringTransaction.findMany({
      where: {
        active: true,
        accountId: accountFilterId ? accountFilterId : { in: accountIds },
        startDate: { lte: to! },
      },
      include: { account: true },
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
        isPremiumMock: true,
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
    return { success: true };
  } catch {
    return { success: false, error: 'עדכון תצוגה נכשל' };
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
    refreshAllViews();
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

    refreshAllViews();
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
    refreshAllViews();
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
    refreshAllViews();
    return { success: true };
  } catch {
    return { success: false, error: 'Failed to archive account' };
  }
}

export async function getAccounts() {
  try {
    const userId = await requireUserId();
    await ensureUserBootstrap(userId);
    return prisma.account.findMany({
      where: {
        isArchived: false,
        members: { some: { userId } },
      },
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
    });
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

export type AccountWithMembersForSettings = Awaited<ReturnType<typeof getAccounts>>[number] & {
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
      include: {
        members: {
          include: {
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
    refreshAllViews();
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

    revalidatePath('/');
    revalidatePath('/settings');
    revalidatePath('/insights');
    return { success: true };
  } catch {
    return { success: false, error: 'שמירת התרומה החודשית נכשלה' };
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
    return prisma.category.findMany({
      where: { userId },
      orderBy: { name: 'asc' },
    });
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
    refreshAllViews();
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
    return { success: true };
  } catch {
    return { success: false, error: 'Failed to delete category' };
  }
}

async function runGeminiPrompt(prompt: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { success: false as const, error: 'GEMINI_API_KEY is missing' };
  }

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.4,
        topP: 0.8,
        maxOutputTokens: 900,
      },
    }),
  });

  if (!response.ok) {
    return { success: false as const, error: `Gemini request failed (${response.status})` };
  }

  const payload = await response.json();
  const text = payload?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? '').join('').trim();
  if (!text) {
    return { success: false as const, error: 'Gemini response was empty' };
  }
  return { success: true as const, text };
}

function summarizeByCategory(rows: { category: string; amount: number }[]) {
  const totals = new Map<string, number>();
  rows.forEach((row) => totals.set(row.category, (totals.get(row.category) ?? 0) + row.amount));
  return Array.from(totals.entries())
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total);
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
    const topCategories = byCategory.slice(0, 5).map((row) => `${row.category}: ₪${Math.round(row.total).toLocaleString()}`).join(', ');
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

function buildMonthBucket(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export async function getInsightsAdvancedAnalysis() {
  try {
    const userId = await requireUserId();
    const accountIds = await getUserAccountIds(userId);
    if (accountIds.length === 0) return { success: true, analysis: 'אין נתונים לניתוח מתקדם כרגע.' };

    const [transactions, recurring, budget] = await Promise.all([
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
      prisma.budgetSettings.findUnique({ where: { userId } }),
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

    const categoriesRecent = summarizeByCategory(recentRows).slice(0, 8)
      .map((row) => `${row.category}: ₪${Math.round(row.total).toLocaleString()}`)
      .join(', ');
    const recurringSummary = recurring.slice(0, 10)
      .map((row) => `${row.category}: ₪${Math.round(row.amount).toLocaleString()} ביום ${row.dayOfMonth}`)
      .join(', ');
    const concentrationRisk = totalRecent > 0 ? ((summarizeByCategory(recentRows)[0]?.total ?? 0) / totalRecent) * 100 : 0;

    const prompt = `אתה אנליסט פיננסי מתקדם מאוד. נתח עומק בעברית ברמת מקבל החלטות.
נתוני בסיס:
- הוצאות כוללות: ₪${Math.round(totalAll).toLocaleString()}
- הוצאות 3 חודשים אחרונים: ₪${Math.round(totalRecent).toLocaleString()}
- מגמת 6 חודשים: ${monthTrend || 'אין'}
- מספר פעולות כולל: ${transactions.length}
- הכנסה חודשית (אם קיימת): ₪${Math.round(budget?.monthlyIncome ?? 0).toLocaleString()}
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
  anomalies: import('@/lib/types').CategoryAnomaly[];
  hasEnoughHistory: boolean;
}> {
  try {
    const userId = await requireUserId();
    const accountIds = await getUserAccountIds(userId);
    if (accountIds.length === 0) return { anomalies: [], hasEnoughHistory: false };

    const now = new Date();
    const currentFrom = startOfMonth(now.getFullYear(), now.getMonth());
    const currentTo = endOfMonth(now.getFullYear(), now.getMonth());

    // 6-month historical window, excluding current month
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

    // Count distinct months in the historical window per account
    const accountMonthSets = new Map<string, Set<string>>();
    historicalTxns.forEach((t) => {
      const bucket = buildMonthBucket(new Date(t.date));
      if (!accountMonthSets.has(t.accountId)) accountMonthSets.set(t.accountId, new Set());
      accountMonthSets.get(t.accountId)!.add(bucket);
    });

    // Determine the global number of historical months (max across accounts, floored at 1)
    const globalMonthCount = Math.max(...Array.from(accountMonthSets.values()).map((s) => s.size), 0);
    if (globalMonthCount < 2) return { anomalies: [], hasEnoughHistory: false };

    // Aggregate historical totals by (accountId, category)
    const histTotals = new Map<string, number>();
    const histMonthCounts = new Map<string, Set<string>>();
    historicalTxns.forEach((t) => {
      const key = `${t.accountId}::${t.category}`;
      const bucket = buildMonthBucket(new Date(t.date));
      histTotals.set(key, (histTotals.get(key) ?? 0) + t.amount);
      if (!histMonthCounts.has(key)) histMonthCounts.set(key, new Set());
      histMonthCounts.get(key)!.add(bucket);
    });

    // Aggregate current month totals by (accountId, category)
    const currTotals = new Map<string, number>();
    currentTxns.forEach((t) => {
      const key = `${t.accountId}::${t.category}`;
      currTotals.set(key, (currTotals.get(key) ?? 0) + t.amount);
    });

    const anomalies: import('@/lib/types').CategoryAnomaly[] = [];

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
    const top = summarizeByCategory(rows).slice(0, 6)
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
      include: { account: { include: { members: true } } },
    });
    if (!existing) return { success: false, error: 'Transaction not found' };
    if (!existing.account.members.some((m) => m.userId === userId)) return { success: false, error: 'Forbidden' };
    await assertUserHasAccount(userId, accountId);

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
    refreshAllViews();
    return { success: true };
  } catch {
    return { success: false, error: 'Failed to update transaction' };
  }
}

export async function deleteTransaction(id: string) {
  try {
    const userId = await requireUserId();
    const existing = await prisma.transaction.findUnique({
      where: { id },
      include: { account: { include: { members: true } } },
    });
    if (!existing) return { success: false, error: 'Transaction not found' };
    if (!existing.account.members.some((m) => m.userId === userId)) return { success: false, error: 'Forbidden' };

    await prisma.transaction.delete({ where: { id } });
    await logActionMetric('transaction_deleted', userId, { transactionId: id });
    refreshAllViews();
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
    return prisma.recurringTransaction.findMany({
      where: { active: true, accountId: { in: accountIds } },
      include: { account: true },
      orderBy: { nextRun: 'asc' },
    });
  } catch {
    return [];
  }
}

export async function deleteRecurringTransaction(id: string) {
  try {
    const userId = await requireUserId();
    const recurring = await prisma.recurringTransaction.findUnique({
      where: { id },
      include: { account: { include: { members: true } } },
    });
    if (!recurring) return { success: false, error: 'Not found' };
    if (!recurring.account.members.some((m) => m.userId === userId)) return { success: false, error: 'Forbidden' };

    await prisma.recurringTransaction.delete({ where: { id } });
    refreshAllViews();
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
      include: { account: { include: { members: true } } },
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
    refreshAllViews();
    return { success: true };
  } catch {
    return { success: false, error: 'Failed to update recurring transaction' };
  }
}

export async function getMonthlyStats(year: number, month: number) {
  try {
    const userId = await requireUserId();
    const accountIds = await getUserAccountIds(userId);
    if (accountIds.length === 0) {
      return { total: 0, accountTotals: [], transactions: [] };
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

    const transactions = await prisma.transaction.findMany({
      where: {
        accountId: { in: accountIds },
        date: { gte: from, lte: to },
      },
      include: { account: true },
      orderBy: { date: 'desc' },
    });

    const recurring = await prisma.recurringTransaction.findMany({
      where: {
        active: true,
        accountId: { in: accountIds },
        startDate: { lte: to },
      },
      include: { account: true },
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
    };
  } catch {
    return { total: 0, accountTotals: [], transactions: [] };
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

    refreshAllViews();
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

    refreshAllViews();
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

      if (hasMonthlyIncomeInput && normalizedMonthlyIncome != null) {
        await tx.budgetSettings.upsert({
          where: { userId },
          create: {
            userId,
            monthlyIncome: normalizedMonthlyIncome,
            needsPercent: 50,
            wantsPercent: 30,
            savingsPercent: 20,
          },
          update: {
            monthlyIncome: normalizedMonthlyIncome,
          },
        });
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
    });

    if ('error' in result && result.error) {
      return {
        success: false,
        error: 'השלמת האשף נכשלה. יש לעדכן את החשבונות ולנסות שוב.',
        code: 'INVALID_INPUT' as const,
      };
    }

    await Promise.all(result.createdAccounts.map((account) => recalculateAccountIncome(account.id)));

    refreshAllViews();
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
