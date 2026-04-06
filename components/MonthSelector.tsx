'use client';

import { useLayoutEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { eachMonthOfInterval, format, startOfYear, endOfYear } from 'date-fns';
import { he } from 'date-fns/locale';
import { ChevronRight, ChevronLeft } from 'lucide-react';

type MonthSelectorProps = {
    /** Where month/year query updates apply (e.g. `/` for dashboard, `/history` for history). */
    basePath?: string;
};

export default function MonthSelector({ basePath = '/history' }: MonthSelectorProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const now = new Date();
    const yearParam = parseInt(searchParams.get('year') || now.getFullYear().toString(), 10);
    const monthParam = parseInt(searchParams.get('month') || now.getMonth().toString(), 10);
    const currentYear = Number.isFinite(yearParam) && yearParam >= 2020 && yearParam <= 2100 ? yearParam : now.getFullYear();
    const currentMonth = Number.isFinite(monthParam) && monthParam >= 0 && monthParam <= 11 ? monthParam : now.getMonth();

    const months = eachMonthOfInterval({
        start: startOfYear(new Date(currentYear, 0, 1)),
        end: endOfYear(new Date(currentYear, 0, 1))
    });

    const monthsViewportRef = useRef<HTMLDivElement | null>(null);
    const selectedMonthRef = useRef<HTMLButtonElement | null>(null);

    useLayoutEffect(() => {
        const viewport = monthsViewportRef.current;
        const selected = selectedMonthRef.current;
        if (!viewport || !selected) return;

        const viewportRect = viewport.getBoundingClientRect();
        const selectedRect = selected.getBoundingClientRect();
        const viewportCenter = viewportRect.left + (viewportRect.width / 2);
        const selectedCenter = selectedRect.left + (selectedRect.width / 2);
        const delta = selectedCenter - viewportCenter;

        if (Math.abs(delta) > 1) {
            viewport.scrollLeft += delta;
        }
    }, [currentMonth, currentYear]);

    const withQuery = (m: number, y: number) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('month', String(m));
        params.set('year', String(y));
        const q = params.toString();
        if (basePath === '/') {
            return q ? `/?${q}` : '/';
        }
        return q ? `${basePath}?${q}` : basePath;
    };

    const handleSelect = (date: Date) => {
        const m = date.getMonth();
        const y = date.getFullYear();
        router.push(withQuery(m, y));
    };

    const nextYear = () => router.push(withQuery(currentMonth, currentYear + 1));
    const prevYear = () => router.push(withQuery(currentMonth, currentYear - 1));

    return (
        <div className="w-full max-w-full min-w-0 overflow-hidden">
            {/* Year selector */}
            <div className="flex justify-between items-center mb-3">
                <button onClick={nextYear} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-ios-dark-fill flex items-center justify-center active:bg-gray-200 dark:active:bg-ios-dark-card transition">
                    <ChevronRight className="w-4 h-4 text-gray-500 dark:text-ios-dark-subtle" />
                </button>
                <h2 className="text-base font-bold text-ios-text dark:text-ios-dark-text">{currentYear}</h2>
                <button onClick={prevYear} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-ios-dark-fill flex items-center justify-center active:bg-gray-200 dark:active:bg-ios-dark-card transition">
                    <ChevronLeft className="w-4 h-4 text-gray-500 dark:text-ios-dark-subtle" />
                </button>
            </div>

            {/* Month pills */}
            <div ref={monthsViewportRef} className="w-full max-w-full min-w-0 overflow-x-auto no-scrollbar pb-2 [direction:ltr]">
                <div className="flex w-max min-w-full flex-row-reverse gap-2">
                    {months.map((date, index) => {
                        const isSelected = date.getMonth() === currentMonth;
                        return (
                            <button
                                key={index}
                                ref={isSelected ? selectedMonthRef : undefined}
                                type="button"
                                onClick={() => handleSelect(date)}
                                className={`relative shrink-0 flex flex-col items-center justify-center min-w-[3.5rem] py-2.5 rounded-xl transition-colors ${
                                    isSelected ? 'bg-ios-blue' : ''
                                }`}
                                aria-pressed={isSelected}
                                aria-label={format(date, 'MMMM yyyy', { locale: he })}
                            >
                                <span className={`text-xs font-semibold ${
                                    isSelected ? 'text-white' : 'text-gray-500 dark:text-ios-dark-subtle'
                                }`}>
                                    {format(date, 'MMM', { locale: he })}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
