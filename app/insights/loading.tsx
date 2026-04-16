import InsightsBodySkeleton from "@/components/insights-body-skeleton";

export default function InsightsLoading() {
    return (
        <main className="min-h-screen pb-28 pt-safe bg-ios-bg dark:bg-ios-dark-bg text-ios-text dark:text-ios-dark-text">
            <div className="w-full max-w-md mx-auto px-5 py-8 space-y-4">
                <header className="mb-2">
                    <div className="h-9 w-28 bg-gray-200 dark:bg-ios-dark-fill rounded-lg skeleton-shimmer" />
                    <div className="h-4 w-36 bg-gray-100 dark:bg-ios-dark-fill rounded mt-2 skeleton-shimmer" />
                </header>
                <InsightsBodySkeleton />
            </div>
        </main>
    );
}
