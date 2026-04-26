'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface LiquidToggleProps {
    isOn: boolean;
    onToggle: () => void;
    testId?: string;
}

export default function LiquidToggle({ isOn, onToggle, testId }: LiquidToggleProps) {
    const [isRtl, setIsRtl] = useState(true);

    useEffect(() => {
        if (typeof document !== 'undefined') {
            setIsRtl(document.documentElement.dir === 'rtl');
        }
    }, []);

    return (
        <button
            data-testid={testId}
            type="button"
            role="switch"
            aria-checked={isOn}
            onClick={onToggle}
            className={`flex-shrink-0 w-[51px] h-[31px] rounded-full flex items-center p-[2px] cursor-pointer transition-colors duration-300 ${
                isOn ? 'bg-ios-green' : 'bg-ios-gray-5'
            }`}
        >
            <motion.div
                transition={{
                    type: 'spring',
                    stiffness: 500,
                    damping: 35
                }}
                className="flex-shrink-0 w-[27px] h-[27px] rounded-full bg-white shadow-sm ring-1 ring-black/[0.06] dark:bg-zinc-100 dark:ring-white/20"
                animate={{
                    x: isOn ? (isRtl ? -20 : 20) : 0
                }}
                style={{ willChange: 'transform' }}
            />
        </button>
    );
}
