"use client";

import type { ReactNode } from "react";
import { TrendingUp, AlertTriangle, Info } from "lucide-react";
import type { BudgetAlert, DailyNudge } from "@/lib/types";

interface DailySnapshotCardProps {
    alert: BudgetAlert | null;
    nudge: DailyNudge | null;
}

const severityDotClass: Record<BudgetAlert["severity"], string> = {
    critical: "bg-ios-red",
    warning: "bg-ios-orange",
    ok: "bg-ios-green",
};

const nudgeIconBySeverity: Record<DailyNudge["tone"], ReactNode> = {
    positive: <TrendingUp className="w-4 h-4 text-ios-green" aria-hidden />,
    warning: <AlertTriangle className="w-4 h-4 text-ios-orange" aria-hidden />,
    neutral: <Info className="w-4 h-4 text-ios-subtle" aria-hidden />,
};

export default function DailySnapshotCard({ alert, nudge }: DailySnapshotCardProps) {
    if (!alert && !nudge) return null;

    return (
        <div className="rounded-3xl bg-ios-card dark:bg-ios-dark-card p-4 shadow-card">
            <h2 className="text-sm font-bold text-ios-text dark:text-ios-dark-text mb-3">
                תמונת מצב יומית
            </h2>

            {alert && (
                <div className="flex items-center gap-2.5">
                    <span
                        className={`w-2 h-2 rounded-full flex-shrink-0 ${severityDotClass[alert.severity]}`}
                        aria-hidden
                    />
                    <p className="text-sm text-ios-text dark:text-ios-dark-text text-pretty">
                        {alert.message}
                    </p>
                </div>
            )}

            {alert && nudge && <div className="my-3 border-t border-gray-200/50 dark:border-white/10" />}

            {nudge && (
                <div className="flex items-start gap-2.5">
                    <span className="flex-shrink-0 mt-0.5">{nudgeIconBySeverity[nudge.tone]}</span>
                    <div className="min-w-0">
                        <p className="text-sm font-bold text-ios-text dark:text-ios-dark-text">{nudge.title}</p>
                        <p className="text-xs text-ios-subtle dark:text-ios-dark-subtle text-pretty mt-0.5">
                            {nudge.description}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
