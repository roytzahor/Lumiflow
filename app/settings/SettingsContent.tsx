"use client";

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';
import {
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
  removeAccountMember,
  updateSettingsSectionExpanded,
  addIncomeEntry,
  getIncomeEntries,
  deleteIncomeEntry,
  addSavingsLabel,
  deleteSavingsLabel,
  setSavingsLabelHidden,
} from '../actions';
import type { SettingsSectionKey } from '../actions';
import type { AccountMemberSummary } from '../actions';
import { User, MoonStar, Pencil, Check, X, Trash2, Plus, Share2, LogOut, Copy, SendHorizontal, Info, ChevronDown, Landmark, Tag, TrendingUp, PiggyBank, Eye, EyeOff } from 'lucide-react';
import type { AccountSummary, Category, IncomeEntryItem, SavingsLabel } from '@/lib/types';
import AccountPopup from '@/components/AccountPopup';
import ProfileEditSheet from '@/components/ProfileEditSheet';
import AccountShareSheet from '@/components/AccountShareSheet';
import AccountInfoSheet from '@/components/AccountInfoSheet';
import { cn } from '@/lib/utils';
import { CATEGORY_EMOJIS } from '@/lib/category-emojis';

type SettingsAccount = AccountSummary & { members?: AccountMemberSummary[] };

function mapThemePreferenceToClientTheme(theme: 'LIGHT' | 'DARK' | 'SYSTEM'): 'light' | 'dark' | 'system' {
  if (theme === 'LIGHT') return 'light';
  if (theme === 'DARK') return 'dark';
  return 'system';
}

function SettingsCollapsibleSection({
  open,
  onToggle,
  title,
  headerStart,
  children,
}: {
  open: boolean;
  onToggle: () => void;
  title: string;
  headerStart?: ReactNode;
  children: ReactNode;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <section className="rounded-3xl shadow-card bg-ios-card dark:bg-ios-dark-card">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className={cn(
          'sticky top-0 z-[2] flex w-full items-center gap-2.5 px-5 pt-5 pb-3 text-right',
          'bg-ios-card/95 dark:bg-ios-dark-card/95 backdrop-blur-md',
          'transition-[border-radius] duration-300 ease-out',
          open ? 'rounded-t-3xl rounded-b-none' : 'rounded-3xl',
        )}
      >
        {headerStart}
        <h2 className="text-base font-bold text-ios-text dark:text-ios-dark-text flex-1 min-w-0">{title}</h2>
        <ChevronDown
          className={cn(
            'w-5 h-5 shrink-0 text-ios-subtle dark:text-ios-dark-subtle transition-transform duration-200',
            open ? 'rotate-0' : '-rotate-90',
          )}
          aria-hidden
        />
      </button>
      {reduceMotion ? (
        open ? <div className="px-5 pb-5 pt-1 rounded-b-3xl">{children}</div> : null
      ) : (
        <div className="overflow-hidden">
          <motion.div
            initial={false}
            animate={{
              height: open ? 'auto' : 0,
              opacity: open ? 1 : 0,
            }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <div className="px-5 pb-5 pt-1 rounded-b-3xl">{children}</div>
          </motion.div>
        </div>
      )}
    </section>
  );
}

interface SettingsContentProps {
  initialCategories: Category[];
  initialAccounts: SettingsAccount[];
  initialContributionPlans: Array<{ accountId: string; monthlyAmount: number }>;
  initialSavingsLabels: SavingsLabel[];
  currentUser: {
    id: string;
    name: string | null;
    email: string;
    themePreference: 'LIGHT' | 'DARK' | 'SYSTEM';
    settingsProfileSectionExpanded?: boolean | null;
    settingsAppearanceSectionExpanded?: boolean | null;
    settingsAccountsSectionExpanded?: boolean | null;
    settingsCategoriesSectionExpanded?: boolean | null;
  } | null;
}

export default function SettingsContent({
  initialCategories,
  initialAccounts,
  initialContributionPlans,
  initialSavingsLabels,
  currentUser,
}: SettingsContentProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setTheme } = useTheme();

  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [savingsLabels, setSavingsLabels] = useState<SavingsLabel[]>(initialSavingsLabels);
  const [savingsTargetsOpen, setSavingsTargetsOpen] = useState(true);
  const [newSavingsName, setNewSavingsName] = useState('');
  const [newSavingsEmoji, setNewSavingsEmoji] = useState('💰');
  const [accounts, setAccounts] = useState<SettingsAccount[]>(initialAccounts);
  const [newCatName, setNewCatName] = useState('');
  const [newCatEmojiInput, setNewCatEmojiInput] = useState('');
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState('');
  const [editingCategoryEmojiInput, setEditingCategoryEmojiInput] = useState('✨');
  const [isAccountPopupOpen, setIsAccountPopupOpen] = useState(false);
  const [accountPopupMode, setAccountPopupMode] = useState<'create' | 'edit'>('create');
  const [selectedAccount, setSelectedAccount] = useState<SettingsAccount | null>(null);
  const [accountSaving, setAccountSaving] = useState(false);
  const [accountDeleting, setAccountDeleting] = useState(false);
  const [inviteUrl, setInviteUrl] = useState('');
  const [inviteExpiresInMinutes, setInviteExpiresInMinutes] = useState<number | null>(null);
  const [showInviteLinkPopup, setShowInviteLinkPopup] = useState(false);
  const [shareSheetAccount, setShareSheetAccount] = useState<{ id: string; name: string } | null>(null);
  const [shareSheetMethod, setShareSheetMethod] = useState<'link' | 'email'>('link');
  const [shareSheetEmail, setShareSheetEmail] = useState('');
  const [shareSheetLoading, setShareSheetLoading] = useState(false);
  const [infoSheetAccount, setInfoSheetAccount] = useState<SettingsAccount | null>(null);
  const [infoRemovingUserId, setInfoRemovingUserId] = useState<string | null>(null);
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
  const [settingsSectionOpen, setSettingsSectionOpen] = useState({
    profile: currentUser?.settingsProfileSectionExpanded ?? true,
    appearance: currentUser?.settingsAppearanceSectionExpanded ?? true,
    accounts: currentUser?.settingsAccountsSectionExpanded ?? true,
    categories: currentUser?.settingsCategoriesSectionExpanded ?? true,
  });
  const settingsSectionOpenRef = useRef(settingsSectionOpen);
  settingsSectionOpenRef.current = settingsSectionOpen;
  const themeInitializedRef = useRef(false);

  const [incomeOpen, setIncomeOpen] = useState(false);
  const [incomeEntries, setIncomeEntries] = useState<IncomeEntryItem[]>([]);
  const [incomeEntriesLoaded, setIncomeEntriesLoaded] = useState(false);
  const [incomeFormAmount, setIncomeFormAmount] = useState('');
  const [incomeFormDescription, setIncomeFormDescription] = useState('');
  const [incomeFormDate, setIncomeFormDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [incomeFormAccountId, setIncomeFormAccountId] = useState('');
  const [isAddingIncome, setIsAddingIncome] = useState(false);
  const [deletingIncomeId, setDeletingIncomeId] = useState<string | null>(null);

  const toggleSettingsSection = (key: SettingsSectionKey) => {
    const next = !settingsSectionOpenRef.current[key];
    setSettingsSectionOpen((s) => ({ ...s, [key]: next }));
    void updateSettingsSectionExpanded(key, next);
  };
  const shareSheetEmailIsValid = shareSheetMethod !== 'email' || !shareSheetEmail.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(shareSheetEmail.trim());

  useEffect(() => {
    setCategories(initialCategories);
    setSavingsLabels(initialSavingsLabels);
    setAccounts(initialAccounts);
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
  }, [initialCategories, initialSavingsLabels, initialAccounts, initialContributionPlans, currentUser, setTheme]);

  useEffect(() => {
    if (!currentUser) return;
    setSettingsSectionOpen({
      profile: currentUser.settingsProfileSectionExpanded ?? true,
      appearance: currentUser.settingsAppearanceSectionExpanded ?? true,
      accounts: currentUser.settingsAccountsSectionExpanded ?? true,
      categories: currentUser.settingsCategoriesSectionExpanded ?? true,
    });
  }, [
    currentUser,
    currentUser?.settingsProfileSectionExpanded,
    currentUser?.settingsAppearanceSectionExpanded,
    currentUser?.settingsAccountsSectionExpanded,
    currentUser?.settingsCategoriesSectionExpanded,
  ]);

  useEffect(() => {
    const token = searchParams.get('invite');
    if (!token) {
      setPendingInviteToken(null);
      setShowInvitePopup(false);
      setInvitePreview(null);
      return;
    }

    setPendingInviteToken(token);
    let cancelled = false;
    void getInvitePreview(token).then((res) => {
      if (cancelled) return;
      if (res.success && res.invite) {
        setInvitePreview(res.invite);
        setShowInvitePopup(true);
      } else {
        toast.error(res.error ?? 'ההזמנה אינה תקינה');
        router.replace('/settings');
      }
    });
    return () => {
      cancelled = true;
    };
  }, [searchParams, router]);

  const handleAcceptInvite = async () => {
    const tokenFromUrl =
      typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('invite') : null;
    const token = tokenFromUrl ?? pendingInviteToken;
    if (!token) return;
    setAcceptingInvite(true);
    const res = await acceptAccountInvite(token);
    setAcceptingInvite(false);
    if (res.success) {
      toast.success('ההזמנה אושרה בהצלחה');
      setShowInvitePopup(false);
      setInvitePreview(null);
      setPendingInviteToken(null);
      // Full navigation drops ?invite= reliably; client replace+refresh could leave the overlay
      // mounted while searchParams briefly still expose the token (flaky Cypress + invite UX).
      if (typeof window !== 'undefined') {
        window.location.assign(`${window.location.origin}/settings`);
      } else {
        router.replace('/settings');
      }
    } else {
      toast.error(res.error ?? 'אישור ההזמנה נכשל');
    }
  };

  const openCreateAccountPopup = () => {
    setAccountPopupMode('create');
    setSelectedAccount(null);
    setIsAccountPopupOpen(true);
  };

  const openEditAccountPopup = (account: SettingsAccount) => {
    setAccountPopupMode('edit');
    setSelectedAccount(account);
    setIsAccountPopupOpen(true);
  };

  const closeAccountPopup = () => {
    if (accountSaving || accountDeleting) return;
    setIsAccountPopupOpen(false);
    setSelectedAccount(null);
  };

  const handleAccountSubmit = async (payload: { name: string; type: 'PRIVATE' | 'SHARED'; monthlyContribution: number }) => {
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
      ? (res as { account?: AccountSummary }).account
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

  const handleAccountDeleteFromCard = async (account: SettingsAccount) => {
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

  const openAccountShareSheet = (account: SettingsAccount) => {
    setShareSheetAccount({ id: account.id, name: account.name });
    setShareSheetMethod('link');
    setShareSheetEmail('');
  };

  const openAccountInfoSheet = (account: SettingsAccount) => {
    setInfoSheetAccount(account);
  };

  const closeAccountInfoSheet = () => {
    if (infoRemovingUserId) return;
    setInfoSheetAccount(null);
  };

  const handleRemoveMemberFromInfo = async (memberUserId: string) => {
    if (!infoSheetAccount) return;
    const member = infoSheetAccount.members?.find((m) => m.userId === memberUserId);
    const label = member?.name?.trim() || member?.email || 'משתמש';
    if (!window.confirm(`להסיר את ${label} מהחשבון "${infoSheetAccount.name}"?`)) return;

    setInfoRemovingUserId(memberUserId);
    const res = await removeAccountMember(infoSheetAccount.id, memberUserId);
    setInfoRemovingUserId(null);

    if (!res.success) {
      toast.error(res.error ?? 'הסרת המשתמש נכשלה');
      return;
    }

    toast.success('המשתמש הוסר מהחשבון');
    setAccounts((prev) =>
      prev.map((a) =>
        a.id !== infoSheetAccount.id
          ? a
          : { ...a, members: (a.members ?? []).filter((m) => m.userId !== memberUserId) },
      ),
    );
    setInfoSheetAccount((prev) =>
      prev && prev.id === infoSheetAccount.id
        ? { ...prev, members: (prev.members ?? []).filter((m) => m.userId !== memberUserId) }
        : prev,
    );
    router.refresh();
  };

  const closeAccountShareSheet = () => {
    if (shareSheetLoading) return;
    setShareSheetAccount(null);
    setShareSheetEmail('');
    setShareSheetMethod('link');
  };

  const handleAddCategory = async () => {
    if (!newCatName.trim()) return;
    const resolvedIcon = newCatEmojiInput.trim() || '✨';
    const res = await addCategory(newCatName.trim(), resolvedIcon, 'expense');
    if (res.success) {
      toast.success('קטגוריה נוספה');
      setNewCatName('');
      setNewCatEmojiInput('');
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

  const handleAddSavingsLabel = async () => {
    if (!newSavingsName.trim()) return;
    const icon = newSavingsEmoji.trim() || '💰';
    const res = await addSavingsLabel(newSavingsName.trim(), icon);
    if (res.success) {
      toast.success('יעד חיסכון נוסף');
      setNewSavingsName('');
      setNewSavingsEmoji('💰');
      router.refresh();
    } else {
      toast.error(res.error ?? 'הוספה נכשלה');
    }
  };

  const handleDeleteSavingsLabel = async (id: string) => {
    const res = await deleteSavingsLabel(id);
    if (res.success) {
      setSavingsLabels((prev) => prev.filter((l) => l.id !== id));
      toast.success('נמחק');
      router.refresh();
    } else {
      toast.error(res.error ?? 'מחיקה נכשלה');
    }
  };

  const handleToggleSavingsBuiltinHidden = async (label: SavingsLabel) => {
    if (label.isCustom) return;
    const res = await setSavingsLabelHidden(label.id, !label.hidden);
    if (res.success) {
      setSavingsLabels((prev) =>
        prev.map((l) => (l.id === label.id ? { ...l, hidden: !l.hidden } : l)),
      );
      router.refresh();
    } else {
      toast.error(res.error ?? 'עדכון נכשל');
    }
  };

  const startEditCategory = (cat: Category) => {
    setEditingCategoryId(cat.id);
    setEditingCategoryName(cat.name);
    setEditingCategoryEmojiInput(cat.icon || '✨');
  };

  const cancelEditCategory = () => {
    setEditingCategoryId(null);
    setEditingCategoryName('');
    setEditingCategoryEmojiInput('✨');
  };

  const handleSaveCategory = async () => {
    if (!editingCategoryId || !editingCategoryName.trim()) return;
    const resolvedIcon = editingCategoryEmojiInput.trim() || '✨';
    const res = await updateCategory({
      id: editingCategoryId,
      name: editingCategoryName.trim(),
      icon: resolvedIcon,
      type: 'expense',
    });
    if (!res.success) {
      toast.error(res.error ?? 'עדכון קטגוריה נכשל');
      return;
    }
    setCategories((prev) => prev.map((cat) => (
      cat.id === editingCategoryId
        ? { ...cat, name: editingCategoryName.trim(), icon: resolvedIcon }
        : cat
    )));
    toast.success('הקטגוריה עודכנה');
    cancelEditCategory();
  };

  const loadIncomeEntries = async () => {
    const entries = await getIncomeEntries();
    setIncomeEntries(entries as IncomeEntryItem[]);
    setIncomeEntriesLoaded(true);
  };

  const toggleIncomeSection = () => {
    const next = !incomeOpen;
    setIncomeOpen(next);
    if (next && !incomeEntriesLoaded) {
      void loadIncomeEntries();
    }
  };

  const handleAddIncome = async () => {
    const num = parseFloat(incomeFormAmount);
    if (!incomeFormAmount || isNaN(num) || num <= 0) {
      toast.error('יש להזין סכום תקין');
      return;
    }
    if (!incomeFormAccountId) {
      toast.error('יש לבחור חשבון');
      return;
    }
    if (!incomeFormDate) {
      toast.error('יש לבחור תאריך');
      return;
    }
    setIsAddingIncome(true);
    const formData = new FormData();
    formData.append('amount', String(num));
    formData.append('description', incomeFormDescription);
    formData.append('date', incomeFormDate);
    formData.append('accountId', incomeFormAccountId);
    const res = await addIncomeEntry(formData);
    setIsAddingIncome(false);
    if (!res.success) {
      toast.error(res.error ?? 'הוספת ההכנסה נכשלה');
      return;
    }
    toast.success('הכנסה נוספה');
    setIncomeFormAmount('');
    setIncomeFormDescription('');
    setIncomeFormDate(new Date().toISOString().slice(0, 10));
    void loadIncomeEntries();
    router.refresh();
  };

  const handleDeleteIncome = async (id: string) => {
    setDeletingIncomeId(id);
    const res = await deleteIncomeEntry(id);
    setDeletingIncomeId(null);
    if (!res.success) {
      toast.error(res.error ?? 'מחיקת ההכנסה נכשלה');
      return;
    }
    setIncomeEntries((prev) => prev.filter((e) => e.id !== id));
    toast.success('ההכנסה נמחקה');
    router.refresh();
  };

  const createInviteForAccount = async (payload: { accountId: string; method: 'link' | 'email'; email: string }) => {
    if (payload.method === 'email' && !payload.email.trim()) {
      toast.error('יש להזין אימייל לקבלת הזמנה אישית');
      return false;
    }
    if (payload.method === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email.trim())) {
      toast.error('נראה שכתובת האימייל אינה תקינה');
      return false;
    }

    const response = await createAccountInvite({
      accountId: payload.accountId,
      invitedEmail: payload.method === 'email' ? payload.email.trim() : undefined,
    });

    if (!response.success || !response.inviteUrl) {
      toast.error(response.error ?? 'יצירת הזמנה נכשלה');
      return false;
    }

    setInviteUrl(response.inviteUrl);
    setInviteExpiresInMinutes(response.expiresInMinutes ?? null);
    setShowInviteLinkPopup(true);
    if (payload.method === 'email' && payload.email.trim()) {
      const subject = encodeURIComponent(`הזמנה להצטרף לחשבון: ${response.accountName ?? 'חשבון משותף'}`);
      const body = encodeURIComponent(`היי,\n\nהזמנתי אותך להצטרף לחשבון בלומיפלו:\n${response.inviteUrl}\n\nנתראה!`);
      window.location.href = `mailto:${payload.email.trim()}?subject=${subject}&body=${body}`;
    }
    toast.success(payload.method === 'email' ? 'נוצרה הזמנה אישית לפי אימייל' : 'לינק הזמנה נוצר');
    return true;
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
    const profileRes = await updateCurrentUserProfile({
      name: payload.name,
      email: payload.email,
    });

    setIsProfileSaving(false);
    if (!profileRes.success) {
      toast.error(profileRes.error ?? 'עדכון פרופיל נכשל');
      return false;
    }

    toast.success('הפרופיל עודכן בהצלחה');
    router.refresh();
    return true;
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

  const createInviteFromShareSheet = async () => {
    if (!shareSheetAccount) return;
    setShareSheetLoading(true);
    const success = await createInviteForAccount({
      accountId: shareSheetAccount.id,
      method: shareSheetMethod,
      email: shareSheetEmail,
    });
    setShareSheetLoading(false);
    if (success) {
      closeAccountShareSheet();
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-8">
      <SettingsCollapsibleSection
        open={settingsSectionOpen.profile}
        onToggle={() => toggleSettingsSection('profile')}
        title="פרופיל משתמש"
        headerStart={
          <div className="w-8 h-8 bg-ios-blue/12 rounded-lg flex items-center justify-center shrink-0">
            <User className="w-4 h-4 text-ios-blue" />
          </div>
        }
      >
        <div className="space-y-4">
          <div className="rounded-xl bg-ios-gray-6 dark:bg-ios-dark-fill px-4 py-3">
            <p className="text-xs text-ios-subtle dark:text-ios-dark-subtle">שם</p>
            <p className="text-sm font-semibold text-ios-text dark:text-ios-dark-text">{currentUser?.name?.trim() || 'לא הוגדר עדיין'}</p>
            <div className="my-2 border-t border-gray-200/70 dark:border-white/10" />
            <p className="text-xs text-ios-subtle dark:text-ios-dark-subtle">אימייל</p>
            <p dir="ltr" className="text-[13px] text-ios-text dark:text-ios-dark-text">{currentUser?.email ?? '—'}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              data-testid="settings-edit-profile"
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
      </SettingsCollapsibleSection>

      <SettingsCollapsibleSection
        open={settingsSectionOpen.appearance}
        onToggle={() => toggleSettingsSection('appearance')}
        title="תצוגה"
        headerStart={
          <div className="w-8 h-8 bg-ios-purple/15 rounded-lg flex items-center justify-center shrink-0">
            <MoonStar className="w-4 h-4 text-ios-purple" />
          </div>
        }
      >
        <div className="grid grid-cols-3 gap-2">
          <button
            data-testid="settings-theme-light"
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
            data-testid="settings-theme-dark"
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
      </SettingsCollapsibleSection>

      <SettingsCollapsibleSection
        open={settingsSectionOpen.accounts}
        onToggle={() => toggleSettingsSection('accounts')}
        title="חשבונות"
        headerStart={
          <div className="w-8 h-8 bg-ios-teal/15 rounded-lg flex items-center justify-center shrink-0">
            <Landmark className="w-4 h-4 text-ios-teal" />
          </div>
        }
      >
        <div className="space-y-3">
          <button
            type="button"
            data-testid="settings-add-account"
            onClick={openCreateAccountPopup}
            className="w-full px-3 py-2.5 rounded-xl bg-ios-blue text-white text-sm font-semibold flex items-center justify-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            הוספת חשבון
          </button>
          {accounts.map((account) => (
            <div key={account.id} className="bg-ios-gray-6 dark:bg-ios-dark-fill rounded-xl p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-ios-text dark:text-ios-dark-text leading-tight">{account.name}</p>
                  <p className="text-xs text-ios-subtle dark:text-ios-dark-subtle">
                    {account.type === 'PRIVATE' ? 'פרטי' : 'משותף'} · הכנסה חודשית: ₪{Math.round(account.income ?? 0).toLocaleString('he-IL')}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => openAccountInfoSheet(account)}
                    className="text-ios-teal/90 hover:text-ios-teal p-1"
                    aria-label={`מידע על חשבון ${account.name}`}
                  >
                    <Info className="w-4 h-4" />
                  </button>
                  {account.type === 'SHARED' ? (
                    <button
                      type="button"
                      onClick={() => openAccountShareSheet(account)}
                      className="text-ios-indigo/80 hover:text-ios-indigo p-1"
                      aria-label={`שיתוף חשבון ${account.name}`}
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => openEditAccountPopup(account)}
                    className="text-ios-blue/80 hover:text-ios-blue p-1"
                    aria-label={`עריכת חשבון ${account.name}`}
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAccountDeleteFromCard(account)}
                    disabled={accountDeleting}
                    className="text-ios-red/70 hover:text-ios-red p-1 disabled:opacity-60"
                    aria-label={`מחיקת חשבון ${account.name}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </SettingsCollapsibleSection>

      <SettingsCollapsibleSection
        open={settingsSectionOpen.categories}
        onToggle={() => toggleSettingsSection('categories')}
        title="קטגוריות"
        headerStart={
          <div className="w-8 h-8 bg-ios-orange/15 rounded-lg flex items-center justify-center shrink-0">
            <Tag className="w-4 h-4 text-ios-orange" />
          </div>
        }
      >
        <div className="space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="שם קטגוריה חדשה"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              className="flex-1 bg-ios-gray-6 dark:bg-ios-dark-fill rounded-xl px-3.5 py-2.5 text-sm text-ios-text dark:text-ios-dark-text"
            />
            <input
              type="text"
              value={newCatEmojiInput}
              onChange={(e) => setNewCatEmojiInput(e.target.value)}
              placeholder="בחר/י או הקלד/י 😀"
              list="settings-category-emoji-list"
              className="w-20 text-center bg-ios-gray-6 dark:bg-ios-dark-fill rounded-xl px-1 py-2.5 text-sm text-ios-text dark:text-ios-dark-text"
              aria-label="בחירת אימוג׳י לקטגוריה"
            />
            <datalist id="settings-category-emoji-list">
              {CATEGORY_EMOJIS.map((emoji) => <option key={emoji} value={emoji}>{emoji}</option>)}
            </datalist>
            <button onClick={handleAddCategory} className="w-11 bg-ios-blue text-white rounded-xl flex items-center justify-center">
              <Plus className="w-5 h-5" />
            </button>
          </div>

          <div className="bg-ios-gray-6 dark:bg-ios-dark-fill rounded-xl divide-y divide-gray-200/50 dark:divide-white/10 overflow-hidden max-h-52 overflow-y-auto">
            {categories.map((cat) => (
              <div key={cat.id} className="flex items-center justify-between px-4 py-3">
                {editingCategoryId === cat.id ? (
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      type="text"
                      value={editingCategoryEmojiInput}
                      onChange={(e) => setEditingCategoryEmojiInput(e.target.value)}
                      placeholder="אימוג׳י"
                      list="settings-category-emoji-list"
                      className="w-20 text-center bg-white dark:bg-ios-dark-card rounded-lg px-1 py-2 text-sm text-ios-text dark:text-ios-dark-text"
                      aria-label="בחירת אימוג׳י לעריכת קטגוריה"
                    />
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
      </SettingsCollapsibleSection>

      <section className="rounded-3xl shadow-card bg-ios-card dark:bg-ios-dark-card">
        <button
          type="button"
          onClick={() => setSavingsTargetsOpen((o) => !o)}
          aria-expanded={savingsTargetsOpen}
          className={cn(
            'sticky top-0 z-[2] flex w-full items-center gap-2.5 px-5 pt-5 pb-3 text-right',
            'bg-ios-card/95 dark:bg-ios-dark-card/95 backdrop-blur-md',
            'transition-[border-radius] duration-300 ease-out',
            savingsTargetsOpen ? 'rounded-t-3xl rounded-b-none' : 'rounded-3xl',
          )}
        >
          <div className="w-8 h-8 bg-ios-green/15 rounded-lg flex items-center justify-center shrink-0">
            <PiggyBank className="w-4 h-4 text-ios-green" />
          </div>
          <h2 className="text-base font-bold text-ios-text dark:text-ios-dark-text flex-1 min-w-0">יעדי חיסכון</h2>
          <ChevronDown
            className={cn(
              'w-5 h-5 shrink-0 text-ios-subtle dark:text-ios-dark-subtle transition-transform duration-200',
              savingsTargetsOpen ? 'rotate-0' : '-rotate-90',
            )}
            aria-hidden
          />
        </button>
        {savingsTargetsOpen && (
          <div className="px-5 pb-5 pt-1 rounded-b-3xl space-y-3">
            <p className="text-xs text-ios-subtle dark:text-ios-dark-subtle">
              שמות ואייקונים לבחירה כשמוסיפים הפרשה לחיסכון מהדשבורד. יעדים מובנים ניתן להסתיר מהרשימה בלי למחוק.
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="שם יעד חדש"
                value={newSavingsName}
                onChange={(e) => setNewSavingsName(e.target.value)}
                className="flex-1 bg-ios-gray-6 dark:bg-ios-dark-fill rounded-xl px-3.5 py-2.5 text-sm text-ios-text dark:text-ios-dark-text"
              />
              <input
                type="text"
                value={newSavingsEmoji}
                onChange={(e) => setNewSavingsEmoji(e.target.value)}
                placeholder="😀"
                list="settings-category-emoji-list"
                className="w-20 text-center bg-ios-gray-6 dark:bg-ios-dark-fill rounded-xl px-1 py-2.5 text-sm text-ios-text dark:text-ios-dark-text"
                aria-label="אימוג׳י ליעד חיסכון"
              />
              <button
                type="button"
                onClick={handleAddSavingsLabel}
                className="w-11 bg-ios-green text-white rounded-xl flex items-center justify-center"
                aria-label="הוספת יעד חיסכון"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
            <div className="bg-ios-gray-6 dark:bg-ios-dark-fill rounded-xl divide-y divide-gray-200/50 dark:divide-white/10 overflow-hidden max-h-52 overflow-y-auto">
              {savingsLabels.map((label) => (
                <div
                  key={label.id}
                  className={`flex items-center justify-between px-4 py-3 gap-2 ${label.hidden ? 'opacity-60' : ''}`}
                >
                  <span className="flex items-center gap-2.5 text-sm font-medium text-ios-text dark:text-ios-dark-text min-w-0">
                    <span className="text-lg shrink-0">{label.icon}</span>
                    <span className="truncate">{label.name}</span>
                    {!label.isCustom ? (
                      <span className="text-[10px] font-semibold text-ios-subtle dark:text-ios-dark-subtle shrink-0">
                        מובנה
                      </span>
                    ) : null}
                  </span>
                  <div className="flex items-center gap-1 shrink-0">
                    {!label.isCustom ? (
                      <button
                        type="button"
                        onClick={() => void handleToggleSavingsBuiltinHidden(label)}
                        className="text-ios-blue/80 hover:text-ios-blue p-1"
                        aria-label={label.hidden ? 'הצג בבחירה' : 'הסתר מהבחירה'}
                      >
                        {label.hidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void handleDeleteSavingsLabel(label.id)}
                        className="text-ios-red/70 hover:text-ios-red p-1"
                        aria-label="מחיקת יעד"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* One-time Income Section */}
      <section className="rounded-3xl shadow-card bg-ios-card dark:bg-ios-dark-card">
        <button
          type="button"
          onClick={toggleIncomeSection}
          aria-expanded={incomeOpen}
          className={cn(
            'sticky top-0 z-[2] flex w-full items-center gap-2.5 px-5 pt-5 pb-3 text-right',
            'bg-ios-card/95 dark:bg-ios-dark-card/95 backdrop-blur-md',
            'transition-[border-radius] duration-300 ease-out',
            incomeOpen ? 'rounded-t-3xl rounded-b-none' : 'rounded-3xl',
          )}
        >
          <div className="w-8 h-8 bg-ios-green/15 rounded-lg flex items-center justify-center shrink-0">
            <TrendingUp className="w-4 h-4 text-ios-green" />
          </div>
          <h2 className="text-base font-bold text-ios-text dark:text-ios-dark-text flex-1 min-w-0">הכנסות חד-פעמיות</h2>
          <ChevronDown
            className={cn(
              'w-5 h-5 shrink-0 text-ios-subtle dark:text-ios-dark-subtle transition-transform duration-200',
              incomeOpen ? 'rotate-0' : '-rotate-90',
            )}
            aria-hidden
          />
        </button>
        {incomeOpen && (
          <div className="px-5 pb-5 pt-1 rounded-b-3xl space-y-4">
            <p className="text-xs text-ios-subtle dark:text-ios-dark-subtle">
              בונוס, פרויקט פרילנס, מתנה או כל הכנסה שאינה חלק מהשכר החודשי הקבוע.
            </p>

            {/* Add income form */}
            <div className="bg-ios-gray-6 dark:bg-ios-dark-fill rounded-2xl p-3 space-y-2.5">
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-[11px] font-semibold text-ios-subtle dark:text-ios-dark-subtle mb-1 block">סכום (₪)</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    placeholder="0"
                    value={incomeFormAmount}
                    onChange={(e) => setIncomeFormAmount(e.target.value)}
                    className="w-full bg-white dark:bg-ios-dark-card rounded-xl px-3 py-2.5 text-sm text-ios-text dark:text-ios-dark-text outline-none"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-[11px] font-semibold text-ios-subtle dark:text-ios-dark-subtle mb-1 block">תאריך</label>
                  <input
                    type="date"
                    value={incomeFormDate}
                    onChange={(e) => setIncomeFormDate(e.target.value)}
                    className="w-full bg-white dark:bg-ios-dark-card rounded-xl px-3 py-2.5 text-sm text-ios-text dark:text-ios-dark-text outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-ios-subtle dark:text-ios-dark-subtle mb-1 block">תיאור (אופציונלי)</label>
                <input
                  type="text"
                  placeholder="בונוס שנתי, פרויקט..."
                  value={incomeFormDescription}
                  onChange={(e) => setIncomeFormDescription(e.target.value)}
                  className="w-full bg-white dark:bg-ios-dark-card rounded-xl px-3 py-2.5 text-sm text-ios-text dark:text-ios-dark-text outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-ios-subtle dark:text-ios-dark-subtle mb-1 block">חשבון</label>
                <select
                  value={incomeFormAccountId}
                  onChange={(e) => setIncomeFormAccountId(e.target.value)}
                  className="w-full bg-white dark:bg-ios-dark-card rounded-xl px-3 py-2.5 text-sm text-ios-text dark:text-ios-dark-text outline-none"
                >
                  <option value="">בחר חשבון...</option>
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>{acc.name}</option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={handleAddIncome}
                disabled={isAddingIncome}
                className="w-full py-2.5 rounded-xl bg-ios-green text-white text-sm font-semibold flex items-center justify-center gap-1.5 disabled:opacity-60"
              >
                <Plus className="w-4 h-4" />
                {isAddingIncome ? 'מוסיף...' : 'הוספת הכנסה'}
              </button>
            </div>

            {/* Income entries list */}
            {!incomeEntriesLoaded ? (
              <p className="text-xs text-ios-subtle dark:text-ios-dark-subtle text-center py-2">טוען...</p>
            ) : incomeEntries.length === 0 ? (
              <p className="text-xs text-ios-subtle dark:text-ios-dark-subtle text-center py-2">אין הכנסות חד-פעמיות עדיין</p>
            ) : (
              <div className="bg-ios-gray-6 dark:bg-ios-dark-fill rounded-xl divide-y divide-gray-200/50 dark:divide-white/10 overflow-hidden">
                {incomeEntries.map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between px-3 py-3 gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-ios-text dark:text-ios-dark-text">
                        ₪{Math.round(entry.amount).toLocaleString('he-IL')}
                        {entry.description && (
                          <span className="font-normal text-ios-subtle dark:text-ios-dark-subtle"> · {entry.description}</span>
                        )}
                      </p>
                      <p className="text-xs text-ios-subtle dark:text-ios-dark-subtle mt-0.5">
                        {new Date(entry.date).toLocaleDateString('he-IL')} · {entry.accountName}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteIncome(entry.id)}
                      disabled={deletingIncomeId === entry.id}
                      className="text-ios-red/70 hover:text-ios-red p-1 disabled:opacity-50 flex-shrink-0"
                      aria-label="מחיקת הכנסה"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
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
      <AccountShareSheet
        isOpen={shareSheetAccount !== null}
        accountName={shareSheetAccount?.name ?? ''}
        inviteMethod={shareSheetMethod}
        inviteEmail={shareSheetEmail}
        inviteEmailIsValid={shareSheetEmailIsValid}
        isLoading={shareSheetLoading}
        onClose={closeAccountShareSheet}
        onMethodChange={setShareSheetMethod}
        onEmailChange={setShareSheetEmail}
        onSubmit={createInviteFromShareSheet}
      />

      <AccountInfoSheet
        isOpen={infoSheetAccount !== null}
        accountName={infoSheetAccount?.name ?? ''}
        accountType={infoSheetAccount?.type ?? 'PRIVATE'}
        monthlyIncome={infoSheetAccount ? contributionPlansByAccount[infoSheetAccount.id] ?? infoSheetAccount.income ?? 0 : 0}
        members={infoSheetAccount?.members ?? []}
        currentUserId={currentUser?.id ?? ''}
        removingUserId={infoRemovingUserId}
        onClose={closeAccountInfoSheet}
        onRemoveMember={handleRemoveMemberFromInfo}
      />
    </div>
  );
}
