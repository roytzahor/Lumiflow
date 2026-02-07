export default function HistoryLoading() {
    return (
        <main className="min-h-screen pb-28 pt-safe bg-ios-bg">
            <div className="w-full max-w-md mx-auto animate-pulse">
                {/* Header */}
                <div className="px-5 pt-8 pb-4">
                    <div className="h-8 w-28 bg-gray-200 rounded-lg mb-1.5" />
                    <div className="h-4 w-36 bg-gray-100 rounded-lg" />
                </div>

                {/* Year selector */}
                <div className="flex justify-between items-center px-5 mb-3">
                    <div className="w-8 h-8 rounded-full bg-gray-100" />
                    <div className="h-5 w-12 bg-gray-200 rounded" />
                    <div className="w-8 h-8 rounded-full bg-gray-100" />
                </div>

                {/* Month pills */}
                <div className="flex gap-2 px-5 mb-4">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                        <div key={i} className="min-w-[3.5rem] h-9 rounded-xl bg-gray-100" />
                    ))}
                </div>

                {/* Summary */}
                <div className="px-5 flex gap-3">
                    <div className="flex-1 bg-white rounded-2xl h-20 shadow-card" />
                    <div className="flex-1 flex flex-col gap-2">
                        <div className="bg-white rounded-xl h-9 shadow-card" />
                        <div className="bg-white rounded-xl h-9 shadow-card" />
                    </div>
                </div>

                {/* Transactions */}
                <div className="px-5 mt-6 space-y-3">
                    <div className="h-5 w-24 bg-gray-200 rounded-lg mb-2" />
                    <div className="bg-gray-100 rounded-xl h-10 mb-4" />
                    <div className="bg-white rounded-2xl shadow-card overflow-hidden">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="flex items-center justify-between p-4 border-b border-gray-50 last:border-0">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-gray-100" />
                                    <div className="space-y-1.5">
                                        <div className="h-4 w-24 bg-gray-100 rounded" />
                                        <div className="h-3 w-14 bg-gray-50 rounded" />
                                    </div>
                                </div>
                                <div className="h-4 w-14 bg-gray-100 rounded" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </main>
    );
}
