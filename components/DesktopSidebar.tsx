"use client";

import { Home, Clock, PieChart, Plus, Settings, Repeat } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { useHaptic } from "@/hooks/useHaptic";
import { MAIN_NAV_ITEMS, buildNavHref, buildQuickAddHref, type MainNavQuery } from "@/lib/nav-links";

const NAV_ICONS: Record<string, typeof Home> = {
    "/": Home,
    "/history": Clock,
    "/insights": PieChart,
    "/settings": Settings,
};

export default function DesktopSidebar() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const router = useRouter();
    const { trigger } = useHaptic();

    const query: MainNavQuery = {
        month: searchParams.get("month"),
        year: searchParams.get("year"),
        account: searchParams.get("account"),
    };

    const openQuickAdd = (recurring: boolean) => {
        trigger(10);
        router.push(buildQuickAddHref(query, recurring));
    };

    return (
        <aside className="hidden lg:flex fixed inset-y-0 start-0 z-50 w-64 flex-col bg-ios-card dark:bg-ios-dark-card border-e border-gray-200/50 dark:border-white/10 px-4 py-6">
            <Link href={buildNavHref(MAIN_NAV_ITEMS[0], query)} className="px-3 mb-8">
                <span className="text-2xl font-bold tracking-tight text-ios-text dark:text-ios-dark-text">
                    LumiFlow
                </span>
            </Link>

            <div className="flex flex-col gap-2 mb-8">
                <button
                    type="button"
                    onClick={() => openQuickAdd(false)}
                    className="flex items-center justify-center gap-2 h-11 rounded-2xl bg-ios-blue text-white text-sm font-semibold shadow-lg shadow-ios-blue/25 active:scale-[0.96] transition-transform"
                    data-testid="sidebar-add-button"
                >
                    <Plus className="w-4 h-4" strokeWidth={2.6} aria-hidden />
                    הוספת הוצאה
                </button>
                <button
                    type="button"
                    onClick={() => openQuickAdd(true)}
                    className="flex items-center justify-center gap-2 h-11 rounded-2xl bg-ios-gray-6 dark:bg-ios-dark-fill text-ios-text dark:text-ios-dark-text text-sm font-semibold active:scale-[0.96] transition-transform"
                    data-testid="sidebar-recurring-add"
                >
                    <Repeat className="w-4 h-4" strokeWidth={2.2} aria-hidden />
                    הוצאה קבועה
                </button>
            </div>

            <nav className="flex flex-col gap-1" aria-label="ניווט ראשי">
                {MAIN_NAV_ITEMS.map((item) => {
                    const isActive = pathname === item.basePath;
                    const Icon = NAV_ICONS[item.basePath];

                    return (
                        <Link
                            key={item.basePath}
                            href={buildNavHref(item, query)}
                            onClick={() => trigger(10)}
                            data-testid={item.basePath === "/settings" ? "sidebar-nav-settings" : undefined}
                            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 min-h-[44px] text-sm font-semibold transition-colors ${
                                isActive
                                    ? "bg-ios-blue/10 text-ios-blue"
                                    : "text-ios-subtle dark:text-ios-dark-subtle hover:bg-ios-gray-6/80 dark:hover:bg-ios-dark-fill/80 hover:text-ios-text dark:hover:text-ios-dark-text"
                            }`}
                        >
                            <Icon className="w-5 h-5" strokeWidth={isActive ? 2.2 : 1.8} aria-hidden />
                            {item.name}
                        </Link>
                    );
                })}
            </nav>
        </aside>
    );
}
