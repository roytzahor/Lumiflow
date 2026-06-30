import Dashboard from "@/components/Dashboard";
import DashboardLoadError from "@/components/DashboardLoadError";
import { loadDashboardPageData } from "@/lib/server/load-dashboard-data";

function firstQueryValue(value: string | string[] | undefined): string | undefined {
    if (value === undefined) return undefined;
    return Array.isArray(value) ? value[0] : value;
}

export default async function DashboardDataLoader({
    searchParams,
}: {
    searchParams: Record<string, string | string[] | undefined>;
}) {
    try {
        const dashboardFailFlag = firstQueryValue(searchParams.dashboardFail);
        if (process.env.NODE_ENV !== "production" && dashboardFailFlag === "1") {
            throw new Error("Simulated dashboard load failure");
        }

        const now = new Date();
        const parsedYear = searchParams.year ? parseInt(String(searchParams.year), 10) : now.getFullYear();
        const parsedMonth = searchParams.month ? parseInt(String(searchParams.month), 10) : now.getMonth();
        const year =
            Number.isFinite(parsedYear) && parsedYear >= 2020 && parsedYear <= 2100 ? parsedYear : now.getFullYear();
        const month =
            Number.isFinite(parsedMonth) && parsedMonth >= 0 && parsedMonth <= 11 ? parsedMonth : now.getMonth();
        const selectedMonthIso = new Date(Date.UTC(year, month, 1)).toISOString();

        const {
            transactions,
            categories,
            accounts,
            recurringTransactions,
            contributionTotals,
            currentUser,
            monthlyIncomeEntries,
            myContributionRatios,
            savingsAllocations,
            savingsLabels,
            budgetSettings,
            prevMonthTotal,
        } = await loadDashboardPageData(year, month);

        return (
            <Dashboard
                initialTransactions={transactions}
                initialSavingsAllocations={savingsAllocations}
                savingsLabels={savingsLabels}
                nowIso={now.toISOString()}
                selectedMonthIso={selectedMonthIso}
                categories={categories}
                accounts={accounts}
                recurringTransactions={recurringTransactions}
                contributionTotals={contributionTotals}
                monthlyIncomeEntries={monthlyIncomeEntries}
                myContributionRatios={myContributionRatios}
                viewerName={currentUser?.name ?? null}
                initialRecurringSectionExpanded={currentUser?.dashboardRecurringSectionExpanded ?? false}
                initialSavingsSectionExpanded={currentUser?.dashboardSavingsSectionExpanded ?? false}
                initialSpendingSectionExpanded={currentUser?.dashboardSpendingSectionExpanded ?? true}
                welcomeTourCompletedAt={currentUser?.welcomeTourCompletedAt ?? null}
                budgetSettings={budgetSettings ?? null}
                prevMonthTotal={prevMonthTotal}
            />
        );
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown dashboard load error";
        return <DashboardLoadError message={message} />;
    }
}
