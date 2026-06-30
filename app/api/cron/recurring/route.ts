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

        const results: { id: string; status: 'created' | 'skipped' | 'failed'; error?: string }[] = [];

        for (const rt of dueTransactions) {
            try {
                const nextRunDate = getNextRunDateFromCurrent(new Date(rt.nextRun), rt.dayOfMonth, rt.monthPolicy);

                const outcome = await prisma.$transaction(async (tx) => {
                    // Optimistic claim: only proceed if nextRun still matches what we read.
                    // If another invocation already advanced it, claimed.count will be 0.
                    const claimed = await tx.recurringTransaction.updateMany({
                        where: { id: rt.id, nextRun: rt.nextRun },
                        data: { lastRun: new Date(), nextRun: nextRunDate },
                    });
                    if (claimed.count === 0) {
                        return { status: 'skipped' as const };
                    }

                    await tx.transaction.create({
                        data: {
                            amount: rt.amount,
                            description: rt.description,
                            category: rt.category,
                            accountId: rt.accountId,
                            date: rt.nextRun,
                            recurringTransactionId: rt.id,
                        },
                    });

                    return { status: 'created' as const };
                });

                results.push({ id: rt.id, status: outcome.status });
            } catch (error) {
                console.error('Error processing recurring transaction', { id: rt.id, error });
                results.push({ id: rt.id, status: 'failed', error: error instanceof Error ? error.message : String(error) });
            }
        }

        const created = results.filter((r) => r.status === 'created').length;
        const skipped = results.filter((r) => r.status === 'skipped').length;
        const failed = results.filter((r) => r.status === 'failed').length;

        return NextResponse.json({
            success: true,
            processed: dueTransactions.length,
            created,
            skipped,
            failed,
            results,
        });
    } catch (error) {
        console.error('Error processing recurring transactions:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
