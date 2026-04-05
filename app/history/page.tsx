import { getMonthlyStats, getAccounts, getCategories, getRecurringTransactions, getCurrentUserProfile } from "@/app/actions";
import HistoryView from "@/components/HistoryView";
import { redirectToOnboardingIfNeeded } from "@/lib/onboarding";

export const dynamic = 'force-dynamic';

export default async function HistoryPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    await redirectToOnboardingIfNeeded();
    const params = await searchParams;

    const now = new Date();
    const parsedYear = params.year ? parseInt(params.year as string, 10) : now.getFullYear();
    const parsedMonth = params.month ? parseInt(params.month as string, 10) : now.getMonth();
    const year = Number.isFinite(parsedYear) && parsedYear >= 2020 && parsedYear <= 2100 ? parsedYear : now.getFullYear();
    const month = Number.isFinite(parsedMonth) && parsedMonth >= 0 && parsedMonth <= 11 ? parsedMonth : now.getMonth();

    const [{ total, accountTotals, transactions }, accounts, categories, recurringTransactions, currentUser] = await Promise.all([
        getMonthlyStats(year, month),
        getAccounts(),
        getCategories(),
        getRecurringTransactions(),
        getCurrentUserProfile(),
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
        />
    );
}
