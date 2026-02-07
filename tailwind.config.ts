import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                background: "var(--background)",
                foreground: "var(--foreground)",
                // iOS-inspired color system
                ios: {
                    bg: '#F2F2F7',
                    card: '#FFFFFF',
                    separator: '#C6C6C8',
                    fill: '#E5E5EA',
                    'fill-secondary': '#F2F2F7',
                    blue: '#007AFF',
                    green: '#34C759',
                    red: '#FF3B30',
                    orange: '#FF9500',
                    yellow: '#FFCC00',
                    indigo: '#5856D6',
                    pink: '#FF2D55',
                    teal: '#5AC8FA',
                    purple: '#AF52DE',
                    gray: {
                        1: '#8E8E93',
                        2: '#AEAEB2',
                        3: '#C7C7CC',
                        4: '#D1D1D6',
                        5: '#E5E5EA',
                        6: '#F2F2F7',
                    }
                },
            },
            fontFamily: {
                sans: ['var(--font-assistant)', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
            },
            borderRadius: {
                '4xl': '2rem',
            },
            boxShadow: {
                'card': '0 1px 3px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.06)',
                'card-hover': '0 4px 12px rgba(0, 0, 0, 0.08)',
                'elevated': '0 8px 30px rgba(0, 0, 0, 0.08)',
                'sheet': '0 -4px 32px rgba(0, 0, 0, 0.12)',
            },
            animation: {
                'fade-in': 'fadeIn 0.3s ease-out',
                'slide-up': 'slideUp 0.4s ease-out',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                slideUp: {
                    '0%': { opacity: '0', transform: 'translateY(20px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
            }
        },
    },
    plugins: [],
};
export default config;
