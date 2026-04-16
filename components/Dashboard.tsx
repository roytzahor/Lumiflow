"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { motion, AnimatePresence, useReducedMotion, useScroll, useMotionValueEvent } from "framer-motion";
import QuickAddSheet from "./QuickAddSheet";
import RecurringEditSheet from "./RecurringEditSheet";
import PieChart from "./PieChart";
import { formatIlsAmount, formatUtcMonthYear, getHourInTimezone } from "@/lib/formatters";
import { updateDashboardRecurringSectionExpanded } from "@/app/actions";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, ChevronLeft, Lock } from "lucide-react";
import MonthSelector from "./MonthSelector";
import type { TransactionListItem, Account, Category, RecurringWithAccount, MonthlyIncomeTotal, ContributionRatio } from "@/lib/types";
import { parseScopeAccountId } from "@/lib/scope-account";
import { computeMyMoneyBreakdown } from "@/lib/my-money-utils";

interface DashboardProps {
    initialTransactions: TransactionListItem[];
    nowIso: string;
    selectedMonthIso?: string;
    categories: Category[];
    accounts: Account[];
    recurringTransactions?: RecurringWithAccount[];
    contributionTotals?: Array<{
        accountId: string;
        accountName: string;
        accountType: "PRIVATE" | "SHARED";
        totalMonthlyInflow: number;
    }>;
    monthlyIncomeEntries?: MonthlyIncomeTotal[];
    myContributionRatios?: ContributionRatio[];
    viewerName?: string | null;
    initialRecurringSectionExpanded?: boolean;
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

function getCategoryIcon(categories: Category[], categoryName: string): string {
    const cat = categories.find((c) => c.name === categoryName);
    return cat ? cat.icon : '🛒';
}

type AccountBalanceRow = {
    account: Account;
    expenses: number;
    monthlyInflow: number;
    balance: number;
};

function DashboardAccountBalanceCard({
    row,
    index,
    reduceMotion,
}: {
    row: AccountBalanceRow;
    index: number;
    reduceMotion: boolean;
}) {
    const { account, expenses, monthlyInflow, balance } = row;
    const colors = getAccountColor(account);
    const isAccountLocked = monthlyInflow === 0 && expenses === 0;
    return (
        <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: reduceMotion ? 0 : 0.24 + index * 0.06 }}
            className={`rounded-2xl p-4 ring-1 ${colors.ring} ${colors.bg}`}
        >
            {isAccountLocked ? (
                <div className="relative overflow-hidden rounded-xl min-h-[112px]">
                    <div className="pointer-events-none select-none blur-[2.5px] opacity-85">
                        <div className="rounded-xl bg-white/70 dark:bg-ios-dark-card/70 p-3">
                            <div className="flex items-center justify-between mb-3">
                                <p className={`text-sm font-semibold ${colors.text}`}>{getAccountLabel(account)}</p>
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
                                הוסיפו לחשבון &quot;{getAccountLabel(account)}&quot; הכנסות או הוצאות כדי לפתוח את המאזן
                            </p>
                        </div>
                    </div>
                </div>
            ) : (
                <>
                    <div className="flex items-center justify-between mb-3">
                        <p className={`text-sm font-semibold ${colors.text}`}>{getAccountLabel(account)}</p>
                        <p className={`text-sm font-bold tabular-nums ${balance >= 0 ? "text-ios-green" : "text-ios-red"}`}>
                            {balance >= 0 ? "₪" : "-₪"}
                            {formatIlsAmount(Math.abs(balance))}
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
                            <p className={`text-sm font-semibold tabular-nums ${balance >= 0 ? "text-ios-green" : "text-ios-red"}`}>
                                {balance >= 0 ? "₪" : "-₪"}
                                {formatIlsAmount(Math.abs(Math.round(balance)))}
                            </p>
                        </div>
                    </div>
                </>
            )}
        </motion.div>
    );
}

export default function Dashboard({
    initialTransactions = [],
    nowIso,
    selectedMonthIso,
    categories = [],
    accounts = [],
    recurringTransactions = [],
    contributionTotals = [],
    monthlyIncomeEntries = [],
    myContributionRatios = [],
    viewerName = null,
    initialRecurringSectionExpanded = true,
}: DashboardProps) {
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [quickAddIntent, setQuickAddIntent] = useState<{ recurring: boolean } | null>(null);
    const [showStickyHeader, setShowStickyHeader] = useState(false);
    const [selectedRecurring, setSelectedRecurring] = useState<RecurringWithAccount | null>(null);
    const [recurringSectionExpanded, setRecurringSectionExpanded] = useState(initialRecurringSectionExpanded);
    const recurringExpandedRef = useRef(recurringSectionExpanded);
    recurringExpandedRef.current = recurringSectionExpanded;

    useEffect(() => {
        setRecurringSectionExpanded(initialRecurringSectionExpanded);
    }, [initialRecurringSectionExpanded]);
    const router = useRouter();
    const searchParams = useSearchParams();
    const accountParam = searchParams.get("account");
    const scopeAccountId = useMemo(
        () => parseScopeAccountId(accountParam, accounts),
        [accountParam, accounts]
    );

    useEffect(() => {
        if (!accountParam) return;
        if (accounts.some((a) => a.id === accountParam)) return;
        const params = new URLSearchParams(searchParams.toString());
        params.delete("account");
        const q = params.toString();
        router.replace(q ? `/?${q}` : "/", { scroll: false });
    }, [accountParam, accounts, searchParams, router]);

    const setScopeAccount = useCallback(
        (next: "all" | string) => {
            const params = new URLSearchParams(searchParams.toString());
            if (next === "all") {
                params.delete("account");
            } else {
                params.set("account", next);
            }
            const q = params.toString();
            router.replace(q ? `/?${q}` : "/", { scroll: false });
        },
        [router, searchParams]
    );

    const stableNow = useMemo(() => new Date(nowIso), [nowIso]);
    const selectedMonth = useMemo(() => selectedMonthIso ? new Date(selectedMonthIso) : stableNow, [selectedMonthIso, stableNow]);

    const { scrollY } = useScroll();
    const reduceMotion = useReducedMotion();

    const scopedTransactions = useMemo(() => {
        if (scopeAccountId === "all") return initialTransactions;
        return initialTransactions.filter((t) => t.accountId === scopeAccountId);
    }, [initialTransactions, scopeAccountId]);

    const recurringForScope = useMemo(() => {
        if (scopeAccountId === "all") return recurringTransactions;
        return recurringTransactions.filter((r) => r.accountId === scopeAccountId);
    }, [recurringTransactions, scopeAccountId]);

    const recurringTotalAmount = useMemo(
        () => recurringForScope.reduce((sum, r) => sum + r.amount, 0),
        [recurringForScope]
    );

    const oneTimeIncomeByAccountId = useMemo(
        () => new Map(monthlyIncomeEntries.map((e) => [e.accountId, e.totalAmount])),
        [monthlyIncomeEntries]
    );

    const accountBalancesAll = useMemo(() => {
        const inflowByAccountId = new Map(contributionTotals.map((row) => [row.accountId, row.totalMonthlyInflow]));
        return accounts.map((acc) => {
            const expenses = initialTransactions
                .filter((t) => t.accountId === acc.id && t.amount > 0)
                .reduce((sum, t) => sum + t.amount, 0);
            const monthlyInflow = inflowByAccountId.get(acc.id) ?? 0;
            const oneTimeIncome = oneTimeIncomeByAccountId.get(acc.id) ?? 0;
            const balance = monthlyInflow + oneTimeIncome - expenses;
            return { account: acc, expenses, monthlyInflow: monthlyInflow + oneTimeIncome, balance };
        });
    }, [accounts, initialTransactions, contributionTotals, oneTimeIncomeByAccountId]);

    const myMoneyBreakdown = useMemo(() => {
        if (myContributionRatios.length === 0) return null;
        return computeMyMoneyBreakdown({
            myContributions: myContributionRatios,
            transactions: initialTransactions.map((t) => ({
                accountId: t.accountId,
                accountType: t.account.type,
                category: t.category,
                amount: t.amount,
            })),
            monthlyIncomeEntries,
        });
    }, [myContributionRatios, initialTransactions, monthlyIncomeEntries]);

    const chartColors = [
        '#007AFF', '#FF9500', '#FF2D55', '#5856D6',
        '#34C759', '#AF52DE', '#5AC8FA', '#FF3B30', '#FFCC00',
    ];

    const chartData = useMemo(() => {
        if (scopeAccountId === "my-money" && myMoneyBreakdown) {
            return myMoneyBreakdown.categories.map(({ name, amount }, index) => {
                const cat = categories.find(c => c.name === name);
                return {
                    name,
                    value: amount,
                    color: chartColors[index % chartColors.length],
                    icon: cat ? cat.icon : '✨',
                };
            });
        }

        const categoryMap = new Map<string, number>();
        scopedTransactions.forEach((t) => {
            if (t.amount > 0) {
                categoryMap.set(t.category, (categoryMap.get(t.category) ?? 0) + t.amount);
            }
        });

        return Array.from(categoryMap.entries())
            .map(([name, value], index) => {
                const cat = categories.find(c => c.name === name);
                return {
                    name,
                    value,
                    color: chartColors[index % chartColors.length],
                    icon: cat ? cat.icon : '✨'
                };
            })
            .sort((a, b) => b.value - a.value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [scopedTransactions, categories, scopeAccountId, myMoneyBreakdown]);
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
        if (scopeAccountId === "all") return accountBalancesAll;
        return accountBalancesAll.filter((row) => row.account.id === scopeAccountId);
    }, [accountBalancesAll, scopeAccountId]);

    const totalMonthlyInflowScope = useMemo(() => {
        if (scopeAccountId === "all") {
            return accountBalancesAll.reduce((sum, row) => sum + row.monthlyInflow, 0);
        }
        const row = accountBalancesAll.find((r) => r.account.id === scopeAccountId);
        return row?.monthlyInflow ?? 0;
    }, [accountBalancesAll, scopeAccountId]);

    useEffect(() => {
        if (searchParams.get('quickAdd') !== '1') return;
        setQuickAddIntent({ recurring: searchParams.get('recurring') === '1' });
        setIsSheetOpen(true);
        const params = new URLSearchParams(searchParams.toString());
        params.delete('quickAdd');
        params.delete('recurring');
        const q = params.toString();
        router.replace(q ? `/?${q}` : '/', { scroll: false });
    }, [searchParams, router]);

    useMotionValueEvent(scrollY, "change", (latest) => {
        setShowStickyHeader(latest > 280);
    });

    const totalSpent = scopeAccountId === "my-money" && myMoneyBreakdown
        ? myMoneyBreakdown.totalAttributedExpenses
        : scopedTransactions.reduce((sum, t) => sum + t.amount, 0);
    const income = scopeAccountId === "my-money" && myMoneyBreakdown
        ? myMoneyBreakdown.totalIncome
        : totalMonthlyInflowScope;
    const hasIncomeConfigured = income > 0;
    const savedSoFar = hasIncomeConfigured ? income - totalSpent : 0;
    const rawRatio = hasIncomeConfigured ? (savedSoFar / income) * 100 : 0;
    const savingsRatio = Math.max(Math.min(rawRatio, 100), 0);

    const handleCloseSheet = () => {
        setIsSheetOpen(false);
        setQuickAddIntent(null);
    };

    const handleRecurringClick = (item: RecurringWithAccount) => {
        setSelectedRecurring(item);
    };

    const handleCloseRecurringSheet = () => {
        setSelectedRecurring(null);
    };

    const toggleRecurringSection = () => {
        const next = !recurringExpandedRef.current;
        setRecurringSectionExpanded(next);
        void updateDashboardRecurringSectionExpanded(next);
    };

    const monthName = formatUtcMonthYear(selectedMonth);
    const sectionEnter = reduceMotion ? false : ({ opacity: 0, y: 20 } as const);
    const sectionDelay = (seconds: number) => ({ delay: reduceMotion ? 0 : seconds });

    return (
        <div className="w-full max-w-md mx-auto h-full relative min-h-screen pb-28 pt-safe">
            {/* Sticky Header */}
            {showStickyHeader && hasIncomeConfigured && (
                <motion.div
                    initial={reduceMotion ? false : { y: -60, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="fixed top-0 inset-x-0 z-50 bg-white/80 dark:bg-ios-dark-card/80 backdrop-blur-xl border-b border-gray-200/60 dark:border-white/10 pt-safe"
                >
                    <div className="max-w-md mx-auto px-5 py-3 flex justify-between items-center">
                        <span className="font-bold text-base text-ios-text dark:text-ios-dark-text">
                            {savedSoFar >= 0
                                ? (scopeAccountId === "my-money" ? "חסכתי" : "חסכנו")
                                : "חריגה"} החודש
                        </span>
                        <span className={`font-bold tabular-nums ${savedSoFar >= 0 ? 'text-ios-green' : 'text-ios-red'}`}>
                            {savedSoFar >= 0 ? '₪' : '-₪'}{formatIlsAmount(Math.abs(savedSoFar))}
                        </span>
                    </div>
                </motion.div>
            )}

            <div className="px-5 pt-6">
                {/* Header */}
                <header className="mb-3">
                    <p className="text-base text-ios-subtle dark:text-ios-dark-subtle mb-1">
                        {viewerName?.trim() ? `${getGreeting(stableNow)}, ${viewerName.trim()}` : getGreeting(stableNow)}
                    </p>
                    <h1 className="text-3xl font-bold text-ios-text dark:text-ios-dark-text tracking-tight">
                        {monthName}
                    </h1>
                </header>

                <div className="mb-8 min-w-0">
                    <MonthSelector basePath="/" />
                </div>

                {(accounts.length > 1 || myContributionRatios.length > 0) ? (
                    <div className="mb-6 min-w-0 max-w-full flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
                        <h2 className="text-lg font-bold text-ios-text dark:text-ios-dark-text shrink-0">תצוגה לפי חשבון</h2>
                        <div className="relative w-full sm:w-auto sm:min-w-[11rem] shrink-0">
                            <label htmlFor="dashboard-scope-account" className="sr-only">
                                חשבון לתצוגה בסקירה
                            </label>
                            <select
                                id="dashboard-scope-account"
                                value={scopeAccountId}
                                onChange={(e) => {
                                    const v = e.target.value;
                                    setScopeAccount(v === "all" ? "all" : v);
                                }}
                                aria-label="חשבון לתצוגה בסקירה"
                                className="w-full appearance-none rounded-xl border border-gray-200/90 dark:border-white/10 bg-white/90 dark:bg-ios-dark-fill/90 text-sm font-semibold text-ios-text dark:text-ios-dark-text py-2.5 ps-3 pe-9 shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ios-blue/40"
                            >
                                <option value="all">כל החשבונות</option>
                                {myContributionRatios.length > 0 && (
                                    <option value="my-money">הכסף שלי</option>
                                )}
                                {accounts.map((acc) => (
                                    <option key={acc.id} value={acc.id}>
                                        {getAccountLabel(acc)}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown className="pointer-events-none absolute end-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ios-subtle dark:text-ios-dark-subtle" aria-hidden />
                        </div>
                    </div>
                ) : null}

                {/* Savings Ring */}
                <motion.div
                    initial={sectionEnter}
                    animate={{ opacity: 1, y: 0 }}
                    transition={sectionDelay(0.1)}
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
                                        initial={{ pathLength: reduceMotion ? savingsRatio / 100 : 0 }}
                                        animate={{ pathLength: savingsRatio / 100 }}
                                        transition={
                                            reduceMotion
                                                ? { duration: 0 }
                                                : { duration: 1.2, ease: "easeOut", delay: 0.3 }
                                        }
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
                                        <p className="text-xs text-ios-subtle dark:text-ios-dark-subtle font-medium">
                                            {scopeAccountId === "my-money" ? "חסכתי החודש" : "חסכנו החודש"}
                                        </p>
                                    <p className={`text-2xl font-bold tracking-tight ${savedSoFar >= 0 ? 'text-ios-green' : 'text-ios-red'}`}>
                                        ₪{formatIlsAmount(savedSoFar)}
                                    </p>
                                </div>
                                <div className="flex gap-6">
                                    <div>
                                        <p className="text-[11px] text-ios-subtle dark:text-ios-dark-subtle">
                                            {scopeAccountId === "my-money" ? "הכנסות שלי" : "הכנסות לחשבונות"}
                                        </p>
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
                                                <p className="text-[11px] text-ios-subtle dark:text-ios-dark-subtle">הכנסות לחשבונות</p>
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
                            <div className="absolute inset-0 flex items-center justify-center px-4 pointer-events-none">
                                <div className="w-[235px] rounded-xl bg-white/28 dark:bg-ios-dark-card/42 backdrop-blur-xl border border-white/20 dark:border-white/10 px-3 py-3 text-center shadow-card pointer-events-auto">
                                    <div className="w-8 h-8 rounded-full bg-ios-blue/15 text-ios-blue flex items-center justify-center mx-auto mb-2">
                                        <Lock className="w-4 h-4" />
                                    </div>
                                    <p className="text-xs text-ios-text dark:text-ios-dark-text leading-relaxed">
                                        הגדירו תרומה חודשית לכל חשבון בהגדרות כדי לראות כמה חסכתם החודש
                                    </p>
                                    <Link
                                        href="/settings"
                                        className="mt-3 inline-flex items-center justify-center w-full rounded-xl bg-ios-blue text-white text-xs font-semibold py-2.5 active:opacity-90"
                                    >
                                        הגדרות חשבונות
                                    </Link>
                                </div>
                            </div>
                        </div>
                    )}
                </motion.div>

                <motion.div
                    initial={sectionEnter}
                    animate={{ opacity: 1, y: 0 }}
                    transition={sectionDelay(0.2)}
                    className="bg-ios-card dark:bg-ios-dark-card rounded-3xl p-5 shadow-card mb-6"
                >
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-lg font-bold text-ios-text dark:text-ios-dark-text">
                            {scopeAccountId === "my-money" ? "הכסף שלי" : "מאזן לפי חשבון"}
                        </h2>
                        {scopeAccountId !== "my-money" && (
                            <span className="text-xs font-semibold text-ios-subtle dark:text-ios-dark-subtle">{accountBalances.length} חשבונות</span>
                        )}
                    </div>

                    {scopeAccountId === "my-money" && myMoneyBreakdown ? (
                        <div className="space-y-3">
                            <div className="rounded-2xl bg-ios-blue/8 ring-1 ring-ios-blue/20 p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <p className="text-sm font-semibold text-ios-blue">סיכום חודשי אישי</p>
                                    <p className={`text-sm font-bold tabular-nums ${myMoneyBreakdown.balance >= 0 ? "text-ios-green" : "text-ios-red"}`}>
                                        {myMoneyBreakdown.balance >= 0 ? "₪" : "-₪"}{formatIlsAmount(Math.abs(myMoneyBreakdown.balance))}
                                    </p>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-center">
                                    <div className="rounded-lg bg-white/70 dark:bg-ios-dark-card/70 px-2 py-2">
                                        <p className="text-[11px] text-ios-subtle dark:text-ios-dark-subtle">סה״כ הכנסות שלי</p>
                                        <p className="text-sm font-semibold text-ios-text dark:text-ios-dark-text tabular-nums">
                                            ₪{formatIlsAmount(Math.round(myMoneyBreakdown.totalIncome))}
                                        </p>
                                    </div>
                                    <div className="rounded-lg bg-white/70 dark:bg-ios-dark-card/70 px-2 py-2">
                                        <p className="text-[11px] text-ios-subtle dark:text-ios-dark-subtle">הוצאות מיוחסות לי</p>
                                        <p className="text-sm font-semibold text-ios-text dark:text-ios-dark-text tabular-nums">
                                            ₪{formatIlsAmount(Math.round(myMoneyBreakdown.totalAttributedExpenses))}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            {myMoneyBreakdown.categories.length > 0 && (
                                <div className="rounded-2xl bg-ios-gray-6/60 dark:bg-ios-dark-fill/60 p-3 space-y-2">
                                    <p className="text-[11px] font-semibold text-ios-subtle dark:text-ios-dark-subtle px-1">התפלגות לפי קטגוריה (מיוחס)</p>
                                    {myMoneyBreakdown.categories.slice(0, 5).map((cat) => {
                                        const pct = myMoneyBreakdown.totalAttributedExpenses > 0
                                            ? (cat.amount / myMoneyBreakdown.totalAttributedExpenses) * 100
                                            : 0;
                                        const icon = getCategoryIcon(categories, cat.name);
                                        return (
                                            <div key={cat.name} className="flex items-center gap-2.5">
                                                <span className="text-base w-6 text-center flex-shrink-0">{icon}</span>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between mb-0.5">
                                                        <span className="text-xs font-medium text-ios-text dark:text-ios-dark-text truncate">{cat.name}</span>
                                                        <span className="text-xs font-semibold text-ios-text dark:text-ios-dark-text tabular-nums flex-shrink-0 ms-2">
                                                            ₪{formatIlsAmount(Math.round(cat.amount))}
                                                        </span>
                                                    </div>
                                                    <div className="h-1.5 rounded-full bg-gray-200/70 dark:bg-ios-dark-fill overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full ${cat.source === 'shared' ? 'bg-ios-indigo/70' : 'bg-ios-blue/70'}`}
                                                            style={{ width: `${pct}%` }}
                                                        />
                                                    </div>
                                                </div>
                                                {cat.source === 'shared' && (
                                                    <span className="text-[10px] font-semibold text-ios-indigo bg-ios-indigo/10 px-1.5 py-0.5 rounded-md flex-shrink-0">משותף</span>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    ) : accountBalances.length === 0 ? (
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
                    ) : accountBalances.length > 1 ? (
                        <div className="flex flex-row-reverse gap-3 overflow-x-auto pb-2 pt-0.5 snap-x snap-mandatory no-scrollbar -mx-1 px-1">
                            {accountBalances.map((row, index) => (
                                <div
                                    key={row.account.id}
                                    className="snap-center shrink-0 w-[min(100%,17.5rem)] max-w-[280px]"
                                >
                                    <DashboardAccountBalanceCard row={row} index={index} reduceMotion={!!reduceMotion} />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="space-y-2.5">
                            {accountBalances.map((row, index) => (
                                <DashboardAccountBalanceCard key={row.account.id} row={row} index={index} reduceMotion={!!reduceMotion} />
                            ))}
                        </div>
                    )}
                </motion.div>

                {/* Spending Breakdown */}
                <motion.div
                    initial={sectionEnter}
                    animate={{ opacity: 1, y: 0 }}
                    transition={sectionDelay(0.35)}
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
                    initial={sectionEnter}
                    animate={{ opacity: 1, y: 0 }}
                    transition={sectionDelay(0.4)}
                    className="bg-ios-card dark:bg-ios-dark-card rounded-3xl p-5 shadow-card mt-3"
                >
                    <button
                        type="button"
                        onClick={toggleRecurringSection}
                        aria-expanded={recurringSectionExpanded}
                        className="w-full flex items-center justify-between gap-2 text-start rounded-xl -mx-1 px-1 py-0.5 active:bg-black/[0.03] dark:active:bg-white/[0.04] transition-colors"
                    >
                        <div className="flex items-center gap-2 min-w-0">
                            <motion.span
                                animate={{ rotate: recurringSectionExpanded ? 180 : 0 }}
                                transition={
                                    reduceMotion
                                        ? { duration: 0 }
                                        : { type: "spring", stiffness: 400, damping: 30 }
                                }
                                className="flex-shrink-0 text-ios-subtle dark:text-ios-dark-subtle inline-flex"
                                aria-hidden
                            >
                                <ChevronDown className="w-5 h-5" />
                            </motion.span>
                            <h2 className="text-lg font-bold text-ios-text dark:text-ios-dark-text truncate">ריכוז הוצאות קבועות</h2>
                        </div>
                        <span className="text-xs font-semibold text-ios-subtle dark:text-ios-dark-subtle flex-shrink-0">{recurringForScope.length} סה״כ</span>
                    </button>
                    {!recurringSectionExpanded && recurringForScope.length > 0 && (
                        <p className="text-xs text-ios-subtle dark:text-ios-dark-subtle mt-2 pr-7">
                            סה״כ קבועות חודשיות:{" "}
                            <span className="font-bold text-ios-text dark:text-ios-dark-text tabular-nums">
                                ₪{formatIlsAmount(recurringTotalAmount)}
                            </span>
                        </p>
                    )}
                    <AnimatePresence initial={false}>
                        {recurringSectionExpanded && (
                            <motion.div
                                key="recurring-body"
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{
                                    duration: reduceMotion ? 0.01 : 0.2,
                                    ease: "easeInOut",
                                }}
                                className="overflow-hidden"
                            >
                                <div className={recurringForScope.length === 0 ? "pt-2" : "pt-3"}>
                                    {recurringForScope.length === 0 ? (
                                        <p className="text-sm text-ios-subtle dark:text-ios-dark-subtle py-2">אין הוצאות חוזרות כרגע</p>
                                    ) : (
                                        <div className="bg-white dark:bg-ios-dark-card rounded-2xl shadow-card overflow-hidden divide-y divide-gray-100 dark:divide-white/10">
                                            {recurringForScope.map((item) => {
                                                const icon = getCategoryIcon(categories, item.category);
                                                const isShared = item.account.type === "SHARED";
                                                const badgeColor = isShared
                                                    ? "text-ios-indigo bg-ios-indigo/8"
                                                    : "text-ios-blue bg-ios-teal/8";
                                                return (
                                                    <button
                                                        key={item.id}
                                                        type="button"
                                                        onClick={() => handleRecurringClick(item)}
                                                        className="w-full flex items-center justify-between p-4 cursor-pointer active:bg-gray-50 dark:active:bg-ios-dark-fill transition-colors"
                                                    >
                                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                                            <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-ios-dark-fill flex items-center justify-center text-lg flex-shrink-0">
                                                                {icon}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <h3 className="text-[15px] font-semibold text-ios-text dark:text-ios-dark-text truncate">{item.description || item.category}</h3>
                                                                <div className="flex items-center gap-2 mt-0.5">
                                                                    <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded-md ${badgeColor}`}>
                                                                        {item.account.name}
                                                                    </span>
                                                                    <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded-md text-ios-blue bg-ios-blue/10">
                                                                        קבועה
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2 flex-shrink-0">
                                                            <span className="text-[15px] font-bold text-ios-text dark:text-ios-dark-text tabular-nums">₪{formatIlsAmount(item.amount)}</span>
                                                            <ChevronLeft className="w-4 h-4 text-gray-300 dark:text-ios-dark-subtle/60" />
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            </div>

            {/* Quick Add Sheet */}
            <QuickAddSheet
                isOpen={isSheetOpen}
                onClose={handleCloseSheet}
                initialData={null}
                categories={categories}
                accounts={accounts}
                openWithRecurring={quickAddIntent?.recurring ?? false}
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
