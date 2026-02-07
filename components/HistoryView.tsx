"use client";

import { useState } from "react";
import TransactionFeed from "./TransactionFeed";
import QuickAddSheet from "./QuickAddSheet";
import { useHaptic } from "@/hooks/useHaptic";
import BottomNav from "./BottomNav";
import MonthSelector from "./MonthSelector";
import type { TransactionWithAccount, Account, Category } from "@/lib/types";

interface HistoryViewProps {
    transactions: TransactionWithAccount[];
    total: number;
    jointTotal: number;
    privateTotal: number;
    accounts: Account[];
    categories: Category[];
}

export default function HistoryView({ transactions, total, jointTotal, privateTotal, accounts, categories }: HistoryViewProps) {
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState<TransactionWithAccount | null>(null);
    const { trigger } = useHaptic();

    const handleTransactionClick = (transaction: TransactionWithAccount) => {
        trigger(10);
        setEditingTransaction(transaction);
        setIsSheetOpen(true);
    };

    const handleCloseSheet = () => {
        setIsSheetOpen(false);
        setEditingTransaction(null);
    };

    return (
        <div className="w-full max-w-md mx-auto min-h-screen pb-28 font-sans text-gray-900">
            {/* Header */}
            <header className="pt-safe px-5 pt-8 pb-4">
                <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
                    היסטוריה
                </h1>
                <p className="text-sm text-gray-400 mt-0.5">פירוט כל ההוצאות</p>
            </header>

            {/* Month Selector */}
            <MonthSelector />

            {/* Summary Cards */}
            <div className="px-5 mt-4 flex gap-3">
                {/* Total */}
                <div className="flex-1 bg-white rounded-2xl p-4 shadow-card">
                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">סה״כ</p>
                    <p className="text-2xl font-bold text-gray-900 tabular-nums">₪{total.toLocaleString()}</p>
                </div>

                {/* Joint + Private */}
                <div className="flex-1 flex flex-col gap-2">
                    <div className="bg-white rounded-xl px-4 py-2.5 shadow-card flex justify-between items-center">
                        <span className="text-xs font-semibold text-ios-indigo">משותף</span>
                        <span className="text-sm font-bold text-gray-900 tabular-nums">₪{jointTotal.toLocaleString()}</span>
                    </div>
                    <div className="bg-white rounded-xl px-4 py-2.5 shadow-card flex justify-between items-center">
                        <span className="text-xs font-semibold text-ios-pink">פרטי</span>
                        <span className="text-sm font-bold text-gray-900 tabular-nums">₪{privateTotal.toLocaleString()}</span>
                    </div>
                </div>
            </div>

            {/* Transactions */}
            <div className="px-5">
                <TransactionFeed
                    transactions={transactions}
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
