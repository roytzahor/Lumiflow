'use client';

import { motion } from 'framer-motion';

interface LiquidToggleProps {
    isOn: boolean;
    onToggle: () => void;
}

export default function LiquidToggle({ isOn, onToggle }: LiquidToggleProps) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={isOn}
            onClick={onToggle}
            className={`flex-shrink-0 w-[51px] h-[31px] rounded-full flex items-center p-[2px] cursor-pointer transition-colors duration-300 ${
                isOn ? 'bg-ios-green' : 'bg-gray-200'
            }`}
        >
            <motion.div
                transition={{
                    type: 'spring',
                    stiffness: 500,
                    damping: 35
                }}
                className="flex-shrink-0 w-[27px] h-[27px] bg-white rounded-full shadow-sm"
                animate={{
                    x: isOn ? 20 : 0
                }}
                style={{ willChange: 'transform' }}
            />
        </button>
    );
}
