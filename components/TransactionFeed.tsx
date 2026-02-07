"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { ChevronLeft } from 'lucide-react';
import type { TransactionWithAccount, Category } from '@/lib/types';

interface TransactionFeedProps {
    transactions: TransactionWithAccount[];
    categories?: Category[];
    onTransactionClick?: (transaction: TransactionWithAccount) => void;
}

export default function TransactionFeed({ transactions = [], categories = [], onTransactionClick }: TransactionFeedProps) {
    const [filter, setFilter] = useState('All');

    const filters = [
        { id: 'All', label: 'הכל' },
        { id: 'Joint', label: 'משותף' },
        { id: 'Roy', label: 'רועי' },
        { id: 'Romi', label: 'רומי' },
    ];

    const filteredTransactions = transactions.filter((t) => {
        if (filter === 'All') return true;
        if (filter === 'Joint') return t.account?.type === 'JOINT';
        if (filter === 'Roy') return t.account?.name?.includes('Roy');
        if (filter === 'Romi') return t.account?.name?.includes('Romi');
        return true;
    });

    const getIcon = (categoryName: string) => {
        const cat = categories.find(c => c.name === categoryName);
        return cat ? cat.icon : '🛒';
    };

    const getAccountBadge = (t: TransactionWithAccount) => {
        if (t.account?.type === 'JOINT') return { label: 'משותף', color: 'text-ios-indigo bg-ios-indigo/8' };
        if (t.account?.name?.toLowerCase().includes('roy')) return { label: 'רועי', color: 'text-ios-blue bg-ios-teal/8' };
        if (t.account?.name?.toLowerCase().includes('romi')) return { label: 'רומי', color: 'text-ios-pink bg-ios-pink/8' };
        return { label: t.account?.name || '', color: 'text-gray-500 bg-gray-100' };
    };

    // Group transactions by date
    const groupedByDate = filteredTransactions.reduce<Record<string, TransactionWithAccount[]>>((groups, t) => {
        const dateKey = format(new Date(t.date), 'yyyy-MM-dd');
        if (!groups[dateKey]) groups[dateKey] = [];
        groups[dateKey].push(t);
        return groups;
    }, {});

    const sortedDates = Object.keys(groupedByDate).sort((a, b) => b.localeCompare(a));

    return (
        <div className="w-full mt-4 pb-24">
            {/* Section Header */}
            <h2 className="text-lg font-bold text-gray-900 mb-3">פעולות אחרונות</h2>

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
                        className="flex flex-col items-center justify-center py-16 text-gray-400"
                    >
                        <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                            <span className="text-2xl opacity-60">💸</span>
                        </div>
                        <p className="text-sm font-medium">אין הוצאות להצגה</p>
                    </motion.div>
                ) : (
                    <div className="space-y-5">
                        {sortedDates.map((dateKey) => (
                            <div key={dateKey}>
                                {/* Date Header */}
                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">
                                    {format(new Date(dateKey), 'EEEE, d MMMM', { locale: he })}
                                </p>

                                {/* Transactions Card */}
                                <div className="bg-white rounded-2xl shadow-card overflow-hidden divide-y divide-gray-100">
                                    {groupedByDate[dateKey].map((t) => {
                                        const badge = getAccountBadge(t);
                                        return (
                                            <motion.div
                                                key={t.id}
                                                layout
                                                onClick={() => onTransactionClick?.(t)}
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                exit={{ opacity: 0, scale: 0.98 }}
                                                whileTap={{ scale: 0.98, backgroundColor: '#F5F5F7' }}
                                                className="flex items-center justify-between p-4 cursor-pointer transition-colors active:bg-gray-50"
                                            >
                                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                                    <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-lg flex-shrink-0">
                                                        {getIcon(t.category)}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h3 className="text-[15px] font-semibold text-gray-900 truncate">
                                                            {t.description || t.category}
                                                        </h3>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded-md ${badge.color}`}>
                                                                {badge.label}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2 flex-shrink-0">
                                                    <span className="text-[15px] font-bold text-gray-900 tabular-nums">
                                                        ₪{t.amount.toLocaleString()}
                                                    </span>
                                                    <ChevronLeft className="w-4 h-4 text-gray-300" />
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
