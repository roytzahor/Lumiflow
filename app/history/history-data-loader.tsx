import {
    getMonthlyStats,
    getAccounts,
    getCategories,
    getRecurringTransactions,
    getCurrentUserProfile,
    getSavingsLabels,
} from "@/app/actions";
import HistoryView from "@/components/HistoryView";

export default async function HistoryDataLoader({
    year,
    month,
}: {
    year: number;
    month: number;
}) {
    const [
        { total, accountTotals, transactions, savingsAllocations },
        accounts,
        categories,
        recurringTransactions,
        currentUser,
        savingsLabels,
    ] = await Promise.all([
        getMonthlyStats(year, month),
        getAccounts(),
        getCategories(),
        getRecurringTransactions(),
        getCurrentUserProfile(),
        getSavingsLabels(),
    ]);

    return (
        <HistoryView
            transactions={transactions}
            total={total}
            accountTotals={accountTotals}
            accounts={accounts}
            categories={categories}
            recurringTransactions={recurringTransactions}
            initialHistoryShowRecurring={currentUser?.historyShowRecurringTransactions ?? true}
            savingsAllocations={savingsAllocations}
            savingsLabels={savingsLabels}
        />
    );
}
