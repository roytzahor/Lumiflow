import { prisma } from '@/lib/prisma';
import { getNextRunDateFromCurrent } from '@/lib/recurring-utils';
import { NextRequest, NextResponse } from 'next/server';

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: NextRequest) {
    if (!CRON_SECRET && process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'CRON_SECRET is required in production' }, { status: 500 });
    }
    if (CRON_SECRET) {
        const authHeader = request.headers.get('authorization');
        const bearer = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
        const querySecret = request.nextUrl.searchParams.get('secret');
        const provided = bearer ?? querySecret;
        if (provided !== CRON_SECRET) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
    }

    try {
        const today = new Date();

        const dueTransactions = await prisma.recurringTransaction.findMany({
            where: {
                active: true,
                nextRun: {
                    lte: today,
                },
            },
        });

        if (dueTransactions.length === 0) {
            return NextResponse.json({ message: 'No recurring transactions to process.' });
        }

        const createdTransactions = await prisma.$transaction(async (tx) => {
            const results: Awaited<ReturnType<typeof tx.transaction.create>>[] = [];
            for (const rt of dueTransactions) {
                const newTransaction = await tx.transaction.create({
                    data: {
                        amount: rt.amount,
                        description: rt.description,
                        category: rt.category,
                        accountId: rt.accountId,
                        date: rt.nextRun,
                        recurringTransactionId: rt.id,
                    },
                });
                results.push(newTransaction);

                const nextRunDate = getNextRunDateFromCurrent(new Date(rt.nextRun), rt.dayOfMonth, rt.monthPolicy);

                await tx.recurringTransaction.update({
                    where: { id: rt.id },
                    data: {
                        lastRun: new Date(),
                        nextRun: nextRunDate,
                    },
                });
            }
            return results;
        });

        return NextResponse.json({
            success: true,
            processed: dueTransactions.length,
            transactions: createdTransactions,
        });
    } catch (error) {
        console.error('Error processing recurring transactions:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
