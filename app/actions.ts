
'use server';

import { authOptions } from '@/auth';
import { hashInviteToken } from '@/lib/invite-utils';
import { prisma } from '@/lib/prisma';
import { resolveMonthlyDate } from '@/lib/recurring-utils';
import type { AccountType, RecurringMonthPolicy, Transaction } from '@prisma/client';
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
  const userId = session?.user?.id;
  if (!userId) throw new Error('Unauthorized');
  return userId;
}

function startOfMonth(year: number, month: number) {
  return new Date(year, month, 1, 0, 0, 0, 0);
}

function endOfMonth(year: number, month: number) {
  return new Date(year, month + 1, 0, 23, 59, 59, 999);
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

async function ensureUserBootstrap(userId: string) {
  const accountCount = await prisma.accountMember.count({ where: { userId } });
  if (accountCount === 0) {
    const account = await prisma.account.create({
      data: {
        name: 'Main Account',
        type: 'PRIVATE',
      },
    });

    await prisma.accountMember.create({
      data: {
        userId,
        accountId: account.id,
        role: 'OWNER',
      },
    });
  }

  const budgetExists = await prisma.budgetSettings.findUnique({ where: { userId } });
  if (!budgetExists) {
    await prisma.budgetSettings.create({
      data: {
        userId,
        monthlyIncome: 21000,
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
  revalidatePath('/');
  revalidatePath('/history');
  revalidatePath('/settings');
}

async function decorateRecurringFlags(transactions: (Transaction & { recurringTransactionId: string | null; account: { id: string; name: string; type: AccountType; balance: number; color: string | null; icon: string | null; isArchived: boolean; createdAt: Date; updatedAt: Date } })[]) {
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
    const date = new Date(String(formData.get('date') ?? ''));
    const category = String(formData.get('category') ?? '').trim();
    const isRecurring = formData.get('isRecurring') === 'true';
    const monthPolicy = (formData.get('monthPolicy') as RecurringMonthPolicy | null) ?? 'ROLL_TO_LAST_DAY';
    let accountId = String(formData.get('accountId') ?? '');

    const accountIds = await getUserAccountIds(userId);
    if (!accountId) accountId = accountIds[0] ?? '';
    if (!amount || Number.isNaN(amount) || amount <= 0 || !category || !accountId) {
      return { success: false, error: 'Missing required fields' };
    }
    if (!accountIds.includes(accountId)) return { success: false, error: 'Forbidden' };

    let recurringTransactionId: string | undefined;
    if (isRecurring) {
      const dayOfMonth = date.getDate();
      const nextRun = resolveMonthlyDate(date.getFullYear(), date.getMonth() + 1, dayOfMonth, monthPolicy) ??
        new Date(date.getFullYear(), date.getMonth() + 2, 1);

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
        recurringTransactionId,
      },
    });

    refreshAllViews();
    return { success: true, transaction };
  } catch (error) {
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

    if (filter !== 'All' && accountIds.includes(filter)) {
      where.accountId = filter;
    }

    if (year != null && month != null) {
      where.date = { gte: startOfMonth(year, month), lte: endOfMonth(year, month) };
    }

    const transactions = await prisma.transaction.findMany({
      where,
      orderBy: { date: 'desc' },
      include: { account: true },
    });

    return decorateRecurringFlags(transactions);
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

export async function createAccount(input: { name: string; type: AccountType; color?: string; icon?: string }) {
  try {
    const userId = await requireUserId();
    const account = await prisma.account.create({
      data: {
        name: input.name.trim() || 'New account',
        type: input.type,
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
    const member = await assertUserHasAccount(userId, accountId);
    if (member.role !== 'OWNER') return { success: false, error: 'Only owner can edit this account' };

    await prisma.account.update({
      where: { id: accountId },
      data: {
        name: input.name?.trim(),
        type: input.type,
        color: input.color,
        icon: input.icon,
      },
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
    revalidatePath('/settings');
    return { success: true };
  } catch {
    return { success: false, error: 'Failed to add category' };
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

export async function updateTransaction(id: string, formData: FormData) {
  try {
    const userId = await requireUserId();
    const amount = parseFloat(String(formData.get('amount') ?? '0'));
    const description = String(formData.get('description') ?? '').trim();
    const date = new Date(String(formData.get('date') ?? ''));
    const accountId = String(formData.get('accountId') ?? '');
    const category = String(formData.get('category') ?? '');
    const isRecurring = formData.get('isRecurring') === 'true';
    const monthPolicy = (formData.get('monthPolicy') as RecurringMonthPolicy | null) ?? 'ROLL_TO_LAST_DAY';

    const existing = await prisma.transaction.findUnique({
      where: { id },
      include: { account: { include: { members: true } } },
    });
    if (!existing) return { success: false, error: 'Transaction not found' };
    if (!existing.account.members.some((m) => m.userId === userId)) return { success: false, error: 'Forbidden' };
    await assertUserHasAccount(userId, accountId);

    let recurringTransactionId = existing.recurringTransactionId;
    if (isRecurring && !recurringTransactionId) {
      const dayOfMonth = date.getDate();
      const nextRun = resolveMonthlyDate(date.getFullYear(), date.getMonth() + 1, dayOfMonth, monthPolicy) ??
        new Date(date.getFullYear(), date.getMonth() + 2, 1);
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
      const dayOfMonth = date.getDate();
      const nextRun = resolveMonthlyDate(date.getFullYear(), date.getMonth() + 1, dayOfMonth, monthPolicy) ??
        new Date(date.getFullYear(), date.getMonth() + 2, 1);
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
        recurringTransactionId,
      },
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

export async function getMonthlyStats(year: number, month: number) {
  try {
    const userId = await requireUserId();
    const accountIds = await getUserAccountIds(userId);
    if (accountIds.length === 0) {
      return { total: 0, accountTotals: [], transactions: [] };
    }

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
      accountTotals: Array.from(totalsMap.values()).sort((a, b) => b.total - a.total),
      transactions: all,
    };
  } catch {
    return { total: 0, accountTotals: [], transactions: [] };
  }
}

export async function createAccountInvite(accountId: string) {
  try {
    const userId = await requireUserId();
    const member = await assertUserHasAccount(userId, accountId);
    if (member.role !== 'OWNER') return { success: false, error: 'Only owners can invite' };
    const account = await prisma.account.findUnique({ where: { id: accountId } });
    if (!account) return { success: false, error: 'Account not found' };

    const rawToken = randomBytes(24).toString('hex');
    const tokenHash = hashInviteToken(rawToken);
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);

    await prisma.accountInvite.create({
      data: {
        accountId,
        createdById: userId,
        tokenHash,
        expiresAt,
      },
    });

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXTAUTH_URL ?? 'http://localhost:3000';
    const inviteUrl = `${baseUrl}/settings?invite=${rawToken}`;
    return { success: true, inviteUrl, accountName: account.name };
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
    const tokenHash = hashInviteToken(rawToken);

    const invite = await prisma.accountInvite.findUnique({ where: { tokenHash } });
    if (!invite) return { success: false, error: 'Invalid invite' };
    if (invite.acceptedAt) return { success: false, error: 'Invite already used' };
    if (invite.expiresAt < new Date()) return { success: false, error: 'Invite expired' };

    await prisma.accountMember.upsert({
      where: { userId_accountId: { userId, accountId: invite.accountId } },
      create: {
        userId,
        accountId: invite.accountId,
        role: 'MEMBER',
      },
      update: {},
    });

    await prisma.accountInvite.update({
      where: { id: invite.id },
      data: {
        acceptedAt: new Date(),
        acceptedById: userId,
      },
    });

    refreshAllViews();
    return { success: true };
  } catch {
    return { success: false, error: 'Failed to accept invite' };
  }
}

export async function completeOnboarding(input: {
  createPersonal: boolean;
  createShared: boolean;
  sharedAccountName?: string;
}) {
  try {
    const userId = await requireUserId();
    const createdAccounts: { id: string; name: string; type: AccountType }[] = [];

    if (!input.createPersonal && !input.createShared) {
      return { success: false, error: 'Choose at least one option' };
    }

    if (input.createPersonal) {
      let personal = await prisma.account.findFirst({
        where: {
          type: 'PRIVATE',
          isArchived: false,
          members: { some: { userId } },
        },
      });
      if (!personal) {
        personal = await prisma.account.create({
          data: {
            name: 'החשבון האישי שלי',
            type: 'PRIVATE',
          },
        });
        await prisma.accountMember.create({
          data: { userId, accountId: personal.id, role: 'OWNER' },
        });
      }
      createdAccounts.push({ id: personal.id, name: personal.name, type: personal.type });
    }

    let inviteUrl: string | null = null;
    if (input.createShared) {
      const sharedName = input.sharedAccountName?.trim() || 'חשבון משותף';
      const shared = await prisma.account.create({
        data: {
          name: sharedName,
          type: 'SHARED',
        },
      });
      await prisma.accountMember.create({
        data: { userId, accountId: shared.id, role: 'OWNER' },
      });
      createdAccounts.push({ id: shared.id, name: shared.name, type: shared.type });

      const invite = await createAccountInvite(shared.id);
      inviteUrl = invite.success ? invite.inviteUrl ?? null : null;
    }

    refreshAllViews();
    return { success: true, createdAccounts, inviteUrl };
  } catch {
    return { success: false, error: 'Failed to complete onboarding' };
  }
}
