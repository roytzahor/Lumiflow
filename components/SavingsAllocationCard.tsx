'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, ChevronLeft, PiggyBank, Plus } from 'lucide-react';
import Money from "@/components/ui/Money";
import type { SavingsAllocationListItem, SavingsLabel } from '@/lib/types';

interface SavingsAllocationCardProps {
  allocations: SavingsAllocationListItem[];
  savingsLabels: SavingsLabel[];
  totalAllocations: number;
  reduceMotion: boolean;
  sectionExpanded: boolean;
  onToggleSection: () => void;
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
  sectionExpanded,
  onToggleSection,
  onAdd,
  onEdit,
}: SavingsAllocationCardProps) {
  const sectionEnter = reduceMotion ? false : ({ opacity: 0, y: 20 } as const);
  const sectionDelay = (seconds: number) => ({ delay: reduceMotion ? 0 : seconds });

  return (
    <motion.div
      initial={sectionEnter}
      animate={{ opacity: 1, y: 0 }}
      transition={sectionDelay(0)}
      className="bg-ios-card dark:bg-ios-dark-card rounded-3xl p-5 shadow-card mb-4 mt-3"
    >
      <div className="mb-1 flex min-w-0 items-center gap-2">
        <button
          type="button"
          onClick={onToggleSection}
          aria-expanded={sectionExpanded}
          className="-mx-1 flex min-w-0 flex-1 items-center gap-2 rounded-xl px-1 py-0.5 text-start transition-colors active:bg-black/[0.03] dark:active:bg-white/[0.04]"
        >
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <motion.span
              animate={{ rotate: sectionExpanded ? 180 : 0 }}
              transition={
                reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 400, damping: 30 }
              }
              className="inline-flex shrink-0 text-ios-subtle dark:text-ios-dark-subtle"
              aria-hidden
            >
              <ChevronDown className="h-5 w-5" />
            </motion.span>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-ios-green/12 text-ios-green" aria-hidden="true">
              <PiggyBank className="h-4 w-4" strokeWidth={2} />
            </div>
            <h2 className="min-w-0 flex-1 truncate text-lg font-bold text-ios-text dark:text-ios-dark-text">
              הפרשות חיסכון החודש
            </h2>
          </div>
        </button>
        <button
          type="button"
          onClick={onAdd}
          className="flex shrink-0 items-center gap-1 rounded-xl bg-ios-green/15 px-3 py-2 text-xs font-bold text-ios-green transition-colors active:bg-ios-green/25"
        >
          <Plus className="h-4 w-4" strokeWidth={2.5} aria-hidden />
          הוספה
        </button>
        <span className="shrink-0 text-xs font-semibold tabular-nums text-ios-subtle dark:text-ios-dark-subtle">
          {allocations.length} סה״כ
        </span>
      </div>

      {!sectionExpanded && allocations.length > 0 && (
        <p className="text-xs text-ios-subtle dark:text-ios-dark-subtle mt-2 pe-7">
          סה״כ הפרשות החודש:{' '}
          <span className="font-bold text-ios-text dark:text-ios-dark-text tabular-nums">
            <Money amount={totalAllocations} signed={false} />
          </span>
        </p>
      )}

      {!sectionExpanded && allocations.length === 0 && (
        <p className="text-xs text-ios-subtle dark:text-ios-dark-subtle mt-2 pe-7 leading-relaxed">
          עדיין אין הפרשות — לחצו על &quot;הוספה&quot; או הרחיבו לפרטים.
        </p>
      )}

      <AnimatePresence initial={false}>
        {sectionExpanded && (
          <motion.div
            key="savings-section-body"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{
              duration: reduceMotion ? 0.01 : 0.2,
              ease: 'easeInOut',
            }}
            className="overflow-hidden"
          >
            <div className={allocations.length === 0 ? 'pt-2' : 'pt-3'}>
              {allocations.length === 0 ? (
                <p className="text-sm text-ios-subtle dark:text-ios-dark-subtle py-2">
                  עדיין אין הפרשות — הוסיפו העברות לחיסכון, השקעות או קרנות.
                </p>
              ) : (
                <>
                  <div className="bg-ios-gray-6 dark:bg-ios-dark-fill rounded-xl overflow-hidden divide-y divide-gray-200/50 dark:divide-white/10 mb-3">
                    {allocations.map((row) => (
                      <button
                        key={row.id}
                        type="button"
                        onClick={() => onEdit(row)}
                        className="w-full flex items-center justify-between min-h-[44px] px-4 py-3 cursor-pointer active:bg-ios-gray-5/70 dark:active:bg-ios-dark-card/50 transition-colors text-start"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-10 h-10 rounded-lg bg-ios-card dark:bg-ios-dark-card flex items-center justify-center text-lg flex-shrink-0 shadow-sm">
                            {iconForLabel(savingsLabels, row.label)}
                          </div>
                          <div className="min-w-0 text-start">
                            <h3 className="text-[15px] font-semibold text-ios-text dark:text-ios-dark-text truncate">
                              {row.description || row.label}
                            </h3>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded-md text-ios-green bg-ios-green/10">
                                {row.label}
                              </span>
                              {row.standingOrderToInvestment ? (
                                <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded-md text-ios-indigo bg-ios-indigo/10">
                                  קבע להשקעה
                                </span>
                              ) : null}
                            </div>
                            <p className="text-[11px] font-semibold text-ios-blue dark:text-ios-blue/90 mt-1 truncate">
                              {row.account.name}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-[15px] font-bold text-ios-green tabular-nums">
                            <Money amount={row.amount} signed={false} />
                          </span>
                          <ChevronLeft className="w-4 h-4 text-ios-gray-4 dark:text-ios-dark-subtle/60" aria-hidden />
                        </div>
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-ios-green/8 px-3 py-2.5">
                    <span className="text-sm font-semibold text-ios-text dark:text-ios-dark-text">סה״כ הפרשות</span>
                    <span className="text-sm font-bold text-ios-green tabular-nums">
                      <Money amount={totalAllocations} signed={false} />
                    </span>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
