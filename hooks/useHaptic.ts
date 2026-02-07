'use client';

export type HapticType = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';

function toPattern(value: HapticType | number | number[]): number | number[] {
    if (typeof value === 'number') return value;
    if (Array.isArray(value)) return value;
    switch (value) {
        case 'light': return 10;
        case 'medium': return 20;
        case 'heavy': return 50;
        case 'success': return [10, 30, 10];
        case 'warning': return [50, 100, 50];
        case 'error': return [100, 50, 100, 50, 100];
        default: return 10;
    }
}

export function useHaptic() {
    const trigger = (value: HapticType | number | number[] = 10) => {
        if (typeof window === 'undefined') return;
        if (navigator.vibrate) {
            const pattern = typeof value === 'string' ? toPattern(value) : value;
            navigator.vibrate(pattern);
        }
    };
    return { trigger };
}
