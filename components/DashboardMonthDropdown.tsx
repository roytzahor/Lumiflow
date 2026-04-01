'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { eachMonthOfInterval, format, startOfYear, endOfYear } from 'date-fns';
import { he } from 'date-fns/locale';
import { ChevronRight, ChevronLeft, ChevronDown } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

export default function DashboardMonthDropdown() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const now = new Date();

    const yearParam = parseInt(searchParams.get('year') || now.getFullYear().toString(), 10);
    const monthParam = parseInt(searchParams.get('month') || now.getMonth().toString(), 10);
    const currentYear = Number.isFinite(yearParam) && yearParam >= 2020 && yearParam <= 2100 ? yearParam : now.getFullYear();
    const currentMonth = Number.isFinite(monthParam) && monthParam >= 0 && monthParam <= 11 ? monthParam : now.getMonth();

    const isCurrentMonth = currentYear === now.getFullYear() && currentMonth === now.getMonth();

    const [open, setOpen] = useState(false);
    const [pickerYear, setPickerYear] = useState(currentYear);
    const popoverRef = useRef<HTMLDivElement>(null);

    const months = eachMonthOfInterval({
        start: startOfYear(new Date(pickerYear, 0, 1)),
        end: endOfYear(new Date(pickerYear, 0, 1)),
    });

    const handleSelect = (date: Date) => {
        const m = date.getMonth();
        const y = date.getFullYear();
        setOpen(false);
        router.push(`/?month=${m}&year=${y}`);
    };

    useEffect(() => {
        if (!open) return;
        setPickerYear(currentYear);
        const handler = (e: MouseEvent) => {
            if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open, currentYear]);

    return (
        <div className="relative" ref={popoverRef}>
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-ios-gray-6 dark:bg-ios-dark-fill active:opacity-80 transition-opacity"
                aria-expanded={open}
                aria-haspopup="listbox"
            >
                <span className="text-sm font-semibold text-ios-text dark:text-ios-dark-text">
                    {isCurrentMonth
                        ? 'החודש הנוכחי'
                        : format(new Date(currentYear, currentMonth, 1), 'MMM yyyy', { locale: he })}
                </span>
                <ChevronDown
                    className={`w-3.5 h-3.5 text-ios-subtle dark:text-ios-dark-subtle transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
                />
            </button>

            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: -6, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -6, scale: 0.97 }}
                        transition={{ duration: 0.15 }}
                        className="absolute left-0 top-full mt-2 z-50 w-72 bg-white dark:bg-ios-dark-card rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.14)] ring-1 ring-black/5 dark:ring-white/10 p-4 overflow-hidden"
                        role="listbox"
                    >
                        {/* Year nav */}
                        <div className="flex justify-between items-center mb-4">
                            <button
                                type="button"
                                onClick={() => setPickerYear((y) => y + 1)}
                                disabled={pickerYear >= now.getFullYear()}
                                className="w-8 h-8 rounded-full bg-gray-100 dark:bg-ios-dark-fill flex items-center justify-center disabled:opacity-30 active:bg-gray-200 dark:active:bg-ios-dark-card transition"
                            >
                                <ChevronRight className="w-4 h-4 text-gray-500 dark:text-ios-dark-subtle" />
                            </button>
                            <span className="text-base font-bold text-ios-text dark:text-ios-dark-text">{pickerYear}</span>
                            <button
                                type="button"
                                onClick={() => setPickerYear((y) => y - 1)}
                                disabled={pickerYear <= 2020}
                                className="w-8 h-8 rounded-full bg-gray-100 dark:bg-ios-dark-fill flex items-center justify-center disabled:opacity-30 active:bg-gray-200 dark:active:bg-ios-dark-card transition"
                            >
                                <ChevronLeft className="w-4 h-4 text-gray-500 dark:text-ios-dark-subtle" />
                            </button>
                        </div>

                        {/* Month grid */}
                        <div className="grid grid-cols-4 gap-1.5">
                            {months.map((date) => {
                                const isSelected = date.getMonth() === currentMonth && pickerYear === currentYear;
                                const isFuture = date > now && !(date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth());
                                return (
                                    <button
                                        key={date.getMonth()}
                                        type="button"
                                        role="option"
                                        aria-selected={isSelected}
                                        disabled={isFuture}
                                        onClick={() => handleSelect(date)}
                                        className={`py-2 rounded-xl text-xs font-semibold transition-colors disabled:opacity-30 ${
                                            isSelected
                                                ? 'bg-ios-blue text-white'
                                                : 'text-ios-text dark:text-ios-dark-text active:bg-gray-100 dark:active:bg-ios-dark-fill'
                                        }`}
                                    >
                                        {format(date, 'MMM', { locale: he })}
                                    </button>
                                );
                            })}
                        </div>

                        {!isCurrentMonth && (
                            <button
                                type="button"
                                onClick={() => {
                                    setOpen(false);
                                    router.push('/');
                                }}
                                className="mt-3 w-full text-xs font-semibold text-ios-blue py-2 rounded-xl active:bg-ios-blue/10 transition-colors"
                            >
                                חזרה לחודש הנוכחי
                            </button>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
