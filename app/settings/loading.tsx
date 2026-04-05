export default function SettingsLoading() {
    return (
        <div
            className="min-h-screen pb-28 font-sans text-ios-text dark:text-ios-dark-text bg-ios-bg dark:bg-ios-dark-bg transition-colors"
            dir="rtl"
        >
            <div className="w-full max-w-md mx-auto animate-pulse">
                <header className="pt-safe px-5 pt-8 pb-4">
                    <div className="h-9 w-32 bg-gray-200 dark:bg-ios-dark-fill rounded-lg" />
                    <div className="h-4 w-48 bg-gray-100 dark:bg-ios-dark-fill rounded mt-2" />
                </header>

                <main className="px-5 py-2 space-y-6">
                    {/* פרופיל */}
                    <div className="rounded-3xl shadow-card bg-ios-card dark:bg-ios-dark-card overflow-hidden">
                        <div className="flex items-center gap-2.5 px-5 pt-5 pb-3">
                            <div className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-ios-dark-fill shrink-0" />
                            <div className="h-5 flex-1 bg-gray-200 dark:bg-ios-dark-fill rounded-lg" />
                            <div className="w-5 h-5 rounded bg-gray-100 dark:bg-ios-dark-fill shrink-0" />
                        </div>
                        <div className="px-5 pb-5 pt-1 space-y-3">
                            <div className="rounded-xl bg-ios-gray-6 dark:bg-ios-dark-fill h-24 w-full" />
                            <div className="rounded-xl bg-ios-gray-6 dark:bg-ios-dark-fill h-20 w-full" />
                            <div className="grid grid-cols-2 gap-2">
                                <div className="h-10 rounded-xl bg-ios-blue/30 dark:bg-ios-blue/20" />
                                <div className="h-10 rounded-xl bg-ios-indigo/25 dark:bg-ios-indigo/20" />
                            </div>
                        </div>
                    </div>
                    {/* תצוגה */}
                    <div className="rounded-3xl shadow-card bg-ios-card dark:bg-ios-dark-card overflow-hidden">
                        <div className="flex items-center gap-2.5 px-5 pt-5 pb-3">
                            <div className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-ios-dark-fill shrink-0" />
                            <div className="h-5 flex-1 bg-gray-200 dark:bg-ios-dark-fill rounded-lg" />
                            <div className="w-5 h-5 rounded bg-gray-100 dark:bg-ios-dark-fill shrink-0" />
                        </div>
                        <div className="px-5 pb-5 pt-1">
                            <div className="grid grid-cols-3 gap-2">
                                {[1, 2, 3].map((i) => (
                                    <div key={i} className="h-10 rounded-xl bg-ios-gray-6 dark:bg-ios-dark-fill" />
                                ))}
                            </div>
                        </div>
                    </div>
                    {/* חשבונות */}
                    <div className="rounded-3xl shadow-card bg-ios-card dark:bg-ios-dark-card overflow-hidden">
                        <div className="flex items-center gap-2.5 px-5 pt-5 pb-3">
                            <div className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-ios-dark-fill shrink-0" />
                            <div className="h-5 flex-1 bg-gray-200 dark:bg-ios-dark-fill rounded-lg" />
                            <div className="w-5 h-5 rounded bg-gray-100 dark:bg-ios-dark-fill shrink-0" />
                        </div>
                        <div className="px-5 pb-5 pt-1 space-y-3">
                            <div className="h-10 w-full rounded-xl bg-ios-blue/35 dark:bg-ios-blue/25" />
                            {[1, 2].map((i) => (
                                <div key={i} className="rounded-xl bg-ios-gray-6 dark:bg-ios-dark-fill h-[4.5rem] w-full" />
                            ))}
                        </div>
                    </div>
                    {/* קטגוריות */}
                    <div className="rounded-3xl shadow-card bg-ios-card dark:bg-ios-dark-card overflow-hidden">
                        <div className="flex items-center gap-2.5 px-5 pt-5 pb-3">
                            <div className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-ios-dark-fill shrink-0" />
                            <div className="h-5 flex-1 bg-gray-200 dark:bg-ios-dark-fill rounded-lg" />
                            <div className="w-5 h-5 rounded bg-gray-100 dark:bg-ios-dark-fill shrink-0" />
                        </div>
                        <div className="px-5 pb-5 pt-1 space-y-3">
                            <div className="flex gap-2">
                                <div className="h-10 flex-1 rounded-xl bg-ios-gray-6 dark:bg-ios-dark-fill" />
                                <div className="h-10 w-20 rounded-xl bg-ios-gray-6 dark:bg-ios-dark-fill" />
                                <div className="h-10 w-11 rounded-xl bg-ios-blue/35 dark:bg-ios-blue/25 shrink-0" />
                            </div>
                            <div className="rounded-xl bg-ios-gray-6 dark:bg-ios-dark-fill h-36 w-full divide-y divide-gray-200/50 dark:divide-white/10 overflow-hidden p-0">
                                {[1, 2, 3, 4].map((row) => (
                                    <div key={row} className="flex items-center justify-between px-4 py-3 border-b border-gray-200/40 dark:border-white/10 last:border-0">
                                        <div className="h-4 w-28 bg-gray-200/90 dark:bg-ios-dark-fill rounded" />
                                        <div className="flex gap-1">
                                            <div className="w-7 h-7 rounded bg-gray-200/80 dark:bg-ios-dark-fill" />
                                            <div className="w-7 h-7 rounded bg-gray-200/80 dark:bg-ios-dark-fill" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="h-12 w-full rounded-xl bg-gray-900 dark:bg-white opacity-90" />

                    <section className="pt-2 pb-4">
                        <div className="h-3 w-24 bg-gray-200 dark:bg-ios-dark-fill rounded mx-auto" />
                    </section>
                </main>
            </div>
        </div>
    );
}
