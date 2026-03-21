"use client";

import { useEffect, useMemo, useState } from 'react';
import { X, Trash2 } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import type { Account, AccountType } from '@/lib/types';

type AccountFormValues = {
  name: string;
  type: AccountType;
  monthlyContribution: number;
};

interface AccountPopupProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  account: Account | null;
  initialMonthlyContribution?: number;
  isSaving?: boolean;
  isDeleting?: boolean;
  onClose: () => void;
  onSubmit: (values: AccountFormValues) => Promise<void> | void;
  onDelete?: () => Promise<void> | void;
}

const INITIAL_VALUES: AccountFormValues = {
  name: '',
  type: 'PRIVATE',
  monthlyContribution: 0,
};

export default function AccountPopup({
  isOpen,
  mode,
  account,
  initialMonthlyContribution = 0,
  isSaving = false,
  isDeleting = false,
  onClose,
  onSubmit,
  onDelete,
}: AccountPopupProps) {
  const [values, setValues] = useState<AccountFormValues>(INITIAL_VALUES);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setValues(account ? {
      name: account.name,
      type: account.type,
      monthlyContribution: Number.isFinite(initialMonthlyContribution) ? initialMonthlyContribution : 0,
    } : INITIAL_VALUES);
    setShowDeleteConfirm(false);
    setError(null);
  }, [isOpen, account, initialMonthlyContribution]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isSaving && !isDeleting) onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, isSaving, isDeleting, onClose]);

  const title = useMemo(() => (mode === 'create' ? 'הוספת חשבון' : 'עריכת חשבון'), [mode]);
  const submitLabel = mode === 'create' ? 'יצירת חשבון' : 'שמירת שינויים';

  const handleSubmit = async () => {
    const normalizedName = values.name.trim();
    const normalizedContribution = Number(values.monthlyContribution);
    if (!normalizedName) {
      setError('יש להזין שם חשבון');
      return;
    }
    if (!Number.isFinite(normalizedContribution) || normalizedContribution < 0) {
      setError('יש להזין תרומה חודשית תקינה (0 ומעלה)');
      return;
    }
    setError(null);
    await onSubmit({
      name: normalizedName,
      type: values.type,
      monthlyContribution: normalizedContribution,
    });
  };

  return (
    <AnimatePresence>
      {isOpen ? (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-[96] bg-black/35 backdrop-blur-sm"
            onClick={() => {
              if (!isSaving && !isDeleting) onClose();
            }}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="account-popup-title"
            initial={{ y: '100%', opacity: 0.9 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0.95 }}
            transition={{ type: 'spring', damping: 32, stiffness: 360, mass: 0.8 }}
            className="fixed bottom-0 left-0 right-0 z-[97] mx-auto w-full max-w-md rounded-t-[20px] bg-ios-bg dark:bg-ios-dark-bg shadow-sheet pb-safe"
          >
            <div className="flex w-full justify-center pt-3 pb-2">
              <div className="h-[5px] w-9 rounded-full bg-gray-300 dark:bg-ios-dark-subtle/60" />
            </div>
            <div className="space-y-4 px-5 pb-8">
              <div className="flex items-center justify-between gap-2">
                <h3 id="account-popup-title" className="text-lg font-bold text-ios-text dark:text-ios-dark-text">{title}</h3>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSaving || isDeleting}
                  className="w-8 h-8 rounded-lg bg-ios-gray-6 dark:bg-ios-dark-fill text-ios-subtle dark:text-ios-dark-subtle flex items-center justify-center disabled:opacity-50"
                  aria-label="סגור"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                <label className="block space-y-1">
                  <span className="text-xs text-ios-subtle dark:text-ios-dark-subtle">סוג חשבון</span>
                  <select
                    value={values.type}
                    onChange={(e) => setValues((prev) => ({ ...prev, type: e.target.value as AccountType }))}
                    className="w-full bg-ios-gray-6 dark:bg-ios-dark-fill rounded-xl px-3 py-2.5 text-sm text-ios-text dark:text-ios-dark-text"
                  >
                    <option value="PRIVATE">פרטי</option>
                    <option value="SHARED">משותף</option>
                  </select>
                </label>

                <label className="block space-y-1">
                  <span className="text-xs text-ios-subtle dark:text-ios-dark-subtle">שם חשבון</span>
                  <input
                    type="text"
                    value={values.name}
                    onChange={(e) => setValues((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="למשל: חשבון הבית"
                    className="w-full bg-ios-gray-6 dark:bg-ios-dark-fill rounded-xl px-3 py-2.5 text-sm text-ios-text dark:text-ios-dark-text"
                  />
                </label>

                <label className="block space-y-1">
                  <span className="text-xs text-ios-subtle dark:text-ios-dark-subtle">תרומה חודשית לחשבון (₪)</span>
                  <input
                    type="number"
                    min={0}
                    inputMode="decimal"
                    value={values.monthlyContribution}
                    onChange={(e) => setValues((prev) => ({ ...prev, monthlyContribution: Number(e.target.value) }))}
                    className="w-full bg-ios-gray-6 dark:bg-ios-dark-fill rounded-xl px-3 py-2.5 text-sm text-ios-text dark:text-ios-dark-text"
                    dir="ltr"
                  />
                  <p className="text-[11px] text-ios-subtle dark:text-ios-dark-subtle">
                    ההכנסה החודשית של החשבון מחושבת אוטומטית מסכום התרומות של כל חברי החשבון.
                  </p>
                </label>
              </div>

              {error ? <p className="text-xs text-ios-red">{error}</p> : null}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSaving || isDeleting}
                  className="flex-1 py-2.5 rounded-xl bg-ios-gray-6 dark:bg-ios-dark-fill text-ios-text dark:text-ios-dark-text text-sm font-medium disabled:opacity-50"
                >
                  ביטול
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSaving || isDeleting}
                  className="flex-1 py-2.5 rounded-xl bg-ios-blue text-white text-sm font-semibold disabled:opacity-50"
                >
                  {isSaving ? 'שומר...' : submitLabel}
                </button>
              </div>

              {mode === 'edit' && onDelete ? (
                showDeleteConfirm ? (
                  <div className="space-y-2">
                    <p className="text-xs text-ios-red">מחיקת חשבון תעביר אותו לארכיון. להמשיך?</p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setShowDeleteConfirm(false)}
                        disabled={isDeleting}
                        className="flex-1 py-2.5 rounded-xl bg-ios-gray-6 dark:bg-ios-dark-fill text-ios-text dark:text-ios-dark-text text-sm font-medium disabled:opacity-50"
                      >
                        ביטול
                      </button>
                      <button
                        type="button"
                        onClick={onDelete}
                        disabled={isDeleting}
                        className="flex-1 py-2.5 rounded-xl bg-ios-red text-white text-sm font-semibold disabled:opacity-50"
                      >
                        {isDeleting ? 'מוחק...' : 'מחיקה'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="w-full py-2.5 rounded-xl border border-ios-red/40 text-ios-red text-sm font-semibold flex items-center justify-center gap-1.5"
                  >
                    <Trash2 className="w-4 h-4" />
                    מחיקת חשבון
                  </button>
                )
              ) : null}
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}
