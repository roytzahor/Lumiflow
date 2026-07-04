"use client";

import { useState } from 'react';
import { TrendingUp } from 'lucide-react';
import SettingsCollapsibleSection from '@/components/settings/SettingsCollapsibleSection';
import { formatIlsAmount } from '@/lib/formatters';

interface BudgetSectionProps {
  initialMonthlyIncome: number;
  open: boolean;
  onToggle: () => void;
  onSave: (monthlyIncome: number) => Promise<void>;
  isSaving: boolean;
}

export default function BudgetSection({
  initialMonthlyIncome,
  open,
  onToggle,
  onSave,
  isSaving,
}: BudgetSectionProps) {
  const [localIncome, setLocalIncome] = useState(
    initialMonthlyIncome > 0 ? String(initialMonthlyIncome) : '',
  );

  const parsed = parseFloat(localIncome);
  const isUnchanged = parsed === initialMonthlyIncome || (isNaN(parsed) && initialMonthlyIncome === 0);

  const handleSave = async () => {
    const value = isNaN(parsed) || parsed < 0 ? 0 : parsed;
    await onSave(value);
  };

  return (
    <SettingsCollapsibleSection
      open={open}
      onToggle={onToggle}
      title="תקציב חודשי"
      headerStart={
        <div className="w-8 h-8 bg-ios-teal/15 rounded-lg flex items-center justify-center shrink-0">
          <TrendingUp className="w-4 h-4 text-ios-teal" aria-hidden />
        </div>
      }
    >
      <div className="space-y-3">
        <div>
          <label className="text-[11px] font-semibold text-ios-subtle dark:text-ios-dark-subtle mb-1 block">
            הכנסה חודשית
          </label>
          <input
            data-testid="settings-budget-income"
            type="number"
            min="0"
            step="100"
            placeholder="לדוגמה: 15000"
            value={localIncome}
            onChange={(e) => setLocalIncome(e.target.value)}
            className="w-full bg-ios-gray-6 dark:bg-ios-dark-fill rounded-xl px-3.5 py-2.5 text-sm text-ios-text dark:text-ios-dark-text outline-none"
          />
          {!isNaN(parsed) && parsed > 0 && (
            <p className="text-xs text-ios-subtle dark:text-ios-dark-subtle mt-1.5">
              תקציב הוצאות לפי 50/30/20: ₪{formatIlsAmount(parsed * 0.8)}
            </p>
          )}
        </div>
        <button
          data-testid="settings-budget-save"
          type="button"
          onClick={() => void handleSave()}
          disabled={isSaving || isUnchanged}
          className="w-full py-2.5 rounded-xl bg-ios-teal text-white text-sm font-semibold disabled:opacity-50 active:scale-[0.96] transition-transform"
        >
          {isSaving ? 'שומר...' : 'שמירה'}
        </button>
      </div>
    </SettingsCollapsibleSection>
  );
}
