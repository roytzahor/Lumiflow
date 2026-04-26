import { prisma } from '@/lib/prisma';
import { getCachedServerSession } from '@/lib/get-cached-server-session';
import { resolveOrRestoreSessionUserId } from '@/lib/session-user';
import { cache } from 'react';

const DEFAULT_CATEGORIES = [
  { name: 'כללי', icon: '✨', type: 'expense' },
  { name: 'מזון', icon: '🍽️', type: 'expense' },
  { name: 'דיור', icon: '🏠', type: 'expense' },
  { name: 'תחבורה', icon: '🚗', type: 'expense' },
  { name: 'בילויים', icon: '🎉', type: 'expense' },
];

const DEFAULT_SAVINGS_LABELS = [
  { name: 'תיק מסחר עצמאי', icon: '📈' },
  { name: 'פיקדון', icon: '🏦' },
  { name: 'BTB', icon: '💰' },
  { name: 'קופת גמל', icon: '🔐' },
  { name: 'קרן השתלמות', icon: '📋' },
  { name: 'חיסכון כללי', icon: '🐖' },
] as const;

/** One session resolution per RSC / server-action request. */
export const requireUserId = cache(async () => {
  const session = await getCachedServerSession();
  if (!session?.user) throw new Error('Unauthorized');

  return resolveOrRestoreSessionUserId({
    userId: session.user.id,
    email: session.user.email,
    name: session.user.name,
  });
});

/** Budget defaults + seeded categories/labels at most once per user per request. */
export const ensureUserBootstrap = cache(async (userId: string) => {
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

  const savingsLabelCount = await prisma.savingsLabel.count({ where: { userId } });
  if (savingsLabelCount === 0) {
    await prisma.savingsLabel.createMany({
      data: DEFAULT_SAVINGS_LABELS.map((row) => ({
        userId,
        name: row.name,
        icon: row.icon,
        isCustom: false,
        hidden: false,
      })),
    });
  }
});

/** Membership-derived account ids once per user per request. */
export const getUserAccountIds = cache(async (userId: string) => {
  const memberships = await prisma.accountMember.findMany({
    where: { userId, account: { isArchived: false } },
    select: { accountId: true },
  });
  return memberships.map((m) => m.accountId);
});
