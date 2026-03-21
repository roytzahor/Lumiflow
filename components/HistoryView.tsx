"use client";

import { useState } from "react";
import TransactionFeed from "./TransactionFeed";
import QuickAddSheet from "./QuickAddSheet";
import { useHaptic } from "@/hooks/useHaptic";
import { formatIlsAmount } from "@/lib/formatters";
import BottomNav from "./BottomNav";
import MonthSelector from "./MonthSelector";
import type { TransactionListItem, Account, Category, AccountTotal } from "@/lib/types";

interface HistoryViewProps {
    transactions: TransactionListItem[];
    total: number;
    accountTotals: AccountTotal[];
    accounts: Account[];
    categories: Category[];
}

export default function HistoryView({ transactions, total, accountTotals, accounts, categories }: HistoryViewProps) {
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState<TransactionListItem | null>(null);
    const { trigger } = useHaptic();
    const totalsByAccountId = new Map(accountTotals.map((row) => [row.accountId, row.total]));
    const normalizedAccountTotals = accounts
        .map((account) => ({
            accountId: account.id,
            accountName: account.name,
            total: totalsByAccountId.get(account.id) ?? 0,
        }))
        .sort((a, b) => {
            if (b.total !== a.total) return b.total - a.total;
            return a.accountName.localeCompare(b.accountName, "he");
        });
    const accountCount = normalizedAccountTotals.length;
    const hasNoAccounts = accountCount === 0;
    const hasScrollableAccounts = accountCount > 3;
    const visibleAccountTotals = normalizedAccountTotals.slice(0, 3);
    const summaryRowHeightClass = "h-[172px]";
    const scrollAccountCardHeightClass = "h-[52px]";

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
            <div className="px-5">
                <MonthSelector />
            </div>

            {/* Summary Cards */}
            <div className="px-5 mt-4">
                <div className={`flex gap-3 items-stretch ${summaryRowHeightClass}`}>
                    {/* Total */}
                    <div className={`${hasNoAccounts ? "w-full" : "flex-1 h-full"} bg-white dark:bg-ios-dark-card rounded-2xl p-4 shadow-card flex flex-col justify-center`}>
                        <p className="text-[11px] font-medium text-ios-subtle dark:text-ios-dark-subtle mb-1">סה״כ כלל ההוצאות שלך</p>
                        <p className="text-2xl font-bold text-ios-text dark:text-ios-dark-text tabular-nums">₪{formatIlsAmount(total)}</p>
                    </div>

                    {!hasNoAccounts && (
                        <div className="flex-1 min-h-0 h-full">
                            {hasScrollableAccounts ? (
                                <div className="h-full overflow-y-scroll pr-1 [scrollbar-gutter:stable] scrollbar-thin [scrollbar-color:rgba(0,122,255,0.72)_rgba(120,120,128,0.2)] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-ios-subtle/20 dark:[&::-webkit-scrollbar-track]:bg-ios-dark-subtle/20 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-ios-blue/75 dark:[&::-webkit-scrollbar-thumb]:bg-ios-blue/65">
                                    <div className="flex flex-col gap-2">
                                        {normalizedAccountTotals.map((row) => (
                                            <div
                                                key={row.accountId}
                                                className={`${scrollAccountCardHeightClass} flex-shrink-0 bg-white dark:bg-ios-dark-card rounded-xl px-3 py-2 shadow-card flex justify-between items-center`}
                                            >
                                                <span className="text-[11px] font-semibold text-ios-indigo truncate max-w-[110px]">{row.accountName}</span>
                                                <span className="text-xs font-bold text-ios-text dark:text-ios-dark-text tabular-nums">₪{formatIlsAmount(row.total)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="h-full flex flex-col gap-2">
                                    {visibleAccountTotals.map((row) => (
                                        <div
                                            key={row.accountId}
                                            className="flex-1 min-h-0 bg-white dark:bg-ios-dark-card rounded-xl px-3 py-2 shadow-card flex justify-between items-center"
                                        >
                                            <span className="text-[11px] font-semibold text-ios-indigo truncate max-w-[110px]">{row.accountName}</span>
                                            <span className="text-xs font-bold text-ios-text dark:text-ios-dark-text tabular-nums">₪{formatIlsAmount(row.total)}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
                {hasScrollableAccounts && (
                    <p className="text-[11px] text-ios-subtle dark:text-ios-dark-subtle mt-2">
                        גללו למעלה/למטה להצגת חשבונות נוספים
                    </p>
                )}
            </div>

            {/* Transactions */}
            <div className="px-5">
                <TransactionFeed
                    transactions={transactions}
                    accounts={accounts}
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
        </div>
    );
}
