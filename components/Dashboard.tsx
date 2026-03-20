"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, useScroll, useMotionValueEvent } from "framer-motion";
import QuickAddSheet from "./QuickAddSheet";
import RecurringEditSheet from "./RecurringEditSheet";
import PieChart from "./PieChart";
import { formatIlsAmount, formatUtcDayMonthYear, formatUtcMonthYear, getHourInTimezone } from "@/lib/formatters";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, Lock } from "lucide-react";
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
    const [selectedRecurring, setSelectedRecurring] = useState<RecurringWithAccount | null>(null);
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
    const shouldShowSpendingTeaser = chartData.length < 2;
    const spendingTeaserData = useMemo(() => {
        if (!shouldShowSpendingTeaser) return chartData;
        if (chartData.length === 1) {
            const base = chartData[0];
            return [
                base,
                { name: "קטגוריה נוספת", value: Math.max(base.value * 0.65, 1), color: "#FF9500", icon: "✨" },
                { name: "קטגוריה נוספת 2", value: Math.max(base.value * 0.4, 1), color: "#34C759", icon: "✨" },
            ];
        }
        return [
            { name: "דיור", value: 42, color: "#007AFF", icon: "🏠" },
            { name: "מזון", value: 33, color: "#FF9500", icon: "🍽️" },
            { name: "בילויים", value: 25, color: "#34C759", icon: "🎉" },
        ];
    }, [chartData, shouldShowSpendingTeaser]);

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

    const handleRecurringClick = (item: RecurringWithAccount) => {
        setSelectedRecurring(item);
    };

    const handleCloseRecurringSheet = () => {
        setSelectedRecurring(null);
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
                        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-ios-gray-6/40 dark:bg-ios-dark-fill/30 p-5 min-h-[152px]">
                            <div className="pointer-events-none select-none blur-[2.5px] opacity-90">
                                <div className="flex items-center gap-6">
                                    <div className="relative w-24 h-24 flex-shrink-0 rounded-full bg-white/70 dark:bg-ios-dark-card/70" />
                                    <div className="flex-1 space-y-3">
                                        <div>
                                            <p className="text-xs text-ios-subtle dark:text-ios-dark-subtle font-medium">חסכנו החודש</p>
                                            <p className="text-2xl font-bold tracking-tight text-ios-subtle dark:text-ios-dark-subtle">₪0</p>
                                        </div>
                                        <div className="flex gap-6">
                                            <div>
                                                <p className="text-[11px] text-ios-subtle dark:text-ios-dark-subtle">הכנסה</p>
                                                <p className="text-sm font-semibold text-ios-subtle dark:text-ios-dark-subtle">₪0</p>
                                            </div>
                                            <div>
                                                <p className="text-[11px] text-ios-subtle dark:text-ios-dark-subtle">הוצאות</p>
                                                <p className="text-sm font-semibold text-ios-subtle dark:text-ios-dark-subtle">₪0</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="absolute inset-0 flex items-center justify-center px-4">
                                <div className="w-[235px] rounded-xl bg-white/28 dark:bg-ios-dark-card/42 backdrop-blur-xl border border-white/20 dark:border-white/10 px-3 py-3 text-center shadow-card">
                                    <div className="w-8 h-8 rounded-full bg-ios-blue/15 text-ios-blue flex items-center justify-center mx-auto mb-2">
                                        <Lock className="w-4 h-4" />
                                    </div>
                                    <p className="text-xs text-ios-text dark:text-ios-dark-text leading-relaxed">
                                        הוסיפו לחשבון הכנסות או הוצאות כדי לפתוח את המאזן
                                    </p>
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
                        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-ios-gray-6/40 dark:bg-ios-dark-fill/30 p-3.5 min-h-[158px]">
                            <div className="pointer-events-none select-none blur-[2.5px] opacity-85 space-y-2">
                                {[0, 1, 2].map((row) => (
                                    <div key={row} className="rounded-xl bg-white/70 dark:bg-ios-dark-card/65 p-3">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-sm font-semibold text-ios-subtle dark:text-ios-dark-subtle">חשבון</span>
                                            <span className="text-sm font-bold text-ios-subtle dark:text-ios-dark-subtle tabular-nums">₪0</span>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2">
                                            <div className="rounded-lg bg-ios-gray-6/70 dark:bg-ios-dark-fill/70 h-8" />
                                            <div className="rounded-lg bg-ios-gray-6/70 dark:bg-ios-dark-fill/70 h-8" />
                                            <div className="rounded-lg bg-ios-gray-6/70 dark:bg-ios-dark-fill/70 h-8" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="absolute inset-0 flex items-center justify-center px-4">
                                <div className="w-[235px] rounded-xl bg-white/28 dark:bg-ios-dark-card/42 backdrop-blur-xl border border-white/20 dark:border-white/10 px-3 py-3 text-center shadow-card">
                                    <div className="w-9 h-9 rounded-full bg-ios-blue/15 text-ios-blue flex items-center justify-center mx-auto mb-2">
                                        <Lock className="w-4 h-4" />
                                    </div>
                                    <p className="text-xs text-ios-text dark:text-ios-dark-text leading-relaxed">
                                        הוסיפו לחשבון הכנסות או הוצאות כדי לפתוח את המאזן
                                    </p>
                                </div>
                            </div>
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
                                            <div className="relative overflow-hidden rounded-xl min-h-[112px]">
                                                <div className="pointer-events-none select-none blur-[2.5px] opacity-85">
                                                    <div className="rounded-xl bg-white/70 dark:bg-ios-dark-card/70 p-3">
                                                        <div className="flex items-center justify-between mb-3">
                                                            <p className={`text-sm font-semibold ${colors.text}`}>
                                                                {getAccountLabel(account)}
                                                            </p>
                                                            <p className="text-sm font-bold text-ios-subtle dark:text-ios-dark-subtle tabular-nums">₪0</p>
                                                        </div>
                                                        <div className="grid grid-cols-3 gap-2 text-center">
                                                            <div className="rounded-lg bg-ios-gray-6/80 dark:bg-ios-dark-fill/80 px-2 py-2">
                                                                <p className="text-[11px] text-ios-subtle dark:text-ios-dark-subtle">הכנסות</p>
                                                                <p className="text-sm font-semibold text-ios-text dark:text-ios-dark-text tabular-nums">₪0</p>
                                                            </div>
                                                            <div className="rounded-lg bg-ios-gray-6/80 dark:bg-ios-dark-fill/80 px-2 py-2">
                                                                <p className="text-[11px] text-ios-subtle dark:text-ios-dark-subtle">הוצאות</p>
                                                                <p className="text-sm font-semibold text-ios-text dark:text-ios-dark-text tabular-nums">₪0</p>
                                                            </div>
                                                            <div className="rounded-lg bg-ios-gray-6/80 dark:bg-ios-dark-fill/80 px-2 py-2">
                                                                <p className="text-[11px] text-ios-subtle dark:text-ios-dark-subtle">מאזן</p>
                                                                <p className="text-sm font-semibold text-ios-text dark:text-ios-dark-text tabular-nums">₪0</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="absolute inset-0 flex items-center justify-center p-3">
                                                    <div className="w-[235px] rounded-xl bg-white/26 dark:bg-ios-dark-card/42 backdrop-blur-xl border border-white/20 dark:border-white/10 p-3 text-center shadow-card">
                                                        <div className="w-7 h-7 rounded-full bg-ios-blue/15 text-ios-blue flex items-center justify-center mx-auto mb-2">
                                                            <Lock className="w-3.5 h-3.5" />
                                                        </div>
                                                        <p className="text-xs text-ios-text dark:text-ios-dark-text leading-relaxed">
                                                            הוסיפו לחשבון הכנסות או הוצאות כדי לפתוח את המאזן
                                                        </p>
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
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35 }}
                    className="bg-ios-card dark:bg-ios-dark-card rounded-3xl p-5 shadow-card mb-6"
                >
                    <h2 className="text-lg font-bold text-ios-text dark:text-ios-dark-text mb-3">התפלגות הוצאות</h2>
                    <div className="relative rounded-2xl overflow-hidden">
                        <div className={shouldShowSpendingTeaser ? "blur-[3px] opacity-90 pointer-events-none select-none" : ""}>
                            <PieChart data={spendingTeaserData} />
                        </div>
                        {shouldShowSpendingTeaser && (
                            <div className="absolute inset-0 flex items-center justify-center px-4">
                                <div className="w-[270px] rounded-2xl bg-white/28 dark:bg-ios-dark-card/42 backdrop-blur-xl border border-white/20 dark:border-white/10 px-4 py-3.5 text-center shadow-card">
                                    <p className="text-sm font-semibold text-ios-text dark:text-ios-dark-text mb-1">
                                        ההתפלגות תיפתח כשתתווספנה קטגוריות נוספות
                                    </p>
                                    <p className="text-xs text-ios-subtle dark:text-ios-dark-subtle leading-relaxed">
                                        יש להוסיף הוצאות מקטגוריות נוספות כדי לראות את התפלגות ההוצאות
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </motion.div>

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
                                    <button
                                        key={item.id}
                                        type="button"
                                        onClick={() => handleRecurringClick(item)}
                                        className="w-full flex items-center justify-between bg-ios-gray-6 dark:bg-ios-dark-fill rounded-xl px-3.5 py-3 active:opacity-90 transition-opacity"
                                    >
                                        <div className="min-w-0 text-right">
                                            <p className="text-sm font-semibold text-ios-text dark:text-ios-dark-text truncate">{item.description || item.category}</p>
                                            <p className="text-xs text-ios-subtle dark:text-ios-dark-subtle truncate">
                                                {item.account.name} · חיוב הבא {formatUtcDayMonthYear(nextRun)}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm font-bold text-ios-text dark:text-ios-dark-text tabular-nums">₪{formatIlsAmount(item.amount)}</p>
                                            <ChevronLeft className="w-4 h-4 text-gray-300 dark:text-ios-dark-subtle/60" />
                                        </div>
                                    </button>
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
            <RecurringEditSheet
                isOpen={selectedRecurring !== null}
                recurring={selectedRecurring}
                onClose={handleCloseRecurringSheet}
                categories={categories}
                accounts={accounts}
            />
        </div>
    );
}
