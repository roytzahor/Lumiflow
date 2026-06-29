'use server';

import { prisma } from '@/lib/prisma';
import { requireUserId } from '@/lib/server-user';
import { revalidatePath } from 'next/cache';
import bcrypt from 'bcryptjs';

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
