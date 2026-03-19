'use client';

import { completeOnboarding } from '@/app/actions';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

type OnboardingTemplate = 'personalOnly' | 'personalShared' | 'custom';
type OnboardingStep = 1 | 2 | 3 | 4 | 5;

type OnboardingDraft = {
  template: OnboardingTemplate;
  createPersonal: boolean;
  createShared: boolean;
  sharedAccountName: string;
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
const DEFAULT_DRAFT: OnboardingDraft = {
  template: 'personalOnly',
  createPersonal: true,
  createShared: false,
  sharedAccountName: 'חשבון משותף',
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

  useEffect(() => {
    try {
      const rawDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (!rawDraft) {
        setDidHydrateDraft(true);
        return;
      }

      const parsed = JSON.parse(rawDraft) as Partial<OnboardingDraft>;
      const restored: OnboardingDraft = {
        template: parsed.template === 'personalShared' || parsed.template === 'custom' || parsed.template === 'personalOnly'
          ? parsed.template
          : DEFAULT_DRAFT.template,
        createPersonal: typeof parsed.createPersonal === 'boolean' ? parsed.createPersonal : DEFAULT_DRAFT.createPersonal,
        createShared: typeof parsed.createShared === 'boolean' ? parsed.createShared : DEFAULT_DRAFT.createShared,
        sharedAccountName: typeof parsed.sharedAccountName === 'string' && parsed.sharedAccountName.trim()
          ? parsed.sharedAccountName.trim()
          : DEFAULT_DRAFT.sharedAccountName,
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
  const hasAdditionalAccount = draft.createPersonal && draft.createShared;
  const personalSplitAmount = hasIncomeInput
    ? Math.max(0, Math.min(Math.round(draft.personalSplitAmount), Math.round(incomeValue)))
    : 0;
  const sharedSplitAmount = hasIncomeInput
    ? Math.max(Math.round(incomeValue) - personalSplitAmount, 0)
    : 0;
  const accountTargets = useMemo(() => {
    const labels: string[] = [];
    if (draft.createPersonal) labels.push('חשבון אישי');
    if (draft.createShared) labels.push(draft.sharedAccountName.trim() || 'חשבון משותף');
    return labels;
  }, [draft.createPersonal, draft.createShared, draft.sharedAccountName]);
  useEffect(() => {
    if (hasAdditionalAccount) return;
    setDraft((prev) => (prev.autoSplitContributions || prev.personalSplitAmount !== 0
      ? { ...prev, autoSplitContributions: false, personalSplitAmount: 0 }
      : prev));
  }, [hasAdditionalAccount]);

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
    setDraft((prev) => ({ ...prev, template: value }));
    if (value === 'personalOnly') {
      setDraft((prev) => ({ ...prev, createPersonal: true, createShared: false }));
      return;
    }
    if (value === 'personalShared') {
      setDraft((prev) => ({ ...prev, createPersonal: true, createShared: true }));
    }
  };

  const goNextStep = () => {
    setError('');
    if (step === 2 && !draft.createPersonal && !draft.createShared) {
      setError('צריך לבחור לפחות חשבון אחד כדי להמשיך.');
      return;
    }

    if (step === 2 && draft.createShared && !draft.sharedAccountName.trim()) {
      setError('צריך לבחור שם לחשבון המשותף.');
      return;
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

    const res = await completeOnboarding({
      createPersonal: draft.createPersonal,
      createShared: draft.createShared,
      sharedAccountName: draft.sharedAccountName,
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
            <label className="flex items-center gap-3 bg-ios-gray-6 dark:bg-ios-dark-fill rounded-xl px-4 py-3">
              <input
                data-testid="onboarding-personal"
                type="checkbox"
                checked={draft.createPersonal}
                onChange={(e) => setDraft((prev) => ({ ...prev, createPersonal: e.target.checked, template: 'custom' }))}
              />
              <span className="text-sm font-medium text-ios-text dark:text-ios-dark-text">חשבון אישי</span>
            </label>
            <label className="flex items-center gap-3 bg-ios-gray-6 dark:bg-ios-dark-fill rounded-xl px-4 py-3">
              <input
                data-testid="onboarding-shared"
                type="checkbox"
                checked={draft.createShared}
                onChange={(e) => setDraft((prev) => ({ ...prev, createShared: e.target.checked, template: 'custom' }))}
              />
              <span className="text-sm font-medium text-ios-text dark:text-ios-dark-text">חשבון משותף</span>
            </label>
            {draft.createShared && (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-ios-subtle dark:text-ios-dark-subtle">שם לחשבון המשותף</label>
                <input
                  data-testid="onboarding-shared-name"
                  value={draft.sharedAccountName}
                  onChange={(e) => setDraft((prev) => ({ ...prev, sharedAccountName: e.target.value }))}
                  className="w-full bg-ios-gray-6 dark:bg-ios-dark-fill rounded-xl px-3 py-2.5 text-sm text-ios-text dark:text-ios-dark-text"
                  placeholder="חשבון משותף"
                />
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
                      פיצול לפי סכום: חשבון אישי מול חשבון משותף
                    </p>
                    <input
                      data-testid="onboarding-personal-split-slider"
                      type="range"
                      min={0}
                      max={Math.max(Math.round(incomeValue), 0)}
                      step={1}
                      value={personalSplitAmount}
                      onChange={(e) => setDraft((prev) => ({ ...prev, personalSplitAmount: Number(e.target.value) }))}
                      className="w-full accent-ios-blue"
                      dir="ltr"
                    />
                    <div className="flex items-center justify-between text-xs text-ios-subtle dark:text-ios-dark-subtle">
                      <span>אישי ₪{personalSplitAmount.toLocaleString('he-IL')}</span>
                      <span>משותף ₪{sharedSplitAmount.toLocaleString('he-IL')}</span>
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
            {!draft.createShared ? (
              <div className="rounded-xl bg-ios-gray-6 dark:bg-ios-dark-fill px-4 py-3 text-sm text-ios-subtle dark:text-ios-dark-subtle">
                לא נבחר חשבון משותף, אפשר לדלג לשלב הסיום.
              </div>
            ) : (
              <>
                <p className="text-sm text-ios-subtle dark:text-ios-dark-subtle">
                  אפשר להוסיף כתובת אימייל להזמנה מיידית, או לדלג וליצור לינק שיתוף כללי.
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
              <p className="text-ios-subtle dark:text-ios-dark-subtle">חשבון אישי: <span className="font-semibold text-ios-text dark:text-ios-dark-text">{draft.createPersonal ? 'כן' : 'לא'}</span></p>
              <p className="text-ios-subtle dark:text-ios-dark-subtle">חשבון משותף: <span className="font-semibold text-ios-text dark:text-ios-dark-text">{draft.createShared ? draft.sharedAccountName : 'לא נבחר'}</span></p>
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
              {draft.createShared && (
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
