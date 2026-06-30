'use client';
import Money from '@/components/ui/Money';

interface BudgetHealthCardProps {
  monthlyIncome: number;
  needsPercent: number;
  wantsPercent: number;
  spent: number;
}

export default function BudgetHealthCard({ monthlyIncome, needsPercent, wantsPercent, spent }: BudgetHealthCardProps) {
  const spendingBudget = monthlyIncome * (needsPercent + wantsPercent) / 100;
  if (spendingBudget === 0) return null;

  const ratio = Math.min(Math.max(spent / spendingBudget, 0), 1);
  const pct = Math.round(ratio * 100);

  const barColor = ratio < 0.75 ? 'bg-ios-green' : ratio < 1 ? 'bg-ios-orange' : 'bg-ios-red';
  const textColor = ratio < 0.75 ? 'text-ios-green' : ratio < 1 ? 'text-ios-orange' : 'text-ios-red';

  return (
    <div className="rounded-3xl bg-ios-card dark:bg-ios-dark-card p-4 shadow-card">
      <h2 className="text-lg font-bold text-ios-text dark:text-ios-dark-text text-balance mb-3">
        בריאות תקציב
      </h2>
      <div className="overflow-hidden rounded-full bg-ios-gray-5 dark:bg-ios-dark-fill h-2 mb-3">
        <div
          className={`h-full rounded-full transition-[width,background-color] duration-500 ${barColor}`}
          style={{ width: `${ratio * 100}%` }}
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
      <div className="flex items-center justify-between">
        <p className="text-sm text-ios-subtle dark:text-ios-dark-subtle tabular-nums">
          <span className="font-semibold text-ios-text dark:text-ios-dark-text">
            <Money amount={spent} signed={false} />
          </span>
          {' '}מתוך{' '}
          <Money amount={spendingBudget} signed={false} />
        </p>
        <p className={`text-sm font-bold tabular-nums ${textColor}`}>
          {pct}% מהתקציב
        </p>
      </div>
    </div>
  );
}
