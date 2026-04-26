"use client";

import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, PiggyBank } from 'lucide-react';
import { formatIlsAmount, formatUtcDateLabel, getCalendarDateKeyInTimeZone, getUtcDateKey } from '@/lib/formatters';
import type { TransactionListItem, Category, SavingsAllocationListItem, SavingsLabel } from '@/lib/types';

function addedByDisplayName(user: { name: string | null; email: string }): string {
    const name = user.name?.trim();
    if (name) return name;
    const email = user.email.trim();
    const at = email.indexOf('@');
    return at > 0 ? email.slice(0, at) : email;
}

type FeedRow =
    | { kind: 'transaction'; transaction: TransactionListItem }
    | { kind: 'savings'; savings: SavingsAllocationListItem };

interface TransactionFeedProps {
    transactions: TransactionListItem[];
    categories?: Category[];
    onTransactionClick?: (transaction: TransactionListItem) => void;
    savingsAllocations?: SavingsAllocationListItem[];
    savingsLabels?: SavingsLabel[];
    showSavingsInFeed?: boolean;
    onSavingsClick?: (savings: SavingsAllocationListItem) => void;
}

const JERUSALEM_TZ = 'Asia/Jerusalem';

function savingsIcon(labels: SavingsLabel[] | undefined, labelName: string): string {
    return labels?.find((l) => l.name === labelName)?.icon ?? '🐖';
}

export default function TransactionFeed({
    transactions = [],
    categories = [],
    onTransactionClick,
    savingsAllocations = [],
    savingsLabels = [],
    showSavingsInFeed = false,
    onSavingsClick,
}: TransactionFeedProps) {
    const todayJerusalemKey = useMemo(() => getCalendarDateKeyInTimeZone(new Date(), JERUSALEM_TZ), []);

    const getIcon = (categoryName: string) => {
        const cat = categories.find(c => c.name === categoryName);
        return cat ? cat.icon : '🛒';
    };

    const getAccountBadge = (t: TransactionListItem) => {
        if (t.account?.type === 'SHARED') return { label: t.account?.name || 'משותף', color: 'text-ios-indigo bg-ios-indigo/8' };
        return { label: t.account?.name || '', color: 'text-ios-blue bg-ios-teal/8' };
    };

    const getSavingsAccountBadge = (s: SavingsAllocationListItem) => {
        if (s.account?.type === 'SHARED') return { label: s.account?.name || 'משותף', color: 'text-ios-indigo bg-ios-indigo/8' };
        return { label: s.account?.name || '', color: 'text-ios-blue bg-ios-teal/8' };
    };

    const isPlannedFutureRecurring = (t: TransactionListItem) => {
        if (!t.isRecurring || !t.isProjected) return false;
        const occurrenceKey = getUtcDateKey(t.date);
        return occurrenceKey > todayJerusalemKey;
    };

    const groupedByDate = useMemo(() => {
        const rows: FeedRow[] = [];
        for (const t of transactions) {
            rows.push({ kind: 'transaction', transaction: t });
        }
        if (showSavingsInFeed) {
            for (const s of savingsAllocations) {
                rows.push({ kind: 'savings', savings: s });
            }
        }
        const groups = rows.reduce<Record<string, FeedRow[]>>((acc, row) => {
            const dateKey = getUtcDateKey(
                row.kind === 'transaction' ? row.transaction.date : row.savings.date
            );
            if (!acc[dateKey]) acc[dateKey] = [];
            acc[dateKey].push(row);
            return acc;
        }, {});
        for (const k of Object.keys(groups)) {
            groups[k].sort((a, b) => {
                const ta =
                    a.kind === 'transaction'
                        ? new Date(a.transaction.date).getTime()
                        : new Date(a.savings.date).getTime();
                const tb =
                    b.kind === 'transaction'
                        ? new Date(b.transaction.date).getTime()
                        : new Date(b.savings.date).getTime();
                return tb - ta;
            });
        }
        return groups;
    }, [transactions, savingsAllocations, showSavingsInFeed]);

    const sortedDates = Object.keys(groupedByDate).sort((a, b) => b.localeCompare(a));

    const isEmpty =
        transactions.length === 0 && (!showSavingsInFeed || savingsAllocations.length === 0);

    return (
        <div className="w-full mt-3 pb-6 min-w-0">
            <AnimatePresence mode="popLayout">
                {isEmpty ? (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="flex flex-col items-center justify-center py-16 text-ios-subtle dark:text-ios-dark-subtle"
                    >
                        <div className="w-14 h-14 bg-ios-gray-6 dark:bg-ios-dark-fill rounded-full flex items-center justify-center mb-3">
                            <span className="text-2xl opacity-60">💸</span>
                        </div>
                        <p className="text-sm font-medium text-center px-2">
                            לא נוספו עדיין הוצאות
                        </p>
                    </motion.div>
                ) : (
                    <div className="space-y-5">
                        {sortedDates.map((dateKey) => (
                            <div key={dateKey}>
                                <p className="text-xs font-semibold text-ios-subtle dark:text-ios-dark-subtle uppercase tracking-wider mb-2 px-1">
                                    {formatUtcDateLabel(dateKey)}
                                </p>

                                <div className="bg-ios-card dark:bg-ios-dark-card rounded-2xl shadow-card overflow-hidden divide-y divide-black/5 dark:divide-white/10">
                                    {groupedByDate[dateKey].map((row) => {
                                        if (row.kind === 'savings') {
                                            const s = row.savings;
                                            const badge = getSavingsAccountBadge(s);
                                            return (
                                                <motion.button
                                                    key={`savings-${s.id}`}
                                                    type="button"
                                                    layout
                                                    onClick={() => onSavingsClick?.(s)}
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    exit={{ opacity: 0, scale: 0.98 }}
                                                    whileTap={{ scale: 0.98 }}
                                                    className="w-full flex items-center justify-between min-h-[44px] py-3 px-4 transition-colors cursor-pointer active:bg-ios-green/5 dark:active:bg-ios-green/10 border-s-4 border-ios-green"
                                                >
                                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                                        <div className="w-10 h-10 rounded-xl bg-ios-green/12 flex items-center justify-center flex-shrink-0 text-ios-green">
                                                            <PiggyBank className="w-5 h-5" strokeWidth={2} />
                                                        </div>
                                                        <div className="flex-1 min-w-0 text-start">
                                                            <h3 className="text-[15px] font-semibold text-ios-text dark:text-ios-dark-text truncate">
                                                                {s.description || s.label}
                                                            </h3>
                                                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                                                <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded-md text-ios-green bg-ios-green/10">
                                                                    הפרשה לחיסכון · {savingsIcon(savingsLabels, s.label)} {s.label}
                                                                </span>
                                                                {s.standingOrderToInvestment ? (
                                                                    <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded-md text-ios-indigo bg-ios-indigo/10">
                                                                        קבע להשקעה
                                                                    </span>
                                                                ) : null}
                                                                <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded-md ${badge.color}`}>
                                                                    {badge.label}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2 flex-shrink-0">
                                                        <span className="text-[15px] font-bold text-ios-green tabular-nums">
                                                            ₪{formatIlsAmount(s.amount)}
                                                        </span>
                                                        <ChevronLeft className="w-4 h-4 text-ios-gray-4 dark:text-ios-dark-subtle/60" />
                                                    </div>
                                                </motion.button>
                                            );
                                        }

                                        const t = row.transaction;
                                        const badge = getAccountBadge(t);
                                        const plannedFutureRecurring = isPlannedFutureRecurring(t);
                                        const addedBy =
                                            !t.isProjected && t.paidByUser
                                                ? addedByDisplayName(t.paidByUser)
                                                : null;
                                        return (
                                            <motion.div
                                                key={t.id}
                                                data-testid={`transaction-row-${t.id}`}
                                                layout
                                                onClick={() => (t.isRecurring || !t.isProjected) ? onTransactionClick?.(t) : undefined}
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                exit={{ opacity: 0, scale: 0.98 }}
                                                whileTap={(t.isRecurring || !t.isProjected) ? { scale: 0.98 } : undefined}
                                                className={`flex items-center justify-between min-h-[44px] py-3 px-4 transition-colors ${
                                                    (t.isRecurring || !t.isProjected) ? 'cursor-pointer active:bg-ios-gray-6/90 dark:active:bg-ios-dark-fill' : 'cursor-default'
                                                }`}
                                            >
                                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                                    <div className="w-10 h-10 rounded-xl bg-ios-gray-6 dark:bg-ios-dark-fill flex items-center justify-center text-lg flex-shrink-0">
                                                        {getIcon(t.category)}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h3 className="text-[15px] font-semibold text-ios-text dark:text-ios-dark-text truncate">
                                                            {t.description || t.category}
                                                        </h3>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded-md ${badge.color}`}>
                                                                {badge.label}
                                                            </span>
                                                            {t.installmentNumber != null &&
                                                                t.installmentTotal != null &&
                                                                t.installmentTotal > 0 && (
                                                                    <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded-md text-ios-teal bg-ios-teal/10 tabular-nums">
                                                                        {t.installmentNumber}/{t.installmentTotal}
                                                                    </span>
                                                                )}
                                                            {t.isRecurring && (
                                                                <span
                                                                    className={`text-[11px] font-semibold px-1.5 py-0.5 rounded-md ${
                                                                        plannedFutureRecurring
                                                                            ? 'text-ios-orange bg-ios-orange/10'
                                                                            : 'text-ios-blue bg-ios-blue/10'
                                                                    }`}
                                                                >
                                                                    {plannedFutureRecurring ? 'קבועה מתוכננת' : 'קבועה'}
                                                                </span>
                                                            )}
                                                        </div>
                                                        {addedBy ? (
                                                            <p className="text-[10px] text-ios-subtle dark:text-ios-dark-subtle mt-1 leading-snug">
                                                                נוסף על ידי {addedBy}
                                                            </p>
                                                        ) : null}
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2 flex-shrink-0">
                                                    <span className="text-[15px] font-bold text-ios-text dark:text-ios-dark-text tabular-nums">
                                                        ₪{formatIlsAmount(t.amount)}
                                                    </span>
                                                    {(t.isRecurring || !t.isProjected) && <ChevronLeft className="w-4 h-4 text-ios-gray-4 dark:text-ios-dark-subtle/60" />}
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
