"use client";

import { ChevronDown, X } from "lucide-react";
import LiquidToggle from "./ui/LiquidToggle";
import InfoHint from "./InfoHint";
import { formatIlsAmount } from "@/lib/formatters";
import type { AccountSummary, Category } from "@/lib/types";

const selectClass =
    "w-full appearance-none rounded-xl border border-gray-200/50 dark:border-white/10 bg-ios-gray-6 dark:bg-ios-dark-fill text-sm font-semibold text-ios-text dark:text-ios-dark-text py-2 ps-3 pe-8 shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ios-blue/40";

export type HistoryControlsCardProps = {
    accounts: AccountSummary[];
    categories: Category[];
    activeCategoryNames: string[];
    selectedCategory: string | null;
    /** Resolved scope: `"all"` or a concrete account id. */
    effectiveAccountId: "all" | string;
    filteredAccount: AccountSummary | null;
    showRecurring: boolean;
    showSavingsInFeed: boolean;
    /** Whether to show the savings-in-feed toggle (any savings rows for current account scope). */
    showSavingsToggle: boolean;
    displayTotal: number;
    visibleSavingsTotal: number;
    showSavingsSummaryRow: boolean;
    onAccountChange: (accountId: "all" | string) => void;
    onCategoryFilter: (categoryName: string | null) => void;
    onToggleRecurring: () => void;
    onToggleSavingsInFeed: () => void;
};

export default function HistoryControlsCard({
    accounts,
    categories,
    activeCategoryNames,
    selectedCategory,
    effectiveAccountId,
    filteredAccount,
    showRecurring,
    showSavingsInFeed,
    showSavingsToggle,
    displayTotal,
    visibleSavingsTotal,
    showSavingsSummaryRow,
    onAccountChange,
    onCategoryFilter,
    onToggleRecurring,
    onToggleSavingsInFeed,
}: HistoryControlsCardProps) {
    const totalLabel = selectedCategory
        ? `סה״כ הוצאות ב${selectedCategory}`
        : filteredAccount
          ? "סה״כ הוצאות לחשבון"
          : "סה״כ כלל ההוצאות שלך";

    return (
        <section
            className="rounded-3xl bg-ios-card dark:bg-ios-dark-card p-4 shadow-card space-y-3 min-w-0"
            aria-label="פעולות אחרונות — סינון וסיכום"
        >
            <h2 className="text-base font-bold text-ios-text dark:text-ios-dark-text">פעולות אחרונות</h2>

            <div className="space-y-2 min-w-0">
                {accounts.length > 1 ? (
                    <div className="relative min-w-0">
                        <label htmlFor="history-account-filter" className="sr-only">
                            סינון לפי חשבון
                        </label>
                        <select
                            data-testid="history-account-filter"
                            id="history-account-filter"
                            value={effectiveAccountId === "all" ? "all" : effectiveAccountId}
                            onChange={(e) => {
                                const v = e.target.value;
                                onAccountChange(v === "all" ? "all" : v);
                            }}
                            aria-label="חשבון להצגה בהיסטוריה"
                            className={selectClass}
                        >
                            <option value="all">כל החשבונות</option>
                            {accounts.map((acc) => (
                                <option key={acc.id} value={acc.id}>
                                    {acc.name}
                                </option>
                            ))}
                        </select>
                        <ChevronDown
                            className="pointer-events-none absolute end-2 top-1/2 h-4 w-4 -translate-y-1/2 text-ios-subtle dark:text-ios-dark-subtle"
                            aria-hidden
                        />
                    </div>
                ) : null}

                {selectedCategory ? (
                    <div className="flex items-center gap-2 rounded-xl border border-ios-blue/20 bg-ios-blue/10 py-2 ps-3 pe-2 dark:bg-ios-blue/15">
                        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ios-blue">
                            {(() => {
                                const cat = categories.find((c) => c.name === selectedCategory);
                                return cat ? `${cat.icon} ${selectedCategory}` : selectedCategory;
                            })()}
                        </span>
                        <button
                            type="button"
                            onClick={() => onCategoryFilter(null)}
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ios-blue/15 text-ios-blue transition-colors active:bg-ios-blue/25"
                            aria-label="הסר סינון קטגוריה"
                        >
                            <X className="h-3.5 w-3.5" strokeWidth={2.5} />
                        </button>
                    </div>
                ) : activeCategoryNames.length > 1 ? (
                    <div className="relative min-w-0">
                        <label htmlFor="history-category-filter" className="sr-only">
                            סינון לפי קטגוריה
                        </label>
                        <select
                            data-testid="history-category-filter"
                            id="history-category-filter"
                            value=""
                            onChange={(e) => {
                                const v = e.target.value;
                                onCategoryFilter(v || null);
                            }}
                            aria-label="סינון לפי קטגוריה"
                            className={selectClass}
                        >
                            <option value="">כל הקטגוריות</option>
                            {activeCategoryNames.map((name) => {
                                const cat = categories.find((c) => c.name === name);
                                return (
                                    <option key={name} value={name}>
                                        {cat ? `${cat.icon} ${name}` : name}
                                    </option>
                                );
                            })}
                        </select>
                        <ChevronDown
                            className="pointer-events-none absolute end-2 top-1/2 h-4 w-4 -translate-y-1/2 text-ios-subtle dark:text-ios-dark-subtle"
                            aria-hidden
                        />
                    </div>
                ) : null}
            </div>

            <div className="min-w-0 space-y-1.5 border-t border-black/5 pt-3 dark:border-white/10">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1 space-y-0.5">
                        <p className="text-[11px] font-medium leading-snug text-ios-subtle dark:text-ios-dark-subtle">
                            {totalLabel}
                        </p>
                        {filteredAccount ? (
                            <p className="truncate text-xs font-semibold text-ios-indigo dark:text-ios-indigo">
                                {filteredAccount.name}
                            </p>
                        ) : null}
                    </div>
                    <p className="shrink-0 text-xl font-bold tabular-nums text-ios-text dark:text-ios-dark-text">
                        ₪{formatIlsAmount(displayTotal)}
                    </p>
                </div>
                {showSavingsSummaryRow ? (
                    <div className="flex items-center justify-between gap-3 border-t border-black/5 pt-2 dark:border-white/10">
                        <p className="text-[11px] font-medium text-ios-subtle dark:text-ios-dark-subtle">
                            סה״כ הפרשות חיסכון
                        </p>
                        <p className="shrink-0 text-base font-bold tabular-nums text-ios-green">
                            ₪{formatIlsAmount(visibleSavingsTotal)}
                        </p>
                    </div>
                ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-black/5 pt-3 dark:border-white/10">
                <div className="flex min-w-0 min-h-[44px] flex-1 basis-[min(100%,11rem)] items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-1">
                        <span className="truncate text-xs font-semibold text-ios-text dark:text-ios-dark-text">
                            הוצאות קבועות
                        </span>
                        <InfoHint ariaLabel="הסבר על הצגת הוצאות קבועות">
                            כשהאפשרות פעילה, גם תנועות חוזרות צפויות מוצגות ברשימה לצד הוצאות שבוצעו בפועל.
                        </InfoHint>
                    </div>
                    <LiquidToggle isOn={showRecurring} onToggle={onToggleRecurring} testId="history-show-recurring" />
                </div>
                {showSavingsToggle ? (
                    <div className="flex min-w-0 min-h-[44px] flex-1 basis-[min(100%,11rem)] items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-1">
                            <span className="truncate text-xs font-semibold text-ios-text dark:text-ios-dark-text">
                                הפרשות חיסכון
                            </span>
                            <InfoHint ariaLabel="הסבר על הצגת הפרשות חיסכון">
                                הפרשות חיסכון מוצגות בתזרים לצד הוצאות; הסכום בתקציר למטה משקף את סך ההפרשות
                                הגלויות כשהאפשרות דלוקה.
                            </InfoHint>
                        </div>
                        <LiquidToggle
                            isOn={showSavingsInFeed}
                            onToggle={onToggleSavingsInFeed}
                            testId="history-show-savings"
                        />
                    </div>
                ) : null}
            </div>
        </section>
    );
}
