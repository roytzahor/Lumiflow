'use client';

import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

export default function BudgetSetupPromptCard() {
  return (
    <div className="rounded-3xl bg-ios-blue/8 dark:bg-ios-blue/15 p-5 shadow-card mb-4 border border-ios-blue/15 dark:border-ios-blue/25">
      <div className="flex items-start gap-4">
        <div className="w-11 h-11 rounded-2xl bg-ios-blue/15 dark:bg-ios-blue/25 flex items-center justify-center text-xl flex-shrink-0">
          💰
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-bold text-ios-text dark:text-ios-dark-text text-balance mb-1">
            הגדרת תקציב חודשי
          </h2>
          <p className="text-xs text-ios-subtle dark:text-ios-dark-subtle text-pretty leading-relaxed mb-3">
            הגדרת הכנסה חודשית תפתח את כרטיסי המעקב, בריאות התקציב, ותמונת המצב היומית.
          </p>
          <Link
            href="/settings?section=budget"
            className="inline-flex items-center gap-1.5 rounded-xl bg-ios-blue px-4 py-2.5 text-sm font-bold text-white active:opacity-90 transition-opacity"
          >
            הגדרת תקציב
            <ChevronLeft className="w-4 h-4" aria-hidden />
          </Link>
        </div>
      </div>
    </div>
  );
}
