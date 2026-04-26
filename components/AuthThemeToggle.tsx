'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';

interface AuthThemeToggleProps {
  className?: string;
}

export default function AuthThemeToggle({ className = '' }: AuthThemeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted && resolvedTheme === 'dark';
  const label = isDark ? 'מעבר למצב בהיר' : 'מעבר למצב כהה';

  return (
    <button
      type="button"
      suppressHydrationWarning
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className={`inline-flex items-center gap-2 rounded-xl border border-gray-200/50 dark:border-white/15 bg-ios-card/95 dark:bg-ios-dark-fill/80 px-3 py-2 text-xs font-semibold text-ios-text dark:text-ios-dark-text hover:bg-ios-gray-6 dark:hover:bg-ios-dark-fill transition shadow-sm ${className}`}
      aria-label={label}
      title={label}
    >
      {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
      {isDark ? 'מצב בהיר' : 'מצב כהה'}
    </button>
  );
}
