"use client";

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';
import {
  updateBudgetSettings,
  updateCurrentUserProfile,
  updateCurrentUserPassword,
  updateThemePreference,
  addCategory,
  updateCategory,
  deleteCategory,
  updateAccount,
  createAccount,
  archiveAccount,
  createAccountInvite,
  acceptAccountInvite,
  getInvitePreview,
  upsertContributionPlan,
} from '../actions';
import { User, MoonStar, Pencil, Check, X, Trash2, Save, Plus, Wallet, Share2, LogOut, Link2, Mail, Copy, SendHorizontal } from 'lucide-react';
import type { BudgetSettings, Account, Category } from '@/lib/types';
import AccountPopup from '@/components/AccountPopup';
import ProfileEditSheet from '@/components/ProfileEditSheet';

const DEFAULT_BUDGET: BudgetSettings = {
  id: '',
  userId: '',
  monthlyIncome: 0,
  needsPercent: 50,
  wantsPercent: 30,
  savingsPercent: 20,
  savingsGoal: null,
  savingsGoalAmount: null,
};

const CATEGORY_EMOJIS = ['🍕', '🛒', '🚗', '🏠', '💡', '🍽️', '☕', '🎁', '🎉', '💊', '🧾', '✈️', '📦', '🧒', '🐶', '💸', '✨'];

function mapThemePreferenceToClientTheme(theme: 'LIGHT' | 'DARK' | 'SYSTEM'): 'light' | 'dark' | 'system' {
  if (theme === 'LIGHT') return 'light';
  if (theme === 'DARK') return 'dark';
  return 'system';
}

interface SettingsContentProps {
  initialBudget: BudgetSettings | null;
  initialCategories: Category[];
  initialAccounts: Account[];
  initialContributionPlans: Array<{ accountId: string; monthlyAmount: number }>;
  currentUser: { id: string; name: string | null; email: string; themePreference: 'LIGHT' | 'DARK' | 'SYSTEM' } | null;
}

export default function SettingsContent({
  initialBudget,
  initialCategories,
  initialAccounts,
  initialContributionPlans,
  currentUser,
}: SettingsContentProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setTheme } = useTheme();

  const [budget, setBudget] = useState<BudgetSettings>(initialBudget ?? DEFAULT_BUDGET);
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [accounts, setAccounts] = useState<Account[]>(initialAccounts);
  const [loading, setLoading] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('🍕');
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState('');
  const [editingCategoryIcon, setEditingCategoryIcon] = useState('✨');
  const [isAccountPopupOpen, setIsAccountPopupOpen] = useState(false);
  const [accountPopupMode, setAccountPopupMode] = useState<'create' | 'edit'>('create');
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [accountSaving, setAccountSaving] = useState(false);
  const [accountDeleting, setAccountDeleting] = useState(false);
  const [inviteAccountId, setInviteAccountId] = useState('');
  const [inviteMethod, setInviteMethod] = useState<'link' | 'email'>('link');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteUrl, setInviteUrl] = useState('');
  const [inviteExpiresInMinutes, setInviteExpiresInMinutes] = useState<number | null>(null);
  const [showInviteLinkPopup, setShowInviteLinkPopup] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [pendingInviteToken, setPendingInviteToken] = useState<string | null>(null);
  const [invitePreview, setInvitePreview] = useState<{
    accountName: string;
    invitedByName: string;
    expiresAt: string;
  } | null>(null);
  const [showInvitePopup, setShowInvitePopup] = useState(false);
  const [acceptingInvite, setAcceptingInvite] = useState(false);
  const [profileSheetMode, setProfileSheetMode] = useState<'details' | 'password' | null>(null);
  const [isProfileSaving, setIsProfileSaving] = useState(false);
  const [isPasswordSaving, setIsPasswordSaving] = useState(false);
  const [themePreference, setThemePreference] = useState<'LIGHT' | 'DARK' | 'SYSTEM'>(currentUser?.themePreference ?? 'SYSTEM');
  const [isThemeSaving, setIsThemeSaving] = useState(false);
  const [contributionPlansByAccount, setContributionPlansByAccount] = useState<Record<string, number>>({});
  const themeInitializedRef = useRef(false);
  const sharedAccounts = accounts.filter((a) => a.type === 'SHARED');
  const selectedInviteAccountName = sharedAccounts.find((a) => a.id === inviteAccountId)?.name ?? '';
  const inviteEmailIsValid = inviteMethod !== 'email' || !inviteEmail.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteEmail.trim());

  useEffect(() => {
    setCategories(initialCategories);
    setAccounts(initialAccounts);
    setBudget(initialBudget ?? DEFAULT_BUDGET);
    const preference = currentUser?.themePreference ?? 'SYSTEM';
    setThemePreference(preference);
    if (!themeInitializedRef.current) {
      setTheme(mapThemePreferenceToClientTheme(preference));
      themeInitializedRef.current = true;
    }
    setContributionPlansByAccount(
      initialContributionPlans.reduce<Record<string, number>>((acc, row) => {
        acc[row.accountId] = row.monthlyAmount;
        return acc;
      }, {}),
    );
  }, [initialBudget, initialCategories, initialAccounts, initialContributionPlans, currentUser, setTheme]);

  useEffect(() => {
    const token = searchParams.get('invite');
    if (!token) {
      setPendingInviteToken(null);
      setShowInvitePopup(false);
      setInvitePreview(null);
      return;
    }

    setPendingInviteToken(token);
    getInvitePreview(token).then((res) => {
      if (res.success && res.invite) {
        setInvitePreview(res.invite);
        setShowInvitePopup(true);
      } else {
        toast.error(res.error ?? 'ההזמנה אינה תקינה');
        router.replace('/settings');
      }
    });
  }, [searchParams, router]);

  const handleAcceptInvite = async () => {
    if (!pendingInviteToken) return;
    setAcceptingInvite(true);
    const res = await acceptAccountInvite(pendingInviteToken);
    setAcceptingInvite(false);
    if (res.success) {
      toast.success('ההזמנה אושרה בהצלחה');
      setShowInvitePopup(false);
      router.replace('/settings');
      router.refresh();
    } else {
      toast.error(res.error ?? 'אישור ההזמנה נכשל');
    }
  };

  const saveBudget = async () => {
    setLoading(true);
    const res = await updateBudgetSettings({
      monthlyIncome: Number(budget.monthlyIncome),
      needsPercent: budget.needsPercent,
      wantsPercent: budget.wantsPercent,
      savingsPercent: budget.savingsPercent,
      savingsGoal: budget.savingsGoal ?? undefined,
      savingsGoalAmount: budget.savingsGoalAmount ?? undefined,
    });
    setLoading(false);
    if (res.success) toast.success('נשמר בהצלחה');
    else toast.error(res.error ?? 'השמירה נכשלה');
  };

  const openCreateAccountPopup = () => {
    setAccountPopupMode('create');
    setSelectedAccount(null);
    setIsAccountPopupOpen(true);
  };

  const openEditAccountPopup = (account: Account) => {
    setAccountPopupMode('edit');
    setSelectedAccount(account);
    setIsAccountPopupOpen(true);
  };

  const closeAccountPopup = () => {
    if (accountSaving || accountDeleting) return;
    setIsAccountPopupOpen(false);
    setSelectedAccount(null);
  };

  const handleAccountSubmit = async (payload: { name: string; type: 'PRIVATE' | 'SHARED'; income: number; monthlyContribution: number }) => {
    setAccountSaving(true);
    const res = accountPopupMode === 'create'
      ? await createAccount(payload)
      : selectedAccount
        ? await updateAccount(selectedAccount.id, payload)
        : { success: false, error: 'לא נמצא חשבון לעריכה' };
    if (!res.success) {
      setAccountSaving(false);
      toast.error(res.error ?? 'שמירת החשבון נכשלה');
      return;
    }

    const createdAccount = accountPopupMode === 'create'
      ? (res as { account?: Account }).account
      : null;
    const accountId = accountPopupMode === 'create'
      ? createdAccount?.id ?? null
      : selectedAccount?.id ?? null;

    if (!accountId) {
      setAccountSaving(false);
      toast.error('לא נמצא חשבון לשמירת התרומה החודשית');
      return;
    }

    const contributionRes = await upsertContributionPlan({
      accountId,
      monthlyAmount: payload.monthlyContribution,
    });
    setAccountSaving(false);

    if (!contributionRes.success) {
      toast.error(contributionRes.error ?? 'שמירת התרומה החודשית נכשלה');
      if (accountPopupMode === 'create' && createdAccount) {
        setAccountPopupMode('edit');
        setSelectedAccount(createdAccount);
      }
      router.refresh();
      return;
    }

    setContributionPlansByAccount((prev) => ({
      ...prev,
      [accountId]: payload.monthlyContribution,
    }));
    toast.success(accountPopupMode === 'create' ? 'החשבון נוצר' : 'החשבון עודכן');
    setIsAccountPopupOpen(false);
    setSelectedAccount(null);
    router.refresh();
  };

  const handleAccountDelete = async () => {
    if (!selectedAccount) return;
    setAccountDeleting(true);
    const res = await archiveAccount(selectedAccount.id);
    setAccountDeleting(false);
    if (res.success) {
      toast.success('החשבון הועבר לארכיון');
      setIsAccountPopupOpen(false);
      setSelectedAccount(null);
      router.refresh();
    } else {
      toast.error(res.error ?? 'מחיקת החשבון נכשלה');
    }
  };

  const handleAccountDeleteFromCard = async (account: Account) => {
    if (!window.confirm(`למחוק את החשבון "${account.name}"? החשבון יועבר לארכיון.`)) return;
    setAccountDeleting(true);
    const res = await archiveAccount(account.id);
    setAccountDeleting(false);
    if (res.success) {
      toast.success('החשבון הועבר לארכיון');
      router.refresh();
    } else {
      toast.error(res.error ?? 'מחיקת החשבון נכשלה');
    }
  };

  const handleAddCategory = async () => {
    if (!newCatName.trim()) return;
    const res = await addCategory(newCatName.trim(), newCatIcon, 'expense');
    if (res.success) {
      toast.success('קטגוריה נוספה');
      setNewCatName('');
      router.refresh();
    } else {
      toast.error(res.error ?? 'הוספת קטגוריה נכשלה');
    }
  };

  const handleDeleteCategory = async (id: string) => {
    const res = await deleteCategory(id);
    if (res.success) {
      setCategories((prev) => prev.filter((c) => c.id !== id));
      toast.success('הקטגוריה נמחקה');
    } else {
      toast.error(res.error ?? 'מחיקת קטגוריה נכשלה');
    }
  };

  const startEditCategory = (cat: Category) => {
    setEditingCategoryId(cat.id);
    setEditingCategoryName(cat.name);
    setEditingCategoryIcon(cat.icon);
  };

  const cancelEditCategory = () => {
    setEditingCategoryId(null);
    setEditingCategoryName('');
    setEditingCategoryIcon('✨');
  };

  const handleSaveCategory = async () => {
    if (!editingCategoryId || !editingCategoryName.trim()) return;
    const res = await updateCategory({
      id: editingCategoryId,
      name: editingCategoryName.trim(),
      icon: editingCategoryIcon || '✨',
      type: 'expense',
    });
    if (!res.success) {
      toast.error(res.error ?? 'עדכון קטגוריה נכשל');
      return;
    }
    setCategories((prev) => prev.map((cat) => (
      cat.id === editingCategoryId
        ? { ...cat, name: editingCategoryName.trim(), icon: editingCategoryIcon || '✨' }
        : cat
    )));
    toast.success('הקטגוריה עודכנה');
    cancelEditCategory();
  };

  const saveProfile = async () => {
    setProfileSheetMode('details');
  };

  const savePassword = async () => {
    setProfileSheetMode('password');
  };

  const closeProfileSheet = () => {
    if (isProfileSaving || isPasswordSaving) return;
    setProfileSheetMode(null);
  };

  const saveProfileDetails = async (payload: { name: string; email: string }) => {
    setIsProfileSaving(true);
    const res = await updateCurrentUserProfile({
      name: payload.name,
      email: payload.email,
    });
    setIsProfileSaving(false);
    if (res.success) {
      toast.success('הפרופיל עודכן בהצלחה');
      router.refresh();
      return true;
    } else {
      toast.error(res.error ?? 'עדכון פרופיל נכשל');
      return false;
    }
  };

  const savePasswordDetails = async (payload: { currentPassword: string; newPassword: string }) => {
    setIsPasswordSaving(true);
    const res = await updateCurrentUserPassword({
      currentPassword: payload.currentPassword,
      newPassword: payload.newPassword,
    });
    setIsPasswordSaving(false);
    if (res.success) {
      toast.success('הסיסמה עודכנה');
      return true;
    } else {
      toast.error(res.error ?? 'עדכון סיסמה נכשל');
      return false;
    }
  };

  const handleThemeChange = async (nextTheme: 'LIGHT' | 'DARK' | 'SYSTEM') => {
    if (isThemeSaving || nextTheme === themePreference) return;
    const previousTheme = themePreference;
    setThemePreference(nextTheme);
    setTheme(mapThemePreferenceToClientTheme(nextTheme));
    setIsThemeSaving(true);
    const res = await updateThemePreference(nextTheme);
    setIsThemeSaving(false);
    if (!res.success) {
      setThemePreference(previousTheme);
      setTheme(mapThemePreferenceToClientTheme(previousTheme));
      toast.error(res.error ?? 'עדכון תצוגה נכשל');
      return;
    }
  };

  const createInvite = async () => {
    if (!inviteAccountId) return;
    if (inviteMethod === 'email' && !inviteEmail.trim()) {
      toast.error('יש להזין אימייל לקבלת הזמנה אישית');
      return;
    }
    if (inviteMethod === 'email' && !inviteEmailIsValid) {
      toast.error('נראה שכתובת האימייל אינה תקינה');
      return;
    }
    setInviteLoading(true);
    const res = await createAccountInvite({
      accountId: inviteAccountId,
      invitedEmail: inviteMethod === 'email' ? inviteEmail : undefined,
    });
    setInviteLoading(false);
    if (res.success && res.inviteUrl) {
      setInviteUrl(res.inviteUrl);
      setInviteExpiresInMinutes(res.expiresInMinutes ?? null);
      setShowInviteLinkPopup(true);
      if (inviteMethod === 'email' && inviteEmail.trim()) {
        const subject = encodeURIComponent(`הזמנה להצטרף לחשבון: ${res.accountName ?? 'חשבון משותף'}`);
        const body = encodeURIComponent(`היי,\n\nהזמנתי אותך להצטרף לחשבון בלומיפלו:\n${res.inviteUrl}\n\nנתראה!`);
        window.location.href = `mailto:${inviteEmail.trim()}?subject=${subject}&body=${body}`;
      }
      toast.success(inviteMethod === 'email' ? 'נוצרה הזמנה אישית לפי אימייל' : 'לינק הזמנה נוצר');
    } else {
      toast.error(res.error ?? 'יצירת הזמנה נכשלה');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-8">
      <section className="bg-ios-card dark:bg-ios-dark-card rounded-2xl shadow-card overflow-hidden">
        <div className="px-5 pt-5 pb-3 flex items-center gap-2.5">
          <div className="w-8 h-8 bg-ios-indigo/10 rounded-lg flex items-center justify-center">
            <User className="w-4 h-4 text-ios-indigo" />
          </div>
          <h2 className="text-base font-bold text-ios-text dark:text-ios-dark-text">פרופיל משתמש</h2>
        </div>
        <div className="px-5 pb-5 space-y-4">
          <div className="rounded-xl bg-ios-gray-6 dark:bg-ios-dark-fill px-4 py-3">
            <p className="text-xs text-ios-subtle dark:text-ios-dark-subtle">שם</p>
            <p className="text-sm font-semibold text-ios-text dark:text-ios-dark-text">{currentUser?.name?.trim() || 'לא הוגדר עדיין'}</p>
            <div className="my-2 border-t border-gray-200/70 dark:border-white/10" />
            <p className="text-xs text-ios-subtle dark:text-ios-dark-subtle">אימייל</p>
            <p dir="ltr" className="text-[13px] text-ios-text dark:text-ios-dark-text">{currentUser?.email ?? '—'}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              onClick={saveProfile}
              className="w-full py-2.5 rounded-xl bg-ios-blue text-white text-sm font-semibold"
            >
              עריכת פרטים
            </button>
            <button
              type="button"
              onClick={savePassword}
              className="w-full py-2.5 rounded-xl bg-ios-indigo text-white text-sm font-semibold"
            >
              עדכון סיסמה
            </button>
          </div>
        </div>
      </section>

      <section className="bg-ios-card dark:bg-ios-dark-card rounded-2xl shadow-card overflow-hidden">
        <div className="px-5 pt-5 pb-3 flex items-center gap-2.5">
          <div className="w-8 h-8 bg-ios-purple/15 rounded-lg flex items-center justify-center">
            <MoonStar className="w-4 h-4 text-ios-purple" />
          </div>
          <h2 className="text-base font-bold text-ios-text dark:text-ios-dark-text">תצוגה</h2>
        </div>
        <div className="px-5 pb-5">
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleThemeChange('LIGHT')}
              disabled={isThemeSaving}
              className={`py-2.5 rounded-xl text-sm font-semibold transition ${
                themePreference === 'LIGHT'
                  ? 'bg-ios-blue text-white'
                  : 'bg-ios-gray-6 dark:bg-ios-dark-fill text-ios-text dark:text-ios-dark-text'
              } ${isThemeSaving ? 'opacity-60 cursor-wait' : ''}`}
            >
              בהיר
            </button>
            <button
              type="button"
              onClick={() => handleThemeChange('DARK')}
              disabled={isThemeSaving}
              className={`py-2.5 rounded-xl text-sm font-semibold transition ${
                themePreference === 'DARK'
                  ? 'bg-ios-blue text-white'
                  : 'bg-ios-gray-6 dark:bg-ios-dark-fill text-ios-text dark:text-ios-dark-text'
              } ${isThemeSaving ? 'opacity-60 cursor-wait' : ''}`}
            >
              כהה
            </button>
            <button
              type="button"
              onClick={() => handleThemeChange('SYSTEM')}
              disabled={isThemeSaving}
              className={`py-2.5 rounded-xl text-sm font-semibold transition ${
                themePreference === 'SYSTEM'
                  ? 'bg-ios-blue text-white'
                  : 'bg-ios-gray-6 dark:bg-ios-dark-fill text-ios-text dark:text-ios-dark-text'
              } ${isThemeSaving ? 'opacity-60 cursor-wait' : ''}`}
            >
              מערכת
            </button>
          </div>
        </div>
      </section>

      <section className="bg-ios-card dark:bg-ios-dark-card rounded-2xl shadow-card overflow-hidden">
        <div className="px-5 pt-5 pb-3 flex items-center gap-2.5">
          <div className="w-8 h-8 bg-ios-blue/10 rounded-lg flex items-center justify-center">
            <Wallet className="w-4 h-4 text-ios-blue" />
          </div>
          <h2 className="text-base font-bold text-ios-text dark:text-ios-dark-text">תקציב</h2>
        </div>
        <div className="px-5 pb-5 space-y-4">
          <p className="text-xs text-ios-subtle dark:text-ios-dark-subtle">מומלץ להזין סכומי הכנסה נטו.</p>
          <input
            type="number"
            value={budget.monthlyIncome}
            onChange={(e) => setBudget({ ...budget, monthlyIncome: parseFloat(e.target.value) || 0 })}
            className="w-full bg-ios-gray-6 dark:bg-ios-dark-fill rounded-xl px-4 py-3 text-lg font-bold text-ios-text dark:text-ios-dark-text focus:outline-none focus:ring-2 focus:ring-ios-blue/30"
          />
          <button
            onClick={saveBudget}
            disabled={loading}
            className="w-full py-3.5 bg-ios-blue text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {loading ? 'שומר...' : 'שמור תקציב'}
          </button>
        </div>
      </section>

      <section className="bg-ios-card dark:bg-ios-dark-card rounded-2xl shadow-card overflow-hidden">
        <div className="px-5 pt-5 pb-3 flex items-center justify-between gap-2">
          <h2 className="text-base font-bold text-ios-text dark:text-ios-dark-text">חשבונות</h2>
          <button
            type="button"
            onClick={openCreateAccountPopup}
            className="px-3 py-2 rounded-xl bg-ios-blue text-white text-sm font-semibold flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            הוספת חשבון
          </button>
        </div>
        <div className="px-5 pb-5 space-y-3">
          {accounts.map((account) => (
            <div key={account.id} className="bg-ios-gray-6 dark:bg-ios-dark-fill rounded-xl p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-ios-text dark:text-ios-dark-text leading-tight">{account.name}</p>
                  <p className="text-xs text-ios-subtle dark:text-ios-dark-subtle">
                    {account.type === 'PRIVATE' ? 'פרטי' : 'משותף'} · הכנסה חודשית: ₪{Math.round(account.income ?? 0).toLocaleString('he-IL')}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => openEditAccountPopup(account)}
                    className="px-3 py-2 rounded-lg bg-white dark:bg-ios-dark-card text-ios-blue text-sm font-medium"
                  >
                    עריכה
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAccountDeleteFromCard(account)}
                    disabled={accountDeleting}
                    className="px-2.5 py-2 rounded-lg bg-white dark:bg-ios-dark-card text-ios-red disabled:opacity-60"
                    aria-label={`מחיקת חשבון ${account.name}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-ios-card dark:bg-ios-dark-card rounded-2xl shadow-card overflow-hidden">
        <div className="px-5 pt-5 pb-3">
          <h2 className="text-base font-bold text-ios-text dark:text-ios-dark-text">שיתוף חשבון</h2>
        </div>
        <div className="px-5 pb-5 space-y-4">
          <p className="text-xs text-ios-subtle dark:text-ios-dark-subtle">
            בחר/י איך להזמין שותף לחשבון משותף. כל הזמנה תקפה לזמן מוגבל.
          </p>

          {sharedAccounts.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 dark:border-white/20 px-4 py-3 text-sm text-ios-subtle dark:text-ios-dark-subtle">
              עדיין אין לך חשבון משותף. אפשר ליצור חשבון חדש מסוג &quot;משותף&quot; ואז לשלוח הזמנה.
            </div>
          ) : null}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setInviteMethod('link')}
              className={`rounded-xl px-3 py-2.5 text-sm font-semibold transition flex items-center justify-center gap-2 ${inviteMethod === 'link'
                ? 'bg-ios-blue text-white'
                : 'bg-ios-gray-6 dark:bg-ios-dark-fill text-ios-text dark:text-ios-dark-text'
                }`}
            >
              <Link2 className="w-4 h-4" />
              שיתוף בקישור
            </button>
            <button
              type="button"
              onClick={() => setInviteMethod('email')}
              className={`rounded-xl px-3 py-2.5 text-sm font-semibold transition flex items-center justify-center gap-2 ${inviteMethod === 'email'
                ? 'bg-ios-blue text-white'
                : 'bg-ios-gray-6 dark:bg-ios-dark-fill text-ios-text dark:text-ios-dark-text'
                }`}
            >
              <Mail className="w-4 h-4" />
              הזמנה במייל
            </button>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-medium text-ios-subtle dark:text-ios-dark-subtle">חשבון לשיתוף</label>
            <select
              data-testid="settings-invite-account"
              value={inviteAccountId}
              onChange={(e) => setInviteAccountId(e.target.value)}
              className="w-full bg-ios-gray-6 dark:bg-ios-dark-fill rounded-xl px-3 py-2.5 text-sm text-ios-text dark:text-ios-dark-text border border-transparent dark:border-white/10"
            >
              <option value="">בחר חשבון משותף</option>
              {sharedAccounts.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>

          {inviteMethod === 'email' ? (
            <div className="space-y-2">
              <label className="block text-xs font-medium text-ios-subtle dark:text-ios-dark-subtle">אימייל מוזמן</label>
              <input
                data-testid="settings-invite-email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full bg-ios-gray-6 dark:bg-ios-dark-fill rounded-xl px-3 py-2.5 text-sm text-ios-text dark:text-ios-dark-text border border-transparent dark:border-white/10"
                dir="ltr"
              />
              {!inviteEmailIsValid ? (
                <p className="text-xs text-ios-red">נראה שכתובת האימייל אינה תקינה.</p>
              ) : null}
            </div>
          ) : (
            <div className="rounded-xl bg-ios-gray-6 dark:bg-ios-dark-fill px-3 py-2.5 text-xs text-ios-subtle dark:text-ios-dark-subtle">
              ייווצר קישור חד-פעמי לשיתוף ידני דרך וואטסאפ, מייל או כל ערוץ אחר.
            </div>
          )}

          <button
            data-testid="settings-create-invite"
            onClick={createInvite}
            disabled={inviteLoading || !inviteAccountId || (inviteMethod === 'email' && (!inviteEmail.trim() || !inviteEmailIsValid))}
            className="w-full px-3 py-3 rounded-xl bg-ios-indigo text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Share2 className="w-4 h-4" />
            {inviteLoading ? 'יוצר הזמנה...' : inviteMethod === 'email' ? 'צור הזמנה אישית במייל' : 'צור קישור הזמנה'}
          </button>

          {selectedInviteAccountName ? (
            <p className="text-[11px] text-ios-subtle dark:text-ios-dark-subtle">
              ההזמנה תישלח עבור החשבון: <span className="font-semibold">{selectedInviteAccountName}</span>
            </p>
          ) : null}
        </div>
      </section>

      <section className="bg-ios-card dark:bg-ios-dark-card rounded-2xl shadow-card overflow-hidden">
        <div className="px-5 pt-5 pb-3">
          <h2 className="text-base font-bold text-ios-text dark:text-ios-dark-text">קטגוריות</h2>
        </div>
        <div className="px-5 pb-5 space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="שם קטגוריה חדשה"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              className="flex-1 bg-ios-gray-6 dark:bg-ios-dark-fill rounded-xl px-3.5 py-2.5 text-sm text-ios-text dark:text-ios-dark-text"
            />
            <select
              value={newCatIcon}
              onChange={(e) => setNewCatIcon(e.target.value)}
              className="w-16 text-center bg-ios-gray-6 dark:bg-ios-dark-fill rounded-xl px-1 py-2.5 text-sm text-ios-text dark:text-ios-dark-text"
              aria-label="בחירת אמוג׳י"
            >
              {CATEGORY_EMOJIS.map((emoji) => <option key={emoji} value={emoji}>{emoji}</option>)}
            </select>
            <button onClick={handleAddCategory} className="w-11 bg-ios-blue text-white rounded-xl flex items-center justify-center">
              <Plus className="w-5 h-5" />
            </button>
          </div>

          <div className="bg-ios-gray-6 dark:bg-ios-dark-fill rounded-xl divide-y divide-gray-200/50 dark:divide-white/10 overflow-hidden max-h-52 overflow-y-auto">
            {categories.map((cat) => (
              <div key={cat.id} className="flex items-center justify-between px-4 py-3">
                {editingCategoryId === cat.id ? (
                  <div className="flex items-center gap-2 flex-1">
                    <select
                      value={editingCategoryIcon}
                      onChange={(e) => setEditingCategoryIcon(e.target.value)}
                      className="w-14 text-center bg-white dark:bg-ios-dark-card rounded-lg px-1 py-2 text-sm text-ios-text dark:text-ios-dark-text"
                    >
                      {CATEGORY_EMOJIS.map((emoji) => <option key={emoji} value={emoji}>{emoji}</option>)}
                    </select>
                    <input
                      value={editingCategoryName}
                      onChange={(e) => setEditingCategoryName(e.target.value)}
                      className="flex-1 bg-white dark:bg-ios-dark-card rounded-lg px-3 py-2 text-sm text-ios-text dark:text-ios-dark-text"
                    />
                    <button onClick={handleSaveCategory} className="text-ios-green p-1">
                      <Check className="w-4 h-4" />
                    </button>
                    <button onClick={cancelEditCategory} className="text-ios-subtle dark:text-ios-dark-subtle p-1">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="flex items-center gap-2.5 text-sm font-medium text-ios-text dark:text-ios-dark-text">
                      <span className="text-lg">{cat.icon}</span>
                      {cat.name}
                    </span>
                    <div className="flex items-center gap-1">
                      <button onClick={() => startEditCategory(cat)} className="text-ios-blue/80 hover:text-ios-blue p-1">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDeleteCategory(cat.id)} className="text-ios-red/70 hover:text-ios-red p-1">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <button
        data-testid="settings-signout"
        onClick={() => signOut({ callbackUrl: '/auth/signin' })}
        className="w-full py-3 bg-black dark:bg-white dark:text-black text-white rounded-xl font-medium flex items-center justify-center gap-2"
      >
        <LogOut className="w-4 h-4" />
        התנתק
      </button>

      {showInvitePopup && invitePreview && (
        <div data-testid="invite-popup" className="fixed inset-0 z-[90] bg-black/35 backdrop-blur-sm flex items-center justify-center px-5">
          <div className="w-full max-w-sm bg-ios-card dark:bg-ios-dark-card rounded-2xl shadow-card p-5 space-y-4">
            <h3 className="text-lg font-bold text-ios-text dark:text-ios-dark-text">הזמנה להצטרפות לחשבון</h3>
            <p className="text-sm text-ios-subtle dark:text-ios-dark-subtle leading-relaxed">
              <span className="font-semibold">{invitePreview.invitedByName}</span> הזמין אותך להצטרף לחשבון{' '}
              <span className="font-semibold">{invitePreview.accountName}</span>.
            </p>
            <p className="text-xs text-ios-subtle dark:text-ios-dark-subtle">תוקף ההזמנה עד {new Date(invitePreview.expiresAt).toLocaleDateString('he-IL')}</p>
            <div className="flex gap-2">
              <button
                data-testid="invite-popup-decline"
                onClick={() => {
                  setShowInvitePopup(false);
                  router.replace('/settings');
                }}
                className="flex-1 py-2.5 rounded-xl bg-ios-gray-6 dark:bg-ios-dark-fill text-ios-text dark:text-ios-dark-text text-sm font-medium"
              >
                לא עכשיו
              </button>
              <button
                data-testid="invite-popup-accept"
                onClick={handleAcceptInvite}
                disabled={acceptingInvite}
                className="flex-1 py-2.5 rounded-xl bg-ios-blue text-white text-sm font-semibold disabled:opacity-50"
              >
                {acceptingInvite ? 'מאשר...' : 'אשר הצטרפות'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showInviteLinkPopup && inviteUrl && (
        <div className="fixed inset-0 z-[95] bg-black/35 backdrop-blur-sm flex items-center justify-center px-5">
          <div className="w-full max-w-sm bg-ios-card dark:bg-ios-dark-card rounded-2xl shadow-card p-5 space-y-4">
            <h3 className="text-lg font-bold text-ios-text dark:text-ios-dark-text">לינק הזמנה מוכן</h3>
            <div data-testid="settings-invite-url" className="text-xs text-ios-subtle dark:text-ios-dark-subtle break-all bg-ios-gray-6 dark:bg-ios-dark-fill rounded-xl px-3 py-2.5">
              {inviteUrl}
            </div>
            <p className="text-xs text-ios-red">
              שים/י לב: הקישור תקף ל-{inviteExpiresInMinutes ?? 30} דקות בלבד. אין לשתף עם אף אחד אחר.
            </p>
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  await navigator.clipboard.writeText(inviteUrl);
                  toast.success('הקישור הועתק');
                }}
                className="flex-1 py-2.5 rounded-xl bg-ios-blue text-white text-sm font-semibold flex items-center justify-center gap-1.5"
              >
                <Copy className="w-4 h-4" />
                העתק קישור
              </button>
              <button
                onClick={async () => {
                  if (navigator.share) {
                    await navigator.share({
                      title: 'הזמנה ל-LumiFlow',
                      text: 'הזמנה להצטרפות לחשבון משותף',
                      url: inviteUrl,
                    });
                    return;
                  }
                  await navigator.clipboard.writeText(inviteUrl);
                  toast.success('הקישור הועתק לשיתוף');
                }}
                className="flex-1 py-2.5 rounded-xl bg-ios-indigo text-white text-sm font-semibold flex items-center justify-center gap-1.5"
              >
                <SendHorizontal className="w-4 h-4" />
                שתף
              </button>
            </div>
            <button
              onClick={() => {
                setShowInviteLinkPopup(false);
                setInviteUrl('');
                setInviteExpiresInMinutes(null);
              }}
              className="w-full py-2.5 rounded-xl bg-ios-gray-6 dark:bg-ios-dark-fill text-ios-text dark:text-ios-dark-text text-sm font-medium"
            >
              סגור
            </button>
          </div>
        </div>
      )}

      <AccountPopup
        isOpen={isAccountPopupOpen}
        mode={accountPopupMode}
        account={selectedAccount}
        initialMonthlyContribution={selectedAccount ? contributionPlansByAccount[selectedAccount.id] ?? 0 : 0}
        isSaving={accountSaving}
        isDeleting={accountDeleting}
        onClose={closeAccountPopup}
        onSubmit={handleAccountSubmit}
        onDelete={accountPopupMode === 'edit' ? handleAccountDelete : undefined}
      />

      <ProfileEditSheet
        isOpen={profileSheetMode !== null}
        mode={profileSheetMode ?? 'details'}
        initialName={currentUser?.name ?? ''}
        initialEmail={currentUser?.email ?? ''}
        isSaving={profileSheetMode === 'details' ? isProfileSaving : isPasswordSaving}
        onClose={closeProfileSheet}
        onSaveDetails={saveProfileDetails}
        onSavePassword={savePasswordDetails}
      />
    </div>
  );
}
