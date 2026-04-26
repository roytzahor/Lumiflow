'use client';

import GoogleSignInButton from '@/components/auth/GoogleSignInButton';
import AuthThemeToggle from '@/components/AuthThemeToggle';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';

type SignInClientProps = {
  googleAuthEnabled: boolean;
};

export default function SignInClient({ googleAuthEnabled }: SignInClientProps) {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const callbackUrl = searchParams.get('callbackUrl') || '/';

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const res = await signIn('credentials', {
      email,
      password,
      callbackUrl,
      redirect: false,
    });

    setLoading(false);
    if (!res || res.error) {
      setError('אימייל או סיסמה לא נכונים');
      return;
    }
    window.location.href = callbackUrl;
  };

  const inputClassName =
    'w-full rounded-xl px-4 py-3 text-ios-text dark:text-ios-dark-text bg-ios-card dark:bg-ios-dark-card border border-gray-200/50 dark:border-white/10 placeholder:text-ios-subtle dark:placeholder:text-ios-dark-subtle/90 focus:outline-none focus:ring-2 focus:ring-ios-blue/45 focus:border-ios-blue/35 transition-shadow shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]';

  return (
    <main className="min-h-screen bg-ios-bg dark:bg-ios-dark-bg dark:bg-[radial-gradient(120%_85%_at_50%_0%,rgba(42,102,237,0.22),rgba(6,13,28,1))] flex items-center justify-center px-5 py-8 transition-colors">
      <div className="w-full max-w-sm bg-ios-card/95 dark:bg-ios-dark-card/95 rounded-3xl shadow-card p-6 space-y-4 border border-gray-200/50 dark:border-white/10 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <p className="text-xs text-ios-subtle dark:text-ios-dark-subtle">ברוך/ה הבא/ה</p>
          <AuthThemeToggle />
        </div>
        <h1 className="text-3xl font-bold text-ios-text dark:text-ios-dark-text tracking-tight">כניסה ל־LumiFlow</h1>

        {googleAuthEnabled && (
          <>
            <GoogleSignInButton callbackUrl={callbackUrl} disabled={loading} />
            <div className="relative flex items-center gap-3 py-1">
              <span className="h-px flex-1 bg-ios-gray-5 dark:bg-white/15" />
              <span className="text-xs text-ios-subtle dark:text-ios-dark-subtle shrink-0">או עם אימייל</span>
              <span className="h-px flex-1 bg-ios-gray-5 dark:bg-white/15" />
            </div>
          </>
        )}

        <form onSubmit={onSubmit} className="space-y-4">
          <input
            data-testid="signin-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="אימייל"
            dir="ltr"
            className={inputClassName}
          />
          <input
            data-testid="signin-password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="סיסמה"
            dir="ltr"
            className={inputClassName}
          />
          {error && <p className="text-sm text-ios-red">{error}</p>}
          <button
            data-testid="signin-submit"
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-ios-blue text-white font-semibold shadow-[0_10px_24px_rgba(42,102,237,0.34)] hover:brightness-105 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {loading ? 'נכנס...' : 'כניסה'}
          </button>
        </form>
        <p className="text-sm text-ios-subtle dark:text-ios-dark-subtle">
          משתמש חדש?{' '}
          <Link
            href={`/auth/signup?callbackUrl=${encodeURIComponent(callbackUrl)}`}
            className="text-ios-blue font-medium"
          >
            צור חשבון
          </Link>
        </p>
      </div>
    </main>
  );
}
