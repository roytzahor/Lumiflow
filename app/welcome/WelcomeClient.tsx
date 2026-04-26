'use client';

import { updateCurrentUserProfile, updateThemePreference } from '@/app/actions';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

type ThemePref = 'LIGHT' | 'DARK' | 'SYSTEM';

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
  const [name, setName] = useState(initialName);
  const [themePreference, setThemePreference] = useState<ThemePref>(initialTheme);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setTheme(mapThemePreferenceToClientTheme(themePreference));
  }, [setTheme, themePreference]);

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
    router.push('/');
    router.refresh();
  };

  return (
    <main className="min-h-screen bg-ios-bg dark:bg-ios-dark-bg flex items-center justify-center px-5 py-8 transition-colors">
      <section className="w-full max-w-md bg-ios-card dark:bg-ios-dark-card rounded-2xl shadow-card p-6 space-y-5">
        <header className="space-y-2">
          <h1 className="text-2xl font-bold text-ios-text dark:text-ios-dark-text">ברוכים הבאים ל-LumiFlow</h1>
          <p className="text-sm text-ios-subtle dark:text-ios-dark-subtle">
            החשבון האישי שלכם מוכן. עדכנו כאן שם תצוגה ומצב תצוגה, ולחצו להמשך לדשבורד — הכל ניתן לשינוי בהגדרות בכל עת.
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
              className="w-full bg-ios-gray-6 dark:bg-ios-dark-fill rounded-xl px-3 py-2.5 text-sm text-ios-text dark:text-ios-dark-text"
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
                  className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition ${
                    themePreference === t
                      ? 'border-ios-blue bg-ios-blue/10 text-ios-blue'
                      : 'border-gray-200 dark:border-white/10 text-ios-text dark:text-ios-dark-text'
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
          className="w-full py-3 rounded-xl bg-ios-blue text-white font-semibold disabled:opacity-50"
        >
          {saving ? 'שומר...' : 'המשך לדשבורד'}
        </button>
      </section>
    </main>
  );
}
