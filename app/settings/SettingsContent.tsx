"use client";

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { toast } from 'sonner';
import {
  updateBudgetSettings,
  addCategory,
  deleteCategory,
  deleteRecurringTransaction,
  updateAccount,
  createAccount,
  archiveAccount,
  createAccountInvite,
  acceptAccountInvite,
  getInvitePreview,
} from '../actions';
import { Trash2, Save, Plus, Wallet, Share2, LogOut } from 'lucide-react';
import type { BudgetSettings, Account, Category, RecurringWithAccount, AccountType } from '@/lib/types';

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
  initialRecurring: RecurringWithAccount[];
}

export default function SettingsContent({ initialBudget, initialCategories, initialAccounts, initialRecurring }: SettingsContentProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [budget, setBudget] = useState<BudgetSettings>(initialBudget ?? DEFAULT_BUDGET);
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [accounts, setAccounts] = useState<Account[]>(initialAccounts);
  const [recurring, setRecurring] = useState<RecurringWithAccount[]>(initialRecurring);
  const [loading, setLoading] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('🍕');
  const [newAccountName, setNewAccountName] = useState('');
  const [newAccountType, setNewAccountType] = useState<AccountType>('PRIVATE');
  const [inviteAccountId, setInviteAccountId] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteUrl, setInviteUrl] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [pendingInviteToken, setPendingInviteToken] = useState<string | null>(null);
  const [invitePreview, setInvitePreview] = useState<{
    accountName: string;
    invitedByName: string;
    expiresAt: string;
  } | null>(null);
  const [showInvitePopup, setShowInvitePopup] = useState(false);
  const [acceptingInvite, setAcceptingInvite] = useState(false);

  useEffect(() => {
    setCategories(initialCategories);
    setRecurring(initialRecurring);
    setAccounts(initialAccounts);
    setBudget(initialBudget ?? DEFAULT_BUDGET);
  }, [initialBudget, initialCategories, initialRecurring, initialAccounts]);

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
    } else {
      toast.error(res.error ?? 'מחיקת קטגוריה נכשלה');
    }
  };

  const handleDeleteRecurring = async (id: string) => {
    const res = await deleteRecurringTransaction(id);
    if (res.success) {
      setRecurring((prev) => prev.filter((r) => r.id !== id));
    } else {
      toast.error(res.error ?? 'מחיקת הוצאה חוזרת נכשלה');
    }
  };

  const createInvite = async () => {
    if (!inviteAccountId) return;
    setInviteLoading(true);
    const res = await createAccountInvite(inviteAccountId);
    setInviteLoading(false);
    if (res.success && res.inviteUrl) {
      setInviteUrl(res.inviteUrl);
      await navigator.clipboard.writeText(res.inviteUrl);
      if (inviteEmail.trim()) {
        const subject = encodeURIComponent(`הזמנה להצטרף לחשבון: ${res.accountName ?? 'חשבון משותף'}`);
        const body = encodeURIComponent(`היי,\n\nהזמנתי אותך להצטרף לחשבון בלומיפלו:\n${res.inviteUrl}\n\nנתראה!`);
        window.location.href = `mailto:${inviteEmail.trim()}?subject=${subject}&body=${body}`;
      }
      toast.success('לינק הזמנה הועתק');
    } else {
      toast.error(res.error ?? 'יצירת הזמנה נכשלה');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-8">
      <section className="bg-white rounded-2xl shadow-card overflow-hidden">
        <div className="px-5 pt-5 pb-3 flex items-center gap-2.5">
          <div className="w-8 h-8 bg-ios-blue/10 rounded-lg flex items-center justify-center">
            <Wallet className="w-4 h-4 text-ios-blue" />
          </div>
          <h2 className="text-base font-bold text-gray-900">תקציב</h2>
        </div>
        <div className="px-5 pb-5 space-y-4">
          <input
            type="number"
            value={budget.monthlyIncome}
            onChange={(e) => setBudget({ ...budget, monthlyIncome: parseFloat(e.target.value) || 0 })}
            className="w-full bg-ios-gray-6 rounded-xl px-4 py-3 text-lg font-bold focus:outline-none focus:ring-2 focus:ring-ios-blue/30"
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

      <section className="bg-white rounded-2xl shadow-card overflow-hidden">
        <div className="px-5 pt-5 pb-3">
          <h2 className="text-base font-bold text-gray-900">חשבונות</h2>
        </div>
        <div className="px-5 pb-5 space-y-3">
          {accounts.map((account) => (
            <div key={account.id} className="bg-ios-gray-6 rounded-xl p-3 space-y-2">
              <input
                type="text"
                value={account.name}
                onChange={(e) => updateLocalAccount(account.id, { name: e.target.value })}
                className="w-full bg-white rounded-lg px-3 py-2.5 text-sm"
              />
              <div className="flex gap-2">
                <select
                  value={account.type}
                  onChange={(e) => updateLocalAccount(account.id, { type: e.target.value as AccountType })}
                  className="flex-1 bg-white rounded-lg px-3 py-2 text-sm"
                >
                  <option value="PRIVATE">פרטי</option>
                  <option value="SHARED">משותף</option>
                </select>
                <button onClick={() => saveAccount(account)} className="px-3 py-2 rounded-lg bg-ios-blue text-white text-sm">שמור</button>
                <button onClick={() => archiveOneAccount(account.id)} className="px-3 py-2 rounded-lg bg-ios-red text-white text-sm">ארכיון</button>
              </div>
            </div>
          ))}

          <div className="flex gap-2 pt-2">
            <input
              value={newAccountName}
              onChange={(e) => setNewAccountName(e.target.value)}
              placeholder="שם חשבון חדש"
              className="flex-1 bg-ios-gray-6 rounded-xl px-3 py-2.5 text-sm"
            />
            <select
              value={newAccountType}
              onChange={(e) => setNewAccountType(e.target.value as AccountType)}
              className="bg-ios-gray-6 rounded-xl px-3 py-2.5 text-sm"
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

      <section className="bg-white rounded-2xl shadow-card overflow-hidden">
        <div className="px-5 pt-5 pb-3">
          <h2 className="text-base font-bold text-gray-900">שיתוף חשבון</h2>
        </div>
        <div className="px-5 pb-5 space-y-3">
          <div className="flex gap-2">
            <select
              value={inviteAccountId}
              onChange={(e) => setInviteAccountId(e.target.value)}
              className="flex-1 bg-ios-gray-6 rounded-xl px-3 py-2.5 text-sm"
            >
              <option value="">בחר חשבון משותף</option>
              {accounts.filter((a) => a.type === 'SHARED').map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
            <input
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="מייל להזמנה (אופציונלי)"
              className="flex-1 bg-ios-gray-6 rounded-xl px-3 py-2.5 text-sm"
              dir="ltr"
            />
            <button
              onClick={createInvite}
              disabled={inviteLoading || !inviteAccountId}
              className="px-3 py-2.5 rounded-xl bg-ios-indigo text-white text-sm flex items-center gap-1 disabled:opacity-50"
            >
              <Share2 className="w-4 h-4" />
              {inviteLoading ? 'יוצר...' : 'צור לינק'}
            </button>
          </div>
          {inviteUrl && <p className="text-xs text-gray-500 break-all">{inviteUrl}</p>}
        </div>
      </section>

      <section className="bg-white rounded-2xl shadow-card overflow-hidden">
        <div className="px-5 pt-5 pb-3">
          <h2 className="text-base font-bold text-gray-900">קטגוריות</h2>
        </div>
        <div className="px-5 pb-5 space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="שם קטגוריה חדשה"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              className="flex-1 bg-ios-gray-6 rounded-xl px-3.5 py-2.5 text-sm"
            />
            <select
              value={newCatIcon}
              onChange={(e) => setNewCatIcon(e.target.value)}
              className="w-16 text-center bg-ios-gray-6 rounded-xl px-1 py-2.5 text-sm"
              aria-label="בחירת אמוג׳י"
            >
              {CATEGORY_EMOJIS.map((emoji) => <option key={emoji} value={emoji}>{emoji}</option>)}
            </select>
            <button onClick={handleAddCategory} className="w-11 bg-ios-blue text-white rounded-xl flex items-center justify-center">
              <Plus className="w-5 h-5" />
            </button>
          </div>

          <div className="bg-ios-gray-6 rounded-xl divide-y divide-gray-200/50 overflow-hidden max-h-52 overflow-y-auto">
            {categories.map((cat) => (
              <div key={cat.id} className="flex items-center justify-between px-4 py-3">
                <span className="flex items-center gap-2.5 text-sm font-medium text-gray-700">
                  <span className="text-lg">{cat.icon}</span>
                  {cat.name}
                </span>
                {cat.isCustom && (
                  <button onClick={() => handleDeleteCategory(cat.id)} className="text-ios-red/70 hover:text-ios-red p-1">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white rounded-2xl shadow-card overflow-hidden">
        <div className="px-5 pt-5 pb-3">
          <h2 className="text-base font-bold text-gray-900">הוצאות חוזרות</h2>
        </div>
        <div className="px-5 pb-5">
          {recurring.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-6">אין הוצאות חוזרות</p>
          ) : (
            <div className="bg-ios-gray-6 rounded-xl divide-y divide-gray-200/50 overflow-hidden">
              {recurring.map((item) => (
                <div key={item.id} className="flex items-center justify-between px-4 py-3.5">
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-gray-900">{item.description || item.category}</span>
                    <span className="text-xs text-gray-400">{item.account.name} · ₪{item.amount}/חודש</span>
                  </div>
                  <button onClick={() => handleDeleteRecurring(item.id)} className="text-ios-red/70 hover:text-ios-red p-1.5">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <button
        onClick={() => signOut({ callbackUrl: '/auth/signin' })}
        className="w-full py-3 bg-black text-white rounded-xl font-medium flex items-center justify-center gap-2"
      >
        <LogOut className="w-4 h-4" />
        התנתק
      </button>

      {showInvitePopup && invitePreview && (
        <div className="fixed inset-0 z-[90] bg-black/35 backdrop-blur-sm flex items-center justify-center px-5">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-card p-5 space-y-4">
            <h3 className="text-lg font-bold text-gray-900">הזמנה להצטרפות לחשבון</h3>
            <p className="text-sm text-gray-700 leading-relaxed">
              <span className="font-semibold">{invitePreview.invitedByName}</span> הזמין אותך להצטרף לחשבון{' '}
              <span className="font-semibold">{invitePreview.accountName}</span>.
            </p>
            <p className="text-xs text-gray-400">תוקף ההזמנה עד {new Date(invitePreview.expiresAt).toLocaleDateString('he-IL')}</p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowInvitePopup(false);
                  router.replace('/settings');
                }}
                className="flex-1 py-2.5 rounded-xl bg-ios-gray-6 text-gray-700 text-sm font-medium"
              >
                לא עכשיו
              </button>
              <button
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
    </div>
  );
}
