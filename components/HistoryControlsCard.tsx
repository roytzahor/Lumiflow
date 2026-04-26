"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, ChevronDown, ListFilter } from "lucide-react";
import LiquidToggle from "./ui/LiquidToggle";
import InfoHint from "./InfoHint";
import { formatIlsAmount } from "@/lib/formatters";
import type { AccountSummary, Category } from "@/lib/types";

const selectClass =
    "w-full min-w-0 max-w-[11rem] appearance-none rounded-xl border border-gray-200/50 dark:border-white/10 bg-ios-gray-6 dark:bg-ios-dark-fill text-sm font-semibold text-ios-text dark:text-ios-dark-text py-2 ps-3 pe-8 shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ios-blue/40";

export type HistoryControlsCardProps = {
    accounts: AccountSummary[];
    categories: Category[];
    activeCategoryNames: string[];
    selectedCategories: string[];
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
    onToggleCategory: (categoryName: string) => void;
    onClearCategories: () => void;
    onToggleRecurring: () => void;
    onToggleSavingsInFeed: () => void;
};

export default function HistoryControlsCard({
    accounts,
    categories,
    activeCategoryNames,
    selectedCategories,
    effectiveAccountId,
    filteredAccount,
    showRecurring,
    showSavingsInFeed,
    showSavingsToggle,
    displayTotal,
    visibleSavingsTotal,
    showSavingsSummaryRow,
    onAccountChange,
    onToggleCategory,
    onClearCategories,
    onToggleRecurring,
    onToggleSavingsInFeed,
}: HistoryControlsCardProps) {
    const [filtersOpen, setFiltersOpen] = useState(false);
    const filtersPopoverRef = useRef<HTMLDivElement>(null);

    const closeFilters = useCallback(() => setFiltersOpen(false), []);

    const filterBadgeActive =
        selectedCategories.length > 0 || !showRecurring || (showSavingsToggle && !showSavingsInFeed);

    const hasCategoryMultiselect = activeCategoryNames.length > 1;

    useEffect(() => {
        if (!filtersOpen) return;
        const onPointerDown = (e: PointerEvent) => {
            const t = e.target as HTMLElement | null;
            if (t?.closest?.("[data-lumiflow-overlay]")) return;
            const root = filtersPopoverRef.current;
            if (root && !root.contains(e.target as Node)) closeFilters();
        };
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") closeFilters();
        };
        document.addEventListener("pointerdown", onPointerDown, true);
        document.addEventListener("keydown", onKeyDown);
        return () => {
            document.removeEventListener("pointerdown", onPointerDown, true);
            document.removeEventListener("keydown", onKeyDown);
        };
    }, [filtersOpen, closeFilters]);

    const totalLabel =
        selectedCategories.length === 0
            ? filteredAccount
                ? "סה״כ הוצאות לחשבון"
                : "סה״כ כלל ההוצאות שלך"
            : selectedCategories.length === 1
              ? `סה״כ הוצאות ב${selectedCategories[0]}`
              : `סה״כ הוצאות ב־${selectedCategories.length} קטגוריות`;

    return (
        <section
            className="rounded-3xl bg-ios-card dark:bg-ios-dark-card p-4 shadow-card space-y-3 min-w-0"
            aria-label="פעולות אחרונות — סינון וסיכום"
        >
            <div className="flex min-w-0 items-center justify-between gap-2">
                <div className="flex min-w-0 flex-1 items-center justify-between gap-2 sm:gap-3">
                    <h2 className="min-w-0 flex-1 truncate text-base font-bold text-ios-text dark:text-ios-dark-text">
                        פעולות אחרונות
                    </h2>
                    {accounts.length > 1 ? (
                        <div className="relative shrink-0">
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
                </div>
                <div className="relative shrink-0" ref={filtersPopoverRef}>
                    <button
                        type="button"
                        data-testid="history-filters-toggle"
                        aria-expanded={filtersOpen}
                        aria-haspopup="true"
                        aria-controls="history-filters-panel"
                        onClick={() => setFiltersOpen((o) => !o)}
                        className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200/50 bg-ios-gray-6 text-ios-text shadow-sm transition-colors hover:bg-ios-gray-5 active:scale-[0.97] dark:border-white/10 dark:bg-ios-dark-fill dark:text-ios-dark-text dark:hover:bg-ios-dark-card"
                    >
                        <ListFilter className="h-5 w-5 text-ios-subtle dark:text-ios-dark-subtle" strokeWidth={2} />
                        {filterBadgeActive ? (
                            <span className="absolute end-1.5 top-1.5 h-2 w-2 rounded-full bg-ios-blue ring-2 ring-ios-card dark:ring-ios-dark-card" />
                        ) : null}
                    </button>
                    {filtersOpen ? (
                        <div
                            id="history-filters-panel"
                            role="region"
                            aria-label="סינון תצוגה"
                            className="absolute end-0 top-[calc(100%+0.5rem)] z-30 w-[min(calc(100vw-2.5rem),18.5rem)] rounded-2xl border border-gray-200/50 bg-ios-card p-3 shadow-elevated dark:border-white/10 dark:bg-ios-dark-card"
                        >
                            <div className="max-h-[min(70vh,22rem)] space-y-3 overflow-y-auto overscroll-contain">
                                {hasCategoryMultiselect ? (
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between gap-2">
                                            <p className="text-[11px] font-semibold text-ios-subtle dark:text-ios-dark-subtle">
                                                קטגוריות
                                            </p>
                                            {selectedCategories.length > 0 ? (
                                                <button
                                                    type="button"
                                                    onClick={() => onClearCategories()}
                                                    className="shrink-0 rounded-lg px-2 py-1 text-[11px] font-semibold text-ios-blue hover:bg-ios-blue/10 active:bg-ios-blue/15"
                                                >
                                                    נקה הכל
                                                </button>
                                            ) : null}
                                        </div>
                                        <div
                                            data-testid="history-category-multiselect"
                                            role="group"
                                            aria-label="בחירת קטגוריות"
                                            className="flex max-h-36 flex-col gap-0.5 overflow-y-auto overscroll-contain pe-0.5"
                                        >
                                            {activeCategoryNames.map((name) => {
                                                const selected = selectedCategories.includes(name);
                                                const cat = categories.find((c) => c.name === name);
                                                const icon = cat?.icon ?? "·";
                                                return (
                                                    <button
                                                        key={name}
                                                        type="button"
                                                        data-testid={`history-category-option-${encodeURIComponent(name)}`}
                                                        onClick={() => onToggleCategory(name)}
                                                        aria-pressed={selected}
                                                        className={`flex min-h-[40px] w-full items-center gap-2 rounded-xl px-2.5 py-2 text-start text-sm font-medium transition-colors ${
                                                            selected
                                                                ? "bg-ios-blue/12 text-ios-blue dark:bg-ios-blue/18 dark:text-ios-blue"
                                                                : "text-ios-text hover:bg-ios-gray-6 active:bg-ios-gray-5 dark:text-ios-dark-text dark:hover:bg-ios-dark-fill dark:active:bg-ios-dark-card"
                                                        }`}
                                                    >
                                                        <span
                                                            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                                                                selected
                                                                    ? "border-ios-blue/40 bg-ios-blue text-white dark:border-white/30"
                                                                    : "border-gray-200/60 bg-ios-card dark:border-white/15 dark:bg-ios-dark-card"
                                                            }`}
                                                            aria-hidden
                                                        >
                                                            {selected ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
                                                        </span>
                                                        <span className="text-base leading-none" aria-hidden>
                                                            {icon}
                                                        </span>
                                                        <span className="min-w-0 flex-1 truncate">{name}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ) : null}

                                <div
                                    className={
                                        hasCategoryMultiselect
                                            ? "space-y-2 border-t border-black/5 pt-3 dark:border-white/10"
                                            : "space-y-2"
                                    }
                                >
                                    <div className="flex min-h-[44px] items-center justify-between gap-2">
                                        <div className="flex min-w-0 items-center gap-1">
                                            <span className="truncate text-xs font-semibold text-ios-text dark:text-ios-dark-text">
                                                הוצאות קבועות
                                            </span>
                                            <InfoHint ariaLabel="הסבר על הצגת הוצאות קבועות">
                                                כשהאפשרות פעילה, גם תנועות חוזרות צפויות מוצגות ברשימה לצד הוצאות שבוצעו בפועל.
                                            </InfoHint>
                                        </div>
                                        <LiquidToggle
                                            isOn={showRecurring}
                                            onToggle={onToggleRecurring}
                                            testId="history-show-recurring"
                                        />
                                    </div>
                                    {showSavingsToggle ? (
                                        <div className="flex min-h-[44px] items-center justify-between gap-2">
                                            <div className="flex min-w-0 items-center gap-1">
                                                <span className="truncate text-xs font-semibold text-ios-text dark:text-ios-dark-text">
                                                    הפרשות חיסכון
                                                </span>
                                                <InfoHint ariaLabel="הסבר על הצגת הפרשות חיסכון">
                                                    הפרשות חיסכון מוצגות בתזרים לצד הוצאות; הסכום בתקציר למטה משקף את סך
                                                    ההפרשות הגלויות כשהאפשרות דלוקה.
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
                            </div>
                        </div>
                    ) : null}
                </div>
            </div>

            {selectedCategories.length > 0 ? (
                <div
                    className="flex flex-wrap items-center gap-x-1.5 gap-y-1.5"
                    aria-label="קטגוריות נבחרות"
                >
                    {selectedCategories.map((name) => {
                        const cat = categories.find((c) => c.name === name);
                        const icon = cat?.icon ?? "·";
                        return (
                            <button
                                key={name}
                                type="button"
                                onClick={() => onToggleCategory(name)}
                                title={name}
                                aria-label={`הסר סינון ${name}`}
                                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ios-blue/12 text-base leading-none ring-1 ring-ios-blue/25 transition active:scale-95 dark:bg-ios-blue/18 dark:ring-ios-blue/35"
                            >
                                <span className="select-none" aria-hidden>
                                    {icon}
                                </span>
                            </button>
                        );
                    })}
                    <button
                        type="button"
                        onClick={() => onClearCategories()}
                        className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold text-ios-blue hover:bg-ios-blue/10 active:bg-ios-blue/15"
                    >
                        נקה הכל
                    </button>
                </div>
            ) : null}

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
        </section>
    );
}
