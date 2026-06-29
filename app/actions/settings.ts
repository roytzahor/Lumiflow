'use server';

import { prisma } from '@/lib/prisma';
import { ensureUserBootstrap, requireUserId } from '@/lib/server-user';
import { revalidatePath } from 'next/cache';
import type { SettingsSectionKey } from './_shared';

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
