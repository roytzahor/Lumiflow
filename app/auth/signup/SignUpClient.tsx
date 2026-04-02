'use client';

import GoogleSignInButton from '@/components/auth/GoogleSignInButton';
import AuthThemeToggle from '@/components/AuthThemeToggle';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { useState } from 'react';

type SignUpClientProps = {
  googleAuthEnabled: boolean;
};

export default function SignUpClient({ googleAuthEnabled }: SignUpClientProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const callbackUrl = '/onboarding';

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });

    const payload = await response.json();
    if (!response.ok) {
      setLoading(false);
      setError(payload.error ?? 'Registration failed');
      return;
    }

    const signInResult = await signIn('credentials', {
      email,
      password,
      callbackUrl,
      redirect: false,
    });

    setLoading(false);
    if (!signInResult || signInResult.error) {
      setError('החשבון נוצר, אנא התחבר');
      return;
    }

    window.location.href = callbackUrl;
  };

  const inputClassName =
    'w-full rounded-xl px-4 py-3 text-ios-text dark:text-ios-dark-text bg-white dark:bg-[#111a2e] border border-gray-200 dark:border-white/20 placeholder:text-gray-400 dark:placeholder:text-ios-dark-subtle/90 focus:outline-none focus:ring-2 focus:ring-ios-blue/45 focus:border-ios-blue/35 transition-shadow shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]';

  return (
    <main className="min-h-screen bg-ios-bg dark:bg-ios-dark-bg dark:bg-[radial-gradient(120%_85%_at_50%_0%,rgba(42,102,237,0.22),rgba(6,13,28,1))] flex items-center justify-center px-5 py-8 transition-colors">
      <div className="w-full max-w-sm bg-ios-card/95 dark:bg-ios-dark-card/95 rounded-3xl shadow-card p-6 space-y-4 border border-gray-100 dark:border-white/10 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <p className="text-xs text-ios-subtle dark:text-ios-dark-subtle">יצירת משתמש חדש</p>
          <AuthThemeToggle />
        </div>
        <h1 className="text-3xl font-bold text-ios-text dark:text-ios-dark-text tracking-tight">יצירת חשבון חדש</h1>

        {googleAuthEnabled && (
          <>
            <GoogleSignInButton callbackUrl={callbackUrl} disabled={loading} />
            <div className="relative flex items-center gap-3 py-1">
              <span className="h-px flex-1 bg-gray-200 dark:bg-white/15" />
              <span className="text-xs text-ios-subtle dark:text-ios-dark-subtle shrink-0">או עם אימייל</span>
              <span className="h-px flex-1 bg-gray-200 dark:bg-white/15" />
            </div>
          </>
        )}

        <form onSubmit={onSubmit} className="space-y-4">
          <input
            data-testid="signup-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="שם (אופציונלי)"
            className={inputClassName}
          />
          <input
            data-testid="signup-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="אימייל"
            dir="ltr"
            className={inputClassName}
          />
          <input
            data-testid="signup-password"
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="סיסמה"
            dir="ltr"
            className={inputClassName}
          />
          {error && <p className="text-sm text-ios-red">{error}</p>}
          <button
            data-testid="signup-submit"
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-ios-blue text-white font-semibold shadow-[0_10px_24px_rgba(42,102,237,0.34)] hover:brightness-105 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {loading ? 'יוצר...' : 'צור חשבון'}
          </button>
        </form>
        <p className="text-sm text-ios-subtle dark:text-ios-dark-subtle">
          כבר יש לך חשבון?{' '}
          <Link
            href={`/auth/signin?callbackUrl=${encodeURIComponent('/onboarding')}`}
            className="text-ios-blue font-medium"
          >
            התחבר
          </Link>
        </p>
      </div>
    </main>
  );
}
