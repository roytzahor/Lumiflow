/** Insights anomalies section skeleton (below static header). */
export default function InsightsBodySkeleton() {
    return (
        <section className="skeleton-shimmer">
            <div className="h-5 w-52 bg-ios-gray-5 dark:bg-ios-dark-fill rounded-lg mb-3" />
            <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                    <div
                        key={i}
                        className="bg-ios-card dark:bg-ios-dark-card rounded-3xl p-4 shadow-card"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-xl bg-ios-gray-6 dark:bg-ios-dark-fill shrink-0" />
                            <div className="flex-1 min-w-0 space-y-2">
                                <div className="flex items-center justify-between gap-2">
                                    <div className="h-4 flex-1 max-w-[9rem] bg-ios-gray-5 dark:bg-ios-dark-fill rounded" />
                                    <div className="h-4 w-16 bg-ios-gray-5 dark:bg-ios-dark-fill rounded shrink-0" />
                                </div>
                                <div className="flex items-center justify-between gap-2">
                                    <div className="h-3.5 w-20 rounded-md bg-ios-gray-6 dark:bg-ios-dark-fill" />
                                    <div className="h-3 w-14 bg-ios-gray-6 dark:bg-ios-dark-fill rounded shrink-0" />
                                </div>
                            </div>
                        </div>
                        <div className="mt-3 rounded-xl px-3 py-2.5 flex justify-between bg-ios-gray-6/80 dark:bg-ios-dark-fill/80">
                            <div className="h-3 w-12 bg-ios-gray-5 dark:bg-ios-dark-fill rounded" />
                            <div className="h-3 w-14 bg-ios-gray-5 dark:bg-ios-dark-fill rounded" />
                        </div>
                        <div className="mt-1 rounded-xl px-3 py-2.5 flex justify-between bg-ios-gray-6 dark:bg-ios-dark-fill">
                            <div className="h-3 w-28 bg-ios-gray-5/80 dark:bg-ios-dark-fill rounded" />
                            <div className="h-3 w-14 bg-ios-gray-5/80 dark:bg-ios-dark-fill rounded" />
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}
