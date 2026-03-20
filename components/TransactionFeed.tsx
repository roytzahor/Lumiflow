"use client";

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft } from 'lucide-react';
import { formatIlsAmount, formatUtcDateLabel, getUtcDateKey } from '@/lib/formatters';
import type { TransactionListItem, Category, Account } from '@/lib/types';

interface TransactionFeedProps {
    transactions: TransactionListItem[];
    accounts?: Account[];
    categories?: Category[];
    onTransactionClick?: (transaction: TransactionListItem) => void;
}

export default function TransactionFeed({ transactions = [], accounts = [], categories = [], onTransactionClick }: TransactionFeedProps) {
    const [filter, setFilter] = useState('All');

    const accountFilters = useMemo(() => {
        return accounts.map((account) => ({
            id: account.id,
            label: account.name || 'חשבון',
            isShared: account.type === 'SHARED',
        })).sort((a, b) => {
            if (a.isShared === b.isShared) return a.label.localeCompare(b.label, 'he');
            return a.isShared ? -1 : 1;
        });
    }, [accounts]);

    const filters = [{ id: 'All', label: 'הכל' }, ...accountFilters];
    const activeFilterLabel = filters.find((f) => f.id === filter)?.label || 'החשבון שנבחר';

    const filteredTransactions = transactions.filter((t) => {
        if (filter === 'All') return true;
        return t.accountId === filter;
    });

    const getIcon = (categoryName: string) => {
        const cat = categories.find(c => c.name === categoryName);
        return cat ? cat.icon : '🛒';
    };

    const getAccountBadge = (t: TransactionListItem) => {
        if (t.account?.type === 'SHARED') return { label: t.account?.name || 'משותף', color: 'text-ios-indigo bg-ios-indigo/8' };
        return { label: t.account?.name || '', color: 'text-ios-blue bg-ios-teal/8' };
    };

    // Group transactions by date
    const groupedByDate = filteredTransactions.reduce<Record<string, TransactionListItem[]>>((groups, t) => {
        const dateKey = getUtcDateKey(t.date);
        if (!groups[dateKey]) groups[dateKey] = [];
        groups[dateKey].push(t);
        return groups;
    }, {});

    const sortedDates = Object.keys(groupedByDate).sort((a, b) => b.localeCompare(a));

    return (
        <div className="w-full mt-4 pb-6">
            {/* Section Header */}
            <h2 className="text-lg font-bold text-ios-text dark:text-ios-dark-text mb-3">פעולות אחרונות</h2>

            {/* Segmented Control */}
            <div className="segmented-control mb-4">
                {filters.map((f) => (
                    <button
                        key={f.id}
                        onClick={() => setFilter(f.id)}
                        className={`segmented-control-item ${
                            filter === f.id
                                ? 'segmented-control-item-active'
                                : 'segmented-control-item-inactive'
                        }`}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            {/* Grouped Transaction List */}
            <AnimatePresence mode="popLayout">
                {filteredTransactions.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="flex flex-col items-center justify-center py-16 text-ios-subtle dark:text-ios-dark-subtle"
                    >
                        <div className="w-14 h-14 bg-gray-100 dark:bg-ios-dark-fill rounded-full flex items-center justify-center mb-3">
                            <span className="text-2xl opacity-60">💸</span>
                        </div>
                        <p className="text-sm font-medium">
                            {filter === 'All' ? 'לא נוספו עדיין הוצאות לחשבונות' : `לא נוספו עדיין הוצאות לחשבון ${activeFilterLabel}`}
                        </p>
                    </motion.div>
                ) : (
                    <div className="space-y-5">
                        {sortedDates.map((dateKey) => (
                            <div key={dateKey}>
                                {/* Date Header */}
                                <p className="text-xs font-semibold text-ios-subtle dark:text-ios-dark-subtle uppercase tracking-wider mb-2 px-1">
                                    {formatUtcDateLabel(dateKey)}
                                </p>

                                {/* Transactions Card */}
                                <div className="bg-white dark:bg-ios-dark-card rounded-2xl shadow-card overflow-hidden divide-y divide-gray-100 dark:divide-white/10">
                                    {groupedByDate[dateKey].map((t) => {
                                        const badge = getAccountBadge(t);
                                        return (
                                            <motion.div
                                                key={t.id}
                                                layout
                                                onClick={() => !t.isProjected && onTransactionClick?.(t)}
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                exit={{ opacity: 0, scale: 0.98 }}
                                                whileTap={t.isProjected ? undefined : { scale: 0.98 }}
                                                className={`flex items-center justify-between p-4 transition-colors ${
                                                    t.isProjected ? 'cursor-default' : 'cursor-pointer active:bg-gray-50 dark:active:bg-ios-dark-fill'
                                                }`}
                                            >
                                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                                    <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-ios-dark-fill flex items-center justify-center text-lg flex-shrink-0">
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
                                                            {t.isRecurring && (
                                                                <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded-md ${t.isProjected ? 'text-ios-orange bg-ios-orange/10' : 'text-ios-blue bg-ios-blue/10'}`}>
                                                                    {t.isProjected ? 'קבועה מתוכננת' : 'קבועה'}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2 flex-shrink-0">
                                                    <span className="text-[15px] font-bold text-ios-text dark:text-ios-dark-text tabular-nums">
                                                        ₪{formatIlsAmount(t.amount)}
                                                    </span>
                                                    {!t.isProjected && <ChevronLeft className="w-4 h-4 text-gray-300 dark:text-ios-dark-subtle/60" />}
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
