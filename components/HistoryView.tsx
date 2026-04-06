"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import TransactionFeed from "./TransactionFeed";
import QuickAddSheet from "./QuickAddSheet";
import RecurringEditSheet from "./RecurringEditSheet";
import LiquidToggle from "./ui/LiquidToggle";
import { useHaptic } from "@/hooks/useHaptic";
import { formatIlsAmount } from "@/lib/formatters";
import BottomNav from "./BottomNav";
import MonthSelector from "./MonthSelector";
import type { TransactionListItem, Account, Category, AccountTotal, RecurringWithAccount } from "@/lib/types";
import { updateHistoryShowRecurringTransactions } from "@/app/actions";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { parseScopeAccountId } from "@/lib/scope-account";

interface HistoryViewProps {
    transactions: TransactionListItem[];
    total: number;
    accountTotals: AccountTotal[];
    accounts: Account[];
    categories: Category[];
    recurringTransactions?: RecurringWithAccount[];
    initialHistoryShowRecurring?: boolean;
}

export default function HistoryView({
    transactions,
    accounts,
    categories,
    recurringTransactions = [],
    initialHistoryShowRecurring = true,
}: HistoryViewProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const accountParam = searchParams.get("account");

    const selectedAccountId = useMemo(
        () => parseScopeAccountId(accountParam, accounts),
        [accountParam, accounts]
    );

    const setHistoryAccountFilter = useCallback(
        (next: "all" | string) => {
            const params = new URLSearchParams(searchParams.toString());
            if (next === "all") {
                params.delete("account");
            } else {
                params.set("account", next);
            }
            const q = params.toString();
            router.replace(q ? `/history?${q}` : "/history");
        },
        [router, searchParams]
    );

    useEffect(() => {
        if (!accountParam) return;
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
        if (selectedAccountId === "all") return transactions;
        return transactions.filter((t) => t.accountId === selectedAccountId);
    }, [transactions, selectedAccountId]);

    const visibleTransactions = useMemo(
        () => (showRecurring ? transactionsForView : transactionsForView.filter((t) => !t.isRecurring)),
        [transactionsForView, showRecurring]
    );

    const displayTotal = useMemo(
        () => visibleTransactions.reduce((sum, t) => sum + t.amount, 0),
        [visibleTransactions]
    );

    const filteredAccount =
        selectedAccountId === "all" ? null : accounts.find((a) => a.id === selectedAccountId) ?? null;

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
                            id="history-account-filter"
                            value={selectedAccountId === "all" ? "all" : selectedAccountId}
                            onChange={(e) => {
                                const v = e.target.value;
                                setHistoryAccountFilter(v === "all" ? "all" : v);
                            }}
                            aria-label="חשבון להצגה בהיסטוריה"
                            className="w-full appearance-none rounded-xl border border-gray-200/90 dark:border-white/10 bg-white/90 dark:bg-ios-dark-fill/90 text-sm font-semibold text-ios-text dark:text-ios-dark-text py-2.5 ps-3 pe-9 shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ios-blue/40"
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

            <div className="px-5 mt-3 w-full min-w-0 max-w-full">
                <div className="flex w-full min-w-0 max-w-full items-center justify-between gap-3 rounded-2xl bg-white/80 dark:bg-ios-dark-card/80 py-3 px-3.5 shadow-card border border-gray-100/80 dark:border-white/10">
                    <span className="text-sm font-semibold text-ios-text dark:text-ios-dark-text min-w-0 flex-1 truncate">
                        הצג הוצאות קבועות
                    </span>
                    <div className="shrink-0">
                        <LiquidToggle isOn={showRecurring} onToggle={toggleShowRecurring} testId="history-show-recurring" />
                    </div>
                </div>
            </div>

            {/* Summary card */}
            <div className="px-5 mt-4 min-w-0">
                <div className="min-h-[152px] w-full min-w-0 bg-white dark:bg-ios-dark-card rounded-2xl p-4 shadow-card flex flex-col justify-center">
                    <div className="flex items-center justify-between gap-4 w-full min-w-0">
                        <div className="min-w-0 flex-1 space-y-1">
                            <p className="text-[11px] font-medium text-ios-subtle dark:text-ios-dark-subtle">
                                {filteredAccount ? "סה״כ הוצאות לחשבון" : "סה״כ כלל ההוצאות שלך"}
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
                </div>
            </div>

            {/* Transactions */}
            <div className="px-5">
                <TransactionFeed
                    transactions={visibleTransactions}
                    categories={categories}
                    onTransactionClick={handleTransactionClick}
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
        </div>
    );
}
