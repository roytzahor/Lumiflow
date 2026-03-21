"use client";

import { useEffect, useMemo, useState } from 'react';
import { X, Trash2 } from 'lucide-react';
import type { Account, AccountType } from '@/lib/types';

type AccountFormValues = {
  name: string;
  type: AccountType;
  income: number;
};

interface AccountPopupProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  account: Account | null;
  isSaving?: boolean;
  isDeleting?: boolean;
  onClose: () => void;
  onSubmit: (values: AccountFormValues) => Promise<void> | void;
  onDelete?: () => Promise<void> | void;
}

const INITIAL_VALUES: AccountFormValues = {
  name: '',
  type: 'PRIVATE',
  income: 0,
};

export default function AccountPopup({
  isOpen,
  mode,
  account,
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
      income: Number.isFinite(account.income) ? account.income : 0,
    } : INITIAL_VALUES);
    setShowDeleteConfirm(false);
    setError(null);
  }, [isOpen, account]);

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

  if (!isOpen) return null;

  const handleSubmit = async () => {
    const normalizedName = values.name.trim();
    const normalizedIncome = Number(values.income);
    if (!normalizedName) {
      setError('יש להזין שם חשבון');
      return;
    }
    if (!Number.isFinite(normalizedIncome) || normalizedIncome < 0) {
      setError('יש להזין הכנסה חודשית תקינה (0 ומעלה)');
      return;
    }
    setError(null);
    await onSubmit({
      name: normalizedName,
      type: values.type,
      income: normalizedIncome,
    });
  };

  return (
    <div className="fixed inset-0 z-[96] bg-black/35 backdrop-blur-sm flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-ios-card dark:bg-ios-dark-card rounded-2xl shadow-card p-5 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-lg font-bold text-ios-text dark:text-ios-dark-text">{title}</h3>
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
            <span className="text-xs text-ios-subtle dark:text-ios-dark-subtle">הכנסה חודשית לחשבון (₪)</span>
            <input
              type="number"
              min={0}
              inputMode="decimal"
              value={values.income}
              onChange={(e) => setValues((prev) => ({ ...prev, income: Number(e.target.value) }))}
              className="w-full bg-ios-gray-6 dark:bg-ios-dark-fill rounded-xl px-3 py-2.5 text-sm text-ios-text dark:text-ios-dark-text"
              dir="ltr"
            />
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
    </div>
  );
}
