'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import { X, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { addIncomeEntry } from '@/app/actions/income';
import { formatDateInputForDisplay, getTodayDateInputValue } from '@/lib/date-only';
import { normalizeAmountInput } from '@/lib/amount-input';
import { useIsDesktop } from '@/hooks/useIsDesktop';
import type { AccountSummary } from '@/lib/types';

interface IncomeEntrySheetProps {
    isOpen: boolean;
    onClose: () => void;
    accounts: AccountSummary[];
}

export default function IncomeEntrySheet({ isOpen, onClose, accounts }: IncomeEntrySheetProps) {
    const router = useRouter();
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [date, setDate] = useState(getTodayDateInputValue());
    const [accountId, setAccountId] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [amountError, setAmountError] = useState('');

    const dragControls = useDragControls();
    const isDesktop = useIsDesktop();
    const sheetRef = useRef<HTMLDivElement>(null);
    const amountInputRef = useRef<HTMLInputElement>(null);
    const prevIsOpenRef = useRef(false);

    useEffect(() => {
        const wasOpen = prevIsOpenRef.current;
        prevIsOpenRef.current = isOpen;
        if (!isOpen || wasOpen) return;
        setAmount('');
        setDescription('');
        setDate(getTodayDateInputValue());
        setAccountId(accounts[0]?.id ?? '');
        setAmountError('');
    }, [isOpen, accounts]);

    useEffect(() => {
        if (!isOpen) return;
        const timer = setTimeout(() => amountInputRef.current?.focus(), 100);
        return () => clearTimeout(timer);
    }, [isOpen]);

    const handleSubmit = async () => {
        const normalizedAmount = normalizeAmountInput(amount);
        const num = parseFloat(normalizedAmount);
        if (!normalizedAmount || isNaN(num) || num <= 0) {
            setAmountError('הזן סכום תקין');
            return;
        }
        if (!accountId) {
            toast.error('יש לבחור חשבון');
            return;
        }
        setAmountError('');
        setIsSubmitting(true);
        try {
            const formData = new FormData();
            formData.append('amount', normalizedAmount);
            formData.append('description', description);
            formData.append('date', date);
            formData.append('accountId', accountId);
            const res = await addIncomeEntry(formData);
            if (res.success) {
                toast.success('הכנסה נרשמה בהצלחה');
                router.refresh();
                onClose();
            } else {
                toast.error(res.error || 'שמירה נכשלה');
            }
        } catch {
            toast.error('אירעה תקלה בחיבור. בדקו את הרשת ונסו שוב.');
        } finally {
            setIsSubmitting(false);
        }
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
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="income-sheet-title"
                        initial={isDesktop ? { opacity: 0, scale: 0.96 } : { y: '100%', opacity: 0 }}
                        animate={isDesktop ? { opacity: 1, scale: 1 } : { y: 0, opacity: 1 }}
                        exit={isDesktop ? { opacity: 0, scale: 0.96 } : { y: '100%', opacity: 0 }}
                        transition={{ type: 'spring', damping: 32, stiffness: 380, mass: 0.8 }}
                        drag={isDesktop ? false : 'y'}
                        dragControls={dragControls}
                        dragConstraints={{ top: 0 }}
                        dragElastic={0.15}
                        onDragEnd={(_e, info) => { if (info.offset.y > 100) onClose(); }}
                        className="fixed bottom-0 left-0 right-0 z-[80] max-h-[80vh] bg-ios-bg dark:bg-ios-dark-bg shadow-sheet flex flex-col pb-safe rounded-t-[20px] max-w-md mx-auto lg:inset-0 lg:m-auto lg:h-fit lg:rounded-3xl"
                    >
                        <div className="w-full flex justify-center pt-3 pb-2 lg:hidden" onPointerDown={(e) => dragControls.start(e)}>
                            <div className="w-9 h-[5px] bg-ios-gray-4 dark:bg-ios-dark-subtle/60 rounded-full" />
                        </div>

                        <div className="flex-1 overflow-y-auto px-5 pb-8 lg:pt-6">
                            <div className="flex items-center justify-between mb-6">
                                <h2 id="income-sheet-title" className="text-xl font-bold text-ios-text dark:text-ios-dark-text">הוספת הכנסה</h2>
                                <button type="button" onClick={onClose} className="w-8 h-8 bg-ios-gray-5 dark:bg-ios-dark-fill rounded-full flex items-center justify-center" aria-label="סגור">
                                    <X className="w-4 h-4 text-ios-subtle dark:text-ios-dark-subtle" />
                                </button>
                            </div>

                            {/* Amount */}
                            <div className="bg-ios-card dark:bg-ios-dark-card rounded-2xl p-5 shadow-card mb-4 text-center">
                                <p className="text-xs font-semibold text-ios-subtle dark:text-ios-dark-subtle uppercase tracking-wider mb-3">סכום</p>
                                <div className="flex items-center justify-center gap-1">
                                    <span aria-hidden className="text-3xl text-ios-gray-4 dark:text-ios-dark-subtle/60 font-light">₪</span>
                                    <input
                                        ref={amountInputRef}
                                        type="text"
                                        inputMode="decimal"
                                        value={amount}
                                        onChange={(e) => { setAmount(normalizeAmountInput(e.target.value)); if (amountError) setAmountError(''); }}
                                        placeholder="0"
                                        className="bg-transparent text-center text-4xl font-bold text-ios-text dark:text-ios-dark-text placeholder:text-ios-gray-4/70 dark:placeholder:text-ios-dark-subtle/50 focus:outline-none w-40"
                                        aria-invalid={!!amountError}
                                    />
                                </div>
                                {amountError && <p className="text-sm text-ios-red text-center mt-2" role="alert">{amountError}</p>}
                            </div>

                            {/* Account */}
                            {accounts.length > 1 && (
                                <div className="bg-ios-card dark:bg-ios-dark-card rounded-2xl shadow-card mb-4 overflow-hidden">
                                    <p className="text-xs font-semibold text-ios-subtle dark:text-ios-dark-subtle uppercase tracking-wider px-4 pt-4 pb-2">חשבון</p>
                                    <div className="px-3 pb-3 flex flex-col gap-1">
                                        {accounts.map((acc) => (
                                            <button
                                                key={acc.id}
                                                type="button"
                                                onClick={() => setAccountId(acc.id)}
                                                className={`flex items-center gap-2.5 px-3.5 py-3 rounded-xl text-sm font-semibold text-start transition-colors ${accountId === acc.id ? 'bg-ios-blue/12 dark:bg-ios-blue/25 text-ios-blue' : 'bg-ios-gray-6 dark:bg-ios-dark-fill text-ios-subtle dark:text-ios-dark-subtle'}`}
                                                aria-pressed={accountId === acc.id}
                                            >
                                                <span>{acc.type === 'SHARED' ? '👥' : '👤'}</span>
                                                <span>{acc.name}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Date */}
                            <div className="bg-ios-card dark:bg-ios-dark-card rounded-2xl shadow-card mb-4 overflow-hidden">
                                <div className="flex items-center justify-between p-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-ios-green/10 rounded-lg flex items-center justify-center">
                                            <Calendar className="w-4 h-4 text-ios-green" aria-hidden />
                                        </div>
                                        <span className="text-[15px] font-medium text-ios-text dark:text-ios-dark-text">תאריך</span>
                                    </div>
                                    <input
                                        type="date"
                                        value={date}
                                        onChange={(e) => setDate(e.target.value)}
                                        className="bg-ios-gray-6 dark:bg-ios-dark-fill border border-gray-200/50 dark:border-white/10 rounded-xl px-3 py-2 text-[15px] text-ios-text dark:text-ios-dark-text focus:outline-none focus:ring-2 focus:ring-ios-green/30 text-start"
                                    />
                                </div>
                                <p className="text-xs text-ios-subtle dark:text-ios-dark-subtle px-4 pb-4 -mt-2">
                                    {date ? formatDateInputForDisplay(date, 'he-IL') : ''}
                                </p>
                            </div>

                            {/* Description */}
                            <div className="bg-ios-card dark:bg-ios-dark-card rounded-2xl shadow-card mb-6 p-4">
                                <p className="text-xs font-semibold text-ios-subtle dark:text-ios-dark-subtle uppercase tracking-wider mb-2">תיאור (אופציונלי)</p>
                                <input
                                    type="text"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="w-full bg-ios-gray-6 dark:bg-ios-dark-fill rounded-xl py-3 px-4 text-[15px] text-ios-text dark:text-ios-dark-text placeholder:text-ios-subtle dark:placeholder:text-ios-dark-subtle focus:outline-none focus:ring-2 focus:ring-ios-green/30"
                                    placeholder="משכורת, עצמאי, בונוס..."
                                />
                            </div>

                            <button
                                type="button"
                                onClick={() => void handleSubmit()}
                                disabled={isSubmitting || !amount}
                                className="w-full bg-ios-green text-white font-bold text-base py-4 rounded-2xl shadow-lg shadow-ios-green/20 hover:bg-ios-green/90 active:scale-[0.96] transition-[background-color,transform,opacity] disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                {isSubmitting ? 'שומר...' : 'שמור הכנסה'}
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
