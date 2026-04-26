"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import TransactionFeed from "./TransactionFeed";
import QuickAddSheet from "./QuickAddSheet";
import RecurringEditSheet from "./RecurringEditSheet";

const SavingsAllocationSheet = dynamic(() => import("./SavingsAllocationSheet"), { ssr: false });
import LiquidToggle from "./ui/LiquidToggle";
import InfoHint from "./InfoHint";
import { useHaptic } from "@/hooks/useHaptic";
import { formatIlsAmount } from "@/lib/formatters";
import BottomNav from "./BottomNav";
import MonthSelector from "./MonthSelector";
import type {
    TransactionListItem,
    AccountSummary,
    Category,
    AccountTotal,
    RecurringWithAccount,
    SavingsAllocationListItem,
    SavingsLabel,
} from "@/lib/types";
import { updateHistoryShowRecurringTransactions } from "@/app/actions";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, X } from "lucide-react";
import { parseScopeAccountId } from "@/lib/scope-account";

interface HistoryViewProps {
    transactions: TransactionListItem[];
    total: number;
    accountTotals: AccountTotal[];
    accounts: AccountSummary[];
    categories: Category[];
    recurringTransactions?: RecurringWithAccount[];
    initialHistoryShowRecurring?: boolean;
    savingsAllocations?: SavingsAllocationListItem[];
    savingsLabels?: SavingsLabel[];
}

export default function HistoryView({
    transactions,
    accounts,
    categories,
    recurringTransactions = [],
    initialHistoryShowRecurring = true,
    savingsAllocations = [],
    savingsLabels = [],
}: HistoryViewProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const accountParam = searchParams.get("account");

    const selectedAccountId = useMemo(
        () => parseScopeAccountId(accountParam, accounts),
        [accountParam, accounts]
    );

    /** "my-money" is dashboard-only; treat as all accounts for the history list. */
    const effectiveHistoryAccountId = selectedAccountId === "my-money" ? "all" : selectedAccountId;

    const categoryParam = searchParams.get("category");

    const activeCategoryNames = useMemo(() => {
        const uniqueNames = new Set(transactions.map((t) => t.category));
        return Array.from(uniqueNames).sort((a, b) => a.localeCompare(b, "he"));
    }, [transactions]);

    const selectedCategory = useMemo(() => {
        if (!categoryParam) return null;
        if (activeCategoryNames.includes(categoryParam)) return categoryParam;
        return null;
    }, [categoryParam, activeCategoryNames]);

    const setHistoryAccountFilter = useCallback(
        (next: "all" | string) => {
            const params = new URLSearchParams(searchParams.toString());
            if (next === "all") {
                params.set("account", "all");
            } else {
                params.set("account", next);
            }
            const q = params.toString();
            router.replace(q ? `/history?${q}` : "/history");
        },
        [router, searchParams]
    );

    const setCategoryFilter = useCallback(
        (next: string | null) => {
            const params = new URLSearchParams(searchParams.toString());
            if (next) {
                params.set("category", next);
            } else {
                params.delete("category");
            }
            const q = params.toString();
            router.replace(q ? `/history?${q}` : "/history");
        },
        [router, searchParams]
    );

    useEffect(() => {
        if (categoryParam && !activeCategoryNames.includes(categoryParam)) {
            const params = new URLSearchParams(searchParams.toString());
            params.delete("category");
            const q = params.toString();
            router.replace(q ? `/history?${q}` : "/history", { scroll: false });
        }
    }, [categoryParam, activeCategoryNames, searchParams, router]);

    useEffect(() => {
        if (accountParam === "my-money") {
            const params = new URLSearchParams(searchParams.toString());
            params.set("account", "all");
            const q = params.toString();
            router.replace(`/history?${q}`, { scroll: false });
            return;
        }
        if (!accountParam) return;
        if (accountParam === "all") return;
        if (accounts.some((a) => a.id === accountParam)) return;
        const params = new URLSearchParams(searchParams.toString());
        params.delete("account");
        const q = params.toString();
        router.replace(q ? `/history?${q}` : "/history", { scroll: false });
    }, [accountParam, accounts, searchParams, router]);

    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState<TransactionListItem | null>(null);
    const [selectedRecurring, setSelectedRecurring] = useState<RecurringWithAccount | null>(null);
    const [showRecurring, setShowRecurring] = useState(initialHistoryShowRecurring);
    const showRecurringRef = useRef(showRecurring);
    showRecurringRef.current = showRecurring;
    const [showSavingsInFeed, setShowSavingsInFeed] = useState(true);
    const [savingsSheetOpen, setSavingsSheetOpen] = useState(false);
    const [editingSavings, setEditingSavings] = useState<SavingsAllocationListItem | null>(null);
    const { trigger } = useHaptic();

    useEffect(() => {
        setShowRecurring(initialHistoryShowRecurring);
    }, [initialHistoryShowRecurring]);

    const toggleShowRecurring = () => {
        const next = !showRecurringRef.current;
        setShowRecurring(next);
        void updateHistoryShowRecurringTransactions(next);
    };

    const transactionsForView = useMemo(() => {
        if (effectiveHistoryAccountId === "all") return transactions;
        return transactions.filter((t) => t.accountId === effectiveHistoryAccountId);
    }, [transactions, effectiveHistoryAccountId]);

    const savingsForView = useMemo(() => {
        if (effectiveHistoryAccountId === "all") return savingsAllocations;
        return savingsAllocations.filter((s) => s.accountId === effectiveHistoryAccountId);
    }, [savingsAllocations, effectiveHistoryAccountId]);

    const visibleTransactions = useMemo(() => {
        let result = showRecurring ? transactionsForView : transactionsForView.filter((t) => !t.isRecurring);
        if (selectedCategory) {
            result = result.filter((t) => t.category === selectedCategory);
        }
        return result;
    }, [transactionsForView, showRecurring, selectedCategory]);

    const visibleSavings = useMemo(() => {
        if (selectedCategory) return [];
        return savingsForView;
    }, [savingsForView, selectedCategory]);

    const displayTotal = useMemo(
        () => visibleTransactions.reduce((sum, t) => sum + t.amount, 0),
        [visibleTransactions]
    );

    const visibleSavingsTotal = useMemo(
        () => visibleSavings.reduce((sum, s) => sum + s.amount, 0),
        [visibleSavings]
    );

    const filteredAccount =
        effectiveHistoryAccountId === "all" ? null : accounts.find((a) => a.id === effectiveHistoryAccountId) ?? null;

    const handleTransactionClick = (transaction: TransactionListItem) => {
        trigger(10);
        if (transaction.recurringTransactionId) {
            const recurring = recurringTransactions.find((r) => r.id === transaction.recurringTransactionId);
            if (recurring) {
                setSelectedRecurring(recurring);
                return;
            }
        }
        if (transaction.isProjected) return;
        setEditingTransaction(transaction);
        setIsSheetOpen(true);
    };

    const handleSavingsClick = (row: SavingsAllocationListItem) => {
        trigger(10);
        setEditingSavings(row);
        setSavingsSheetOpen(true);
    };

    const handleCloseSheet = () => {
        setIsSheetOpen(false);
        setEditingTransaction(null);
    };

    const handleCloseRecurringSheet = () => {
        setSelectedRecurring(null);
    };

    return (
        <div className="w-full max-w-md mx-auto min-h-screen pb-28 overflow-x-clip font-sans text-ios-text dark:text-ios-dark-text">
            {/* Header */}
            <header className="pt-safe px-5 pt-8 pb-4">
                <h1 className="text-3xl font-bold text-ios-text dark:text-ios-dark-text tracking-tight">
                    היסטוריה
                </h1>
                <p className="text-sm text-ios-subtle dark:text-ios-dark-subtle mt-0.5">פירוט כל ההוצאות</p>
            </header>

            {/* Month Selector */}
            <div className="px-5 min-w-0">
                <MonthSelector />
            </div>

            {/* Recent activity title + account scope (same select styling as dashboard pie) */}
            <div className="px-5 mt-3 min-w-0 max-w-full flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-lg font-bold text-ios-text dark:text-ios-dark-text shrink-0">פעולות אחרונות</h2>
                {accounts.length > 1 ? (
                    <div className="relative w-full sm:w-auto sm:min-w-[11rem] shrink-0">
                        <label htmlFor="history-account-filter" className="sr-only">
                            סינון לפי חשבון
                        </label>
                        <select
                            data-testid="history-account-filter"
                            id="history-account-filter"
                            value={effectiveHistoryAccountId === "all" ? "all" : effectiveHistoryAccountId}
                            onChange={(e) => {
                                const v = e.target.value;
                                setHistoryAccountFilter(v === "all" ? "all" : v);
                            }}
                            aria-label="חשבון להצגה בהיסטוריה"
                            className="w-full appearance-none rounded-xl border border-gray-200/50 dark:border-white/10 bg-ios-card/95 dark:bg-ios-dark-fill/90 text-sm font-semibold text-ios-text dark:text-ios-dark-text py-2.5 ps-3 pe-9 shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ios-blue/40"
                        >
                            <option value="all">כל החשבונות</option>
                            {accounts.map((acc) => (
                                <option key={acc.id} value={acc.id}>
                                    {acc.name}
                                </option>
                            ))}
                        </select>
                        <ChevronDown
                            className="pointer-events-none absolute end-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ios-subtle dark:text-ios-dark-subtle"
                            aria-hidden
                        />
                    </div>
                ) : null}
            </div>

            {/* Category filter */}
            <div className="px-5 mt-3 min-w-0 max-w-full">
                {selectedCategory ? (
                    <div className="flex items-center gap-2 rounded-xl bg-ios-blue/10 dark:bg-ios-blue/15 border border-ios-blue/20 py-2 px-3">
                        <span className="text-sm font-semibold text-ios-blue flex-1 min-w-0 truncate">
                            {(() => {
                                const cat = categories.find((c) => c.name === selectedCategory);
                                return cat ? `${cat.icon} ${selectedCategory}` : selectedCategory;
                            })()}
                        </span>
                        <button
                            type="button"
                            onClick={() => setCategoryFilter(null)}
                            className="shrink-0 w-7 h-7 rounded-full bg-ios-blue/15 text-ios-blue flex items-center justify-center active:bg-ios-blue/25 transition-colors"
                            aria-label="הסר סינון קטגוריה"
                        >
                            <X className="w-3.5 h-3.5" strokeWidth={2.5} />
                        </button>
                    </div>
                ) : activeCategoryNames.length > 1 ? (
                    <div className="relative">
                        <label htmlFor="history-category-filter" className="sr-only">
                            סינון לפי קטגוריה
                        </label>
                        <select
                            data-testid="history-category-filter"
                            id="history-category-filter"
                            value=""
                            onChange={(e) => {
                                const v = e.target.value;
                                setCategoryFilter(v || null);
                            }}
                            aria-label="סינון לפי קטגוריה"
                            className="w-full appearance-none rounded-xl border border-gray-200/50 dark:border-white/10 bg-ios-card/95 dark:bg-ios-dark-fill/90 text-sm font-semibold text-ios-text dark:text-ios-dark-text py-2.5 ps-3 pe-9 shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ios-blue/40"
                        >
                            <option value="">כל הקטגוריות</option>
                            {activeCategoryNames.map((name) => {
                                const cat = categories.find((c) => c.name === name);
                                return (
                                    <option key={name} value={name}>
                                        {cat ? `${cat.icon} ${name}` : name}
                                    </option>
                                );
                            })}
                        </select>
                        <ChevronDown
                            className="pointer-events-none absolute end-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ios-subtle dark:text-ios-dark-subtle"
                            aria-hidden
                        />
                    </div>
                ) : null}
            </div>

            <div className="px-5 mt-3 w-full min-w-0 max-w-full space-y-2.5">
                <div className="flex w-full min-w-0 max-w-full items-center justify-between gap-2 rounded-2xl bg-ios-card/90 dark:bg-ios-dark-card/80 py-3 px-3.5 shadow-card">
                    <div className="flex min-w-0 flex-1 items-center gap-1.5">
                        <span className="text-sm font-semibold text-ios-text dark:text-ios-dark-text truncate">
                            הצג הוצאות קבועות
                        </span>
                        <InfoHint ariaLabel="הסבר על הצגת הוצאות קבועות">
                            כשהאפשרות פעילה, גם תנועות חוזרות צפויות מוצגות ברשימה לצד הוצאות שבוצעו בפועל.
                        </InfoHint>
                    </div>
                    <div className="shrink-0">
                        <LiquidToggle isOn={showRecurring} onToggle={toggleShowRecurring} testId="history-show-recurring" />
                    </div>
                </div>
                {savingsForView.length > 0 ? (
                    <div className="flex w-full min-w-0 max-w-full items-center justify-between gap-2 rounded-2xl bg-ios-card/90 dark:bg-ios-dark-card/80 py-3 px-3.5 shadow-card">
                        <div className="flex min-w-0 flex-1 items-center gap-1.5">
                            <span className="text-sm font-semibold text-ios-text dark:text-ios-dark-text truncate">
                                הצג הפרשות חיסכון
                            </span>
                            <InfoHint ariaLabel="הסבר על הצגת הפרשות חיסכון">
                                הפרשות חיסכון מוצגות בתזרים לצד הוצאות; הסכום בתקציר למטה משקף את סך ההפרשות
                                הגלויות כשהאפשרות דלוקה.
                            </InfoHint>
                        </div>
                        <div className="shrink-0">
                            <LiquidToggle
                                isOn={showSavingsInFeed}
                                onToggle={() => setShowSavingsInFeed((v) => !v)}
                                testId="history-show-savings"
                            />
                        </div>
                    </div>
                ) : null}
            </div>

            {/* Summary card */}
            <div className="px-5 mt-4 min-w-0">
                <div className="min-h-[152px] w-full min-w-0 bg-ios-card dark:bg-ios-dark-card rounded-2xl p-4 shadow-card flex flex-col justify-center gap-3">
                        <div className="flex items-center justify-between gap-4 w-full min-w-0">
                        <div className="min-w-0 flex-1 space-y-1">
                            <p className="text-[11px] font-medium text-ios-subtle dark:text-ios-dark-subtle">
                                {selectedCategory
                                    ? `סה״כ הוצאות ב${selectedCategory}`
                                    : filteredAccount
                                      ? "סה״כ הוצאות לחשבון"
                                      : "סה״כ כלל ההוצאות שלך"}
                            </p>
                            {filteredAccount ? (
                                <p className="text-xs font-semibold text-ios-indigo dark:text-ios-indigo truncate">
                                    {filteredAccount.name}
                                </p>
                            ) : null}
                        </div>
                        <p className="text-2xl font-bold text-ios-text dark:text-ios-dark-text tabular-nums shrink-0">
                            ₪{formatIlsAmount(displayTotal)}
                        </p>
                    </div>
                    {!selectedCategory && showSavingsInFeed && visibleSavingsTotal > 0 ? (
                        <div className="flex items-center justify-between gap-4 w-full min-w-0 pt-2 border-t border-black/5 dark:border-white/10">
                            <p className="text-[11px] font-medium text-ios-subtle dark:text-ios-dark-subtle">
                                סה״כ הפרשות חיסכון
                            </p>
                            <p className="text-lg font-bold text-ios-green tabular-nums shrink-0">
                                ₪{formatIlsAmount(visibleSavingsTotal)}
                            </p>
                        </div>
                    ) : null}
                </div>
            </div>

            {/* Transactions */}
            <div className="px-5">
                <TransactionFeed
                    transactions={visibleTransactions}
                    categories={categories}
                    onTransactionClick={handleTransactionClick}
                    savingsAllocations={visibleSavings}
                    savingsLabels={savingsLabels}
                    showSavingsInFeed={showSavingsInFeed && !selectedCategory}
                    onSavingsClick={handleSavingsClick}
                />
            </div>

            <BottomNav />

            <QuickAddSheet
                isOpen={isSheetOpen}
                onClose={handleCloseSheet}
                initialData={editingTransaction}
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
            <SavingsAllocationSheet
                isOpen={savingsSheetOpen}
                onClose={() => {
                    setSavingsSheetOpen(false);
                    setEditingSavings(null);
                }}
                initialData={editingSavings}
                accounts={accounts}
                savingsLabels={savingsLabels}
            />
        </div>
    );
}
