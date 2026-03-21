'use client';

import { completeOnboarding } from '@/app/actions';
import type { AccountType } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';

type OnboardingTemplate = 'personalOnly' | 'personalShared' | 'custom';
type OnboardingStep = 1 | 2 | 3 | 4 | 5;
type OnboardingAccountDraft = {
  id: string;
  type: AccountType;
  name: string;
  income: string;
};

type OnboardingDraft = {
  template: OnboardingTemplate;
  accounts: OnboardingAccountDraft[];
  inviteAccountDraftId: string | null;
  invitedEmail: string;
  monthlyIncomeNet: string;
  autoSplitContributions: boolean;
  personalSplitAmount: number;
};

type OnboardingSuccess = {
  inviteUrl: string | null;
  createdAccounts: Array<{ id: string; name: string; type: 'PRIVATE' | 'SHARED' }>;
};

const DRAFT_STORAGE_KEY = 'lumiflow:onboarding-draft:v1';

function createDraftAccount(type: AccountType = 'PRIVATE', partial?: Partial<OnboardingAccountDraft>): OnboardingAccountDraft {
  return {
    id: partial?.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    name: partial?.name ?? (type === 'PRIVATE' ? 'החשבון האישי שלי' : 'חשבון משותף'),
    income: partial?.income ?? '',
  };
}

const DEFAULT_DRAFT: OnboardingDraft = {
  template: 'personalOnly',
  accounts: [createDraftAccount('PRIVATE')],
  inviteAccountDraftId: null,
  invitedEmail: '',
  monthlyIncomeNet: '',
  autoSplitContributions: true,
  personalSplitAmount: 0,
};

function getTemplateLabel(template: OnboardingTemplate) {
  if (template === 'personalOnly') return 'אישי בלבד';
  if (template === 'personalShared') return 'אישי + משותף';
  return 'מותאם אישית';
}

export default function OnboardingClient() {
  const router = useRouter();
  const [step, setStep] = useState<OnboardingStep>(1);
  const [draft, setDraft] = useState<OnboardingDraft>(DEFAULT_DRAFT);
  const [didHydrateDraft, setDidHydrateDraft] = useState(false);
  const [showResumeNotice, setShowResumeNotice] = useState(false);
  const [result, setResult] = useState<OnboardingSuccess | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const parseOptionalNonNegativeNumber = (value: string) => {
    const trimmedValue = value.trim();
    if (!trimmedValue) return null;
    const parsed = Number(trimmedValue);
    if (!Number.isFinite(parsed) || parsed < 0) return null;
    return parsed;
  };

  useEffect(() => {
    try {
      const rawDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (!rawDraft) {
        setDidHydrateDraft(true);
        return;
      }

      const parsed = JSON.parse(rawDraft) as Partial<OnboardingDraft> & {
        createPersonal?: boolean;
        createShared?: boolean;
        sharedAccountName?: string;
      };
      const parsedAccounts = Array.isArray(parsed.accounts) ? parsed.accounts : [];
      const restoredAccounts = parsedAccounts.length > 0
        ? parsedAccounts
          .filter((account) => account && (account.type === 'PRIVATE' || account.type === 'SHARED'))
          .map((account) => createDraftAccount(account.type, {
            id: typeof account.id === 'string' && account.id ? account.id : undefined,
            name: typeof account.name === 'string' && account.name.trim() ? account.name.trim() : undefined,
            income: typeof account.income === 'string' ? account.income : '',
          }))
        : (() => {
            const migratedAccounts: OnboardingAccountDraft[] = [];
            if (parsed.createPersonal !== false) {
              migratedAccounts.push(createDraftAccount('PRIVATE'));
            }
            if (parsed.createShared) {
              migratedAccounts.push(createDraftAccount('SHARED', {
                name: typeof parsed.sharedAccountName === 'string' && parsed.sharedAccountName.trim()
                  ? parsed.sharedAccountName.trim()
                  : 'חשבון משותף',
              }));
            }
            return migratedAccounts;
          })();

      const restored: OnboardingDraft = {
        template: parsed.template === 'personalShared' || parsed.template === 'custom' || parsed.template === 'personalOnly'
          ? parsed.template
          : DEFAULT_DRAFT.template,
        accounts: restoredAccounts,
        inviteAccountDraftId: typeof parsed.inviteAccountDraftId === 'string' && parsed.inviteAccountDraftId
          ? parsed.inviteAccountDraftId
          : null,
        invitedEmail: typeof parsed.invitedEmail === 'string' ? parsed.invitedEmail : DEFAULT_DRAFT.invitedEmail,
        monthlyIncomeNet: typeof parsed.monthlyIncomeNet === 'string' ? parsed.monthlyIncomeNet : DEFAULT_DRAFT.monthlyIncomeNet,
        autoSplitContributions: typeof parsed.autoSplitContributions === 'boolean'
          ? parsed.autoSplitContributions
          : DEFAULT_DRAFT.autoSplitContributions,
        personalSplitAmount: typeof parsed.personalSplitAmount === 'number' && Number.isFinite(parsed.personalSplitAmount)
          ? Math.max(0, Math.round(parsed.personalSplitAmount))
          : DEFAULT_DRAFT.personalSplitAmount,
      };

      setDraft(restored);
      setShowResumeNotice(true);
    } catch {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
    } finally {
      setDidHydrateDraft(true);
    }
  }, []);

  useEffect(() => {
    if (!didHydrateDraft || result) return;
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
  }, [draft, didHydrateDraft, result]);

  const totalSteps = 5;
  const progress = useMemo(() => Math.round((step / totalSteps) * 100), [step]);
  const incomeValue = Number(draft.monthlyIncomeNet);
  const hasIncomeInput = draft.monthlyIncomeNet.trim() !== '' && Number.isFinite(incomeValue) && incomeValue >= 0;
  const hasPersonalAccount = draft.accounts.some((account) => account.type === 'PRIVATE');
  const sharedAccounts = draft.accounts.filter((account) => account.type === 'SHARED');
  const hasSharedAccount = sharedAccounts.length > 0;
  const hasAdditionalAccount = hasPersonalAccount && hasSharedAccount;
  const personalSplitAmount = hasIncomeInput
    ? Math.max(0, Math.min(Math.round(draft.personalSplitAmount), Math.round(incomeValue)))
    : 0;
  const sharedSplitAmount = hasIncomeInput
    ? Math.max(Math.round(incomeValue) - personalSplitAmount, 0)
    : 0;
  const accountTargets = useMemo(() => {
    return draft.accounts.map((account) => account.name.trim() || (account.type === 'PRIVATE' ? 'חשבון אישי' : 'חשבון משותף'));
  }, [draft.accounts]);

  useEffect(() => {
    if (hasAdditionalAccount) return;
    setDraft((prev) => (prev.autoSplitContributions || prev.personalSplitAmount !== 0
      ? { ...prev, autoSplitContributions: false, personalSplitAmount: 0 }
      : prev));
  }, [hasAdditionalAccount]);

  useEffect(() => {
    setDraft((prev) => {
      const sharedIds = prev.accounts
        .filter((account) => account.type === 'SHARED')
        .map((account) => account.id);
      const fallbackId = sharedIds[0] ?? null;
      if (!prev.inviteAccountDraftId) {
        if (fallbackId === null) return prev;
        return { ...prev, inviteAccountDraftId: fallbackId };
      }
      if (sharedIds.includes(prev.inviteAccountDraftId)) return prev;
      return { ...prev, inviteAccountDraftId: fallbackId };
    });
  }, [draft.accounts]);

  useEffect(() => {
    if (!hasIncomeInput) return;
    setDraft((prev) => {
      if (prev.personalSplitAmount <= incomeValue) return prev;
      return {
        ...prev,
        personalSplitAmount: Math.max(0, Math.round(incomeValue)),
      };
    });
  }, [hasIncomeInput, incomeValue]);

  const applyTemplate = (value: OnboardingTemplate) => {
    if (value === 'personalOnly') {
      setDraft((prev) => ({
        ...prev,
        template: value,
        accounts: [createDraftAccount('PRIVATE')],
        inviteAccountDraftId: null,
      }));
      return;
    }
    if (value === 'personalShared') {
      const privateAccount = createDraftAccount('PRIVATE');
      const sharedAccount = createDraftAccount('SHARED');
      setDraft((prev) => ({
        ...prev,
        template: value,
        accounts: [privateAccount, sharedAccount],
        inviteAccountDraftId: sharedAccount.id,
      }));
      return;
    }
    setDraft((prev) => ({
      ...prev,
      template: value,
      accounts: [],
      inviteAccountDraftId: null,
      autoSplitContributions: false,
      personalSplitAmount: 0,
    }));
  };

  const goNextStep = () => {
    setError('');
    if (step === 2 && draft.accounts.length === 0) {
      setError('צריך לבחור לפחות חשבון אחד כדי להמשיך.');
      return;
    }

    if (step === 2) {
      const duplicateKeys = new Set<string>();
      for (let i = 0; i < draft.accounts.length; i += 1) {
        const account = draft.accounts[i];
        const accountLabel = `חשבון ${i + 1}`;
        if (!account.name.trim()) {
          setError(`יש להזין שם עבור ${accountLabel}.`);
          return;
        }
        const incomeInput = account.income.trim();
        if (incomeInput && parseOptionalNonNegativeNumber(incomeInput) == null) {
          setError(`יש להזין הכנסה תקינה עבור ${accountLabel}.`);
          return;
        }
        const duplicateKey = `${account.type}:${account.name.trim().toLowerCase()}`;
        if (duplicateKeys.has(duplicateKey)) {
          setError('נמצאו חשבונות כפולים עם אותו סוג ושם. נא לעדכן לפני המשך.');
          return;
        }
        duplicateKeys.add(duplicateKey);
      }
    }

    if (step === 3 && draft.monthlyIncomeNet.trim() !== '') {
      const parsedIncome = Number(draft.monthlyIncomeNet);
      if (!Number.isFinite(parsedIncome) || parsedIncome < 0) {
        setError('יש להזין הכנסה נטו תקינה או להשאיר ריק.');
        return;
      }
    }

    setStep((prev) => (prev < totalSteps ? (prev + 1) as OnboardingStep : prev));
  };

  const goBackStep = () => {
    setError('');
    setStep((prev) => (prev > 1 ? (prev - 1) as OnboardingStep : prev));
  };

  const submitOnboarding = async () => {
    setLoading(true);
    setError('');

    const sharedAccountForInvite = sharedAccounts.find((account) => account.id === draft.inviteAccountDraftId) ?? sharedAccounts[0];

    const res = await completeOnboarding({
      createPersonal: hasPersonalAccount,
      createShared: hasSharedAccount,
      sharedAccountName: sharedAccountForInvite?.name,
      accounts: draft.accounts.map((account) => ({
        draftId: account.id,
        name: account.name.trim(),
        type: account.type,
        income: parseOptionalNonNegativeNumber(account.income),
      })),
      inviteAccountDraftId: draft.inviteAccountDraftId,
      invitedEmail: draft.invitedEmail,
      monthlyIncomeNet: hasIncomeInput ? incomeValue : null,
      autoSplitContributions: draft.autoSplitContributions,
      personalContributionAmount: hasAdditionalAccount && draft.autoSplitContributions ? personalSplitAmount : null,
    });

    setLoading(false);
    if (!res.success) {
      if (res.code === 'AUTH_STALE') {
        setError('הסשן התיישן. מרעננים את הדף ומנסים שוב.');
        router.refresh();
        return;
      }

      setError(res.error ?? 'השלמת האשף נכשלה');
      return;
    }

    localStorage.removeItem(DRAFT_STORAGE_KEY);
    setShowResumeNotice(false);
    setResult({
      inviteUrl: res.inviteUrl ?? null,
      createdAccounts: res.createdAccounts ?? [],
    });
  };

  const resetDraft = () => {
    setDraft(DEFAULT_DRAFT);
    setStep(1);
    setError('');
    setShowResumeNotice(false);
    localStorage.removeItem(DRAFT_STORAGE_KEY);
  };

  const goToDashboard = () => {
    router.push('/');
    router.refresh();
  };

  return (
    <main className="min-h-screen bg-ios-bg dark:bg-ios-dark-bg flex items-center justify-center px-5 transition-colors">
      <section className="w-full max-w-md bg-ios-card dark:bg-ios-dark-card rounded-2xl shadow-card p-6 space-y-5">
        <header className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-ios-subtle dark:text-ios-dark-subtle">שלב {step} מתוך {totalSteps}</p>
            <button
              type="button"
              onClick={resetDraft}
              className="text-xs font-semibold text-ios-blue"
            >
              התחלה מחדש
            </button>
          </div>
          <div className="h-2 rounded-full bg-ios-gray-6 dark:bg-ios-dark-fill overflow-hidden">
            <div className="h-full bg-ios-blue transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-ios-text dark:text-ios-dark-text">אשף פתיחה</h1>
            <p className="text-sm text-ios-subtle dark:text-ios-dark-subtle">נגדיר את LumiFlow בצורה נעימה ויציבה כבר מהכניסה הראשונה.</p>
          </div>
        </header>

        {showResumeNotice && (
          <div className="rounded-xl bg-ios-blue/10 dark:bg-ios-blue/20 border border-ios-blue/20 px-3 py-2.5 text-xs text-ios-text dark:text-ios-dark-text">
            מצאנו טיוטת אשף קודמת ושיחזרנו אותה. אפשר להמשיך מאיפה שהפסקת.
          </div>
        )}

        {step === 1 && (
          <div className="space-y-3">
            <p className="text-sm font-semibold text-ios-text dark:text-ios-dark-text">איך תרצה להתחיל?</p>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => applyTemplate('personalOnly')}
                data-testid="onboarding-template-personalOnly"
                className={`w-full rounded-xl border px-4 py-3 text-right ${draft.template === 'personalOnly' ? 'border-ios-blue bg-ios-blue/10' : 'border-gray-200 dark:border-white/10'}`}
              >
                <p className="text-sm font-semibold text-ios-text dark:text-ios-dark-text">אישי בלבד</p>
                <p className="text-xs text-ios-subtle dark:text-ios-dark-subtle">לניהול כספים אישי ללא שותפים.</p>
              </button>
              <button
                type="button"
                onClick={() => applyTemplate('personalShared')}
                data-testid="onboarding-template-personalShared"
                className={`w-full rounded-xl border px-4 py-3 text-right ${draft.template === 'personalShared' ? 'border-ios-blue bg-ios-blue/10' : 'border-gray-200 dark:border-white/10'}`}
              >
                <p className="text-sm font-semibold text-ios-text dark:text-ios-dark-text">אישי + משותף</p>
                <p className="text-xs text-ios-subtle dark:text-ios-dark-subtle">חשבון אישי וחשבון משותף בשלב אחד.</p>
              </button>
              <button
                type="button"
                onClick={() => applyTemplate('custom')}
                data-testid="onboarding-template-custom"
                className={`w-full rounded-xl border px-4 py-3 text-right ${draft.template === 'custom' ? 'border-ios-blue bg-ios-blue/10' : 'border-gray-200 dark:border-white/10'}`}
              >
                <p className="text-sm font-semibold text-ios-text dark:text-ios-dark-text">מותאם אישית</p>
                <p className="text-xs text-ios-subtle dark:text-ios-dark-subtle">בחירה ידנית מלאה לכל שלב.</p>
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <p className="text-sm font-semibold text-ios-text dark:text-ios-dark-text">הגדרת חשבונות</p>
            <p className="text-xs text-ios-subtle dark:text-ios-dark-subtle">
              כאן אפשר לנהל חשבונות כמו במסך ההגדרות: סוג חשבון, שם והכנסה חודשית.
            </p>
            <div className="space-y-2">
              {draft.accounts.map((account, index) => (
                <div key={account.id} data-testid="onboarding-account-card" className="rounded-xl bg-ios-gray-6 dark:bg-ios-dark-fill p-3 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-ios-subtle dark:text-ios-dark-subtle">חשבון {index + 1}</p>
                    <button
                      type="button"
                      data-testid="onboarding-account-remove"
                      onClick={() => setDraft((prev) => ({
                        ...prev,
                        template: 'custom',
                        accounts: prev.accounts.filter((entry) => entry.id !== account.id),
                      }))}
                      className="p-1 rounded-lg text-ios-red/80 hover:text-ios-red"
                      aria-label={`מחיקת חשבון ${index + 1}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-ios-subtle dark:text-ios-dark-subtle">סוג חשבון</label>
                    <select
                      data-testid="onboarding-account-type"
                      value={account.type}
                      onChange={(e) => setDraft((prev) => ({
                        ...prev,
                        template: 'custom',
                        accounts: prev.accounts.map((entry) => (
                          entry.id === account.id
                            ? { ...entry, type: e.target.value as AccountType }
                            : entry
                        )),
                      }))}
                      className="w-full bg-white dark:bg-ios-dark-card rounded-xl px-3 py-2.5 text-sm text-ios-text dark:text-ios-dark-text"
                    >
                      <option value="PRIVATE">פרטי</option>
                      <option value="SHARED">משותף</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-ios-subtle dark:text-ios-dark-subtle">שם חשבון</label>
                    <input
                      data-testid="onboarding-account-name"
                      value={account.name}
                      onChange={(e) => setDraft((prev) => ({
                        ...prev,
                        template: 'custom',
                        accounts: prev.accounts.map((entry) => (
                          entry.id === account.id
                            ? { ...entry, name: e.target.value }
                            : entry
                        )),
                      }))}
                      className="w-full bg-white dark:bg-ios-dark-card rounded-xl px-3 py-2.5 text-sm text-ios-text dark:text-ios-dark-text"
                      placeholder={account.type === 'PRIVATE' ? 'למשל: חשבון אישי' : 'למשל: חשבון בית'}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-ios-subtle dark:text-ios-dark-subtle">הכנסה חודשית לחשבון</label>
                    <input
                      data-testid="onboarding-account-income"
                      value={account.income}
                      onChange={(e) => setDraft((prev) => ({
                        ...prev,
                        template: 'custom',
                        accounts: prev.accounts.map((entry) => (
                          entry.id === account.id
                            ? { ...entry, income: e.target.value }
                            : entry
                        )),
                      }))}
                      className="w-full bg-white dark:bg-ios-dark-card rounded-xl px-3 py-2.5 text-sm text-ios-text dark:text-ios-dark-text"
                      placeholder="0"
                      type="number"
                      min={0}
                      dir="ltr"
                    />
                  </div>
                </div>
              ))}
              {draft.accounts.length === 0 && (
                <div className="rounded-xl border border-dashed border-gray-300 dark:border-white/15 px-3 py-3 text-xs text-ios-subtle dark:text-ios-dark-subtle text-center">
                  עדיין לא נוספו חשבונות. אפשר להתחיל מהוספת אישי או משותף.
                </div>
              )}
            </div>
            <button
              type="button"
              data-testid="onboarding-add-account"
              onClick={() => setDraft((prev) => ({
                ...prev,
                template: 'custom',
                accounts: [...prev.accounts, createDraftAccount('PRIVATE')],
              }))}
              className="w-full py-2.5 rounded-xl bg-ios-blue text-white text-sm font-semibold flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              יצירת חשבון
            </button>
            {hasSharedAccount && sharedAccounts.length > 1 && (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-ios-subtle dark:text-ios-dark-subtle">חשבון משותף להזמנה בשלב הבא</label>
                <select
                  data-testid="onboarding-invite-shared-account"
                  value={draft.inviteAccountDraftId ?? sharedAccounts[0].id}
                  onChange={(e) => setDraft((prev) => ({ ...prev, inviteAccountDraftId: e.target.value, template: 'custom' }))}
                  className="w-full bg-ios-gray-6 dark:bg-ios-dark-fill rounded-xl px-3 py-2.5 text-sm text-ios-text dark:text-ios-dark-text"
                >
                  {sharedAccounts.map((account) => (
                    <option key={account.id} value={account.id}>{account.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3">
            <p className="text-sm font-semibold text-ios-text dark:text-ios-dark-text">הכנסה נטו ותרומות (אופציונלי)</p>
            <p className="text-sm text-ios-subtle dark:text-ios-dark-subtle">
              אפשר להגדיר הכנסה חודשית נטו, ובמידה שנבחר גם חשבון אישי וגם חשבון משותף לבצע פיצול חכם ביניהם.
            </p>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-ios-subtle dark:text-ios-dark-subtle">הכנסה נטו חודשית</label>
              <input
                data-testid="onboarding-monthly-income"
                value={draft.monthlyIncomeNet}
                onChange={(e) => setDraft((prev) => ({ ...prev, monthlyIncomeNet: e.target.value }))}
                className="w-full bg-ios-gray-6 dark:bg-ios-dark-fill rounded-xl px-3 py-2.5 text-sm text-ios-text dark:text-ios-dark-text"
                placeholder="למשל 12000"
                type="number"
                min={0}
                dir="ltr"
              />
            </div>

            {hasAdditionalAccount && (
              <>
                <label className="flex items-center gap-3 bg-ios-gray-6 dark:bg-ios-dark-fill rounded-xl px-4 py-3">
                  <input
                    data-testid="onboarding-auto-split"
                    type="checkbox"
                    checked={draft.autoSplitContributions}
                    onChange={(e) => setDraft((prev) => ({ ...prev, autoSplitContributions: e.target.checked }))}
                  />
                  <span className="text-sm font-medium text-ios-text dark:text-ios-dark-text">
                    פיצול חכם של תרומה חודשית בין אישי למשותף
                  </span>
                </label>

                {draft.autoSplitContributions && hasIncomeInput && (
                  <div className="rounded-xl bg-ios-gray-6 dark:bg-ios-dark-fill px-4 py-3 space-y-2.5">
                    <p className="text-xs font-semibold text-ios-subtle dark:text-ios-dark-subtle">
                      פיצול לפי סכום: חשבון משותף מול חשבון אישי
                    </p>
                    <input
                      data-testid="onboarding-personal-split-slider"
                      type="range"
                      min={0}
                      max={Math.max(Math.round(incomeValue), 0)}
                      step={1}
                      value={sharedSplitAmount}
                      onChange={(e) => {
                        const nextSharedAmount = Number(e.target.value);
                        const nextPersonalAmount = Math.max(Math.round(incomeValue) - nextSharedAmount, 0);
                        setDraft((prev) => ({ ...prev, personalSplitAmount: nextPersonalAmount }));
                      }}
                      className="w-full accent-ios-blue"
                      dir="rtl"
                    />
                    <div className="flex items-center justify-between text-xs text-ios-subtle dark:text-ios-dark-subtle">
                      <span>משותף ₪{sharedSplitAmount.toLocaleString('he-IL')}</span>
                      <span>אישי ₪{personalSplitAmount.toLocaleString('he-IL')}</span>
                    </div>
                  </div>
                )}

                {draft.autoSplitContributions && !hasIncomeInput && (
                  <div className="rounded-xl bg-ios-gray-6 dark:bg-ios-dark-fill px-3 py-2.5">
                    <p className="text-xs text-ios-subtle dark:text-ios-dark-subtle">
                      כדי להציג סליידר סכומים צריך להזין קודם הכנסה נטו חודשית.
                    </p>
                  </div>
                )}

                {hasIncomeInput && draft.autoSplitContributions && (
                  <div className="rounded-xl bg-ios-blue/10 dark:bg-ios-blue/20 border border-ios-blue/20 px-3 py-2.5 space-y-1.5">
                    <p className="text-xs text-ios-subtle dark:text-ios-dark-subtle">
                      אישי: כ-{personalSplitAmount.toLocaleString('he-IL')} ₪
                    </p>
                    <p className="text-xs text-ios-subtle dark:text-ios-dark-subtle">
                      משותף: כ-{sharedSplitAmount.toLocaleString('he-IL')} ₪
                    </p>
                    <p className="text-xs text-ios-subtle dark:text-ios-dark-subtle">
                      חשבונות מתוכננים: {accountTargets.join(' + ')}
                    </p>
                  </div>
                )}
              </>
            )}

            {!hasAdditionalAccount && (
              <div className="rounded-xl bg-ios-gray-6 dark:bg-ios-dark-fill px-3 py-2.5">
                <p className="text-xs text-ios-subtle dark:text-ios-dark-subtle">
                  פיצול חכם זמין אחרי בחירה של חשבון אישי + חשבון משותף בשלב הקודם.
                </p>
              </div>
            )}

            <p className="text-xs text-ios-subtle dark:text-ios-dark-subtle">
              אפשר לדלג על השלב הזה ולעדכן אחר כך דרך ההגדרות.
            </p>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-3">
            <p className="text-sm font-semibold text-ios-text dark:text-ios-dark-text">הזמנת שותף/ה</p>
            {!hasSharedAccount ? (
              <div className="rounded-2xl bg-white/28 dark:bg-ios-dark-card/42 backdrop-blur-xl border border-white/20 dark:border-white/10 px-4 py-3 text-sm text-ios-subtle dark:text-ios-dark-subtle">
                לא נבחר חשבון משותף, אפשר לדלג לשלב הסיום.
              </div>
            ) : (
              <>
                <p className="text-sm text-ios-subtle dark:text-ios-dark-subtle">
                  אפשר להוסיף כתובת אימייל להזמנה מיידית לחשבון {sharedAccounts.find((account) => account.id === draft.inviteAccountDraftId)?.name ?? sharedAccounts[0].name}, או לדלג וליצור לינק שיתוף כללי.
                </p>
                <input
                  data-testid="onboarding-invite-email"
                  value={draft.invitedEmail}
                  onChange={(e) => setDraft((prev) => ({ ...prev, invitedEmail: e.target.value }))}
                  className="w-full bg-ios-gray-6 dark:bg-ios-dark-fill rounded-xl px-3 py-2.5 text-sm text-ios-text dark:text-ios-dark-text"
                  placeholder="name@example.com (אופציונלי)"
                  type="email"
                />
              </>
            )}
          </div>
        )}

        {step === 5 && !result && (
          <div className="space-y-3">
            <p className="text-sm font-semibold text-ios-text dark:text-ios-dark-text">סיכום לפני סיום</p>
            <div className="rounded-xl bg-ios-gray-6 dark:bg-ios-dark-fill p-3 space-y-2 text-sm">
              <p className="text-ios-subtle dark:text-ios-dark-subtle">תבנית: <span className="font-semibold text-ios-text dark:text-ios-dark-text">{getTemplateLabel(draft.template)}</span></p>
              <p className="text-ios-subtle dark:text-ios-dark-subtle">מספר חשבונות: <span className="font-semibold text-ios-text dark:text-ios-dark-text">{draft.accounts.length}</span></p>
              {draft.accounts.map((account) => (
                <p key={account.id} className="text-ios-subtle dark:text-ios-dark-subtle">
                  {account.type === 'PRIVATE' ? 'פרטי' : 'משותף'}: <span className="font-semibold text-ios-text dark:text-ios-dark-text">{account.name}</span>
                  {' '}· הכנסה: <span className="font-semibold text-ios-text dark:text-ios-dark-text">
                    {parseOptionalNonNegativeNumber(account.income) != null ? `₪${Math.round(parseOptionalNonNegativeNumber(account.income) ?? 0).toLocaleString('he-IL')}` : 'לא הוגדרה'}
                  </span>
                </p>
              ))}
              <p className="text-ios-subtle dark:text-ios-dark-subtle">
                הכנסה נטו חודשית: <span className="font-semibold text-ios-text dark:text-ios-dark-text">{hasIncomeInput ? `₪${Math.round(incomeValue).toLocaleString('he-IL')}` : 'לא הוגדרה'}</span>
              </p>
              <p className="text-ios-subtle dark:text-ios-dark-subtle">
                פיצול חכם לתרומות: <span className="font-semibold text-ios-text dark:text-ios-dark-text">{draft.autoSplitContributions ? 'פעיל' : 'כבוי'}</span>
              </p>
              {hasAdditionalAccount && draft.autoSplitContributions && hasIncomeInput && (
                <p className="text-ios-subtle dark:text-ios-dark-subtle">
                  פיצול אישי/משותף: <span className="font-semibold text-ios-text dark:text-ios-dark-text">₪{personalSplitAmount.toLocaleString('he-IL')} / ₪{sharedSplitAmount.toLocaleString('he-IL')}</span>
                </p>
              )}
              {hasSharedAccount && (
                <p className="text-ios-subtle dark:text-ios-dark-subtle">אימייל הזמנה: <span className="font-semibold text-ios-text dark:text-ios-dark-text">{draft.invitedEmail.trim() || 'ללא אימייל (לינק כללי)'}</span></p>
              )}
            </div>
          </div>
        )}

        {result && (
          <div className="rounded-xl bg-ios-green/10 border border-ios-green/20 p-4 space-y-3">
            <h2 className="text-lg font-bold text-ios-text dark:text-ios-dark-text">מוכן! החשבונות נוצרו בהצלחה</h2>
            <div className="space-y-1 text-sm">
              {result.createdAccounts.map((account) => (
                <p key={account.id} className="text-ios-subtle dark:text-ios-dark-subtle">
                  {account.type === 'PRIVATE' ? 'אישי' : 'משותף'}: <span className="font-semibold text-ios-text dark:text-ios-dark-text">{account.name}</span>
                </p>
              ))}
            </div>
            {result.inviteUrl && (
              <div className="space-y-2">
                <p className="text-sm text-ios-text dark:text-ios-dark-text">לינק שיתוף מוכן:</p>
                <p data-testid="onboarding-invite-url" className="text-xs text-ios-subtle dark:text-ios-dark-subtle break-all">{result.inviteUrl}</p>
                <button
                  type="button"
                  onClick={async () => {
                    await navigator.clipboard.writeText(result.inviteUrl ?? '');
                  }}
                  className="w-full py-2.5 rounded-lg bg-white dark:bg-ios-dark-card text-sm font-medium border border-gray-200 dark:border-white/10 text-ios-text dark:text-ios-dark-text"
                >
                  העתק לינק שיתוף
                </button>
              </div>
            )}
            <button
              data-testid="onboarding-continue-dashboard"
              type="button"
              onClick={goToDashboard}
              className="w-full py-3 rounded-xl bg-ios-blue text-white font-semibold"
            >
              מעבר לדשבורד
            </button>
          </div>
        )}

        {error && <p className="text-sm text-ios-red">{error}</p>}

        {!result && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={goBackStep}
              disabled={step === 1 || loading}
              className="flex-1 py-3 rounded-xl bg-ios-gray-6 dark:bg-ios-dark-fill text-ios-text dark:text-ios-dark-text font-semibold disabled:opacity-50"
            >
              חזרה
            </button>
            {step < 5 ? (
              <button
                type="button"
                onClick={goNextStep}
                disabled={loading}
                className="flex-1 py-3 rounded-xl bg-ios-blue text-white font-semibold disabled:opacity-50"
              >
                המשך
              </button>
            ) : (
              <button
                data-testid="onboarding-submit"
                type="button"
                onClick={submitOnboarding}
                disabled={loading}
                className="flex-1 py-3 rounded-xl bg-ios-blue text-white font-semibold disabled:opacity-50"
              >
                {loading ? 'שומר...' : 'סיום והתחלה'}
              </button>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
