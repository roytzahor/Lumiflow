'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence, useDragControls, PanInfo } from 'framer-motion';
import { X, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import LiquidToggle from './ui/LiquidToggle';
import { addTransaction } from '@/app/actions';
import { useHaptic } from '@/hooks/useHaptic';
import { detectCategory } from '@/lib/category-dictionary';
import type { TransactionListItem, Account, Category, RecurringMonthPolicy } from '@/lib/types';

interface QuickAddSheetProps {
    isOpen: boolean;
    onClose: () => void;
    initialData?: TransactionListItem | null;
    categories?: Category[];
    accounts?: Account[];
}

function getDefaultAccountId(accounts: Account[]): string {
    const joint = accounts.find((a) => a.type === 'SHARED');
    return joint?.id ?? accounts[0]?.id ?? '';
}

function getAccountLabel(account: Account): string {
    return account.name;
}

function getAccountIcon(account: Account): string {
    if (account.type === 'SHARED') return '👥';
    return '👤';
}

export default function QuickAddSheet({ isOpen, onClose, initialData, categories = [], accounts = [] }: QuickAddSheetProps) {
    const router = useRouter();
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [accountId, setAccountId] = useState('');
    const [category, setCategory] = useState('כללי');
    const [isRecurring, setIsRecurring] = useState(false);
    const [monthPolicy, setMonthPolicy] = useState<RecurringMonthPolicy>('ROLL_TO_LAST_DAY');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [amountError, setAmountError] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const dragControls = useDragControls();
    const { trigger } = useHaptic();
    const sheetRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen) {
            const timer = setTimeout(() => {
                const focusable = sheetRef.current?.querySelector<HTMLElement>(
                    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
                );
                focusable?.focus();
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') { onClose(); return; }
            if (e.key !== 'Tab' || !sheetRef.current) return;
            const focusable = Array.from(
                sheetRef.current.querySelectorAll<HTMLElement>(
                    'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])'
                )
            ).filter((el) => el.offsetParent != null);
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (e.shiftKey) {
                if (document.activeElement === first) { e.preventDefault(); last?.focus(); }
            } else {
                if (document.activeElement === last) { e.preventDefault(); first?.focus(); }
            }
        };
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [isOpen, onClose]);

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                setAmount(initialData.amount.toString());
                setDescription(initialData.description || '');
                setDate(new Date(initialData.date).toISOString().split('T')[0]);
                setAccountId(initialData.account.id);
                setCategory(initialData.category);
                setIsRecurring(Boolean(initialData.isRecurring));
                setMonthPolicy('ROLL_TO_LAST_DAY');
            } else {
                setAmount('');
                setDescription('');
                setDate(new Date().toISOString().split('T')[0]);
                setIsRecurring(false);
                setMonthPolicy('ROLL_TO_LAST_DAY');
                setAccountId(getDefaultAccountId(accounts));
                setCategory('כללי');
            }
            setShowDeleteConfirm(false);
            setAmountError('');
        }
    }, [isOpen, initialData, accounts]);

    useEffect(() => {
        if (!initialData && description) {
            const detected = detectCategory(description);
            if (detected) setCategory(detected.name);
        }
    }, [description, initialData]);

    useEffect(() => {
        if (!initialData) setCategory('כללי');
    }, [accountId, initialData]);

    useEffect(() => {
        if (!isOpen || accounts.length === 0) return;
        const hasSelectedAccount = accounts.some((acc) => acc.id === accountId);
        if (!hasSelectedAccount) {
            setAccountId(getDefaultAccountId(accounts));
        }
    }, [isOpen, accountId, accounts]);

    const handleSubmit = async () => {
        const num = parseFloat(amount);
        if (!amount || isNaN(num)) { setAmountError('הזן סכום'); return; }
        if (num <= 0) { setAmountError('הסכום חייב להיות גדול מ-0'); return; }
        setAmountError('');
        setIsSubmitting(true);

        const formData = new FormData();
        formData.append('amount', amount);
        formData.append('description', description);
        formData.append('date', date);
        formData.append('accountId', accountId);
        formData.append('category', category);
        formData.append('isRecurring', isRecurring ? 'true' : 'false');
        formData.append('monthPolicy', monthPolicy);

        let res;
        if (initialData) {
            const { updateTransaction } = await import('@/app/actions');
            res = await updateTransaction(initialData.id, formData);
        } else {
            res = await addTransaction(formData);
        }

        setIsSubmitting(false);
        if (res.success) {
            toast.success(initialData ? 'עודכן בהצלחה' : 'נוסף בהצלחה');
            router.refresh();
            onClose();
        } else {
            toast.error('שמירה נכשלה. נסה שוב.');
        }
    };

    const handleDelete = async () => {
        if (!initialData) return;
        setIsDeleting(true);
        const { deleteTransaction } = await import('@/app/actions');
        const res = await deleteTransaction(initialData.id);
        setIsDeleting(false);
        if (res.success) {
            toast.success('נמחק בהצלחה');
            router.refresh();
            onClose();
        } else {
            toast.error('מחיקה נכשלה. נסה שוב.');
        }
    };

    const onDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        if (info.offset.y > 100) onClose();
    };

    const selectedDate = date ? new Date(`${date}T00:00:00`) : null;
    const selectedDay = selectedDate && !Number.isNaN(selectedDate.getTime()) ? selectedDate.getDate() : null;
    const shouldShowShortMonthPolicy = isRecurring && selectedDay !== null && selectedDay >= 29;

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
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
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="sheet-title"
                        initial={{ y: '100%', opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: '100%', opacity: 0 }}
                        transition={{ type: 'spring', damping: 32, stiffness: 380, mass: 0.8 }}
                        drag="y"
                        dragControls={dragControls}
                        dragConstraints={{ top: 0 }}
                        dragElastic={0.15}
                        onDragEnd={onDragEnd}
                        className="fixed bottom-0 left-0 right-0 z-[80] max-h-[92vh] bg-ios-bg shadow-sheet flex flex-col pb-safe rounded-t-[20px]"
                    >
                        {/* Drag Handle */}
                        <div className="w-full flex justify-center pt-3 pb-2" onPointerDown={(e) => dragControls.start(e)}>
                            <div className="w-9 h-[5px] bg-gray-300 rounded-full" />
                        </div>

                        <div className="flex-1 overflow-y-auto px-5 pb-8">
                            {/* Header */}
                            <div className="flex items-center justify-between mb-6">
                                <h2 id="sheet-title" className="text-xl font-bold text-gray-900">
                                    {initialData ? 'עריכת הוצאה' : 'הוצאה חדשה'}
                                </h2>
                                <button
                                    data-testid="quickadd-open-close"
                                    type="button"
                                    onClick={onClose}
                                    className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center"
                                    aria-label="סגור"
                                >
                                    <X className="w-4 h-4 text-gray-500" />
                                </button>
                            </div>

                            {/* Amount Input */}
                            <div className="bg-white rounded-2xl p-6 shadow-card mb-4 text-center">
                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">סכום</p>
                                <div className="flex items-center justify-center gap-1">
                                    <span className="text-4xl text-gray-300 font-light">₪</span>
                                    <input
                                        data-testid="quickadd-amount"
                                        type="number"
                                        inputMode="decimal"
                                        value={amount}
                                        onChange={(e) => {
                                            setAmount(e.target.value);
                                            if (amountError) setAmountError('');
                                            trigger(5);
                                        }}
                                        placeholder="0"
                                        className="bg-transparent text-center text-5xl font-bold text-gray-900 placeholder-gray-200 focus:outline-none w-48"
                                        autoFocus={!initialData}
                                        aria-invalid={!!amountError}
                                        aria-describedby={amountError ? 'amount-error' : undefined}
                                    />
                                </div>
                                {amountError && (
                                    <p id="amount-error" className="text-sm text-ios-red text-center mt-2" role="alert">
                                        {amountError}
                                    </p>
                                )}
                            </div>

                            {/* Account Selector */}
                            <div className="bg-white rounded-2xl shadow-card mb-4 overflow-hidden">
                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 pt-4 pb-2">חשבון</p>
                                <div className="flex p-1.5 mx-3 mb-3 bg-ios-gray-6 rounded-xl">
                                    {accounts.map((acc) => (
                                        <button
                                            key={acc.id}
                                            type="button"
                                            onClick={() => {
                                                setAccountId(acc.id);
                                                trigger(10);
                                            }}
                                            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                                                accountId === acc.id
                                                    ? 'bg-white shadow-card text-gray-900'
                                                    : 'text-gray-400'
                                            }`}
                                            aria-pressed={accountId === acc.id}
                                        >
                                            <span className="text-sm">{getAccountIcon(acc)}</span>
                                            {getAccountLabel(acc)}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Form Fields Group */}
                            <div className="bg-white rounded-2xl shadow-card mb-4 overflow-hidden divide-y divide-gray-100">
                                {/* Date */}
                                <div className="flex items-center justify-between p-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-ios-red/10 rounded-lg flex items-center justify-center">
                                            <Calendar className="w-4 h-4 text-ios-red" />
                                        </div>
                                        <span className="text-[15px] font-medium text-gray-900">תאריך</span>
                                    </div>
                                    <input
                                        data-testid="quickadd-date"
                                        type="date"
                                        value={date}
                                        onChange={(e) => setDate(e.target.value)}
                                        className="bg-ios-gray-6 border border-gray-200 rounded-xl px-3 py-2 text-[15px] text-gray-700 focus:outline-none focus:ring-2 focus:ring-ios-blue/30 text-left"
                                    />
                                </div>
                                <div className="px-4 pb-4 -mt-2">
                                    <p className="text-xs text-gray-400">
                                        {date ? format(new Date(date), 'EEEE, d MMMM yyyy', { locale: he }) : ''}
                                    </p>
                                </div>

                                {/* Description */}
                                <div className="p-4">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="w-8 h-8 bg-ios-blue/10 rounded-lg flex items-center justify-center">
                                            <span className="text-sm">📝</span>
                                        </div>
                                        <span className="text-[15px] font-medium text-gray-900">תיאור</span>
                                    </div>
                                    <input
                                        type="text"
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        className="w-full bg-ios-gray-6 rounded-xl py-3 px-4 text-[15px] text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-ios-blue/30 transition"
                                        placeholder="על מה יצא הכסף?"
                                    />
                                </div>
                            </div>

                            {/* Category */}
                            <div className="bg-white rounded-2xl shadow-card mb-4 p-4">
                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">קטגוריה</p>
                                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1" style={{ WebkitOverflowScrolling: 'touch' }}>
                                    {categories.map((cat) => (
                                        <button
                                            key={cat.id}
                                            type="button"
                                            onClick={() => {
                                                setCategory(cat.name);
                                                trigger(10);
                                            }}
                                            className={`flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                                                category === cat.name
                                                    ? 'bg-ios-blue text-white shadow-sm'
                                                    : 'bg-ios-gray-6 text-gray-600'
                                            }`}
                                        >
                                            <span>{cat.icon}</span>
                                            <span>{cat.name}</span>
                                        </button>
                                    ))}
                                    {!categories.some((c) => c.name === 'כללי') && (
                                        <button
                                            type="button"
                                            onClick={() => setCategory('כללי')}
                                            className={`flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                                                category === 'כללי'
                                                    ? 'bg-ios-blue text-white shadow-sm'
                                                    : 'bg-ios-gray-6 text-gray-600'
                                            }`}
                                        >
                                            <span>✨</span>
                                            <span>כללי</span>
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Recurring Toggle */}
                            <div className="bg-white rounded-2xl shadow-card mb-6 p-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-ios-orange/10 rounded-lg flex items-center justify-center">
                                        <span className="text-sm">🔄</span>
                                    </div>
                                    <div>
                                        <p className="text-[15px] font-medium text-gray-900">הוצאה קבועה</p>
                                        <p className="text-xs text-gray-400">
                                            {initialData ? 'עדכון ייצור/יבטל הוראת קבע' : 'יחזור כל חודש'}
                                        </p>
                                    </div>
                                </div>
                                <LiquidToggle testId="quickadd-recurring-toggle" isOn={isRecurring} onToggle={() => setIsRecurring(!isRecurring)} />
                            </div>

                            {shouldShowShortMonthPolicy && (
                                <div className="bg-white rounded-2xl shadow-card mb-6 p-4">
                                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">חודש קצר</p>
                                    <select
                                        data-testid="quickadd-short-month-policy"
                                        value={monthPolicy}
                                        onChange={(e) => setMonthPolicy(e.target.value as RecurringMonthPolicy)}
                                        className="w-full bg-ios-gray-6 border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-ios-blue/30"
                                    >
                                        <option value="ROLL_TO_LAST_DAY">גלישה ליום האחרון בחודש</option>
                                        <option value="SKIP_MONTH">דילוג על חודש חסר</option>
                                    </select>
                                </div>
                            )}

                            {/* Actions */}
                            <div className="space-y-3">
                                <button
                                    data-testid="quickadd-submit"
                                    onClick={() => {
                                        trigger(15);
                                        handleSubmit();
                                    }}
                                    disabled={isSubmitting || !amount}
                                    className="w-full bg-ios-blue text-white font-bold text-base py-4 rounded-2xl shadow-lg shadow-ios-blue/20 hover:bg-ios-blue/90 active:scale-[0.98] transition-all disabled:opacity-40 disabled:shadow-none disabled:cursor-not-allowed"
                                >
                                    {isSubmitting ? 'שומר...' : initialData ? 'עדכון' : 'הוסף הוצאה'}
                                </button>

                                {initialData && (
                                    showDeleteConfirm ? (
                                        <div className="flex gap-3">
                                            <button
                                                onClick={() => setShowDeleteConfirm(false)}
                                                className="flex-1 bg-gray-100 text-gray-700 font-bold py-3.5 rounded-2xl"
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
                                    )
                                )}
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
