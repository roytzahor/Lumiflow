'use client';

import { completeOnboarding } from '@/app/actions';
import type { AccountType } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';

type OnboardingTemplate = 'personalOnly' | 'personalShared' | 'custom';
type OnboardingStep = 1 | 2 | 3 | 4 | 5;
type OnboardingAccountDraft = {
  id: string;
  type: AccountType;
  name: string;
};

type OnboardingDraft = {
  template: OnboardingTemplate;
  accounts: OnboardingAccountDraft[];
  inviteAccountDraftId: string | null;
  invitedEmail: string;
  monthlyIncomeInput: string;
  autoSplitContributions: boolean;
  personalContributionAmount: number;
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
  };
}

const DEFAULT_DRAFT: OnboardingDraft = {
  template: 'personalOnly',
  accounts: [createDraftAccount('PRIVATE')],
  inviteAccountDraftId: null,
  invitedEmail: '',
  monthlyIncomeInput: '',
  autoSplitContributions: false,
  personalContributionAmount: 0,
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
        monthlyIncomeInput: typeof parsed.monthlyIncomeInput === 'string' ? parsed.monthlyIncomeInput : DEFAULT_DRAFT.monthlyIncomeInput,
        autoSplitContributions: typeof parsed.autoSplitContributions === 'boolean'
          ? parsed.autoSplitContributions
          : DEFAULT_DRAFT.autoSplitContributions,
        personalContributionAmount: typeof parsed.personalContributionAmount === 'number' && Number.isFinite(parsed.personalContributionAmount)
          ? parsed.personalContributionAmount
          : DEFAULT_DRAFT.personalContributionAmount,
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
  const hasPersonalAccount = draft.accounts.some((account) => account.type === 'PRIVATE');
  const sharedAccounts = draft.accounts.filter((account) => account.type === 'SHARED');
  const hasSharedAccount = sharedAccounts.length > 0;
  const showIncomeSplitControls = hasPersonalAccount && hasSharedAccount;
  const parsedMonthlyIncome = useMemo(() => {
    const raw = draft.monthlyIncomeInput.trim();
    if (raw === '') return null;
    const n = Number(raw);
    return Number.isFinite(n) && n >= 0 ? n : null;
  }, [draft.monthlyIncomeInput]);

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
        const duplicateKey = `${account.type}:${account.name.trim().toLowerCase()}`;
        if (duplicateKeys.has(duplicateKey)) {
          setError('נמצאו חשבונות כפולים עם אותו סוג ושם. נא לעדכן לפני המשך.');
          return;
        }
        duplicateKeys.add(duplicateKey);
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
      })),
      inviteAccountDraftId: draft.inviteAccountDraftId,
      invitedEmail: draft.invitedEmail,
      monthlyIncomeNet: parsedMonthlyIncome,
      autoSplitContributions: draft.autoSplitContributions,
      personalContributionAmount:
        draft.autoSplitContributions && showIncomeSplitControls
          ? draft.personalContributionAmount
          : null,
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
    window.location.href = '/';
  };

  const signInCallbackPath = '/auth/signin?callbackUrl=%2Fonboarding';

  const handleSwitchAccount = () => {
    void signOut({ callbackUrl: signInCallbackPath });
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
              כאן אפשר להגדיר את סוג החשבון ואת שמו כמו במסך ההגדרות.
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
            <p className="text-sm font-semibold text-ios-text dark:text-ios-dark-text">הכנסה חודשית (אופציונלי)</p>
            <p className="text-xs text-ios-subtle dark:text-ios-dark-subtle">
              אפשר לדלג — תמיד אפשר לעדכן מאוחר יותר בהגדרות. אם יש חשבון אישי ומשותף, אפשר לחלק את ההכנסה ביניהם.
            </p>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-ios-subtle dark:text-ios-dark-subtle">הכנסה נטו חודשית (₪)</label>
              <input
                data-testid="onboarding-monthly-income"
                inputMode="decimal"
                value={draft.monthlyIncomeInput}
                onChange={(e) => {
                  const v = e.target.value;
                  setDraft((prev) => {
                    const trimmed = v.trim();
                    const n = trimmed === '' ? null : Number(trimmed);
                    const inc = n != null && Number.isFinite(n) && n >= 0 ? n : null;
                    let pc = prev.personalContributionAmount;
                    if (inc != null && prev.autoSplitContributions) {
                      pc = Math.min(Math.max(pc, 0), inc);
                      if (inc > 0 && (pc === 0 || Number.isNaN(pc))) {
                        pc = inc / 2;
                      }
                    }
                    return { ...prev, monthlyIncomeInput: v, personalContributionAmount: pc };
                  });
                }}
                className="w-full bg-ios-gray-6 dark:bg-ios-dark-fill rounded-xl px-3 py-2.5 text-sm text-ios-text dark:text-ios-dark-text"
                placeholder="למשל: 12000"
              />
            </div>
            {showIncomeSplitControls && (
              <div className="space-y-2 rounded-xl border border-gray-200 dark:border-white/10 p-3">
                <label className="flex items-center gap-2 text-sm text-ios-text dark:text-ios-dark-text cursor-pointer">
                  <input
                    type="checkbox"
                    data-testid="onboarding-auto-split"
                    checked={draft.autoSplitContributions}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setDraft((prev) => {
                        const inc = prev.monthlyIncomeInput.trim() === ''
                          ? null
                          : Number(prev.monthlyIncomeInput.trim());
                        const income = inc != null && Number.isFinite(inc) && inc >= 0 ? inc : null;
                        return {
                          ...prev,
                          autoSplitContributions: checked,
                          personalContributionAmount:
                            checked && income != null && income > 0 ? income / 2 : prev.personalContributionAmount,
                        };
                      });
                    }}
                    className="rounded border-gray-300"
                  />
                  <span>חלוקה אוטומטית בין אישי למשותף</span>
                </label>
                {draft.autoSplitContributions && parsedMonthlyIncome != null && parsedMonthlyIncome > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs text-ios-subtle dark:text-ios-dark-subtle">
                      אישי ₪{Math.round(draft.personalContributionAmount).toLocaleString('he-IL')} · משותף ₪
                      {Math.max(0, Math.round(parsedMonthlyIncome - draft.personalContributionAmount)).toLocaleString('he-IL')}
                    </p>
                    <input
                      type="range"
                      data-testid="onboarding-personal-split-slider"
                      min={0}
                      max={parsedMonthlyIncome}
                      step={1}
                      value={Math.min(Math.max(draft.personalContributionAmount, 0), parsedMonthlyIncome)}
                      onChange={(e) => setDraft((prev) => ({
                        ...prev,
                        personalContributionAmount: Number(e.target.value),
                      }))}
                      className="w-full"
                    />
                  </div>
                )}
              </div>
            )}
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
                </p>
              ))}
              {hasSharedAccount && (
                <p className="text-ios-subtle dark:text-ios-dark-subtle">אימייל הזמנה: <span className="font-semibold text-ios-text dark:text-ios-dark-text">{draft.invitedEmail.trim() || 'ללא אימייל (לינק כללי)'}</span></p>
              )}
              {parsedMonthlyIncome != null && (
                <p className="text-ios-subtle dark:text-ios-dark-subtle">הכנסה חודשית: <span className="font-semibold text-ios-text dark:text-ios-dark-text">₪{parsedMonthlyIncome.toLocaleString('he-IL')}</span></p>
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
            {step < totalSteps ? (
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

        {!result && (
          <div className="pt-4 border-t border-gray-200/80 dark:border-white/10 space-y-2 text-center">
            <p className="text-xs text-ios-subtle dark:text-ios-dark-subtle">
              לא החשבון הנכון? התנתקו ואז תוכלו להתחבר עם משתמש אחר.
            </p>
            <button
              type="button"
              onClick={handleSwitchAccount}
              className="text-xs font-semibold text-ios-blue hover:underline"
            >
              התנתקות ומעבר למסך כניסה
            </button>
          </div>
        )}
      </section>
    </main>
  );
}
