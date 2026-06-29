'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion, PanInfo, useDragControls } from 'framer-motion';
import { Calendar, ChevronDown, Landmark, Repeat, X } from 'lucide-react';
import LiquidToggle from '@/components/ui/LiquidToggle';
import { toast } from 'sonner';
import { formatDateInputForDisplay, toDateInputValueFromUtc } from '@/lib/date-only';
import type { AccountSummary, SavingsAllocationListItem, SavingsLabel } from '@/lib/types';
import {
  addSavingsAllocation,
  updateSavingsAllocation,
  deleteSavingsAllocation,
} from '@/app/actions';
import InfoHint from '@/components/InfoHint';

interface SavingsAllocationSheetProps {
  isOpen: boolean;
  onClose: () => void;
  initialData: SavingsAllocationListItem | null;
  accounts: AccountSummary[];
  savingsLabels: SavingsLabel[];
}

function getAccountIcon(account: AccountSummary): string {
  if (account.type === 'SHARED') return '👥';
  return '👤';
}

export default function SavingsAllocationSheet({
  isOpen,
  onClose,
  initialData,
  accounts,
  savingsLabels,
}: SavingsAllocationSheetProps) {
  const router = useRouter();
  const dragControls = useDragControls();
  const sheetRef = useRef<HTMLDivElement>(null);

  const visibleLabels = useMemo(
    () => savingsLabels.filter((l) => !l.hidden).sort((a, b) => a.name.localeCompare(b.name, 'he')),
    [savingsLabels]
  );

  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [label, setLabel] = useState('');
  const [date, setDate] = useState('');
  const [standingOrderToInvestment, setStandingOrderToInvestment] = useState(false);
  const [accountId, setAccountId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      const focusable = sheetRef.current?.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      focusable?.focus();
    }, 120);
    return () => clearTimeout(timer);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    if (initialData) {
      setAmount(initialData.amount.toString());
      setDescription(initialData.description || '');
      setLabel(initialData.label);
      setDate(toDateInputValueFromUtc(new Date(initialData.date)));
      setStandingOrderToInvestment(initialData.standingOrderToInvestment);
      setAccountId(initialData.accountId);
    } else {
      setAmount('');
      setDescription('');
      setLabel(visibleLabels[0]?.name ?? '');
      setDate(toDateInputValueFromUtc(new Date()));
      setStandingOrderToInvestment(false);
      setAccountId(accounts.find((a) => a.type === 'SHARED')?.id ?? accounts[0]?.id ?? '');
    }
    setShowDeleteConfirm(false);
  }, [isOpen, initialData, accounts, visibleLabels]);

  /** Keep accountId valid when accounts load after open or list changes. */
  useEffect(() => {
    if (!isOpen || accounts.length === 0) return;
    const stillValid = accounts.some((a) => a.id === accountId);
    if (stillValid) return;
    setAccountId(accounts.find((a) => a.type === 'SHARED')?.id ?? accounts[0].id);
  }, [isOpen, accounts, accountId]);

  const handleSave = async () => {
    const parsedAmount = parseFloat(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      toast.error('הסכום חייב להיות גדול מ-0');
      return;
    }
    if (!date || !accountId || !label.trim()) {
      toast.error('יש למלא את כל השדות הנדרשים');
      return;
    }

    setIsSubmitting(true);
    const formData = new FormData();
    formData.append('amount', amount);
    formData.append('description', description);
    formData.append('date', date);
    formData.append('accountId', accountId);
    formData.append('label', label.trim());
    formData.append('standingOrderToInvestment', standingOrderToInvestment ? 'true' : 'false');

    if (initialData) {
      const res = await updateSavingsAllocation(initialData.id, formData);
      setIsSubmitting(false);
      if (!res.success) {
        toast.error('שמירה נכשלה. נסה שוב.');
        return;
      }
      toast.success('עודכן בהצלחה');
    } else {
      const res = await addSavingsAllocation(formData);
      setIsSubmitting(false);
      if (!res.success) {
        toast.error('שמירה נכשלה. נסה שוב.');
        return;
      }
      toast.success('נוסף בהצלחה');
    }

    router.refresh();
    onClose();
  };

  const handleDelete = async () => {
    if (!initialData) return;
    setIsDeleting(true);
    const res = await deleteSavingsAllocation(initialData.id);
    setIsDeleting(false);
    if (!res.success) {
      toast.error('מחיקה נכשלה. נסה שוב.');
      return;
    }
    toast.success('נמחק בהצלחה');
    router.refresh();
    onClose();
  };

  const onDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.y > 100) onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[70] bg-black/30 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            ref={sheetRef}
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 32, stiffness: 380, mass: 0.8 }}
            drag="y"
            dragControls={dragControls}
            dragConstraints={{ top: 0 }}
            dragElastic={0.15}
            onDragEnd={onDragEnd}
            className="fixed bottom-0 left-0 right-0 z-[80] max-h-[92vh] bg-ios-bg dark:bg-ios-dark-bg shadow-sheet flex flex-col pb-safe rounded-t-[20px] max-w-md mx-auto"
          >
            <div className="w-full flex justify-center pt-3 pb-2" onPointerDown={(e) => dragControls.start(e)}>
              <div className="w-9 h-[5px] bg-ios-gray-4 dark:bg-ios-dark-subtle/60 rounded-full" />
            </div>

            <div className="flex-1 overflow-y-auto px-5 pb-8">
              <div className="flex items-center justify-between gap-2 mb-6">
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <h2 className="text-xl font-bold text-ios-text dark:text-ios-dark-text truncate">
                    {initialData ? 'עריכת הפרשת חיסכון' : 'הפרשה לחיסכון'}
                  </h2>
                  <InfoHint ariaLabel="הסבר על הפרשות חיסכון">
                    הפרשות אלה לא נספרות כהוצאות — הן מופיעות בנפרד כחלק מהחיסכון החודשי.
                  </InfoHint>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-8 h-8 bg-ios-gray-5 dark:bg-ios-dark-fill rounded-full flex items-center justify-center shrink-0"
                  aria-label="סגור"
                >
                  <X className="w-4 h-4 text-ios-subtle dark:text-ios-dark-subtle" />
                </button>
              </div>

              <div className="bg-ios-card dark:bg-ios-dark-card rounded-2xl p-5 sm:p-6 shadow-card border border-gray-200/50 dark:border-white/10 mb-4 text-center">
                <p className="text-xs font-semibold text-ios-subtle dark:text-ios-dark-subtle uppercase tracking-wider mb-3">
                  סכום
                </p>
                <div className="flex items-center justify-center gap-1">
                  <span className="text-3xl sm:text-4xl text-ios-gray-4 dark:text-ios-dark-subtle/60 font-light">₪</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="bg-transparent text-center text-4xl sm:text-5xl font-bold text-ios-text dark:text-ios-dark-text placeholder:text-ios-gray-4/70 dark:placeholder:text-ios-dark-subtle/50 focus:outline-none w-40 sm:w-48"
                  />
                </div>
              </div>

              <div className="bg-ios-card dark:bg-ios-dark-card rounded-2xl shadow-card border border-gray-200/50 dark:border-white/10 mb-4 overflow-hidden p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-xl bg-ios-blue/12 flex items-center justify-center shrink-0">
                    <Landmark className="w-5 h-5 text-ios-blue" strokeWidth={2} aria-hidden="true" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-ios-subtle dark:text-ios-dark-subtle uppercase tracking-wider">
                      חשבון
                    </p>
                    <p className="text-[13px] text-ios-subtle dark:text-ios-dark-subtle mt-0.5">
                      מאיזה חשבון בוצעה ההפרשה
                    </p>
                  </div>
                </div>
                {accounts.length === 0 ? (
                  <p className="text-sm text-ios-subtle dark:text-ios-dark-subtle rounded-xl bg-ios-gray-6 dark:bg-ios-dark-fill px-3 py-3">
                    אין חשבונות זמינים. הוסיפו חשבון תחת הגדרות.
                  </p>
                ) : (
                  <div className="relative">
                    <label htmlFor="savings-allocation-account" className="sr-only">
                      בחירת חשבון
                    </label>
                    <select
                      id="savings-allocation-account"
                      value={accountId}
                      onChange={(e) => setAccountId(e.target.value)}
                      className="w-full min-h-[48px] appearance-none rounded-xl border border-gray-200/90 dark:border-white/12 bg-ios-gray-6 dark:bg-ios-dark-fill ps-3 pe-10 py-3 text-[15px] font-semibold text-ios-text dark:text-ios-dark-text shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ios-green/40"
                    >
                      {accounts.map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {`${getAccountIcon(acc)} ${acc.name}`}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ios-subtle dark:text-ios-dark-subtle"
                      aria-hidden
                    />
                  </div>
                )}
              </div>

              <div className="bg-ios-card dark:bg-ios-dark-card rounded-2xl shadow-card border border-gray-200/50 dark:border-white/10 mb-4 overflow-hidden">
                <div className="p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 bg-ios-green/10 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                      <Calendar className="w-[18px] h-[18px] text-ios-green" strokeWidth={2} aria-hidden="true" />
                    </div>
                    <div className="min-w-0 flex-1 space-y-2">
                      <div>
                        <p className="text-[15px] font-semibold text-ios-text dark:text-ios-dark-text">תאריך</p>
                        <p className="text-xs text-ios-subtle dark:text-ios-dark-subtle mt-0.5">
                          {date ? formatDateInputForDisplay(date, 'he-IL') : 'בחרו את יום ההפרשה'}
                        </p>
                      </div>
                      <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full min-h-[48px] bg-ios-gray-6 dark:bg-ios-dark-fill border border-gray-200/90 dark:border-white/12 rounded-xl px-3 py-2.5 text-[15px] text-ios-text dark:text-ios-dark-text focus:outline-none focus-visible:ring-2 focus-visible:ring-ios-green/35 [color-scheme:light] dark:[color-scheme:dark]"
                      />
                    </div>
                  </div>
                </div>

                <div className="h-px bg-black/5 dark:bg-white/10 mx-4" />

                <div className="p-4 flex items-center justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-9 h-9 bg-ios-indigo/10 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                      <Repeat className="w-[18px] h-[18px] text-ios-indigo" strokeWidth={2} aria-hidden="true" />
                    </div>
                    <div className="flex min-w-0 items-center gap-1.5">
                      <p className="text-[15px] font-semibold text-ios-text dark:text-ios-dark-text">
                        העברת קבע להשקעה
                      </p>
                      <InfoHint ariaLabel="הסבר על סימון העברת קבע להשקעה">
                        סימון שזו הוראת קבע חודשית להשקעה — למעקב אישי בלבד; האפליקציה לא מבצעת העברות אוטומטיות
                        בשמכם.
                      </InfoHint>
                    </div>
                  </div>
                  <LiquidToggle
                    isOn={standingOrderToInvestment}
                    onToggle={() => setStandingOrderToInvestment((v) => !v)}
                    testId="savings-standing-order-toggle"
                  />
                </div>

                <div className="h-px bg-black/5 dark:bg-white/10 mx-4" />

                <div className="p-4 space-y-2">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 bg-ios-blue/10 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-base leading-none" aria-hidden>
                        📝
                      </span>
                    </div>
                    <div className="min-w-0 flex-1 space-y-2">
                      <p className="text-[15px] font-semibold text-ios-text dark:text-ios-dark-text">
                        תיאור (אופציונלי)
                      </p>
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={3}
                        className="w-full resize-none bg-ios-gray-6 dark:bg-ios-dark-fill rounded-xl py-3 px-3.5 text-[15px] text-ios-text dark:text-ios-dark-text placeholder:text-ios-subtle dark:placeholder:text-ios-dark-subtle focus:outline-none focus-visible:ring-2 focus-visible:ring-ios-blue/30 border border-transparent focus-visible:border-gray-200/80 dark:focus-visible:border-white/10 leading-normal"
                        placeholder="למשל: העברה חודשית"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-ios-card dark:bg-ios-dark-card rounded-2xl shadow-card border border-gray-200/50 dark:border-white/10 mb-4 p-4">
                <p className="text-xs font-semibold text-ios-subtle dark:text-ios-dark-subtle uppercase tracking-wider mb-3">
                  יעד חיסכון
                </p>
                <div
                  className="flex gap-2 overflow-x-auto no-scrollbar pb-1"
                  style={{ WebkitOverflowScrolling: 'touch' }}
                >
                  {visibleLabels.map((l) => (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() => setLabel(l.name)}
                      className={`flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-[background-color,color,box-shadow] ${
                        label === l.name
                          ? 'bg-ios-green text-white shadow-sm'
                          : 'bg-ios-gray-6 dark:bg-ios-dark-fill text-ios-subtle dark:text-ios-dark-subtle'
                      }`}
                    >
                      <span>{l.icon}</span>
                      <span>{l.name}</span>
                    </button>
                  ))}
                </div>
                {initialData && !visibleLabels.some((l) => l.name === label) ? (
                  <p className="text-xs text-ios-subtle dark:text-ios-dark-subtle mt-2">
                    נבחר: <span className="font-semibold text-ios-text dark:text-ios-dark-text">{label}</span> (יעד
                    מוסתר בהגדרות)
                  </p>
                ) : null}
                <label className="block mt-3 text-[11px] font-medium text-ios-subtle dark:text-ios-dark-subtle mb-1">
                  או שם מותאם
                </label>
                <input
                  type="text"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  className="w-full bg-ios-gray-6 dark:bg-ios-dark-fill rounded-xl py-2.5 px-3 text-sm text-ios-text dark:text-ios-dark-text focus:outline-none focus:ring-2 focus:ring-ios-blue/30"
                  placeholder="שם היעד"
                />
              </div>

              <div className="space-y-3">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSubmitting || !amount || !accountId}
                  className="w-full bg-ios-green text-white font-bold text-base py-4 rounded-2xl shadow-lg shadow-ios-green/20 hover:bg-ios-green/90 active:scale-[0.96] transition-[background-color,transform,opacity,box-shadow] disabled:opacity-40 disabled:shadow-none disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'שומר...' : initialData ? 'עדכון' : 'הוספה'}
                </button>

                {initialData ? (
                  showDeleteConfirm ? (
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => setShowDeleteConfirm(false)}
                        className="flex-1 bg-ios-gray-6 dark:bg-ios-dark-fill text-ios-text dark:text-ios-dark-text font-bold py-3.5 rounded-2xl"
                      >
                        ביטול
                      </button>
                      <button
                        type="button"
                        onClick={handleDelete}
                        disabled={isDeleting}
                        className="flex-1 bg-ios-red text-white font-bold py-3.5 rounded-2xl"
                      >
                        {isDeleting ? 'מוחק...' : 'מחיקה'}
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(true)}
                      className="w-full text-ios-red hover:text-ios-red/80 font-medium py-3 transition-colors text-sm"
                    >
                      מחיקת הפרשה
                    </button>
                  )
                ) : null}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
