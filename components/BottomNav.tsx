"use client";

import { Home, Clock, Settings } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { useHaptic } from '@/hooks/useHaptic';

export default function BottomNav() {
    const pathname = usePathname();
    const { trigger } = useHaptic();

    const navItems = [
        { name: 'סקירה', path: '/', icon: Home },
        { name: 'היסטוריה', path: '/history', icon: Clock },
        { name: 'הגדרות', path: '/settings', icon: Settings },
    ];

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 pb-safe">
            {/* Soft gradient fade */}
            <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-ios-bg via-ios-bg/90 to-transparent pointer-events-none" />

            {/* Tab bar */}
            <div className="relative bg-white/80 backdrop-blur-2xl border-t border-gray-200/50">
                <div className="max-w-md mx-auto flex items-center justify-around px-4 pt-2 pb-1">
                    {navItems.map((item) => {
                        const isActive = pathname === item.path;
                        const Icon = item.icon;

                        return (
                            <Link
                                key={item.path}
                                href={item.path}
                                onClick={() => trigger(10)}
                                className="relative flex flex-col items-center justify-center flex-1 py-1.5 gap-0.5"
                            >
                                <div className="relative">
                                    <Icon
                                        className={`w-[22px] h-[22px] transition-colors duration-200 ${
                                            isActive ? 'text-ios-blue' : 'text-gray-400'
                                        }`}
                                        strokeWidth={isActive ? 2.2 : 1.8}
                                    />
                                </div>
                                <span className={`text-[10px] font-semibold transition-colors duration-200 ${
                                    isActive ? 'text-ios-blue' : 'text-gray-400'
                                }`}>
                                    {item.name}
                                </span>
                            </Link>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
