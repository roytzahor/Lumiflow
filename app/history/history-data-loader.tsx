import { getMonthlyStats } from "@/app/actions/stats";
import { getAccounts } from "@/app/actions/accounts";
import { getCategories } from "@/app/actions/categories";
import { getRecurringTransactions } from "@/app/actions/recurring";
import { getCurrentUserProfile } from "@/app/actions/profile";
import { getSavingsLabels } from "@/app/actions/savings";
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
