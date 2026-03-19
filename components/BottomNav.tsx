"use client";

import { Home, Clock, PieChart, Plus, Settings } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useHaptic } from '@/hooks/useHaptic';

export default function BottomNav() {
    const pathname = usePathname();
    const { trigger } = useHaptic();

    const navItems = [
        { name: 'סקירה', path: '/', icon: Home, col: 'col-start-1' },
        { name: 'היסטוריה', path: '/history', icon: Clock, col: 'col-start-2' },
        { name: 'תובנות', path: '/insights', icon: PieChart, col: 'col-start-4' },
        { name: 'הגדרות', path: '/settings', icon: Settings, col: 'col-start-5' },
    ];

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 pb-safe">
            {/* Soft gradient fade */}
            <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-ios-bg dark:from-ios-dark-bg via-ios-bg/90 dark:via-ios-dark-bg/90 to-transparent pointer-events-none" />

            {/* Tab bar */}
            <div className="relative bg-white/80 dark:bg-ios-dark-card/85 backdrop-blur-2xl border-t border-gray-200/50 dark:border-white/10">
                <div className="max-w-md mx-auto relative px-4 pt-2 pb-1">
                    <Link
                        href="/?quickAdd=1"
                        onClick={() => trigger(10)}
                        className="absolute left-1/2 -translate-x-1/2 -top-5 z-10 w-14 h-14 rounded-full bg-ios-blue shadow-lg shadow-ios-blue/35 flex items-center justify-center ring-4 ring-ios-bg dark:ring-ios-dark-bg"
                        aria-label="הוספת הוצאה"
                    >
                        <Plus className="w-6 h-6 text-white" strokeWidth={2.8} />
                    </Link>

                    <div className="grid grid-cols-5 items-center pt-4 gap-0.5">
                    {navItems.map((item) => {
                        const isActive = pathname === item.path;
                        const Icon = item.icon;

                        return (
                            <Link
                                key={item.path}
                                href={item.path}
                                onClick={() => trigger(10)}
                                className={`relative flex flex-col items-center justify-center py-2 gap-0.5 ${item.col}`}
                            >
                                <div className="relative">
                                    <Icon
                                        className={`w-[22px] h-[22px] transition-colors duration-200 ${
                                            isActive ? 'text-ios-blue' : 'text-ios-subtle dark:text-ios-dark-subtle'
                                        }`}
                                        strokeWidth={isActive ? 2.2 : 1.8}
                                    />
                                </div>
                                <span className={`text-[10px] font-semibold transition-colors duration-200 ${
                                    isActive ? 'text-ios-blue' : 'text-ios-subtle dark:text-ios-dark-subtle'
                                }`}>
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
