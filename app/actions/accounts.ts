'use server';

import { prisma } from '@/lib/prisma';
import { computeMemberContributionRatios, computeMyContributionRatios } from '@/lib/contribution-ratios';
import { ensureUserBootstrap, getUserAccountIds, requireUserId } from '@/lib/server-user';
import { unstable_cache } from 'next/cache';
import type { AccountType } from '@prisma/client';
import type { AccountSummary } from '@/lib/types';
import { assertUserHasAccount, recalculateAccountIncome, refreshAllViews } from './_shared';
import type { AccountWithMembersForSettings } from './_shared';

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

export async function getMyContributionRatios() {
  try {
    const userId = await requireUserId();
    const accountIds = await getUserAccountIds(userId);
    if (accountIds.length === 0) return [];

    const allPlans = await prisma.accountContributionPlan.findMany({
      where: { accountId: { in: accountIds } },
      select: { userId: true, accountId: true, monthlyAmount: true },
    });

    return computeMyContributionRatios(allPlans, userId);
  } catch {
    return [];
  }
}

export async function getAccountMemberContributions(accountId: string) {
  try {
    const userId = await requireUserId();
    await assertUserHasAccount(userId, accountId);

    const plans = await prisma.accountContributionPlan.findMany({
      where: { accountId },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { monthlyAmount: 'desc' },
    });

    return computeMemberContributionRatios(
      plans.map((p) => ({
        userId: p.userId,
        name: p.user.name?.trim() || p.user.email,
        monthlyAmount: p.monthlyAmount,
      }))
    );
  } catch {
    return [];
  }
}

export async function getAllAccountContributionRatios() {
  try {
    const userId = await requireUserId();
    const accountIds = await getUserAccountIds(userId);
    if (accountIds.length === 0) return [];

    const plans = await prisma.accountContributionPlan.findMany({
      where: { accountId: { in: accountIds } },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    const byAccount = new Map<string, typeof plans>();
    for (const p of plans) {
      const list = byAccount.get(p.accountId) ?? [];
      list.push(p);
      byAccount.set(p.accountId, list);
    }

    return accountIds.map((accountId) => {
      const accountPlans = byAccount.get(accountId) ?? [];
      return {
        accountId,
        members: computeMemberContributionRatios(
          accountPlans.map((p) => ({
            userId: p.userId,
            name: p.user.name?.trim() || p.user.email,
            monthlyAmount: p.monthlyAmount,
          }))
        ),
      };
    });
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
