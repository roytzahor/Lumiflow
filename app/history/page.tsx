import { getMonthlyStats, getAccounts, getCategories } from "@/app/actions";
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
    const year = params.year ? parseInt(params.year as string) : now.getFullYear();
    const month = params.month ? parseInt(params.month as string) : now.getMonth();

    const [{ total, accountTotals, transactions }, accounts, categories] = await Promise.all([
        getMonthlyStats(year, month),
        getAccounts(),
        getCategories(),
    ]);

    return (
        <HistoryView
            transactions={transactions}
            total={total}
            accountTotals={accountTotals}
            accounts={accounts}
            categories={categories}
        />
    );
}
