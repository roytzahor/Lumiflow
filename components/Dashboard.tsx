"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, useScroll, useMotionValueEvent } from "framer-motion";
import QuickAddSheet from "./QuickAddSheet";
import PieChart from "./PieChart";
import { formatIlsAmount, formatUtcDayMonthYear, formatUtcMonthYear, getHourInTimezone } from "@/lib/formatters";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock } from "lucide-react";
import type { TransactionListItem, Account, Category, BudgetSettings, RecurringWithAccount } from "@/lib/types";

interface DashboardProps {
    initialTransactions: TransactionListItem[];
    nowIso: string;
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
    viewerName?: string | null;
}

function getGreeting(now: Date): string {
    const hour = getHourInTimezone(now, "Asia/Jerusalem");
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
    nowIso,
    budgetSettings,
    categories = [],
    accounts = [],
    recurringTransactions = [],
    contributionTotals = [],
    viewerName = null,
}: DashboardProps) {
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [showStickyHeader, setShowStickyHeader] = useState(false);
    const router = useRouter();
    const searchParams = useSearchParams();
    const stableNow = useMemo(() => new Date(nowIso), [nowIso]);

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

    const accountBalances = useMemo(() => {
        const inflowByAccountId = new Map(contributionTotals.map((row) => [row.accountId, row.totalMonthlyInflow]));
        return accounts.map(acc => {
            const expenses = initialTransactions
                .filter(t => t.accountId === acc.id && t.amount > 0)
                .reduce((sum, t) => sum + t.amount, 0);
            const monthlyInflow = inflowByAccountId.get(acc.id) ?? 0;
            const balance = monthlyInflow - expenses;
            return { account: acc, expenses, monthlyInflow, balance };
        });
    }, [accounts, initialTransactions, contributionTotals]);

    useEffect(() => {
        if (searchParams.get('quickAdd') !== '1') return;
        setIsSheetOpen(true);
        router.replace('/', { scroll: false });
    }, [searchParams, router]);

    useMotionValueEvent(scrollY, "change", (latest) => {
        setShowStickyHeader(latest > 280);
    });

    const totalSpent = initialTransactions.reduce((sum, t) => sum + t.amount, 0);
    const income = budgetSettings?.monthlyIncome ?? 0;
    const hasIncomeConfigured = income > 0;
    const savedSoFar = hasIncomeConfigured ? income - totalSpent : 0;
    const rawRatio = hasIncomeConfigured ? (savedSoFar / income) * 100 : 0;
    const savingsRatio = Math.max(Math.min(rawRatio, 100), 0);

    const handleCloseSheet = () => {
        setIsSheetOpen(false);
    };

    const monthName = formatUtcMonthYear(stableNow);

    return (
        <div className="w-full max-w-md mx-auto h-full relative min-h-screen pb-28 pt-safe">
            {/* Sticky Header */}
            {showStickyHeader && hasIncomeConfigured && (
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
                            {savedSoFar >= 0 ? '₪' : '-₪'}{formatIlsAmount(Math.abs(savedSoFar))}
                        </span>
                    </div>
                </motion.div>
            )}

            <div className="px-5 pt-6">
                {/* Header */}
                <header className="mb-8">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-base text-ios-subtle dark:text-ios-dark-subtle mb-1">
                                {viewerName?.trim() ? `${getGreeting(stableNow)}, ${viewerName.trim()}` : getGreeting(stableNow)}
                            </p>
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
                    className={`bg-ios-card dark:bg-ios-dark-card rounded-3xl p-6 shadow-card mb-4 ${hasIncomeConfigured ? '' : 'opacity-80'}`}
                >
                    {hasIncomeConfigured ? (
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
                                        ₪{formatIlsAmount(savedSoFar)}
                                    </p>
                                </div>
                                <div className="flex gap-6">
                                    <div>
                                        <p className="text-[11px] text-ios-subtle dark:text-ios-dark-subtle">הכנסה</p>
                                        <p className="text-sm font-semibold text-ios-text dark:text-ios-dark-text">₪{formatIlsAmount(income)}</p>
                                    </div>
                                    <div>
                                        <p className="text-[11px] text-ios-subtle dark:text-ios-dark-subtle">הוצאות</p>
                                        <p className="text-sm font-semibold text-ios-text dark:text-ios-dark-text">₪{formatIlsAmount(totalSpent)}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="relative overflow-hidden rounded-2xl border border-dashed border-gray-200 dark:border-white/15 bg-ios-gray-6/50 dark:bg-ios-dark-fill/40 p-5">
                            <div className="absolute inset-0 pointer-events-none bg-gradient-to-br from-transparent via-white/10 to-transparent dark:via-white/[0.03]" />
                            <div className="relative flex items-start gap-3">
                                <div className="w-9 h-9 rounded-full bg-ios-blue/15 text-ios-blue flex items-center justify-center">
                                    <Lock className="w-4 h-4" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-semibold text-ios-text dark:text-ios-dark-text mb-1">החיסכון החודשי נעול</p>
                                    <p className="text-xs text-ios-subtle dark:text-ios-dark-subtle leading-relaxed mb-3">
                                        כדי לראות את החסכון החודשי מומלץ לעדכן את ההכנסה בעמוד ההגדרות.
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => router.push('/settings')}
                                        className="px-3 py-2 rounded-lg bg-ios-blue text-white text-xs font-semibold"
                                    >
                                        עדכון
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-ios-card dark:bg-ios-dark-card rounded-3xl p-5 shadow-card mb-6"
                >
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-lg font-bold text-ios-text dark:text-ios-dark-text">מאזן לפי חשבון</h2>
                        <span className="text-xs font-semibold text-ios-subtle dark:text-ios-dark-subtle">{accountBalances.length} חשבונות</span>
                    </div>
                    {accountBalances.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-gray-200 dark:border-white/15 bg-ios-gray-6/60 dark:bg-ios-dark-fill/40 p-4">
                            <p className="text-sm text-ios-subtle dark:text-ios-dark-subtle mb-3">
                                על מנת לצפות במאזן יש להוסיף לפחות חשבון אחד.
                            </p>
                            <button
                                type="button"
                                onClick={() => router.push('/settings')}
                                className="px-3 py-2 rounded-lg bg-ios-blue text-white text-xs font-semibold"
                            >
                                עדכון
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-2.5">
                            {accountBalances.map(({ account, expenses, monthlyInflow, balance }, index) => {
                                const colors = getAccountColor(account);
                                const isAccountLocked = monthlyInflow === 0 && expenses === 0;
                                return (
                                    <motion.div
                                        key={account.id}
                                        initial={{ opacity: 0, y: 15 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.24 + index * 0.06 }}
                                        className={`rounded-2xl p-4 ring-1 ${colors.ring} ${colors.bg}`}
                                    >
                                        {isAccountLocked ? (
                                            <div className="rounded-xl border border-dashed border-gray-200/70 dark:border-white/20 bg-white/70 dark:bg-ios-dark-card/50 p-3.5">
                                                <div className="flex items-start gap-2.5">
                                                    <div className="w-7 h-7 rounded-full bg-ios-blue/15 text-ios-blue flex items-center justify-center flex-shrink-0">
                                                        <Lock className="w-3.5 h-3.5" />
                                                    </div>
                                                    <div>
                                                        <p className={`text-sm font-semibold ${colors.text}`}>
                                                            {getAccountLabel(account)}
                                                        </p>
                                                        <p className="text-xs text-ios-subtle dark:text-ios-dark-subtle mt-1">
                                                            הכרטיס נעול כי טרם הוגדרו הכנסות/הוצאות לחשבון הזה.
                                                        </p>
                                                        <button
                                                            type="button"
                                                            onClick={() => router.push('/settings')}
                                                            className="mt-2 px-2.5 py-1.5 rounded-lg bg-ios-blue text-white text-[11px] font-semibold"
                                                        >
                                                            עדכון
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="flex items-center justify-between mb-3">
                                                    <p className={`text-sm font-semibold ${colors.text}`}>
                                                        {getAccountLabel(account)}
                                                    </p>
                                                    <p className={`text-sm font-bold tabular-nums ${balance >= 0 ? 'text-ios-green' : 'text-ios-red'}`}>
                                                        {balance >= 0 ? '₪' : '-₪'}{formatIlsAmount(Math.abs(balance))}
                                                    </p>
                                                </div>
                                                <div className="grid grid-cols-3 gap-2 text-center">
                                                    <div className="rounded-lg bg-white/70 dark:bg-ios-dark-card/70 px-2 py-2">
                                                        <p className="text-[11px] text-ios-subtle dark:text-ios-dark-subtle">הכנסות</p>
                                                        <p className="text-sm font-semibold text-ios-text dark:text-ios-dark-text tabular-nums">
                                                            ₪{formatIlsAmount(Math.round(monthlyInflow))}
                                                        </p>
                                                    </div>
                                                    <div className="rounded-lg bg-white/70 dark:bg-ios-dark-card/70 px-2 py-2">
                                                        <p className="text-[11px] text-ios-subtle dark:text-ios-dark-subtle">הוצאות</p>
                                                        <p className="text-sm font-semibold text-ios-text dark:text-ios-dark-text tabular-nums">
                                                            ₪{formatIlsAmount(Math.round(expenses))}
                                                        </p>
                                                    </div>
                                                    <div className="rounded-lg bg-white/70 dark:bg-ios-dark-card/70 px-2 py-2">
                                                        <p className="text-[11px] text-ios-subtle dark:text-ios-dark-subtle">מאזן</p>
                                                        <p className={`text-sm font-semibold tabular-nums ${balance >= 0 ? 'text-ios-green' : 'text-ios-red'}`}>
                                                            {balance >= 0 ? '₪' : '-₪'}{formatIlsAmount(Math.abs(Math.round(balance)))}
                                                        </p>
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </motion.div>
                                );
                            })}
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
                                                {item.account.name} · חיוב הבא {formatUtcDayMonthYear(nextRun)}
                                            </p>
                                        </div>
                                        <p className="text-sm font-bold text-ios-text dark:text-ios-dark-text tabular-nums">₪{formatIlsAmount(item.amount)}</p>
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
                initialData={null}
                categories={categories}
                accounts={accounts}
            />
        </div>
    );
}
