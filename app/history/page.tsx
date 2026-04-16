import { Suspense } from "react";
import HistoryPageSkeleton from "@/components/history-page-skeleton";
import HistoryDataLoader from "@/app/history/history-data-loader";
import { redirectToOnboardingIfNeeded } from "@/lib/onboarding";

export default async function HistoryPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    await redirectToOnboardingIfNeeded();
    const params = await searchParams;

    const now = new Date();
    const parsedYear = params.year ? parseInt(params.year as string, 10) : now.getFullYear();
    const parsedMonth = params.month ? parseInt(params.month as string, 10) : now.getMonth();
    const year = Number.isFinite(parsedYear) && parsedYear >= 2020 && parsedYear <= 2100 ? parsedYear : now.getFullYear();
    const month = Number.isFinite(parsedMonth) && parsedMonth >= 0 && parsedMonth <= 11 ? parsedMonth : now.getMonth();

    return (
        <Suspense fallback={<HistoryPageSkeleton />}>
            <HistoryDataLoader year={year} month={month} />
        </Suspense>
    );
}
