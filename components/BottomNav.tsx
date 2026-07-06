"use client";

import { Home, Clock, PieChart, Plus, Settings, Repeat } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useHaptic } from "@/hooks/useHaptic";
import { MAIN_NAV_ITEMS, buildNavHref, buildQuickAddHref, type MainNavQuery } from "@/lib/nav-links";

const LONG_PRESS_MS = 480;

export default function BottomNav() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const router = useRouter();
    const { trigger } = useHaptic();
    const [fabMenuOpen, setFabMenuOpen] = useState(false);
    const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const longPressFiredRef = useRef(false);

    const month = searchParams.get("month");
    const year = searchParams.get("year");
    const account = searchParams.get("account");
    const navQuery: MainNavQuery = { month, year, account };

    const tabExtras: Record<string, { icon: typeof Home; col: string }> = {
        "/": { icon: Home, col: "col-start-1" },
        "/history": { icon: Clock, col: "col-start-2" },
        "/insights": { icon: PieChart, col: "col-start-4" },
        "/settings": { icon: Settings, col: "col-start-5" },
    };

    const navItems = MAIN_NAV_ITEMS.map((item) => ({
        name: item.name,
        path: buildNavHref(item, navQuery),
        basePath: item.basePath,
        ...tabExtras[item.basePath],
    }));

    const clearLongPressTimer = useCallback(() => {
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
        }
    }, []);

    const closeFabMenu = useCallback(() => {
        setFabMenuOpen(false);
    }, []);

    useEffect(() => {
        if (!fabMenuOpen) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") closeFabMenu();
        };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [fabMenuOpen, closeFabMenu]);

    const openQuickAdd = useCallback(
        (recurring: boolean) => {
            closeFabMenu();
            trigger(10);
            router.push(buildQuickAddHref({ month, year, account }, recurring));
        },
        [router, trigger, closeFabMenu, month, year, account]
    );

    const onFabPointerDown = () => {
        longPressFiredRef.current = false;
        clearLongPressTimer();
        longPressTimerRef.current = setTimeout(() => {
            longPressFiredRef.current = true;
            trigger(15);
            setFabMenuOpen(true);
        }, LONG_PRESS_MS);
    };

    const onFabPointerUp = () => {
        clearLongPressTimer();
        if (!longPressFiredRef.current) {
            openQuickAdd(false);
        }
    };

    const onFabPointerCancel = () => {
        clearLongPressTimer();
    };

    return (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 pb-safe bg-ios-card/85 dark:bg-ios-dark-card/85 backdrop-blur-2xl border-t border-gray-200/50 dark:border-white/10 will-change-transform">
            {fabMenuOpen ? (
                <button
                    type="button"
                    className="fixed inset-0 z-[55] bg-black/25 backdrop-blur-[2px]"
                    aria-label="סגירת תפריט"
                    onClick={closeFabMenu}
                />
            ) : null}

            {fabMenuOpen ? (
                <div
                    className="fixed z-[60] left-1/2 -translate-x-1/2 w-[min(calc(100vw-2rem),16rem)] rounded-2xl bg-ios-card dark:bg-ios-dark-card shadow-card border border-gray-200/60 dark:border-white/10 py-2 px-1.5"
                    style={{ bottom: "calc(5.75rem + env(safe-area-inset-bottom, 0px))" }}
                    role="menu"
                    aria-label="אפשרויות הוספה"
                >
                    <button
                        type="button"
                        role="menuitem"
                        className="w-full flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-ios-text dark:text-ios-dark-text hover:bg-ios-gray-6/80 dark:hover:bg-ios-dark-fill/80"
                        onClick={() => openQuickAdd(false)}
                        data-testid="fab-quick-add"
                    >
                        <span className="w-9 h-9 rounded-full bg-ios-blue/15 text-ios-blue flex items-center justify-center shrink-0">
                            <Plus className="w-4 h-4" strokeWidth={2.4} aria-hidden />
                        </span>
                        הוצאה מהירה
                    </button>
                    <button
                        type="button"
                        role="menuitem"
                        className="w-full flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-ios-text dark:text-ios-dark-text hover:bg-ios-gray-6/80 dark:hover:bg-ios-dark-fill/80"
                        onClick={() => openQuickAdd(true)}
                        data-testid="fab-recurring-add"
                    >
                        <span className="w-9 h-9 rounded-full bg-ios-indigo/15 text-ios-indigo flex items-center justify-center shrink-0">
                            <Repeat className="w-4 h-4" strokeWidth={2.4} aria-hidden />
                        </span>
                        הוצאה קבועה
                    </button>
                </div>
            ) : null}

            {/* Soft gradient fade */}
            <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-ios-bg dark:from-ios-dark-bg via-ios-bg/90 dark:via-ios-dark-bg/90 to-transparent pointer-events-none" />

            {/* Tab bar */}
            <div className="relative">
                <div className="lumiflow-fab-slot max-w-md mx-auto relative px-4 pt-2 pb-1">
                    <button
                        type="button"
                        onPointerDown={onFabPointerDown}
                        onPointerUp={onFabPointerUp}
                        onPointerLeave={onFabPointerCancel}
                        onPointerCancel={onFabPointerCancel}
                        onContextMenu={(e) => e.preventDefault()}
                        className="absolute left-1/2 -translate-x-1/2 -top-5 z-10 w-14 h-14 rounded-full bg-ios-blue shadow-lg shadow-ios-blue/35 flex items-center justify-center ring-4 ring-white/80 dark:ring-ios-dark-card touch-manipulation select-none"
                        aria-label="הוספת הוצאה"
                        aria-haspopup="menu"
                        aria-expanded={fabMenuOpen}
                        data-testid="fab-add-button"
                    >
                        <Plus className="w-6 h-6 text-white" strokeWidth={2.8} aria-hidden />
                    </button>

                    <div className="grid grid-cols-5 items-center pt-4 gap-0.5">
                        {navItems.map((item) => {
                            const isActive = pathname === item.basePath;
                            const Icon = item.icon;

                            return (
                                <Link
                                    key={item.basePath}
                                    href={item.path}
                                    onClick={() => trigger(10)}
                                    data-testid={item.basePath === "/settings" ? "bottom-nav-settings" : undefined}
                                    className={`relative flex flex-col items-center justify-center py-2 gap-0.5 ${item.col}`}
                                >
                                    <div className="relative">
                                        <Icon
                                            className={`w-[22px] h-[22px] transition-colors duration-200 ${
                                                isActive ? "text-ios-blue" : "text-ios-subtle dark:text-ios-dark-subtle"
                                            }`}
                                            strokeWidth={isActive ? 2.2 : 1.8}
                                            aria-hidden
                                        />
                                    </div>
                                    <span
                                        className={`text-[10px] font-semibold transition-colors duration-200 ${
                                            isActive ? "text-ios-blue" : "text-ios-subtle dark:text-ios-dark-subtle"
                                        }`}
                                    >
                                        {item.name}
                                    </span>
                                </Link>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
