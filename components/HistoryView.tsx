"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import TransactionFeed from "./TransactionFeed";
import QuickAddSheet from "./QuickAddSheet";
import RecurringEditSheet from "./RecurringEditSheet";

const SavingsAllocationSheet = dynamic(() => import("./SavingsAllocationSheet"), { ssr: false });
import HistoryControlsCard from "./HistoryControlsCard";
import { useHaptic } from "@/hooks/useHaptic";
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

            <div className="px-5 mt-3 min-w-0">
                <HistoryControlsCard
                    accounts={accounts}
                    categories={categories}
                    activeCategoryNames={activeCategoryNames}
                    selectedCategory={selectedCategory}
                    effectiveAccountId={effectiveHistoryAccountId}
                    filteredAccount={filteredAccount}
                    showRecurring={showRecurring}
                    showSavingsInFeed={showSavingsInFeed}
                    showSavingsToggle={savingsForView.length > 0}
                    displayTotal={displayTotal}
                    visibleSavingsTotal={visibleSavingsTotal}
                    showSavingsSummaryRow={
                        !selectedCategory && showSavingsInFeed && visibleSavingsTotal > 0
                    }
                    onAccountChange={setHistoryAccountFilter}
                    onCategoryFilter={setCategoryFilter}
                    onToggleRecurring={toggleShowRecurring}
                    onToggleSavingsInFeed={() => setShowSavingsInFeed((v) => !v)}
                />
            </div>

            {/* Transactions */}
            <div className="px-5 mt-3 min-w-0">
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
