"use client";

import Money from "@/components/ui/Money";

interface SpendingTrendCardProps {
    currentSpent: number;
    prevMonthTotal: number;
}

export default function SpendingTrendCard({ currentSpent, prevMonthTotal }: SpendingTrendCardProps) {
    if (prevMonthTotal === 0 && currentSpent === 0) return null;

    const delta = currentSpent - prevMonthTotal;
    const pct = prevMonthTotal > 0 ? Math.round((Math.abs(delta) / prevMonthTotal) * 100) : null;
    const direction: "up" | "down" | "same" = delta > 0 ? "up" : delta < 0 ? "down" : "same";

    const directionText =
        direction === "up"
            ? "יותר מהחודש הקודם"
            : direction === "down"
              ? "פחות מהחודש הקודם"
              : "זהה לחודש הקודם";

    const directionColor =
        direction === "up"
            ? "text-ios-red"
            : direction === "down"
              ? "text-ios-green"
              : "text-ios-subtle dark:text-ios-dark-subtle";

    return (
        <div className="rounded-3xl bg-ios-card dark:bg-ios-dark-card p-4 shadow-card">
            <p className="text-sm font-semibold text-ios-subtle dark:text-ios-dark-subtle mb-2">
                השוואה לחודש קודם
            </p>
            <div className="flex items-baseline gap-1.5 flex-wrap">
                <span className={`text-base font-bold tabular-nums ${directionColor}`}>
                    <Money amount={Math.abs(delta)} signed={false} />
                </span>
                <span className={`text-sm font-medium ${directionColor}`}>
                    {directionText}
                    {pct !== null && ` (${pct}%)`}
                </span>
            </div>
            <p className="mt-1.5 text-xs text-ios-subtle dark:text-ios-dark-subtle tabular-nums">
                {"חודש קודם: "}
                <span className="font-semibold text-ios-text dark:text-ios-dark-text tabular-nums">
                    <Money amount={prevMonthTotal} signed={false} />
                </span>
            </p>
        </div>
    );
}
