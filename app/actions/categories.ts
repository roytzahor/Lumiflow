'use server';

import { prisma } from '@/lib/prisma';
import { ensureUserBootstrap, requireUserId } from '@/lib/server-user';
import { revalidatePath, revalidateTag, unstable_cache } from 'next/cache';
import { refreshAllViews } from './_shared';

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
