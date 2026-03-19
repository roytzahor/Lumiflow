export default function Loading() {
    return (
        <main className="min-h-screen pb-28 pt-safe bg-ios-bg dark:bg-ios-dark-bg">
            <div className="w-full max-w-md mx-auto px-5 pt-6 animate-pulse">
                {/* Header */}
                <div className="mb-8">
                    <div className="h-4 w-20 bg-gray-200 dark:bg-ios-dark-fill rounded-lg mb-2" />
                    <div className="h-8 w-40 bg-gray-200 dark:bg-ios-dark-fill rounded-lg" />
                </div>

                {/* Summary card */}
                <div className="bg-white dark:bg-ios-dark-card rounded-3xl p-6 shadow-card mb-4">
                    <div className="flex items-center gap-6">
                        <div className="w-24 h-24 rounded-full bg-gray-100 dark:bg-ios-dark-fill" />
                        <div className="flex-1 space-y-3">
                            <div className="h-3 w-16 bg-gray-100 dark:bg-ios-dark-fill rounded" />
                            <div className="h-7 w-28 bg-gray-100 dark:bg-ios-dark-fill rounded" />
                            <div className="flex gap-6">
                                <div className="space-y-1">
                                    <div className="h-2.5 w-10 bg-gray-100 dark:bg-ios-dark-fill rounded" />
                                    <div className="h-4 w-16 bg-gray-100 dark:bg-ios-dark-fill rounded" />
                                </div>
                                <div className="space-y-1">
                                    <div className="h-2.5 w-10 bg-gray-100 dark:bg-ios-dark-fill rounded" />
                                    <div className="h-4 w-16 bg-gray-100 dark:bg-ios-dark-fill rounded" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Account cards */}
                <div className="flex gap-3 mb-6">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="flex-1 bg-gray-100 dark:bg-ios-dark-fill rounded-2xl h-20" />
                    ))}
                </div>

                {/* Pie chart area */}
                <div className="bg-white dark:bg-ios-dark-card rounded-3xl h-72 shadow-card mb-6" />

                {/* Filter tabs */}
                <div className="h-5 w-32 bg-gray-200 dark:bg-ios-dark-fill rounded-lg mb-3" />
                <div className="bg-gray-100 dark:bg-ios-dark-fill rounded-xl h-10 mb-4" />

                {/* Transaction skeletons */}
                <div className="space-y-3">
                    <div className="h-3 w-28 bg-gray-100 dark:bg-ios-dark-fill rounded mb-2" />
                    <div className="bg-white dark:bg-ios-dark-card rounded-2xl shadow-card overflow-hidden">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="flex items-center justify-between p-4 border-b border-gray-50 dark:border-white/10 last:border-0">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-ios-dark-fill" />
                                    <div className="space-y-1.5">
                                        <div className="h-4 w-24 bg-gray-100 dark:bg-ios-dark-fill rounded" />
                                        <div className="h-3 w-14 bg-gray-50 dark:bg-ios-dark-fill/70 rounded" />
                                    </div>
                                </div>
                                <div className="h-4 w-14 bg-gray-100 dark:bg-ios-dark-fill rounded" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </main>
    );
}
