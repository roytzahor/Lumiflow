'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion, PanInfo, useDragControls } from 'framer-motion';
import { Calendar, X } from 'lucide-react';
import { toast } from 'sonner';
import { formatDateInputForDisplay, toDateInputValueFromUtc } from '@/lib/date-only';
import type { AccountSummary, Category, RecurringMonthPolicy, RecurringWithAccount } from '@/lib/types';
import { updateRecurringTransaction } from '@/app/actions';

interface RecurringEditSheetProps {
  isOpen: boolean;
  recurring: RecurringWithAccount | null;
  onClose: () => void;
  accounts: AccountSummary[];
  categories: Category[];
}

function getAccountIcon(account: AccountSummary): string {
  if (account.type === 'SHARED') return '👥';
  return '👤';
}

export default function RecurringEditSheet({
  isOpen,
  recurring,
  onClose,
  accounts,
  categories,
}: RecurringEditSheetProps) {
  const router = useRouter();
  const dragControls = useDragControls();
  const sheetRef = useRef<HTMLDivElement>(null);

  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('כללי');
  const [date, setDate] = useState('');
  const [accountId, setAccountId] = useState('');
  const [monthPolicy, setMonthPolicy] = useState<RecurringMonthPolicy>('ROLL_TO_LAST_DAY');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (!isOpen || !recurring) return;
    setAmount(recurring.amount.toString());
    setDescription(recurring.description || '');
    setCategory(recurring.category || 'כללי');
    setDate(toDateInputValueFromUtc(new Date(recurring.startDate)));
    setAccountId(recurring.accountId);
    setMonthPolicy(recurring.monthPolicy);
    setShowDeleteConfirm(false);
  }, [isOpen, recurring]);

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

  const selectedDay = useMemo(() => {
    if (!date) return null;
    const selectedDate = new Date(`${date}T00:00:00`);
    if (Number.isNaN(selectedDate.getTime())) return null;
    return selectedDate.getDate();
  }, [date]);

  const shouldShowShortMonthPolicy = selectedDay !== null && selectedDay >= 29;

  const handleSave = async () => {
    if (!recurring) return;
    const parsedAmount = parseFloat(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      toast.error('הסכום חייב להיות גדול מ-0');
      return;
    }
    if (!date || !accountId || !category.trim()) {
      toast.error('יש למלא את כל השדות הנדרשים');
      return;
    }

    setIsSubmitting(true);
    const formData = new FormData();
    formData.append('amount', amount);
    formData.append('description', description);
    formData.append('date', date);
    formData.append('accountId', accountId);
    formData.append('category', category);
    formData.append('monthPolicy', monthPolicy);

    const res = await updateRecurringTransaction(recurring.id, formData);
    setIsSubmitting(false);
    if (!res.success) {
      toast.error('שמירה נכשלה. נסה שוב.');
      return;
    }

    toast.success('עודכן בהצלחה');
    router.refresh();
    onClose();
  };

  const handleDelete = async () => {
    if (!recurring) return;
    setIsDeleting(true);
    const { deleteRecurringTransaction } = await import('@/app/actions');
    const res = await deleteRecurringTransaction(recurring.id);
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
      {isOpen && recurring && (
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
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-ios-text dark:text-ios-dark-text">עריכת הוצאה קבועה</h2>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-8 h-8 bg-ios-gray-5 dark:bg-ios-dark-fill rounded-full flex items-center justify-center"
                  aria-label="סגור"
                >
                  <X className="w-4 h-4 text-ios-subtle dark:text-ios-dark-subtle" />
                </button>
              </div>

              <div className="bg-ios-card dark:bg-ios-dark-card rounded-2xl p-5 sm:p-6 shadow-card mb-4 text-center">
                <p className="text-xs font-semibold text-ios-subtle dark:text-ios-dark-subtle uppercase tracking-wider mb-3">סכום</p>
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

              <div className="bg-ios-card dark:bg-ios-dark-card rounded-2xl shadow-card mb-4 overflow-hidden">
                <p className="text-xs font-semibold text-ios-subtle dark:text-ios-dark-subtle uppercase tracking-wider px-4 pt-4 pb-2">חשבון</p>
                <div className="flex p-1.5 mx-3 mb-3 bg-ios-gray-6 dark:bg-ios-dark-fill rounded-xl">
                  {accounts.map((acc) => (
                    <button
                      key={acc.id}
                      type="button"
                      onClick={() => setAccountId(acc.id)}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-semibold transition-[background-color,color,box-shadow] ${
                        accountId === acc.id
                          ? 'bg-ios-card dark:bg-ios-dark-card shadow-card text-ios-text dark:text-ios-dark-text'
                          : 'text-ios-subtle dark:text-ios-dark-subtle'
                      }`}
                    >
                      <span className="text-sm">{getAccountIcon(acc)}</span>
                      {acc.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-ios-card dark:bg-ios-dark-card rounded-2xl shadow-card mb-4 overflow-hidden divide-y divide-black/5 dark:divide-white/10">
                <div className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-ios-red/10 rounded-lg flex items-center justify-center">
                      <Calendar className="w-4 h-4 text-ios-red" aria-hidden="true" />
                    </div>
                    <span className="text-[15px] font-medium text-ios-text dark:text-ios-dark-text">תאריך התחלה</span>
                  </div>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="bg-ios-gray-6 dark:bg-ios-dark-fill border border-gray-200/50 dark:border-white/10 rounded-xl px-3 py-2 text-[15px] text-ios-text dark:text-ios-dark-text focus:outline-none focus:ring-2 focus:ring-ios-blue/30 text-start"
                  />
                </div>
                <div className="px-4 pb-4 -mt-2">
                  <p className="text-xs text-ios-subtle dark:text-ios-dark-subtle">
                    {date ? formatDateInputForDisplay(date, 'he-IL') : ''}
                  </p>
                </div>

                <div className="p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 bg-ios-blue/10 rounded-lg flex items-center justify-center">
                      <span className="text-sm" aria-hidden="true">📝</span>
                    </div>
                    <span className="text-[15px] font-medium text-ios-text dark:text-ios-dark-text">תיאור</span>
                  </div>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-ios-gray-6 dark:bg-ios-dark-fill rounded-xl py-3 px-4 text-[15px] text-ios-text dark:text-ios-dark-text placeholder:text-ios-subtle dark:placeholder:text-ios-dark-subtle focus:outline-none focus:ring-2 focus:ring-ios-blue/30 transition"
                    placeholder="על מה יצא הכסף?"
                  />
                </div>
              </div>

              <div className="bg-ios-card dark:bg-ios-dark-card rounded-2xl shadow-card mb-4 p-4">
                <p className="text-xs font-semibold text-ios-subtle dark:text-ios-dark-subtle uppercase tracking-wider mb-3">קטגוריה</p>
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1" style={{ WebkitOverflowScrolling: 'touch' }}>
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategory(cat.name)}
                      className={`flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-[background-color,color,box-shadow] ${
                        category === cat.name
                          ? 'bg-ios-blue text-white shadow-sm'
                          : 'bg-ios-gray-6 dark:bg-ios-dark-fill text-ios-subtle dark:text-ios-dark-subtle'
                      }`}
                    >
                      <span>{cat.icon}</span>
                      <span>{cat.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {shouldShowShortMonthPolicy && (
                <div className="bg-ios-card dark:bg-ios-dark-card rounded-2xl shadow-card mb-6 p-4">
                  <p className="text-xs font-semibold text-ios-subtle dark:text-ios-dark-subtle uppercase tracking-wider mb-2">חודש קצר</p>
                  <select
                    value={monthPolicy}
                    onChange={(e) => setMonthPolicy(e.target.value as RecurringMonthPolicy)}
                    className="w-full bg-ios-gray-6 dark:bg-ios-dark-fill border border-gray-200/50 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm text-ios-text dark:text-ios-dark-text focus:outline-none focus:ring-2 focus:ring-ios-blue/30"
                  >
                    <option value="ROLL_TO_LAST_DAY">גלישה ליום האחרון בחודש</option>
                    <option value="SKIP_MONTH">דילוג על חודש חסר</option>
                  </select>
                </div>
              )}

              <div className="space-y-3">
                <button
                  onClick={handleSave}
                  disabled={isSubmitting || !amount || !accountId}
                  className="w-full bg-ios-blue text-white font-bold text-base py-4 rounded-2xl shadow-lg shadow-ios-blue/20 hover:bg-ios-blue/90 active:scale-[0.96] transition-[background-color,transform,opacity,box-shadow] disabled:opacity-40 disabled:shadow-none disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'שומר...' : 'עדכון'}
                </button>

                {showDeleteConfirm ? (
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      className="flex-1 bg-ios-gray-6 dark:bg-ios-dark-fill text-ios-text dark:text-ios-dark-text font-bold py-3.5 rounded-2xl"
                    >
                      ביטול
                    </button>
                    <button
                      onClick={handleDelete}
                      disabled={isDeleting}
                      className="flex-1 bg-ios-red text-white font-bold py-3.5 rounded-2xl"
                    >
                      {isDeleting ? 'מוחק...' : 'מחיקה'}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="w-full text-ios-red hover:text-ios-red/80 font-medium py-3 transition-colors text-sm"
                  >
                    מחיקת הוצאה
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
