import type { CategoryAnomaly } from "@/lib/types";
import { formatIlsAmount } from "@/lib/formatters";

type InsightsAnomalyCardProps = {
    anomaly: CategoryAnomaly;
    icon: string;
    variant?: "default" | "example";
};

export default function InsightsAnomalyCard({ anomaly: a, icon, variant = "default" }: InsightsAnomalyCardProps) {
    const isUp = a.direction === "up";
    const isExample = variant === "example";

    return (
        <div
            className={`bg-ios-card dark:bg-ios-dark-card rounded-3xl p-4 shadow-card ${
                isExample
                    ? "pointer-events-none border border-dashed border-ios-subtle/35 dark:border-ios-dark-subtle/40 opacity-[0.88]"
                    : "border border-gray-200/50 dark:border-white/10"
            }`}
        >
            <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-ios-gray-6 dark:bg-ios-dark-fill flex items-center justify-center text-xl flex-shrink-0">
                    {icon}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                        <span className="text-[15px] font-semibold text-ios-text dark:text-ios-dark-text truncate">
                            {a.category}
                        </span>
                        <span
                            className={`text-sm font-bold tabular-nums flex-shrink-0 ${
                                isUp ? "text-ios-red" : "text-ios-green"
                            }`}
                        >
                            {isUp ? "+" : "-"}₪{formatIlsAmount(Math.abs(Math.round(a.difference)))}
                        </span>
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                        <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded-md text-ios-indigo bg-ios-indigo/8 truncate">
                            {a.accountName}
                        </span>
                        <span
                            className={`text-xs flex-shrink-0 ${
                                isUp ? "text-ios-red/80" : "text-ios-green/80"
                            }`}
                        >
                            {isUp ? "עלייה" : "ירידה"} של {Math.round(Math.abs(a.percentChange))}%
                        </span>
                    </div>
                </div>
            </div>

            <div
                className={`mt-3 rounded-xl px-3 py-2 flex items-center justify-between ${
                    isUp ? "bg-ios-red/8" : "bg-ios-green/8"
                }`}
            >
                <span className="text-xs text-ios-subtle dark:text-ios-dark-subtle">החודש</span>
                <span className="text-xs font-semibold tabular-nums text-ios-text dark:text-ios-dark-text">
                    ₪{formatIlsAmount(Math.round(a.currentAmount))}
                </span>
            </div>
            <div className="mt-1 rounded-xl px-3 py-2 flex items-center justify-between bg-ios-gray-6 dark:bg-ios-dark-fill">
                <span className="text-xs text-ios-subtle dark:text-ios-dark-subtle">ממוצע חודשים קודמים</span>
                <span className="text-xs font-semibold tabular-nums text-ios-text dark:text-ios-dark-text">
                    ₪{formatIlsAmount(Math.round(a.monthlyAverage))}
                </span>
            </div>
        </div>
    );
}
