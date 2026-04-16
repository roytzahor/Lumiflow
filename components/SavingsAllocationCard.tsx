'use client';

import { motion } from 'framer-motion';
import { ChevronLeft, PiggyBank, Plus } from 'lucide-react';
import { formatIlsAmount } from '@/lib/formatters';
import type { SavingsAllocationListItem, SavingsLabel } from '@/lib/types';

interface SavingsAllocationCardProps {
  allocations: SavingsAllocationListItem[];
  savingsLabels: SavingsLabel[];
  totalAllocations: number;
  reduceMotion: boolean;
  onAdd: () => void;
  onEdit: (row: SavingsAllocationListItem) => void;
}

function iconForLabel(labels: SavingsLabel[], name: string): string {
  return labels.find((l) => l.name === name)?.icon ?? '🐖';
}

export default function SavingsAllocationCard({
  allocations,
  savingsLabels,
  totalAllocations,
  reduceMotion,
  onAdd,
  onEdit,
}: SavingsAllocationCardProps) {
  const sectionEnter = reduceMotion ? false : ({ opacity: 0, y: 20 } as const);
  const sectionDelay = (seconds: number) => ({ delay: reduceMotion ? 0 : seconds });

  return (
    <motion.div
      initial={sectionEnter}
      animate={{ opacity: 1, y: 0 }}
      transition={sectionDelay(0.15)}
      className="bg-ios-card dark:bg-ios-dark-card rounded-3xl p-5 shadow-card mb-4"
    >
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-ios-green/12 flex items-center justify-center text-ios-green shrink-0">
            <PiggyBank className="w-5 h-5" strokeWidth={2} />
          </div>
          <h2 className="text-lg font-bold text-ios-text dark:text-ios-dark-text truncate">הפרשות חיסכון החודש</h2>
        </div>
        <button
          type="button"
          onClick={onAdd}
          className="shrink-0 flex items-center gap-1 rounded-xl bg-ios-green/15 text-ios-green px-3 py-2 text-xs font-bold active:bg-ios-green/25 transition-colors"
        >
          <Plus className="w-4 h-4" strokeWidth={2.5} />
          הוספה
        </button>
      </div>

      {allocations.length === 0 ? (
        <p className="text-sm text-ios-subtle dark:text-ios-dark-subtle py-2">
          עדיין אין הפרשות — הוסיפו העברות לחיסכון, השקעות או קרנות.
        </p>
      ) : (
        <>
          <div className="bg-white dark:bg-ios-dark-card rounded-2xl shadow-card overflow-hidden divide-y divide-gray-100 dark:divide-white/10 mb-3">
            {allocations.map((row) => (
              <button
                key={row.id}
                type="button"
                onClick={() => onEdit(row)}
                className="w-full flex items-center justify-between p-4 cursor-pointer active:bg-gray-50 dark:active:bg-ios-dark-fill transition-colors text-start"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-ios-green/10 flex items-center justify-center text-lg flex-shrink-0">
                    {iconForLabel(savingsLabels, row.label)}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-[15px] font-semibold text-ios-text dark:text-ios-dark-text truncate">
                      {row.description || row.label}
                    </h3>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded-md text-ios-green bg-ios-green/10">
                        {row.label}
                      </span>
                      <span
                        className={`text-[11px] font-semibold px-1.5 py-0.5 rounded-md ${
                          row.account.type === 'SHARED'
                            ? 'text-ios-indigo bg-ios-indigo/8'
                            : 'text-ios-blue bg-ios-teal/8'
                        }`}
                      >
                        {row.account.name}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-[15px] font-bold text-ios-green tabular-nums">
                    ₪{formatIlsAmount(row.amount)}
                  </span>
                  <ChevronLeft className="w-4 h-4 text-gray-300 dark:text-ios-dark-subtle/60" />
                </div>
              </button>
            ))}
          </div>
          <div className="flex items-center justify-between rounded-xl bg-ios-green/8 px-3 py-2.5">
            <span className="text-sm font-semibold text-ios-text dark:text-ios-dark-text">סה״כ הפרשות</span>
            <span className="text-sm font-bold text-ios-green tabular-nums">₪{formatIlsAmount(totalAllocations)}</span>
          </div>
        </>
      )}
    </motion.div>
  );
}
