'use client';

import { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import { eachMonthOfInterval, format, startOfYear, endOfYear } from 'date-fns';
import { he } from 'date-fns/locale';
import { ChevronRight, ChevronLeft } from 'lucide-react';

export default function MonthSelector() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const currentYear = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
    const currentMonth = parseInt(searchParams.get('month') || new Date().getMonth().toString());

    const months = eachMonthOfInterval({
        start: startOfYear(new Date(currentYear, 0, 1)),
        end: endOfYear(new Date(currentYear, 0, 1))
    });

    const scrollRef = useRef<HTMLDivElement>(null);
    const selectedMonthRef = useRef<HTMLButtonElement | null>(null);

    useEffect(() => {
        selectedMonthRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }, [currentMonth]);

    const handleSelect = (date: Date) => {
        const m = date.getMonth();
        const y = date.getFullYear();
        router.push(`/history?month=${m}&year=${y}`);
    };

    const nextYear = () => router.push(`/history?month=${currentMonth}&year=${currentYear + 1}`);
    const prevYear = () => router.push(`/history?month=${currentMonth}&year=${currentYear - 1}`);

    return (
        <div className="w-full">
            {/* Year selector */}
            <div className="flex justify-between items-center px-5 mb-3">
                <button onClick={nextYear} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-ios-dark-fill flex items-center justify-center active:bg-gray-200 dark:active:bg-ios-dark-card transition">
                    <ChevronRight className="w-4 h-4 text-gray-500 dark:text-ios-dark-subtle" />
                </button>
                <h2 className="text-base font-bold text-ios-text dark:text-ios-dark-text">{currentYear}</h2>
                <button onClick={prevYear} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-ios-dark-fill flex items-center justify-center active:bg-gray-200 dark:active:bg-ios-dark-card transition">
                    <ChevronLeft className="w-4 h-4 text-gray-500 dark:text-ios-dark-subtle" />
                </button>
            </div>

            {/* Month pills */}
            <div
                ref={scrollRef}
                className="flex gap-2 overflow-x-auto no-scrollbar px-5 pb-2"
            >
                {months.map((date, index) => {
                    const isSelected = date.getMonth() === currentMonth;
                    return (
                        <button
                            key={index}
                            ref={isSelected ? selectedMonthRef : undefined}
                            type="button"
                            onClick={() => handleSelect(date)}
                            className="relative flex flex-col items-center justify-center min-w-[3.5rem] py-2.5 rounded-xl transition-all"
                            aria-pressed={isSelected}
                            aria-label={format(date, 'MMMM yyyy', { locale: he })}
                        >
                            {isSelected && (
                                <motion.div
                                    layoutId="selectedMonth"
                                    className="absolute inset-0 bg-ios-blue rounded-xl"
                                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                />
                            )}
                            <span className={`relative z-10 text-xs font-semibold ${
                                isSelected ? 'text-white' : 'text-gray-500 dark:text-ios-dark-subtle'
                            }`}>
                                {format(date, 'MMM', { locale: he })}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
