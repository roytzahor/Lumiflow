/** History route skeleton — used by `app/history/loading` and Suspense fallbacks. */
export default function HistoryPageSkeleton() {
    return (
        <main className="min-h-screen pb-28 pt-safe overflow-x-hidden bg-ios-bg dark:bg-ios-dark-bg">
            <div className="w-full max-w-md mx-auto overflow-x-hidden skeleton-shimmer">
                <div className="px-5 pt-8 pb-4">
                    <div className="h-8 w-28 bg-ios-gray-5 dark:bg-ios-dark-fill rounded-lg mb-1.5" />
                    <div className="h-4 w-36 bg-ios-gray-6 dark:bg-ios-dark-fill rounded-lg" />
                </div>

                <div className="flex justify-between items-center px-5 mb-3">
                    <div className="w-8 h-8 rounded-full bg-ios-gray-6 dark:bg-ios-dark-fill" />
                    <div className="h-5 w-12 bg-ios-gray-5 dark:bg-ios-dark-fill rounded" />
                    <div className="w-8 h-8 rounded-full bg-ios-gray-6 dark:bg-ios-dark-fill" />
                </div>

                <div className="px-5 mb-4">
                    <div className="w-full max-w-full min-w-0 overflow-x-auto no-scrollbar">
                        <div className="flex w-max min-w-full flex-row-reverse gap-2">
                            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                                <div key={i} className="min-w-[3.5rem] h-9 rounded-xl bg-ios-gray-6 dark:bg-ios-dark-fill" />
                            ))}
                        </div>
                    </div>
                </div>

                <div className="px-5 mt-3 mb-4">
                    <div className="rounded-3xl bg-ios-card dark:bg-ios-dark-card p-4 shadow-card space-y-3">
                        <div className="h-5 w-36 bg-ios-gray-5 dark:bg-ios-dark-fill rounded-lg" />
                        <div className="h-9 w-full bg-ios-gray-6 dark:bg-ios-dark-fill rounded-xl" />
                        <div className="h-9 w-full bg-ios-gray-6 dark:bg-ios-dark-fill rounded-xl" />
                        <div className="flex justify-between gap-3 border-t border-black/5 dark:border-white/10 pt-3">
                            <div className="space-y-1.5 flex-1 min-w-0">
                                <div className="h-3 w-28 bg-ios-gray-6 dark:bg-ios-dark-fill rounded" />
                                <div className="h-3 w-20 bg-ios-gray-6 dark:bg-ios-dark-fill rounded" />
                            </div>
                            <div className="h-7 w-24 bg-ios-gray-5 dark:bg-ios-dark-fill rounded-lg shrink-0" />
                        </div>
                        <div className="flex flex-wrap gap-3 border-t border-black/5 dark:border-white/10 pt-3">
                            <div className="h-9 flex-1 min-w-[9rem] bg-ios-gray-6 dark:bg-ios-dark-fill rounded-lg" />
                            <div className="h-9 flex-1 min-w-[9rem] bg-ios-gray-6 dark:bg-ios-dark-fill rounded-lg" />
                        </div>
                    </div>
                </div>

                <div className="px-5 mt-3 space-y-3">
                    <div className="h-5 w-24 bg-ios-gray-5 dark:bg-ios-dark-fill rounded-lg mb-2" />
                    <div className="bg-ios-gray-6 dark:bg-ios-dark-fill rounded-xl h-10 mb-4" />
                    <div className="bg-ios-gray-6 dark:bg-ios-dark-fill rounded-xl overflow-hidden divide-y divide-gray-200/50 dark:divide-white/10">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="flex items-center justify-between px-4 py-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-ios-gray-6 dark:bg-ios-dark-fill" />
                                    <div className="space-y-1.5">
                                        <div className="h-4 w-24 bg-ios-gray-6 dark:bg-ios-dark-fill rounded" />
                                        <div className="h-3 w-14 bg-ios-gray-6 dark:bg-ios-dark-fill/70 rounded" />
                                    </div>
                                </div>
                                <div className="h-4 w-14 bg-ios-gray-6 dark:bg-ios-dark-fill rounded" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </main>
    );
}
