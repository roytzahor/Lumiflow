"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, useScroll, useMotionValueEvent } from "framer-motion";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import TransactionFeed from "./TransactionFeed";
import QuickAddSheet from "./QuickAddSheet";
import PieChart from "./PieChart";
import { useHaptic } from "@/hooks/useHaptic";
import { useRouter, useSearchParams } from "next/navigation";
import type { TransactionListItem, Account, Category, BudgetSettings, RecurringWithAccount } from "@/lib/types";

interface DashboardProps {
    initialTransactions: TransactionListItem[];
    budgetSettings?: BudgetSettings | null;
    categories: Category[];
    accounts: Account[];
    recurringTransactions?: RecurringWithAccount[];
    contributionTotals?: Array<{
        accountId: string;
        accountName: string;
        accountType: "PRIVATE" | "SHARED";
        totalMonthlyInflow: number;
    }>;
}

function getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 6) return "לילה טוב";
    if (hour < 12) return "בוקר טוב";
    if (hour < 17) return "צהריים טובים";
    if (hour < 21) return "ערב טוב";
    return "לילה טוב";
}

function getAccountLabel(account: Account): string {
    return account.name;
}

function getAccountColor(account: Account): { bg: string; text: string; ring: string } {
    if (account.type === "SHARED") return { bg: "bg-ios-indigo/8", text: "text-ios-indigo", ring: "ring-ios-indigo/20" };
    return { bg: "bg-ios-teal/8", text: "text-ios-blue", ring: "ring-ios-teal/20" };
}

export default function Dashboard({
    initialTransactions = [],
    budgetSettings,
    categories = [],
    accounts = [],
    recurringTransactions = [],
    contributionTotals = [],
}: DashboardProps) {
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState<TransactionListItem | null>(null);
    const [showStickyHeader, setShowStickyHeader] = useState(false);
    const [isMounted, setIsMounted] = useState(false);
    const { trigger } = useHaptic();
    const router = useRouter();
    const searchParams = useSearchParams();

    const { scrollY } = useScroll();

    const chartData = useMemo(() => {
        const categoryMap = new Map();
        initialTransactions.forEach(t => {
            if (t.amount > 0) {
                const current = categoryMap.get(t.category) || 0;
                categoryMap.set(t.category, current + t.amount);
            }
        });

        const colors = [
            '#007AFF', '#FF9500', '#FF2D55', '#5856D6',
            '#34C759', '#AF52DE', '#5AC8FA', '#FF3B30', '#FFCC00',
        ];

        return Array.from(categoryMap.entries())
            .map(([name, value], index) => {
                const cat = categories.find(c => c.name === name);
                return {
                    name,
                    value,
                    color: colors[index % colors.length],
                    icon: cat ? cat.icon : '✨'
                };
            })
            .sort((a, b) => b.value - a.value);
    }, [initialTransactions, categories]);

    // Per-account spending
    const accountSpending = useMemo(() => {
        const inflowByAccountId = new Map(contributionTotals.map((row) => [row.accountId, row.totalMonthlyInflow]));
        return accounts.map(acc => {
            const spent = initialTransactions
                .filter(t => t.accountId === acc.id && t.amount > 0)
                .reduce((sum, t) => sum + t.amount, 0);
            return { account: acc, spent, monthlyInflow: inflowByAccountId.get(acc.id) ?? 0 };
        });
    }, [accounts, initialTransactions, contributionTotals]);

    const upcomingRecurring = useMemo(() => {
        const now = new Date();
        const horizon = new Date();
        horizon.setDate(horizon.getDate() + 30);

        return recurringTransactions
            .filter((item) => {
                const nextRun = new Date(item.nextRun);
                return nextRun <= horizon && item.active;
            })
            .sort((a, b) => new Date(a.nextRun).getTime() - new Date(b.nextRun).getTime())
            .slice(0, 4)
            .map((item) => {
                const nextRun = new Date(item.nextRun);
                const isDue = nextRun <= now;
                return { item, nextRun, isDue };
            });
    }, [recurringTransactions]);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    useEffect(() => {
        if (searchParams.get('quickAdd') !== '1') return;
        setEditingTransaction(null);
        setIsSheetOpen(true);
        router.replace('/', { scroll: false });
    }, [searchParams, router]);

    useMotionValueEvent(scrollY, "change", (latest) => {
        setShowStickyHeader(latest > 280);
    });

    if (!isMounted) return null;

    const totalSpent = initialTransactions.reduce((sum, t) => sum + t.amount, 0);
    const income = budgetSettings?.monthlyIncome || 21000;
    const savedSoFar = income - totalSpent;
    const savingsRatio = Math.max(Math.min((savedSoFar / income) * 100, 100), 0);

    const handleTransactionClick = (transaction: TransactionListItem) => {
        if (transaction.isProjected) return;
        trigger(10);
        setEditingTransaction(transaction);
        setIsSheetOpen(true);
    };

    const handleCloseSheet = () => {
        setIsSheetOpen(false);
        setEditingTransaction(null);
    };

    const monthName = format(new Date(), "MMMM yyyy", { locale: he });

    return (
        <div className="w-full max-w-md mx-auto h-full relative min-h-screen pb-28 pt-safe">
            {/* Sticky Header */}
            {showStickyHeader && (
                <motion.div
                    initial={{ y: -60, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="fixed top-0 inset-x-0 z-50 bg-white/80 dark:bg-ios-dark-card/80 backdrop-blur-xl border-b border-gray-200/60 dark:border-white/10 pt-safe"
                >
                    <div className="max-w-md mx-auto px-5 py-3 flex justify-between items-center">
                        <span className="font-bold text-base text-ios-text dark:text-ios-dark-text">
                            {savedSoFar >= 0 ? "חסכנו" : "חריגה"} החודש
                        </span>
                        <span className={`font-bold tabular-nums ${savedSoFar >= 0 ? 'text-ios-green' : 'text-ios-red'}`}>
                            {savedSoFar >= 0 ? '₪' : '-₪'}{Math.abs(savedSoFar).toLocaleString()}
                        </span>
                    </div>
                </motion.div>
            )}

            <div className="px-5 pt-6">
                {/* Header */}
                <header className="mb-8">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-base text-ios-subtle dark:text-ios-dark-subtle mb-1">{getGreeting()}</p>
                            <h1 className="text-3xl font-bold text-ios-text dark:text-ios-dark-text tracking-tight">
                                {monthName}
                            </h1>
                        </div>
                    </div>
                </header>

                {/* Savings Ring */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-ios-card dark:bg-ios-dark-card rounded-3xl p-6 shadow-card mb-4"
                >
                    <div className="flex items-center gap-6">
                        {/* Ring */}
                        <div className="relative w-24 h-24 flex-shrink-0">
                            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                                <circle
                                    cx="50" cy="50" r="42"
                                    stroke="#E5E5EA" strokeWidth="6"
                                    fill="transparent"
                                />
                                <motion.circle
                                    cx="50" cy="50" r="42"
                                    stroke={savedSoFar >= 0 ? "#34C759" : "#FF3B30"}
                                    strokeWidth="6"
                                    fill="transparent"
                                    strokeLinecap="round"
                                    initial={{ pathLength: 0 }}
                                    animate={{ pathLength: savingsRatio / 100 }}
                                    transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }}
                                    strokeDasharray="1"
                                />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-sm font-bold text-ios-text dark:text-ios-dark-text">
                                    {Math.round(savingsRatio)}%
                                </span>
                            </div>
                        </div>

                        {/* Stats */}
                        <div className="flex-1 space-y-3">
                            <div>
                                <p className="text-xs text-ios-subtle dark:text-ios-dark-subtle font-medium">חסכנו החודש</p>
                                <p className={`text-2xl font-bold tracking-tight ${savedSoFar >= 0 ? 'text-ios-green' : 'text-ios-red'}`}>
                                    ₪{savedSoFar.toLocaleString()}
                                </p>
                            </div>
                            <div className="flex gap-6">
                                <div>
                                    <p className="text-[11px] text-ios-subtle dark:text-ios-dark-subtle">הכנסה</p>
                                    <p className="text-sm font-semibold text-ios-text dark:text-ios-dark-text">₪{income.toLocaleString()}</p>
                                </div>
                                <div>
                                    <p className="text-[11px] text-ios-subtle dark:text-ios-dark-subtle">הוצאות</p>
                                    <p className="text-sm font-semibold text-ios-text dark:text-ios-dark-text">₪{totalSpent.toLocaleString()}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Account Cards */}
                <div className="flex gap-3 mb-6 overflow-x-auto no-scrollbar">
                    {accountSpending.map(({ account, spent, monthlyInflow }, index) => {
                        const colors = getAccountColor(account);
                        return (
                            <motion.div
                                key={account.id}
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 + index * 0.08 }}
                                className={`flex-1 min-w-[110px] ${colors.bg} rounded-2xl p-4 ring-1 ${colors.ring}`}
                            >
                                <p className={`text-xs font-semibold ${colors.text} mb-2`}>
                                    {getAccountLabel(account)}
                                </p>
                                <p className="text-lg font-bold text-ios-text dark:text-ios-dark-text tabular-nums">
                                    ₪{spent.toLocaleString()}
                                </p>
                                <p className="text-[11px] mt-1 text-ios-subtle dark:text-ios-dark-subtle">
                                    נכנס חודשי: ₪{Math.round(monthlyInflow).toLocaleString()}
                                </p>
                            </motion.div>
                        );
                    })}
                </div>

                {/* MVP1: Upcoming bills */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.28 }}
                    className="bg-ios-card dark:bg-ios-dark-card rounded-3xl p-5 shadow-card mb-6"
                >
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-lg font-bold text-ios-text dark:text-ios-dark-text">תשלומים קרובים</h2>
                        <span className="text-xs font-semibold text-ios-subtle dark:text-ios-dark-subtle">30 ימים</span>
                    </div>
                    {upcomingRecurring.length === 0 ? (
                        <p className="text-sm text-ios-subtle dark:text-ios-dark-subtle py-2">אין חיובים קבועים בקרוב</p>
                    ) : (
                        <div className="space-y-2">
                            {upcomingRecurring.map(({ item, nextRun, isDue }) => (
                                <div key={item.id} className="flex items-center justify-between bg-ios-gray-6 dark:bg-ios-dark-fill rounded-xl px-3.5 py-3">
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold text-ios-text dark:text-ios-dark-text truncate">{item.description || item.category}</p>
                                        <p className="text-xs text-ios-subtle dark:text-ios-dark-subtle truncate">
                                            {item.account.name} · {format(nextRun, 'd MMM', { locale: he })}
                                        </p>
                                    </div>
                                    <div className="text-left">
                                        <p className="text-sm font-bold text-ios-text dark:text-ios-dark-text tabular-nums">₪{item.amount.toLocaleString()}</p>
                                        <p className={`text-[11px] font-semibold ${isDue ? 'text-ios-red' : 'text-ios-blue'}`}>
                                            {isDue ? 'לביצוע' : 'מתקרב'}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </motion.div>

                {/* Spending Breakdown */}
                {chartData.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.35 }}
                        className="bg-ios-card dark:bg-ios-dark-card rounded-3xl p-5 shadow-card mb-6"
                    >
                        <h2 className="text-lg font-bold text-ios-text dark:text-ios-dark-text mb-3">התפלגות הוצאות</h2>
                        <PieChart data={chartData} />
                    </motion.div>
                )}

                {/* Transaction Feed */}
                <TransactionFeed
                    transactions={initialTransactions}
                    categories={categories}
                    onTransactionClick={handleTransactionClick}
                />

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="bg-ios-card dark:bg-ios-dark-card rounded-3xl p-5 shadow-card mt-3"
                >
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-lg font-bold text-ios-text dark:text-ios-dark-text">ריכוז הוצאות חוזרות</h2>
                        <span className="text-xs font-semibold text-ios-subtle dark:text-ios-dark-subtle">{recurringTransactions.length} סה״כ</span>
                    </div>
                    {recurringTransactions.length === 0 ? (
                        <p className="text-sm text-ios-subtle dark:text-ios-dark-subtle py-2">אין הוצאות חוזרות כרגע</p>
                    ) : (
                        <div className="space-y-2">
                            {recurringTransactions.map((item) => {
                                const nextRun = new Date(item.nextRun);
                                return (
                                    <div key={item.id} className="flex items-center justify-between bg-ios-gray-6 dark:bg-ios-dark-fill rounded-xl px-3.5 py-3">
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold text-ios-text dark:text-ios-dark-text truncate">{item.description || item.category}</p>
                                            <p className="text-xs text-ios-subtle dark:text-ios-dark-subtle truncate">
                                                {item.account.name} · חיוב הבא {format(nextRun, 'd MMM yyyy', { locale: he })}
                                            </p>
                                        </div>
                                        <p className="text-sm font-bold text-ios-text dark:text-ios-dark-text tabular-nums">₪{item.amount.toLocaleString()}</p>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </motion.div>
            </div>

            {/* Quick Add Sheet */}
            <QuickAddSheet
                isOpen={isSheetOpen}
                onClose={handleCloseSheet}
                initialData={editingTransaction}
                categories={categories}
                accounts={accounts}
            />
        </div>
    );
}
