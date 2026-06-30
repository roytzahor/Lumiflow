"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import { Search } from "lucide-react";
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

    const activeCategoryNames = useMemo(() => {
        const uniqueNames = new Set(transactions.map((t) => t.category));
        return Array.from(uniqueNames).sort((a, b) => a.localeCompare(b, "he"));
    }, [transactions]);

    /** Category filters from URL (`category` may repeat); only names present in this month. */
    const selectedCategories = useMemo(() => {
        const raw = searchParams.getAll("category").filter(Boolean);
        const legacy = searchParams.get("category");
        const merged = raw.length > 0 ? raw : legacy ? [legacy] : [];
        const valid = Array.from(new Set(merged)).filter((c) => activeCategoryNames.includes(c));
        return valid.sort((a, b) => a.localeCompare(b, "he"));
    }, [searchParams, activeCategoryNames]);

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

    const replaceCategoryParams = useCallback(
        (names: string[]) => {
            const params = new URLSearchParams(searchParams.toString());
            params.delete("category");
            const valid = Array.from(new Set(names)).filter((c) => activeCategoryNames.includes(c));
            const sorted = valid.sort((a, b) => a.localeCompare(b, "he"));
            for (const c of sorted) {
                params.append("category", c);
            }
            const q = params.toString();
            router.replace(q ? `/history?${q}` : "/history");
        },
        [router, searchParams, activeCategoryNames]
    );

    const toggleCategoryFilter = useCallback(
        (name: string) => {
            if (!activeCategoryNames.includes(name)) return;
            const next = new Set(selectedCategories);
            if (next.has(name)) next.delete(name);
            else next.add(name);
            replaceCategoryParams(Array.from(next));
        },
        [selectedCategories, replaceCategoryParams, activeCategoryNames]
    );

    const clearCategoryFilters = useCallback(() => {
        replaceCategoryParams([]);
    }, [replaceCategoryParams]);

    useEffect(() => {
        const raw = searchParams.getAll("category").filter(Boolean);
        const legacy = searchParams.get("category");
        const merged = raw.length > 0 ? raw : legacy ? [legacy] : [];
        const valid = Array.from(new Set(merged)).filter((c) => activeCategoryNames.includes(c));
        const sorted = [...valid].sort((a, b) => a.localeCompare(b, "he"));
        const hasInvalid = merged.some((c) => !activeCategoryNames.includes(c));
        const hasDupes = new Set(merged).size !== merged.length;
        if (hasInvalid || hasDupes) {
            const params = new URLSearchParams(searchParams.toString());
            params.delete("category");
            for (const c of sorted) {
                params.append("category", c);
            }
            const q = params.toString();
            router.replace(q ? `/history?${q}` : "/history", { scroll: false });
        }
    }, [activeCategoryNames, searchParams, router]);

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
    const [searchQuery, setSearchQuery] = useState("");
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

    const normalizedSearchQuery = searchQuery.trim().toLocaleLowerCase("he");

    const visibleTransactions = useMemo(() => {
        let result = showRecurring ? transactionsForView : transactionsForView.filter((t) => !t.isRecurring);
        if (selectedCategories.length > 0) {
            const set = new Set(selectedCategories);
            result = result.filter((t) => set.has(t.category));
        }
        if (normalizedSearchQuery) {
            result = result.filter((t) => {
                const description = (t.description ?? "").toLocaleLowerCase("he");
                const category = t.category.toLocaleLowerCase("he");
                return description.includes(normalizedSearchQuery) || category.includes(normalizedSearchQuery);
            });
        }
        return result;
    }, [transactionsForView, showRecurring, selectedCategories, normalizedSearchQuery]);

    const visibleSavings = useMemo(() => {
        if (selectedCategories.length > 0) return [];
        return savingsForView;
    }, [savingsForView, selectedCategories]);

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
                    selectedCategories={selectedCategories}
                    effectiveAccountId={effectiveHistoryAccountId}
                    filteredAccount={filteredAccount}
                    showRecurring={showRecurring}
                    showSavingsInFeed={showSavingsInFeed}
                    showSavingsToggle={savingsForView.length > 0}
                    displayTotal={displayTotal}
                    visibleSavingsTotal={visibleSavingsTotal}
                    showSavingsSummaryRow={
                        selectedCategories.length === 0 && showSavingsInFeed && visibleSavingsTotal > 0
                    }
                    searchQuery={searchQuery}
                    onAccountChange={setHistoryAccountFilter}
                    onToggleCategory={toggleCategoryFilter}
                    onClearCategories={clearCategoryFilters}
                    onToggleRecurring={toggleShowRecurring}
                    onToggleSavingsInFeed={() => setShowSavingsInFeed((v) => !v)}
                    onSearchChange={setSearchQuery}
                />
            </div>

            {/* Transactions */}
            <div className="px-5 mt-3 min-w-0">
                {normalizedSearchQuery && visibleTransactions.length === 0 && visibleSavings.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-ios-subtle dark:text-ios-dark-subtle">
                        <div className="w-14 h-14 bg-ios-gray-6 dark:bg-ios-dark-fill rounded-full flex items-center justify-center mb-3">
                            <Search className="h-6 w-6 opacity-60" aria-hidden />
                        </div>
                        <p className="text-sm font-medium text-center px-4 text-ios-subtle dark:text-ios-dark-subtle">
                            אין תוצאות עבור &quot;{searchQuery.trim()}&quot;
                        </p>
                    </div>
                ) : (
                    <TransactionFeed
                        transactions={visibleTransactions}
                        categories={categories}
                        onTransactionClick={handleTransactionClick}
                        savingsAllocations={visibleSavings}
                        savingsLabels={savingsLabels}
                        showSavingsInFeed={showSavingsInFeed && selectedCategories.length === 0}
                        onSavingsClick={handleSavingsClick}
                    />
                )}
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
