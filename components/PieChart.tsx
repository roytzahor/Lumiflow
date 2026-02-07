"use client";

import { useMemo } from 'react';
import { motion } from 'framer-motion';

interface PieChartProps {
    data: { name: string; value: number; color: string; icon: string }[];
}

export default function PieChart({ data }: PieChartProps) {
    const total = useMemo(() => data.reduce((acc, curr) => acc + curr.value, 0), [data]);

    // Calculate donut segments
    let currentAngle = 0;
    const segments = data.map((item) => {
        const percentage = item.value / total;
        const angle = percentage * 360;
        const largeArc = angle > 180 ? 1 : 0;

        const r = 80;
        const cx = 100;
        const cy = 100;

        const x1 = cx + r * Math.cos(Math.PI * (currentAngle - 90) / 180);
        const y1 = cy + r * Math.sin(Math.PI * (currentAngle - 90) / 180);
        const x2 = cx + r * Math.cos(Math.PI * (currentAngle + angle - 90) / 180);
        const y2 = cy + r * Math.sin(Math.PI * (currentAngle + angle - 90) / 180);

        const pathData = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;

        currentAngle += angle;

        return { ...item, pathData, percentage, angle };
    });

    if (total === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                <div className="w-32 h-32 rounded-full border-4 border-gray-100 flex items-center justify-center mb-3">
                    <span className="text-3xl opacity-30">📊</span>
                </div>
                <p className="text-sm font-medium">אין נתונים להצגה</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center w-full">
            {/* Donut Chart */}
            <div className="relative w-48 h-48 my-2">
                <svg viewBox="0 0 200 200" className="w-full h-full -rotate-90">
                    {segments.map((segment, index) => (
                        <motion.path
                            key={segment.name}
                            d={segment.pathData}
                            fill={segment.color}
                            stroke="white"
                            strokeWidth="3"
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: index * 0.08, duration: 0.5, type: "spring" }}
                            className="cursor-pointer"
                        />
                    ))}
                    {/* Center hole */}
                    <circle cx="100" cy="100" r="54" fill="white" />
                </svg>

                {/* Center label */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-[11px] text-gray-400 font-medium">סה״כ</span>
                    <span className="text-xl font-bold text-gray-900 tracking-tight tabular-nums">
                        ₪{total.toLocaleString()}
                    </span>
                </div>
            </div>

            {/* Legend */}
            <div className="w-full space-y-2 mt-3">
                {data.map((item, index) => (
                    <motion.div
                        key={item.name}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 + index * 0.04 }}
                        className="flex items-center justify-between py-1.5"
                    >
                        <div className="flex items-center gap-2.5">
                            <div
                                className="w-3 h-3 rounded-full flex-shrink-0"
                                style={{ backgroundColor: item.color }}
                            />
                            <span className="text-sm text-gray-600">{item.icon} {item.name}</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-xs text-gray-400 tabular-nums">
                                {Math.round(item.value / total * 100)}%
                            </span>
                            <span className="text-sm font-semibold text-gray-900 tabular-nums">
                                ₪{item.value.toLocaleString()}
                            </span>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}
