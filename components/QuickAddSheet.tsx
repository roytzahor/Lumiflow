'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence, useDragControls, PanInfo } from 'framer-motion';
import { X, Calendar, Plus, Search, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import LiquidToggle from './ui/LiquidToggle';
import { addCategory, addTransaction } from '@/app/actions';
import { useHaptic } from '@/hooks/useHaptic';
import { detectAllCategoryMatches } from '@/lib/category-dictionary';
import { formatDateInputForDisplay, getTodayDateInputValue, toDateInputValueFromUtc } from '@/lib/date-only';
import { formatIlsAmount } from '@/lib/formatters';
import type { TransactionListItem, AccountSummary, Category, RecurringMonthPolicy } from '@/lib/types';
import { CATEGORY_EMOJIS } from '@/lib/category-emojis';
import { splitInstallmentAmounts } from '@/lib/installment-utils';

interface QuickAddSheetProps {
    isOpen: boolean;
    onClose: () => void;
    initialData?: TransactionListItem | null;
    categories?: Category[];
    accounts?: AccountSummary[];
    /** When opening a new transaction (no initialData), start in recurring mode */
    openWithRecurring?: boolean;
}

function getDefaultAccountId(accounts: AccountSummary[]): string {
    const joint = accounts.find((a) => a.type === 'SHARED');
    return joint?.id ?? accounts[0]?.id ?? '';
}

function getAccountLabel(account: AccountSummary): string {
    return account.name;
}

function getAccountIcon(account: AccountSummary): string {
    if (account.type === 'SHARED') return '👥';
    return '👤';
}

export default function QuickAddSheet({ isOpen, onClose, initialData, categories = [], accounts = [], openWithRecurring = false }: QuickAddSheetProps) {
    const router = useRouter();
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [date, setDate] = useState(getTodayDateInputValue());
    const [accountId, setAccountId] = useState('');
    const [category, setCategory] = useState('כללי');
    const [isRecurring, setIsRecurring] = useState(false);
    const [installmentCount, setInstallmentCount] = useState(1);
    const [monthPolicy, setMonthPolicy] = useState<RecurringMonthPolicy>('ROLL_TO_LAST_DAY');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [amountError, setAmountError] = useState('');
    const [accountError, setAccountError] = useState('');
    const [dateError, setDateError] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [availableCategories, setAvailableCategories] = useState<Category[]>(categories);
    const [categorySearch, setCategorySearch] = useState('');
    const [newCategoryName, setNewCategoryName] = useState('');
    const [newCategoryEmojiInput, setNewCategoryEmojiInput] = useState('');
    const [isAddingCategory, setIsAddingCategory] = useState(false);
    const [isCategoryTouched, setIsCategoryTouched] = useState(false);
    const [isAccountListExpanded, setIsAccountListExpanded] = useState(false);
    const [hasUserPickedAccount, setHasUserPickedAccount] = useState(false);

    const dragControls = useDragControls();
    const { trigger } = useHaptic();
    const sheetRef = useRef<HTMLDivElement>(null);
    const amountInputRef = useRef<HTMLInputElement>(null);
    const prevIsOpenRef = useRef(false);

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
        setAvailableCategories(categories);
    }, [categories]);

    useEffect(() => {
        const wasOpen = prevIsOpenRef.current;
        const justOpened = isOpen && !wasOpen;
        prevIsOpenRef.current = isOpen;

        if (!justOpened) return;

        if (initialData) {
            setAmount(initialData.amount.toString());
            setDescription(initialData.description || '');
            setDate(toDateInputValueFromUtc(new Date(initialData.date)));
            setAccountId(initialData.account.id);
            setHasUserPickedAccount(true);
            setCategory(initialData.category);
            setIsRecurring(Boolean(initialData.isRecurring));
            setInstallmentCount(
                initialData.installmentTotal != null && initialData.installmentTotal > 0
                    ? initialData.installmentTotal
                    : 1
            );
            setMonthPolicy('ROLL_TO_LAST_DAY');
        } else {
            setAmount('');
            setDescription('');
            setDate(getTodayDateInputValue());
            setIsRecurring(openWithRecurring);
            setInstallmentCount(1);
            setMonthPolicy('ROLL_TO_LAST_DAY');
            setAccountId(accounts.length > 1 ? '' : getDefaultAccountId(accounts));
            setHasUserPickedAccount(accounts.length <= 1);
            setCategory('כללי');
            setIsCategoryTouched(false);
        }
        setShowDeleteConfirm(false);
        setAmountError('');
        setAccountError('');
        setDateError('');
        setCategorySearch('');
        setNewCategoryName('');
        setNewCategoryEmojiInput('');
        setIsAccountListExpanded(false);
    }, [isOpen, initialData, accounts, openWithRecurring]);

    useEffect(() => {
        if (initialData || isCategoryTouched || !description.trim()) return;
        const all = detectAllCategoryMatches(description);
        if (all.length === 1) setCategory(all[0].name);
    }, [description, initialData, isCategoryTouched]);

    const ambiguousCategoryMatches = useMemo(() => {
        if (initialData || isCategoryTouched || !description.trim()) return [];
        const all = detectAllCategoryMatches(description);
        return all.length > 1 ? all : [];
    }, [description, initialData, isCategoryTouched]);

    useEffect(() => {
        if (!isOpen || accounts.length === 0) return;
        const hasSelectedAccount = accounts.some((acc) => acc.id === accountId);
        if (!hasSelectedAccount && (accounts.length === 1 || initialData)) {
            setAccountId(getDefaultAccountId(accounts));
            setHasUserPickedAccount(true);
        }
    }, [isOpen, accountId, accounts, initialData]);

    useEffect(() => {
        if (isRecurring) setInstallmentCount(1);
    }, [isRecurring]);

    useEffect(() => {
        if (installmentCount >= 2) setIsRecurring(false);
    }, [installmentCount]);

    const installmentPreviewParts = useMemo(() => {
        const num = parseFloat(amount);
        if (!amount || Number.isNaN(num) || num <= 0 || installmentCount < 2) return null;
        return splitInstallmentAmounts(num, installmentCount);
    }, [amount, installmentCount]);

    const handleSubmit = async () => {
        const num = parseFloat(amount);
        if (!amount || isNaN(num)) { setAmountError('הזן סכום'); return; }
        if (num <= 0) { setAmountError('הסכום חייב להיות גדול מ-0'); return; }
        if (!date) { setDateError('יש לבחור תאריך'); return; }
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) { setDateError('פורמט תאריך לא תקין'); return; }
        if (!accountId) { setAccountError('יש לבחור חשבון'); return; }
        setAccountError('');
        setDateError('');
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
        formData.append('installmentCount', String(installmentCount));

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
            if (initialData) {
                onClose();
            } else {
                setAmount('');
                setDescription('');
                setDate(getTodayDateInputValue());
                setIsRecurring(false);
                setInstallmentCount(1);
                setMonthPolicy('ROLL_TO_LAST_DAY');
                setAccountId(accounts.length > 1 ? '' : getDefaultAccountId(accounts));
                setHasUserPickedAccount(accounts.length <= 1);
                setCategory('כללי');
                setIsCategoryTouched(false);
                setCategorySearch('');
                setAmountError('');
                setAccountError('');
                setDateError('');
                requestAnimationFrame(() => amountInputRef.current?.focus());
            }
        } else {
            toast.error('שמירה נכשלה. נסה שוב.');
        }
    };

    const handleDelete = async (scope: 'single' | 'installment_group' = 'single') => {
        if (!initialData) return;
        setIsDeleting(true);
        const { deleteTransaction } = await import('@/app/actions');
        const res = await deleteTransaction(initialData.id, scope);
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
    const normalizedSearch = categorySearch.trim().toLocaleLowerCase('he');
    const filteredCategories = useMemo(() => {
        if (!normalizedSearch) return availableCategories;
        return availableCategories.filter((cat) =>
            cat.name.toLocaleLowerCase('he').includes(normalizedSearch) ||
            cat.icon.toLocaleLowerCase('he').includes(normalizedSearch)
        );
    }, [availableCategories, normalizedSearch]);
    const selectedAccount = useMemo(
        () => accounts.find((acc) => acc.id === accountId) ?? accounts[0] ?? null,
        [accountId, accounts]
    );
    const shouldPromptAccountChoice = accounts.length > 1 && !hasUserPickedAccount;

    const isEditingInstallment =
        Boolean(initialData?.installmentGroupId) &&
        initialData?.installmentNumber != null &&
        initialData?.installmentTotal != null;

    const handleCreateCategory = async () => {
        const candidate = newCategoryName.trim();
        if (!candidate) {
            toast.error('יש להזין שם קטגוריה');
            return;
        }

        const existing = availableCategories.find(
            (cat) => cat.name.trim().toLocaleLowerCase('he') === candidate.toLocaleLowerCase('he')
        );
        if (existing) {
            setCategory(existing.name);
            setIsCategoryTouched(true);
            toast.success('הקטגוריה כבר קיימת, נבחרה עבורך');
            return;
        }

        setIsAddingCategory(true);
        const resolvedIcon = newCategoryEmojiInput.trim() || '✨';
        const res = await addCategory(candidate, resolvedIcon, 'expense');
        setIsAddingCategory(false);
        if (!res.success) {
            toast.error(res.error ?? 'הוספת קטגוריה נכשלה');
            return;
        }

        const createdCategory = {
            id: `local-${Date.now()}`,
            name: candidate,
            icon: resolvedIcon,
            type: 'expense',
            isCustom: true,
            userId: (availableCategories[0] as { userId?: string } | undefined)?.userId ?? '',
        } as Category;
        setAvailableCategories((prev) =>
            [...prev, createdCategory].sort((a, b) => a.name.localeCompare(b.name, 'he'))
        );
        setCategory(createdCategory.name);
        setIsCategoryTouched(true);
        setCategorySearch('');
        setNewCategoryName('');
        setNewCategoryEmojiInput('');
        toast.success('קטגוריה נוספה');
    };

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
                        className="fixed bottom-0 left-0 right-0 z-[80] max-h-[92vh] bg-ios-bg dark:bg-ios-dark-bg shadow-sheet flex flex-col pb-safe rounded-t-[20px] max-w-md mx-auto"
                    >
                        {/* Drag Handle */}
                        <div className="w-full flex justify-center pt-3 pb-2" onPointerDown={(e) => dragControls.start(e)}>
                            <div className="w-9 h-[5px] bg-gray-300 dark:bg-ios-dark-subtle/60 rounded-full" />
                        </div>

                        <div className="flex-1 overflow-y-auto px-5 pb-8">
                            {/* Header */}
                            <div className="flex items-center justify-between mb-6">
                                <h2 id="sheet-title" className="text-xl font-bold text-ios-text dark:text-ios-dark-text">
                                    {initialData ? 'עריכת הוצאה' : 'הוצאה חדשה'}
                                </h2>
                                <button
                                    data-testid="quickadd-open-close"
                                    type="button"
                                    onClick={onClose}
                                    className="w-8 h-8 bg-gray-200 dark:bg-ios-dark-fill rounded-full flex items-center justify-center"
                                    aria-label="סגור"
                                >
                                    <X className="w-4 h-4 text-gray-500 dark:text-ios-dark-subtle" />
                                </button>
                            </div>

                            {/* Amount Input */}
                            <div className="bg-white dark:bg-ios-dark-card rounded-2xl p-5 sm:p-6 shadow-card mb-4 text-center">
                                <p className="text-xs font-semibold text-ios-subtle dark:text-ios-dark-subtle uppercase tracking-wider mb-3">סכום</p>
                                <div className="flex items-center justify-center gap-1">
                                    <span className="text-3xl sm:text-4xl text-gray-300 dark:text-ios-dark-subtle/60 font-light">₪</span>
                                    <input
                                        ref={amountInputRef}
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
                                        className="bg-transparent text-center text-4xl sm:text-5xl font-bold text-ios-text dark:text-ios-dark-text placeholder-gray-200 dark:placeholder-ios-dark-subtle/50 focus:outline-none w-40 sm:w-48"
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
                            <div className="bg-white dark:bg-ios-dark-card rounded-2xl shadow-card mb-4 overflow-hidden">
                                <p className="text-xs font-semibold text-ios-subtle dark:text-ios-dark-subtle uppercase tracking-wider px-4 pt-4 pb-2">חשבון</p>
                                <div className="px-3 pb-3">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (accounts.length > 1) setIsAccountListExpanded((prev) => !prev);
                                        }}
                                        className={`w-full flex items-center justify-between gap-3 px-3.5 py-3 bg-ios-gray-6 dark:bg-ios-dark-fill text-ios-text dark:text-ios-dark-text transition-[border-radius] focus:outline-none focus-visible:ring-2 focus-visible:ring-ios-blue/35 ${
                                            isAccountListExpanded && accounts.length > 1 ? 'rounded-t-xl rounded-b-md' : 'rounded-xl'
                                        }`}
                                        aria-expanded={isAccountListExpanded}
                                        disabled={accounts.length <= 1}
                                    >
                                        {accounts.length <= 1 ? (
                                            <span className="flex items-center gap-2 text-sm font-semibold min-w-0">
                                                <span className="text-sm">{selectedAccount ? getAccountIcon(selectedAccount) : '👤'}</span>
                                                <span className="truncate">{selectedAccount ? getAccountLabel(selectedAccount) : 'חשבון'}</span>
                                            </span>
                                        ) : shouldPromptAccountChoice ? (
                                            <span className="text-sm text-ios-subtle dark:text-ios-dark-subtle">בחר חשבון...</span>
                                        ) : (
                                            <span className="flex items-center gap-2 text-sm font-semibold min-w-0">
                                                <span className="text-sm">{selectedAccount ? getAccountIcon(selectedAccount) : '👤'}</span>
                                                <span className="truncate">{selectedAccount ? getAccountLabel(selectedAccount) : 'בחר חשבון'}</span>
                                            </span>
                                        )}
                                        {accounts.length > 1 && (
                                            isAccountListExpanded
                                                ? <ChevronUp className="w-4 h-4 text-ios-subtle dark:text-ios-dark-subtle" />
                                                : <ChevronDown className="w-4 h-4 text-ios-subtle dark:text-ios-dark-subtle" />
                                        )}
                                    </button>
                                    {isAccountListExpanded && accounts.length > 1 && (
                                        <div className="mt-1 max-h-[168px] overflow-y-auto rounded-b-xl overflow-hidden bg-ios-gray-6 dark:bg-ios-dark-fill divide-y divide-black/5 dark:divide-white/10">
                                            {accounts.map((acc) => (
                                                <button
                                                    key={acc.id}
                                                    type="button"
                                                    onClick={() => {
                                                        setAccountId(acc.id);
                                                        setHasUserPickedAccount(true);
                                                        setIsAccountListExpanded(false);
                                                        trigger(10);
                                                    }}
                                                    className={`w-full flex items-center gap-2.5 py-3 px-3.5 text-sm font-semibold text-right transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ios-blue/30 ${
                                                        accountId === acc.id
                                                            ? 'bg-ios-blue/12 dark:bg-ios-blue/25 text-ios-blue dark:text-white'
                                                            : 'text-gray-600 dark:text-ios-dark-subtle'
                                                    }`}
                                                    aria-pressed={accountId === acc.id}
                                                >
                                                    <span className="text-sm">{getAccountIcon(acc)}</span>
                                                    <span className="truncate">{getAccountLabel(acc)}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                {accountError && (
                                    <p className="text-sm text-ios-red px-4 pb-3" role="alert">
                                        {accountError}
                                    </p>
                                )}
                            </div>

                            {/* Date */}
                            <div className="bg-white dark:bg-ios-dark-card rounded-2xl shadow-card mb-4 overflow-hidden">
                                <div className="flex items-center justify-between p-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-ios-red/10 rounded-lg flex items-center justify-center">
                                            <Calendar className="w-4 h-4 text-ios-red" />
                                        </div>
                                        <span className="text-[15px] font-medium text-ios-text dark:text-ios-dark-text">תאריך</span>
                                    </div>
                                    <input
                                        data-testid="quickadd-date"
                                        type="date"
                                        value={date}
                                        onChange={(e) => {
                                            setDate(e.target.value);
                                            if (dateError) setDateError('');
                                        }}
                                        className="bg-ios-gray-6 dark:bg-ios-dark-fill border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2 text-[15px] text-gray-700 dark:text-ios-dark-text focus:outline-none focus:ring-2 focus:ring-ios-blue/30 text-left"
                                    />
                                </div>
                                <div className="px-4 pb-4 -mt-2">
                                    <p className="text-xs text-ios-subtle dark:text-ios-dark-subtle">
                                        {date ? formatDateInputForDisplay(date, 'he-IL') : ''}
                                    </p>
                                    {dateError && <p className="text-xs text-ios-red mt-1">{dateError}</p>}
                                </div>
                            </div>

                            {/* Description */}
                            <div className="bg-white dark:bg-ios-dark-card rounded-2xl shadow-card mb-4 overflow-hidden">
                                <div className="p-4">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="w-8 h-8 bg-ios-blue/10 rounded-lg flex items-center justify-center">
                                            <span className="text-sm">📝</span>
                                        </div>
                                        <span className="text-[15px] font-medium text-ios-text dark:text-ios-dark-text">תיאור</span>
                                    </div>
                                    <input
                                        type="text"
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        className="w-full bg-ios-gray-6 dark:bg-ios-dark-fill rounded-xl py-3 px-4 text-[15px] text-ios-text dark:text-ios-dark-text placeholder-gray-400 dark:placeholder-ios-dark-subtle focus:outline-none focus:ring-2 focus:ring-ios-blue/30 transition"
                                        placeholder="על מה יצא הכסף?"
                                    />
                                </div>
                                {ambiguousCategoryMatches.length > 0 && (
                                    <div className="px-4 pb-4 pt-1 border-t border-gray-100 dark:border-white/10">
                                        <p className="text-xs font-medium text-ios-subtle dark:text-ios-dark-subtle mb-2">
                                            זוהו כמה התאמות לתיאור — בחרו קטגוריה:
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                            {ambiguousCategoryMatches.map((m) => (
                                                <button
                                                    key={m.name}
                                                    type="button"
                                                    onClick={() => {
                                                        setCategory(m.name);
                                                        setIsCategoryTouched(true);
                                                        trigger(8);
                                                    }}
                                                    className="inline-flex items-center gap-1.5 rounded-xl bg-ios-blue/10 dark:bg-ios-blue/20 text-ios-text dark:text-ios-dark-text text-xs font-semibold py-2 px-3 active:opacity-80"
                                                >
                                                    <span>{m.icon}</span>
                                                    <span>{m.name}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Category */}
                            <div className="bg-white dark:bg-ios-dark-card rounded-2xl shadow-card mb-4 p-4">
                                <p className="text-xs font-semibold text-ios-subtle dark:text-ios-dark-subtle uppercase tracking-wider mb-3">קטגוריה</p>
                                <div className="flex gap-2 mb-3">
                                    <input
                                        type="text"
                                        placeholder="שם קטגוריה חדשה"
                                        value={newCategoryName}
                                        onChange={(e) => setNewCategoryName(e.target.value)}
                                        className="flex-1 bg-ios-gray-6 dark:bg-ios-dark-fill rounded-xl px-3.5 py-2.5 text-sm text-ios-text dark:text-ios-dark-text placeholder-gray-400 dark:placeholder-ios-dark-subtle focus:outline-none focus:ring-2 focus:ring-ios-blue/30"
                                    />
                                    <input
                                        type="text"
                                        value={newCategoryEmojiInput}
                                        onChange={(e) => setNewCategoryEmojiInput(e.target.value)}
                                        placeholder="בחר/י או הקלד/י 😀"
                                        list="quickadd-category-emoji-list"
                                        className="w-20 text-center bg-ios-gray-6 dark:bg-ios-dark-fill rounded-xl px-1 py-2.5 text-sm text-ios-text dark:text-ios-dark-text focus:outline-none focus:ring-2 focus:ring-ios-blue/30"
                                        aria-label="בחירת אימוג׳י לקטגוריה"
                                    />
                                    <datalist id="quickadd-category-emoji-list">
                                        {CATEGORY_EMOJIS.map((emoji) => (
                                            <option key={emoji} value={emoji}>
                                                {emoji}
                                            </option>
                                        ))}
                                    </datalist>
                                    <button
                                        type="button"
                                        onClick={() => void handleCreateCategory()}
                                        disabled={isAddingCategory}
                                        className="w-11 shrink-0 bg-ios-blue text-white rounded-xl flex items-center justify-center disabled:opacity-50"
                                        aria-label="הוספת קטגוריה"
                                    >
                                        <Plus className="w-5 h-5" />
                                    </button>
                                </div>
                                <div className="flex gap-2 mb-2">
                                    <div className="flex-1 relative">
                                        <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-ios-subtle dark:text-ios-dark-subtle" />
                                        <input
                                            type="text"
                                            value={categorySearch}
                                            onChange={(e) => setCategorySearch(e.target.value)}
                                            placeholder="חיפוש קטגוריה קיימת"
                                            className="w-full bg-ios-gray-6 dark:bg-ios-dark-fill rounded-xl py-2.5 pr-9 pl-3 text-sm text-ios-text dark:text-ios-dark-text placeholder-gray-400 dark:placeholder-ios-dark-subtle focus:outline-none focus:ring-2 focus:ring-ios-blue/30"
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1" style={{ WebkitOverflowScrolling: 'touch' }}>
                                    {filteredCategories.map((cat) => (
                                        <button
                                            key={cat.id}
                                            type="button"
                                            onClick={() => {
                                                setCategory(cat.name);
                                                setIsCategoryTouched(true);
                                                trigger(10);
                                            }}
                                            className={`flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                                                category === cat.name
                                                    ? 'bg-ios-blue text-white shadow-sm'
                                                    : 'bg-ios-gray-6 dark:bg-ios-dark-fill text-gray-600 dark:text-ios-dark-subtle'
                                            }`}
                                        >
                                            <span>{cat.icon}</span>
                                            <span>{cat.name}</span>
                                        </button>
                                    ))}
                                    {!availableCategories.some((c) => c.name === 'כללי') && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setCategory('כללי');
                                                setIsCategoryTouched(true);
                                            }}
                                            className={`flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                                                category === 'כללי'
                                                    ? 'bg-ios-blue text-white shadow-sm'
                                                    : 'bg-ios-gray-6 dark:bg-ios-dark-fill text-gray-600 dark:text-ios-dark-subtle'
                                            }`}
                                        >
                                            <span>✨</span>
                                            <span>כללי</span>
                                        </button>
                                    )}
                                </div>
                                {filteredCategories.length === 0 && (
                                    <p className="text-xs text-ios-subtle dark:text-ios-dark-subtle mt-2">
                                        לא נמצאו קטגוריות תואמות לחיפוש. ניתן להוסיף קטגוריה חדשה בשורה למעלה.
                                    </p>
                                )}
                            </div>

                            {isEditingInstallment && initialData && (
                                <div className="bg-ios-blue/8 dark:bg-ios-blue/15 rounded-2xl shadow-card mb-4 p-4">
                                    <p className="text-sm font-semibold text-ios-text dark:text-ios-dark-text">
                                        תשלום {initialData.installmentNumber}/{initialData.installmentTotal}
                                    </p>
                                    <p className="text-xs text-ios-subtle dark:text-ios-dark-subtle mt-1">
                                        זוהי הוצאה מתוך סדרת תשלומים; בכל חודש מופיע חלק נפרד עם אותו מונה.
                                    </p>
                                </div>
                            )}

                            {!initialData && (
                                <div className="bg-white dark:bg-ios-dark-card rounded-2xl shadow-card mb-4 p-4">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="w-8 h-8 bg-ios-teal/10 rounded-lg flex items-center justify-center">
                                            <span className="text-sm">📅</span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[15px] font-medium text-ios-text dark:text-ios-dark-text">תשלומים</p>
                                            <p className="text-xs text-ios-subtle dark:text-ios-dark-subtle">
                                                פריסה על מספר חודשים — בכל חודש יווצר תשלום בנפרד (למשל 2/5).
                                            </p>
                                        </div>
                                    </div>
                                    <label className="block text-xs font-semibold text-ios-subtle dark:text-ios-dark-subtle uppercase tracking-wider mb-2">
                                        מספר חודשים
                                    </label>
                                    <input
                                        type="number"
                                        inputMode="numeric"
                                        min={1}
                                        max={60}
                                        value={installmentCount}
                                        onChange={(e) => {
                                            const v = parseInt(e.target.value, 10);
                                            if (Number.isNaN(v)) {
                                                setInstallmentCount(1);
                                                return;
                                            }
                                            setInstallmentCount(Math.min(60, Math.max(1, v)));
                                        }}
                                        disabled={isRecurring}
                                        className="w-full bg-ios-gray-6 dark:bg-ios-dark-fill rounded-xl px-3 py-2.5 text-sm text-ios-text dark:text-ios-dark-text focus:outline-none focus:ring-2 focus:ring-ios-blue/30 disabled:opacity-50"
                                    />
                                    {installmentPreviewParts && installmentPreviewParts.length > 0 && (
                                        <p className="text-xs text-ios-subtle dark:text-ios-dark-subtle mt-2">
                                            סכום לכל חודש: ₪{formatIlsAmount(installmentPreviewParts[0] ?? 0)}
                                            {installmentPreviewParts.length > 1 &&
                                                installmentPreviewParts[0] !==
                                                    installmentPreviewParts[installmentPreviewParts.length - 1] && (
                                                    <span>
                                                        {' '}
                                                        – ₪
                                                        {formatIlsAmount(
                                                            installmentPreviewParts[installmentPreviewParts.length - 1] ?? 0
                                                        )}
                                                    </span>
                                                )}
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* Recurring Toggle */}
                            <div className="bg-white dark:bg-ios-dark-card rounded-2xl shadow-card mb-6 p-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-ios-orange/10 rounded-lg flex items-center justify-center">
                                        <span className="text-sm">🔄</span>
                                    </div>
                                    <div>
                                        <p className="text-[15px] font-medium text-ios-text dark:text-ios-dark-text">הוצאה קבועה</p>
                                        <p className="text-xs text-ios-subtle dark:text-ios-dark-subtle">
                                            {initialData ? 'עדכון ייצור/יבטל הוראת קבע' : 'יחזור כל חודש'}
                                        </p>
                                    </div>
                                </div>
                                <LiquidToggle
                                    testId="quickadd-recurring-toggle"
                                    isOn={isRecurring}
                                    onToggle={() => {
                                        if (!isEditingInstallment) setIsRecurring(!isRecurring);
                                    }}
                                />
                            </div>

                            {shouldShowShortMonthPolicy && (
                                <div className="bg-white dark:bg-ios-dark-card rounded-2xl shadow-card mb-6 p-4">
                                    <p className="text-xs font-semibold text-ios-subtle dark:text-ios-dark-subtle uppercase tracking-wider mb-2">חודש קצר</p>
                                    <select
                                        data-testid="quickadd-short-month-policy"
                                        value={monthPolicy}
                                        onChange={(e) => setMonthPolicy(e.target.value as RecurringMonthPolicy)}
                                        className="w-full bg-ios-gray-6 dark:bg-ios-dark-fill border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm text-gray-700 dark:text-ios-dark-text focus:outline-none focus:ring-2 focus:ring-ios-blue/30"
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
                                    disabled={isSubmitting || !amount || !accountId}
                                    className="w-full bg-ios-blue text-white font-bold text-base py-4 rounded-2xl shadow-lg shadow-ios-blue/20 hover:bg-ios-blue/90 active:scale-[0.98] transition-all disabled:opacity-40 disabled:shadow-none disabled:cursor-not-allowed"
                                >
                                    {isSubmitting ? 'שומר...' : initialData ? 'עדכון' : 'הוסף הוצאה'}
                                </button>

                                {initialData && (
                                    showDeleteConfirm ? (
                                        <div className="space-y-3">
                                            <div className="flex gap-3">
                                                <button
                                                    type="button"
                                                    onClick={() => setShowDeleteConfirm(false)}
                                                    className="flex-1 bg-gray-100 dark:bg-ios-dark-fill text-gray-700 dark:text-ios-dark-text font-bold py-3.5 rounded-2xl"
                                                >
                                                    ביטול
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => void handleDelete('single')}
                                                    disabled={isDeleting}
                                                    className="flex-1 bg-ios-red text-white font-bold py-3.5 rounded-2xl"
                                                >
                                                    {isDeleting
                                                        ? 'מוחק...'
                                                        : initialData.installmentGroupId
                                                          ? 'מחק תשלום זה'
                                                          : 'מחיקה'}
                                                </button>
                                            </div>
                                            {initialData.installmentGroupId && (
                                                <button
                                                    type="button"
                                                    onClick={() => void handleDelete('installment_group')}
                                                    disabled={isDeleting}
                                                    className="w-full border border-ios-red/40 text-ios-red font-semibold py-3 rounded-2xl text-sm"
                                                >
                                                    מחק את כל סדרת התשלומים
                                                </button>
                                            )}
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
