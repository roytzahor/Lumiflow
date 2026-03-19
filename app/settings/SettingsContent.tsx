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
import { User, MoonStar, Pencil, Check, X, Trash2, Save, Plus, Wallet, Share2, LogOut } from 'lucide-react';
import type { BudgetSettings, Account, Category, AccountType } from '@/lib/types';

const DEFAULT_BUDGET: BudgetSettings = {
  id: '',
  userId: '',
  monthlyIncome: 21000,
  needsPercent: 50,
  wantsPercent: 30,
  savingsPercent: 20,
  savingsGoal: null,
  savingsGoalAmount: null,
};

const CATEGORY_EMOJIS = ['🍕', '🛒', '🚗', '🏠', '💡', '🍽️', '☕', '🎁', '🎉', '💊', '🧾', '✈️', '📦', '🧒', '🐶', '💸', '✨'];

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
  const [newAccountName, setNewAccountName] = useState('');
  const [newAccountType, setNewAccountType] = useState<AccountType>('PRIVATE');
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
  const [profileName, setProfileName] = useState(currentUser?.name ?? '');
  const [profileEmail, setProfileEmail] = useState(currentUser?.email ?? '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [themePreference, setThemePreference] = useState<'LIGHT' | 'DARK' | 'SYSTEM'>(currentUser?.themePreference ?? 'SYSTEM');
  const [isThemeSaving, setIsThemeSaving] = useState(false);
  const [contributionDrafts, setContributionDrafts] = useState<Record<string, number>>({});
  const [savingContributionId, setSavingContributionId] = useState<string | null>(null);
  const themeInitializedRef = useRef(false);

  useEffect(() => {
    setCategories(initialCategories);
    setAccounts(initialAccounts);
    setBudget(initialBudget ?? DEFAULT_BUDGET);
    setProfileName(currentUser?.name ?? '');
    setProfileEmail(currentUser?.email ?? '');
    const preference = currentUser?.themePreference ?? 'SYSTEM';
    setThemePreference(preference);
    if (!themeInitializedRef.current) {
      setTheme(preference.toLowerCase());
      themeInitializedRef.current = true;
    }
    setContributionDrafts(
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

  const updateLocalAccount = (id: string, patch: Partial<Account>) => {
    setAccounts((prev) => prev.map((acc) => (acc.id === id ? { ...acc, ...patch } : acc)));
  };

  const saveAccount = async (account: Account) => {
    const res = await updateAccount(account.id, { name: account.name, type: account.type });
    if (res.success) toast.success('החשבון עודכן');
    else toast.error(res.error ?? 'העדכון נכשל');
  };

  const updateContributionDraft = (accountId: string, value: string) => {
    const nextValue = value === '' ? 0 : Number(value);
    setContributionDrafts((prev) => ({
      ...prev,
      [accountId]: Number.isFinite(nextValue) ? nextValue : 0,
    }));
  };

  const saveContribution = async (accountId: string) => {
    const monthlyAmount = Number(contributionDrafts[accountId] ?? 0);
    if (!Number.isFinite(monthlyAmount) || monthlyAmount < 0) {
      toast.error('יש להזין סכום תקין');
      return;
    }
    setSavingContributionId(accountId);
    const res = await upsertContributionPlan({ accountId, monthlyAmount });
    setSavingContributionId(null);
    if (res.success) {
      toast.success('התרומה החודשית נשמרה');
      router.refresh();
    } else {
      toast.error(res.error ?? 'שמירת התרומה נכשלה');
    }
  };

  const addNewAccount = async () => {
    if (!newAccountName.trim()) return;
    const res = await createAccount({ name: newAccountName.trim(), type: newAccountType });
    if (res.success) {
      toast.success('החשבון נוצר');
      setNewAccountName('');
      router.refresh();
    } else {
      toast.error(res.error ?? 'יצירת החשבון נכשלה');
    }
  };

  const archiveOneAccount = async (accountId: string) => {
    const res = await archiveAccount(accountId);
    if (res.success) {
      toast.success('החשבון הועבר לארכיון');
      setAccounts((prev) => prev.filter((acc) => acc.id !== accountId));
      router.refresh();
    } else {
      toast.error(res.error ?? 'הארכוב נכשל');
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
    const res = await updateCurrentUserProfile({
      name: profileName,
      email: profileEmail,
    });
    if (res.success) {
      toast.success('הפרופיל עודכן בהצלחה');
      router.refresh();
    } else {
      toast.error(res.error ?? 'עדכון פרופיל נכשל');
    }
  };

  const savePassword = async () => {
    const res = await updateCurrentUserPassword({
      currentPassword,
      newPassword,
    });
    if (res.success) {
      setCurrentPassword('');
      setNewPassword('');
      toast.success('הסיסמה עודכנה');
    } else {
      toast.error(res.error ?? 'עדכון סיסמה נכשל');
    }
  };

  const handleThemeChange = async (nextTheme: 'LIGHT' | 'DARK' | 'SYSTEM') => {
    if (isThemeSaving || nextTheme === themePreference) return;
    const previousTheme = themePreference;
    setThemePreference(nextTheme);
    setTheme(nextTheme.toLowerCase());
    setIsThemeSaving(true);
    const res = await updateThemePreference(nextTheme);
    setIsThemeSaving(false);
    if (!res.success) {
      setThemePreference(previousTheme);
      setTheme(previousTheme.toLowerCase());
      toast.error(res.error ?? 'עדכון תצוגה נכשל');
      return;
    }
    router.refresh();
  };

  const createInvite = async () => {
    if (!inviteAccountId) return;
    if (inviteMethod === 'email' && !inviteEmail.trim()) {
      toast.error('יש להזין אימייל לקבלת הזמנה אישית');
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
        <div className="px-5 pb-5 space-y-3">
          <input
            type="text"
            value={profileName}
            onChange={(e) => setProfileName(e.target.value)}
            placeholder="שם תצוגה"
            className="w-full bg-ios-gray-6 dark:bg-ios-dark-fill rounded-xl px-4 py-2.5 text-sm text-ios-text dark:text-ios-dark-text"
          />
          <input
            type="email"
            value={profileEmail}
            onChange={(e) => setProfileEmail(e.target.value)}
            placeholder="אימייל"
            dir="ltr"
            className="w-full bg-ios-gray-6 dark:bg-ios-dark-fill rounded-xl px-4 py-2.5 text-sm text-ios-text dark:text-ios-dark-text"
          />
          <button
            onClick={saveProfile}
            className="w-full py-2.5 rounded-xl bg-ios-blue text-white text-sm font-semibold"
          >
            שמור פרטים
          </button>
          <div className="border-t border-gray-100 dark:border-white/10 pt-3 space-y-2">
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="סיסמה נוכחית"
              dir="ltr"
              className="w-full bg-ios-gray-6 dark:bg-ios-dark-fill rounded-xl px-4 py-2.5 text-sm text-ios-text dark:text-ios-dark-text"
            />
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="סיסמה חדשה"
              dir="ltr"
              className="w-full bg-ios-gray-6 dark:bg-ios-dark-fill rounded-xl px-4 py-2.5 text-sm text-ios-text dark:text-ios-dark-text"
            />
            <button
              onClick={savePassword}
              className="w-full py-2.5 rounded-xl bg-ios-indigo text-white text-sm font-semibold"
            >
              עדכן סיסמה
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
        <div className="px-5 pt-5 pb-3">
          <h2 className="text-base font-bold text-ios-text dark:text-ios-dark-text">חשבונות</h2>
        </div>
        <div className="px-5 pb-5 space-y-3">
          {accounts.map((account) => (
            <div key={account.id} className="bg-ios-gray-6 dark:bg-ios-dark-fill rounded-xl p-3 space-y-2">
              <input
                type="text"
                value={account.name}
                onChange={(e) => updateLocalAccount(account.id, { name: e.target.value })}
                className="w-full bg-white dark:bg-ios-dark-card rounded-lg px-3 py-2.5 text-sm text-ios-text dark:text-ios-dark-text"
              />
              <div className="flex gap-2">
                <select
                  value={account.type}
                  onChange={(e) => updateLocalAccount(account.id, { type: e.target.value as AccountType })}
                  className="flex-1 bg-white dark:bg-ios-dark-card rounded-lg px-3 py-2 text-sm text-ios-text dark:text-ios-dark-text"
                >
                  <option value="PRIVATE">פרטי</option>
                  <option value="SHARED">משותף</option>
                </select>
                <button onClick={() => saveAccount(account)} className="px-3 py-2 rounded-lg bg-ios-blue text-white text-sm">שמור</button>
                <button onClick={() => archiveOneAccount(account.id)} className="px-3 py-2 rounded-lg bg-ios-red text-white text-sm">ארכיון</button>
              </div>
              <div className="pt-1 border-t border-gray-200/60 dark:border-white/10">
                <p className="text-xs text-ios-subtle dark:text-ios-dark-subtle mb-2">
                  תרומה חודשית לחשבון הזה (₪)
                </p>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min={0}
                    inputMode="decimal"
                    value={contributionDrafts[account.id] ?? 0}
                    onChange={(e) => updateContributionDraft(account.id, e.target.value)}
                    className="flex-1 bg-white dark:bg-ios-dark-card rounded-lg px-3 py-2.5 text-sm text-ios-text dark:text-ios-dark-text"
                    dir="ltr"
                  />
                  <button
                    type="button"
                    onClick={() => saveContribution(account.id)}
                    disabled={savingContributionId === account.id}
                    className="px-3 py-2 rounded-lg bg-ios-indigo text-white text-sm disabled:opacity-60"
                  >
                    {savingContributionId === account.id ? 'שומר...' : 'שמור תרומה'}
                  </button>
                </div>
                {account.type === 'SHARED' && (
                  <p className="text-[11px] text-ios-subtle dark:text-ios-dark-subtle mt-2">
                    בחשבון משותף הסכום הכולל בסקירה יחושב משילוב התרומות של כל השותפים.
                  </p>
                )}
              </div>
            </div>
          ))}

          <div className="flex gap-2 pt-2">
            <input
              value={newAccountName}
              onChange={(e) => setNewAccountName(e.target.value)}
              placeholder="שם חשבון חדש"
              className="flex-1 bg-ios-gray-6 dark:bg-ios-dark-fill rounded-xl px-3 py-2.5 text-sm text-ios-text dark:text-ios-dark-text"
            />
            <select
              value={newAccountType}
              onChange={(e) => setNewAccountType(e.target.value as AccountType)}
              className="bg-ios-gray-6 dark:bg-ios-dark-fill rounded-xl px-3 py-2.5 text-sm text-ios-text dark:text-ios-dark-text"
            >
              <option value="PRIVATE">פרטי</option>
              <option value="SHARED">משותף</option>
            </select>
            <button onClick={addNewAccount} className="w-11 bg-ios-blue text-white rounded-xl flex items-center justify-center">
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>
      </section>

      <section className="bg-ios-card dark:bg-ios-dark-card rounded-2xl shadow-card overflow-hidden">
        <div className="px-5 pt-5 pb-3">
          <h2 className="text-base font-bold text-ios-text dark:text-ios-dark-text">שיתוף חשבון</h2>
        </div>
        <div className="px-5 pb-5 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setInviteMethod('link')}
              className={`py-2 rounded-xl text-sm font-semibold transition ${inviteMethod === 'link'
                ? 'bg-ios-blue text-white'
                : 'bg-ios-gray-6 dark:bg-ios-dark-fill text-ios-text dark:text-ios-dark-text'
                }`}
            >
              שיתוף בקישור
            </button>
            <button
              type="button"
              onClick={() => setInviteMethod('email')}
              className={`py-2 rounded-xl text-sm font-semibold transition ${inviteMethod === 'email'
                ? 'bg-ios-blue text-white'
                : 'bg-ios-gray-6 dark:bg-ios-dark-fill text-ios-text dark:text-ios-dark-text'
                }`}
            >
              הזמנה במייל
            </button>
          </div>
          <div className="flex gap-2">
            <select
              data-testid="settings-invite-account"
              value={inviteAccountId}
              onChange={(e) => setInviteAccountId(e.target.value)}
              className="flex-1 bg-ios-gray-6 dark:bg-ios-dark-fill rounded-xl px-3 py-2.5 text-sm text-ios-text dark:text-ios-dark-text"
            >
              <option value="">בחר חשבון משותף</option>
              {accounts.filter((a) => a.type === 'SHARED').map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
            {inviteMethod === 'email' ? (
              <input
                data-testid="settings-invite-email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="מייל להזמנה אישית"
                className="flex-1 bg-ios-gray-6 dark:bg-ios-dark-fill rounded-xl px-3 py-2.5 text-sm text-ios-text dark:text-ios-dark-text"
                dir="ltr"
              />
            ) : (
              <div className="flex-1 flex items-center px-3 rounded-xl bg-ios-gray-6 dark:bg-ios-dark-fill text-xs text-ios-subtle dark:text-ios-dark-subtle">
                הקישור שנוצר ניתן לשיתוף ידני עם כל מי שתרצה/י.
              </div>
            )}
            <button
              data-testid="settings-create-invite"
              onClick={createInvite}
              disabled={inviteLoading || !inviteAccountId}
              className="px-3 py-2.5 rounded-xl bg-ios-indigo text-white text-sm flex items-center gap-1 disabled:opacity-50"
            >
              <Share2 className="w-4 h-4" />
              {inviteLoading ? 'יוצר...' : inviteMethod === 'email' ? 'צור הזמנה' : 'צור לינק'}
            </button>
          </div>
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
            <p data-testid="settings-invite-url" className="text-xs text-ios-subtle dark:text-ios-dark-subtle break-all">{inviteUrl}</p>
            <p className="text-xs text-ios-red">
              שים/י לב: הקישור תקף ל-{inviteExpiresInMinutes ?? 30} דקות בלבד. אין לשתף עם אף אחד אחר.
            </p>
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  await navigator.clipboard.writeText(inviteUrl);
                  setShowInviteLinkPopup(false);
                  setInviteUrl('');
                  setInviteExpiresInMinutes(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-ios-blue text-white text-sm font-semibold"
              >
                העתק קישור
              </button>
              <button
                onClick={() => {
                  setShowInviteLinkPopup(false);
                  setInviteUrl('');
                  setInviteExpiresInMinutes(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-ios-gray-6 dark:bg-ios-dark-fill text-ios-text dark:text-ios-dark-text text-sm font-medium"
              >
                סגור
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
