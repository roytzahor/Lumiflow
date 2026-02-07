import { getMonthlyStats, getAccounts, getCategories } from "@/app/actions";
import HistoryView from "@/components/HistoryView";

export default async function HistoryPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const params = await searchParams;

    const now = new Date();
    const year = params.year ? parseInt(params.year as string) : now.getFullYear();
    const month = params.month ? parseInt(params.month as string) : now.getMonth();

    const [{ jointTotal, privateTotal, transactions }, accounts, categories] = await Promise.all([
        getMonthlyStats(year, month),
        getAccounts(),
        getCategories(),
    ]);
    const total = jointTotal + privateTotal;

    return (
        <HistoryView
            transactions={transactions}
            total={total}
            jointTotal={jointTotal}
            privateTotal={privateTotal}
            accounts={accounts}
            categories={categories}
        />
    );
}
