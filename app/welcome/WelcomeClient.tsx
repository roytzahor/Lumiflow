'use client';

import { completeOnboarding, updateCurrentUserProfile, updateThemePreference } from '@/app/actions';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Copy, User, Users } from 'lucide-react';
import { toast } from 'sonner';

type ThemePref = 'LIGHT' | 'DARK' | 'SYSTEM';
type WelcomeStep = 'profile' | 'mode' | 'shared-setup' | 'invite';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function mapThemePreferenceToClientTheme(theme: ThemePref): 'light' | 'dark' | 'system' {
  if (theme === 'LIGHT') return 'light';
  if (theme === 'DARK') return 'dark';
  return 'system';
}

type WelcomeClientProps = {
  initialName: string;
  initialTheme: ThemePref;
};

export default function WelcomeClient({ initialName, initialTheme }: WelcomeClientProps) {
  const router = useRouter();
  const { setTheme } = useTheme();
  const [step, setStep] = useState<WelcomeStep>('profile');
  const [name, setName] = useState(initialName);
  const [themePreference, setThemePreference] = useState<ThemePref>(initialTheme);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [sharedName, setSharedName] = useState('');
  const [partnerEmail, setPartnerEmail] = useState('');
  const [creatingShared, setCreatingShared] = useState(false);
  const [sharedError, setSharedError] = useState('');
  const [inviteUrl, setInviteUrl] = useState('');

  useEffect(() => {
    setTheme(mapThemePreferenceToClientTheme(themePreference));
  }, [setTheme, themePreference]);

  const goToDashboard = () => {
    router.push('/');
    router.refresh();
  };

  const onSaveAndContinue = async () => {
    setSaving(true);
    setError('');
    const nameRes = await updateCurrentUserProfile({ name: name.trim() || undefined });
    if (!nameRes.success) {
      setSaving(false);
      setError(nameRes.error ?? 'שמירה נכשלה');
      return;
    }
    const themeRes = await updateThemePreference(themePreference);
    if (!themeRes.success) {
      setSaving(false);
      setError(themeRes.error ?? 'שמירה נכשלה');
      return;
    }
    setSaving(false);
    setStep('mode');
  };

  const onChooseSolo = () => {
    goToDashboard();
  };

  const onChooseShared = () => {
    setStep('shared-setup');
  };

  const partnerEmailIsValid = !partnerEmail.trim() || EMAIL_REGEX.test(partnerEmail.trim());

  const onCreateSharedAccount = async () => {
    if (!partnerEmailIsValid) {
      setSharedError('נראה שכתובת האימייל אינה תקינה');
      return;
    }
    setSharedError('');
    setCreatingShared(true);
    const res = await completeOnboarding({
      createShared: true,
      sharedAccountName: sharedName.trim() || undefined,
      invitedEmail: partnerEmail.trim() || undefined,
    });
    setCreatingShared(false);

    if (!res.success) {
      setSharedError(res.error ?? 'יצירת החשבון המשותף נכשלה');
      return;
    }

    if (res.inviteUrl) {
      setInviteUrl(res.inviteUrl);
      setStep('invite');
      return;
    }

    goToDashboard();
  };

  const onCopyInviteLink = async () => {
    await navigator.clipboard.writeText(inviteUrl);
    toast.success('הועתק!');
  };

  return (
    <main className="min-h-screen bg-ios-bg dark:bg-ios-dark-bg flex items-center justify-center px-5 py-8 transition-colors">
      <section className="w-full max-w-md bg-ios-card dark:bg-ios-dark-card rounded-2xl shadow-card border border-gray-200/50 dark:border-white/10 p-6 space-y-5">
        {step === 'profile' ? (
          <>
            <header className="space-y-2">
              <h1 className="text-2xl font-bold text-ios-text dark:text-ios-dark-text">ברוכים הבאים ל-LumiFlow</h1>
              <p className="text-sm text-ios-subtle dark:text-ios-dark-subtle">
                החשבון האישי שלכם מוכן. עדכנו כאן שם תצוגה ומצב תצוגה, ולחצו להמשך — הכל ניתן לשינוי בהגדרות בכל עת.
              </p>
            </header>

            <div className="space-y-3">
              <label className="block space-y-1">
                <span className="text-xs font-semibold text-ios-subtle dark:text-ios-dark-subtle">שם תצוגה (אופציונלי)</span>
                <input
                  data-testid="welcome-name-input"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="איך לפנות אליך באפליקציה"
                  className="w-full bg-ios-gray-6 dark:bg-ios-dark-fill rounded-xl px-3 py-2.5 text-sm text-ios-text dark:text-ios-dark-text placeholder:text-ios-subtle dark:placeholder:text-ios-dark-subtle focus:outline-none focus:ring-2 focus:ring-ios-blue/30"
                />
              </label>

              <div className="space-y-2">
                <p className="text-xs font-semibold text-ios-subtle dark:text-ios-dark-subtle">מצב תצוגה</p>
                <div className="flex gap-2">
                  {(['LIGHT', 'DARK', 'SYSTEM'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      data-testid={`welcome-theme-${t.toLowerCase()}`}
                      onClick={() => setThemePreference(t)}
                      className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-[background-color,color,border-color] ${
                        themePreference === t
                          ? 'border-ios-blue bg-ios-blue/10 text-ios-blue'
                          : 'border-gray-200/50 dark:border-white/10 text-ios-text dark:text-ios-dark-text'
                      }`}
                    >
                      {t === 'LIGHT' ? 'בהיר' : t === 'DARK' ? 'כהה' : 'מערכת'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {error ? <p className="text-sm text-ios-red">{error}</p> : null}

            <button
              type="button"
              data-testid="welcome-continue"
              disabled={saving}
              onClick={() => void onSaveAndContinue()}
              className="w-full py-3 rounded-xl bg-ios-blue text-white font-semibold disabled:opacity-50 active:scale-[0.96] transition-[background-color,color,transform]"
            >
              {saving ? 'שומר...' : 'המשך'}
            </button>
          </>
        ) : null}

        {step === 'mode' ? (
          <>
            <header className="space-y-2">
              <h1 className="text-2xl font-bold text-ios-text dark:text-ios-dark-text">איך תרצו לנהל את הכספים?</h1>
              <p className="text-sm text-ios-subtle dark:text-ios-dark-subtle">
                אפשר לשנות את זה בכל עת מההגדרות.
              </p>
            </header>

            <div className="space-y-3">
              <button
                type="button"
                data-testid="welcome-mode-solo"
                onClick={onChooseSolo}
                className="w-full text-start flex items-center gap-3 rounded-xl bg-ios-gray-6 dark:bg-ios-dark-fill px-4 py-4 active:scale-[0.96] transition-[background-color,color,transform]"
              >
                <span className="w-10 h-10 shrink-0 rounded-full bg-ios-blue/10 text-ios-blue flex items-center justify-center">
                  <User className="w-5 h-5" aria-hidden />
                </span>
                <span className="space-y-0.5">
                  <span className="block text-sm font-semibold text-ios-text dark:text-ios-dark-text">לבד</span>
                  <span className="block text-xs text-ios-subtle dark:text-ios-dark-subtle">
                    אעקוב אחרי ההוצאות וההכנסות שלי באופן אישי
                  </span>
                </span>
              </button>

              <button
                type="button"
                data-testid="welcome-mode-shared"
                onClick={onChooseShared}
                className="w-full text-start flex items-center gap-3 rounded-xl bg-ios-gray-6 dark:bg-ios-dark-fill px-4 py-4 active:scale-[0.96] transition-[background-color,color,transform]"
              >
                <span className="w-10 h-10 shrink-0 rounded-full bg-ios-blue/10 text-ios-blue flex items-center justify-center">
                  <Users className="w-5 h-5" aria-hidden />
                </span>
                <span className="space-y-0.5">
                  <span className="block text-sm font-semibold text-ios-text dark:text-ios-dark-text">ביחד עם בן/בת זוג</span>
                  <span className="block text-xs text-ios-subtle dark:text-ios-dark-subtle">
                    ננהל יחד חשבון משותף ונראה כל אחד את החלק שלו
                  </span>
                </span>
              </button>
            </div>

            <button
              type="button"
              data-testid="welcome-skip"
              onClick={goToDashboard}
              className="w-full text-center text-sm text-ios-subtle dark:text-ios-dark-subtle underline active:scale-[0.96] transition-[background-color,color,transform]"
            >
              דלג, אני אגדיר בעצמי מאוחר יותר
            </button>
          </>
        ) : null}

        {step === 'shared-setup' ? (
          <>
            <header className="space-y-2">
              <h1 className="text-2xl font-bold text-ios-text dark:text-ios-dark-text">החשבון המשותף</h1>
              <p className="text-sm text-ios-subtle dark:text-ios-dark-subtle">
                אפשר להזמין את בן/בת הזוג עכשיו, או להמשיך בלעדיהם ולהזמין אותם מאוחר יותר מההגדרות.
              </p>
            </header>

            <div className="space-y-3">
              <label className="block space-y-1">
                <span className="text-xs font-semibold text-ios-subtle dark:text-ios-dark-subtle">שם החשבון המשותף</span>
                <input
                  data-testid="welcome-shared-name-input"
                  type="text"
                  value={sharedName}
                  onChange={(e) => setSharedName(e.target.value)}
                  placeholder="לדוגמה: חשבון הבית"
                  className="w-full bg-ios-gray-6 dark:bg-ios-dark-fill rounded-xl px-3 py-2.5 text-sm text-ios-text dark:text-ios-dark-text placeholder:text-ios-subtle dark:placeholder:text-ios-dark-subtle focus:outline-none focus:ring-2 focus:ring-ios-blue/30"
                />
              </label>

              <label className="block space-y-1">
                <span className="text-xs font-semibold text-ios-subtle dark:text-ios-dark-subtle">אימייל של בן/בת הזוג (אופציונלי)</span>
                <input
                  data-testid="welcome-shared-email-input"
                  type="email"
                  value={partnerEmail}
                  onChange={(e) => setPartnerEmail(e.target.value)}
                  placeholder="name@example.com"
                  dir="ltr"
                  className="w-full bg-ios-gray-6 dark:bg-ios-dark-fill rounded-xl px-3 py-2.5 text-sm text-ios-text dark:text-ios-dark-text placeholder:text-ios-subtle dark:placeholder:text-ios-dark-subtle focus:outline-none focus:ring-2 focus:ring-ios-blue/30"
                />
              </label>
            </div>

            {sharedError ? <p className="text-sm text-ios-red">{sharedError}</p> : null}

            <button
              type="button"
              data-testid="welcome-shared-submit"
              disabled={creatingShared || !partnerEmailIsValid}
              onClick={() => void onCreateSharedAccount()}
              className="w-full py-3 rounded-xl bg-ios-blue text-white font-semibold disabled:opacity-50 active:scale-[0.96] transition-[background-color,color,transform]"
            >
              {creatingShared ? 'יוצר...' : 'יצירת החשבון המשותף'}
            </button>

            <button
              type="button"
              data-testid="welcome-skip"
              onClick={goToDashboard}
              className="w-full text-center text-sm text-ios-subtle dark:text-ios-dark-subtle underline active:scale-[0.96] transition-[background-color,color,transform]"
            >
              דלג
            </button>
          </>
        ) : null}

        {step === 'invite' ? (
          <>
            <header className="space-y-2">
              <h1 className="text-2xl font-bold text-ios-text dark:text-ios-dark-text">החשבון המשותף מוכן!</h1>
              <p className="text-sm text-ios-subtle dark:text-ios-dark-subtle">
                שלחו לבן/בת הזוג את הקישור הזה כדי שיצטרפו:
              </p>
            </header>

            <div data-testid="welcome-invite-link" className="text-xs text-ios-subtle dark:text-ios-dark-subtle break-all bg-ios-gray-6 dark:bg-ios-dark-fill rounded-xl px-3 py-2.5">
              {inviteUrl}
            </div>

            <button
              type="button"
              data-testid="welcome-invite-copy"
              onClick={() => void onCopyInviteLink()}
              className="w-full py-2.5 rounded-xl bg-ios-blue text-white text-sm font-semibold flex items-center justify-center gap-1.5 active:scale-[0.96] transition-[background-color,color,transform]"
            >
              <Copy className="w-4 h-4" aria-hidden />
              העתקת קישור
            </button>

            <button
              type="button"
              data-testid="welcome-finish"
              onClick={goToDashboard}
              className="w-full py-3 rounded-xl bg-ios-gray-6 dark:bg-ios-dark-fill text-ios-text dark:text-ios-dark-text font-semibold active:scale-[0.96] transition-[background-color,color,transform]"
            >
              סיום, למעבר לדשבורד
            </button>
          </>
        ) : null}
      </section>
    </main>
  );
}
