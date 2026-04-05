export default function Loading() {
    return (
        <main className="min-h-screen pb-28 pt-safe bg-ios-bg dark:bg-ios-dark-bg">
            <div className="w-full max-w-md mx-auto px-5 pt-6 animate-pulse">
                {/* Header: greeting + month title (Dashboard header) */}
                <header className="mb-3">
                    <div className="h-4 w-36 bg-gray-200 dark:bg-ios-dark-fill rounded-lg mb-2" />
                    <div className="h-9 w-52 max-w-[85%] bg-gray-200 dark:bg-ios-dark-fill rounded-lg" />
                </header>

                {/* MonthSelector */}
                <div className="mb-8">
                    <div className="flex justify-between items-center mb-3">
                        <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-ios-dark-fill shrink-0" />
                        <div className="h-5 w-14 bg-gray-200 dark:bg-ios-dark-fill rounded" />
                        <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-ios-dark-fill shrink-0" />
                    </div>
                    <div className="w-full max-w-full min-w-0 overflow-x-auto no-scrollbar pb-2 [direction:ltr]">
                        <div className="flex w-max min-w-full flex-row-reverse gap-2">
                            {Array.from({ length: 12 }).map((_, i) => (
                                <div
                                    key={i}
                                    className="shrink-0 min-w-[3.5rem] h-10 rounded-xl bg-gray-100 dark:bg-ios-dark-fill"
                                />
                            ))}
                        </div>
                    </div>
                </div>

                {/* Savings ring card */}
                <div className="bg-ios-card dark:bg-ios-dark-card rounded-3xl p-6 shadow-card mb-4">
                    <div className="flex items-center gap-6">
                        <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
                            <div className="absolute inset-0 rounded-full border-[6px] border-gray-200 dark:border-ios-dark-fill" />
                            <div className="h-5 w-8 bg-gray-200 dark:bg-ios-dark-fill rounded" />
                        </div>
                        <div className="flex-1 space-y-3 min-w-0">
                            <div>
                                <div className="h-3 w-24 bg-gray-100 dark:bg-ios-dark-fill rounded mb-2" />
                                <div className="h-8 w-32 bg-gray-200 dark:bg-ios-dark-fill rounded" />
                            </div>
                            <div className="flex gap-6">
                                <div className="space-y-1.5">
                                    <div className="h-2.5 w-12 bg-gray-100 dark:bg-ios-dark-fill rounded" />
                                    <div className="h-4 w-20 bg-gray-200 dark:bg-ios-dark-fill rounded" />
                                </div>
                                <div className="space-y-1.5">
                                    <div className="h-2.5 w-12 bg-gray-100 dark:bg-ios-dark-fill rounded" />
                                    <div className="h-4 w-20 bg-gray-200 dark:bg-ios-dark-fill rounded" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* מאזן לפי חשבון — carousel-style cards */}
                <div className="bg-ios-card dark:bg-ios-dark-card rounded-3xl p-5 shadow-card mb-6">
                    <div className="flex items-center justify-between mb-3">
                        <div className="h-6 w-40 bg-gray-200 dark:bg-ios-dark-fill rounded-lg" />
                        <div className="h-4 w-16 bg-gray-100 dark:bg-ios-dark-fill rounded" />
                    </div>
                    <div className="flex flex-row-reverse gap-3 overflow-hidden -mx-1 px-1 pt-0.5">
                        {[1, 2].map((i) => (
                            <div
                                key={i}
                                className="shrink-0 w-[min(100%,17.5rem)] max-w-[280px] rounded-2xl p-4 ring-1 ring-gray-200/80 dark:ring-white/10 bg-ios-indigo/5 dark:bg-ios-indigo/8"
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <div className="h-4 w-20 bg-gray-200/80 dark:bg-ios-dark-fill rounded" />
                                    <div className="h-4 w-16 bg-gray-200/80 dark:bg-ios-dark-fill rounded tabular-nums" />
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                    {[1, 2, 3].map((j) => (
                                        <div
                                            key={j}
                                            className="rounded-lg bg-white/70 dark:bg-ios-dark-card/70 h-[52px] flex flex-col justify-center gap-1 px-1"
                                        >
                                            <div className="h-2 w-8 mx-auto bg-gray-200/90 dark:bg-ios-dark-fill rounded" />
                                            <div className="h-3 w-10 mx-auto bg-gray-200 dark:bg-ios-dark-fill rounded" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* התפלגות הוצאות — PieChart: donut + legend */}
                <div className="bg-ios-card dark:bg-ios-dark-card rounded-3xl p-5 shadow-card mb-6">
                    <div className="h-6 w-44 bg-gray-200 dark:bg-ios-dark-fill rounded-lg mb-3" />
                    <div className="relative rounded-2xl overflow-hidden bg-ios-gray-6/20 dark:bg-ios-dark-fill/30">
                        <div className="flex flex-col items-center w-full py-2">
                            <div className="relative w-48 h-48 my-2 flex items-center justify-center">
                                <div className="absolute inset-2 rounded-full border-[10px] border-gray-200 dark:border-ios-dark-fill" />
                                <div className="w-[6.75rem] h-[6.75rem] rounded-full bg-ios-card dark:bg-ios-dark-card" />
                                <div className="absolute flex flex-col items-center gap-1">
                                    <div className="h-2.5 w-8 bg-gray-200 dark:bg-ios-dark-fill rounded" />
                                    <div className="h-5 w-16 bg-gray-200 dark:bg-ios-dark-fill rounded" />
                                </div>
                            </div>
                            <div className="w-full space-y-2 mt-2 px-1 pb-2">
                                {[1, 2, 3].map((k) => (
                                    <div key={k} className="flex items-center justify-between py-1.5 gap-2">
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <div className="w-3 h-3 rounded-full bg-gray-300 dark:bg-ios-dark-fill shrink-0" />
                                            <div className="h-4 flex-1 max-w-[10rem] bg-gray-200 dark:bg-ios-dark-fill rounded" />
                                        </div>
                                        <div className="flex items-center gap-3 shrink-0">
                                            <div className="h-3 w-7 bg-gray-100 dark:bg-ios-dark-fill rounded" />
                                            <div className="h-4 w-14 bg-gray-200 dark:bg-ios-dark-fill rounded" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* ריכוז הוצאות קבועות — header + list rows */}
                <div className="bg-ios-card dark:bg-ios-dark-card rounded-3xl p-5 shadow-card mt-3">
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                            <div className="w-5 h-5 rounded bg-gray-200 dark:bg-ios-dark-fill shrink-0" />
                            <div className="h-5 flex-1 max-w-[220px] bg-gray-200 dark:bg-ios-dark-fill rounded-lg" />
                        </div>
                        <div className="h-4 w-14 bg-gray-100 dark:bg-ios-dark-fill rounded shrink-0" />
                    </div>
                    <div className="mt-4 rounded-2xl bg-white dark:bg-ios-dark-card shadow-card overflow-hidden border border-gray-100/80 dark:border-white/10 divide-y divide-gray-100 dark:divide-white/10">
                        {[1, 2, 3].map((row) => (
                            <div key={row} className="flex items-center justify-between p-4">
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                    <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-ios-dark-fill shrink-0" />
                                    <div className="space-y-2 min-w-0 flex-1">
                                        <div className="h-4 w-32 max-w-[8rem] bg-gray-200 dark:bg-ios-dark-fill rounded" />
                                        <div className="flex gap-2">
                                            <div className="h-3.5 w-14 rounded-md bg-gray-100 dark:bg-ios-dark-fill" />
                                            <div className="h-3.5 w-11 rounded-md bg-gray-100 dark:bg-ios-dark-fill" />
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0 mr-2">
                                    <div className="h-4 w-14 bg-gray-200 dark:bg-ios-dark-fill rounded" />
                                    <div className="w-4 h-4 rounded bg-gray-100 dark:bg-ios-dark-fill opacity-60" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </main>
    );
}
