
'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function addTransaction(formData: FormData) {
    const amount = parseFloat(formData.get('amount') as string);
    const description = formData.get('description') as string;
    const date = new Date(formData.get('date') as string);
    const accountId = formData.get('accountId') as string;
    const category = formData.get('category') as string;
    const isRecurring = formData.get('isRecurring') === 'true';

    if (!amount || !accountId || !category) {
        throw new Error('Missing required fields');
    }

    try {
        const transaction = await prisma.transaction.create({
            data: {
                amount,
                description,
                date,
                accountId,
                category,
            },
        });

        if (isRecurring) {
            const nextRun = new Date(date);
            nextRun.setMonth(nextRun.getMonth() + 1);

            await prisma.recurringTransaction.create({
                data: {
                    amount,
                    description,
                    category,
                    accountId,
                    startDate: date,
                    nextRun: nextRun,
                    active: true
                }
            });
        }

        revalidatePath('/');
        return { success: true, transaction };
    } catch (error) {
        console.error('Failed to add transaction:', error);
        return { success: false, error: 'Failed to add transaction' };
    }
}

export async function getTransactions(
    filter: string = 'All',
    year?: number,
    month?: number
) {
    try {
        let whereClause: Record<string, unknown> = {};

        if (filter === 'Joint') {
            whereClause = { account: { type: 'JOINT' } };
        } else if (filter === 'Roy') {
            whereClause = { account: { name: { contains: 'Roy', mode: 'insensitive' } } };
        } else if (filter === 'Romi') {
            whereClause = { account: { name: { contains: 'Romi', mode: 'insensitive' } } };
        }

        // Restrict to a single month when year and month are provided (month 0-indexed)
        if (year != null && month != null) {
            const startOfMonth = new Date(year, month, 1);
            const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59, 999);
            whereClause = {
                ...whereClause,
                date: { gte: startOfMonth, lte: endOfMonth },
            };
        }

        const transactions = await prisma.transaction.findMany({
            where: whereClause,
            orderBy: {
                date: 'desc',
            },
            include: {
                account: true,
            },
        });
        return transactions;
    } catch (error) {
        console.error('Failed to fetch transactions:', error);
        return [];
    }
}


// Settings Actions
export async function getBudgetSettings() {
    try {
        let settings = await prisma.budgetSettings.findFirst();
        if (!settings) {
            settings = await prisma.budgetSettings.create({
                data: {
                    monthlyIncome: 21000,
                    needsPercent: 50,
                    wantsPercent: 30,
                    savingsPercent: 20
                }
            });
        }
        return settings;
    } catch (error) {
        console.error("Failed to get budget settings:", error);
        return null;
    }
}


export async function updateBudgetSettings(data: { monthlyIncome: number, needsPercent: number, wantsPercent: number, savingsPercent: number, savingsGoal?: string, savingsGoalAmount?: number }) {
    try {
        let settings = await prisma.budgetSettings.findFirst();
        if (settings) {
            await prisma.budgetSettings.update({
                where: { id: settings.id },
                data
            });
        } else {
            await prisma.budgetSettings.create({ data });
        }
        revalidatePath('/settings');
        revalidatePath('/');
        return { success: true };
    } catch (error) {
        console.error("Failed to update budget settings:", error);
        return { success: false, error: "Failed to update settings" };
    }
}

export async function updateAccountNames(updates: { id: string, name: string }[]) {
    try {
        for (const update of updates) {
            await prisma.account.update({
                where: { id: update.id },
                data: { name: update.name }
            });
        }
        revalidatePath('/settings');
        revalidatePath('/');
        return { success: true };
    } catch (error) {
        console.error("Failed to update account names:", error);
        return { success: false, error: "Failed to update account names" };
    }
}

export async function getAccounts() {
    try {
        return await prisma.account.findMany({ orderBy: { type: 'asc' } });
    } catch (error) {
        return [];
    }
}

// Category Actions
export async function getCategories() {
    try {
        return await prisma.category.findMany({ orderBy: { name: 'asc' } });
    } catch (error) {
        return [];
    }
}

export async function addCategory(name: string, icon: string, type: string) {
    try {
        await prisma.category.create({
            data: { name, icon, type, isCustom: true }
        });
        revalidatePath('/settings');
        return { success: true };
    } catch (error) {
        console.error("Failed to add category:", error);
        return { success: false, error: "Failed to add category" };
    }
}

export async function deleteCategory(id: string) {
    try {
        await prisma.category.delete({ where: { id } });
        revalidatePath('/settings');
        return { success: true };
    } catch (error) {
        return { success: false, error: "Failed to delete category" };
    }
}

// Transaction CRUD
export async function updateTransaction(id: string, formData: FormData) {
    const amount = parseFloat(formData.get('amount') as string);
    const description = formData.get('description') as string;
    const date = new Date(formData.get('date') as string);
    const accountId = formData.get('accountId') as string;
    const category = formData.get('category') as string;

    try {
        await prisma.transaction.update({
            where: { id },
            data: {
                amount,
                description,
                date,
                accountId,
                category
            }
        });
        revalidatePath('/');
        return { success: true };
    } catch (error) {
        console.error("Failed to update transaction:", error);
        return { success: false, error: "Failed to update transaction" };
    }
}

export async function deleteTransaction(id: string) {
    try {
        await prisma.transaction.delete({ where: { id } });
        revalidatePath('/');
        return { success: true };
    } catch (error) {
        console.error("Failed to delete transaction:", error);
        return { success: false, error: "Failed to delete transaction" };
    }
}

export async function getRecurringTransactions() {
    try {
        return await prisma.recurringTransaction.findMany({
            include: { account: true },
            orderBy: { nextRun: 'asc' }
        });
    } catch (error) {
        return [];
    }
}

export async function deleteRecurringTransaction(id: string) {
    try {
        await prisma.recurringTransaction.delete({ where: { id } });
        revalidatePath('/settings');
        return { success: true };
    } catch (error) {
        return { success: false, error: "Failed to delete recurring transaction" };
    }
}


export async function getMonthlyStats(year: number, month: number) {
    // month is 0-indexed (0 = Jan, 11 = Dec) if coming from JS Date, but let's assume 1-indexed for API simplicity or handle it clearly.
    // Let's expect 0-indexed to match JS Date.getMonths() usage in UI.

    const startOfMonth = new Date(year, month, 1);
    const endOfMonth = new Date(year, month + 1, 0); // Last day of month

    try {
        const transactions = await prisma.transaction.findMany({
            where: {
                date: {
                    gte: startOfMonth,
                    lte: endOfMonth
                }
            },
            include: {
                account: true
            }
        });

        const jointTotal = transactions
            .filter(t => t.account.type === 'JOINT')
            .reduce((sum, t) => sum + t.amount, 0);

        const privateTotal = transactions
            .filter(t => t.account.type === 'PRIVATE')
            .reduce((sum, t) => sum + t.amount, 0);

        return {
            jointTotal,
            privateTotal,
            transactions
        };

    } catch (error) {
        console.error('Failed to fetch stats:', error);
        return { jointTotal: 0, privateTotal: 0, transactions: [] };
    }
}
