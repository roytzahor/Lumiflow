'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

export default function SignInPage() {
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
    window.location.href = res.url ?? '/';
  };

  const signInWithProvider = async (provider: 'google') => {
    await signIn(provider, { callbackUrl });
  };

  return (
    <main className="min-h-screen bg-ios-bg flex items-center justify-center px-5">
      <form onSubmit={onSubmit} className="w-full max-w-sm bg-white rounded-2xl shadow-card p-6 space-y-4">
        <h1 className="text-2xl font-bold text-gray-900">כניסה ל־LumiFlow</h1>
        <div className="space-y-2">
          <button type="button" onClick={() => signInWithProvider('google')} className="w-full py-2.5 rounded-xl bg-ios-gray-6 text-sm font-medium">המשך עם Google</button>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-px bg-gray-200 flex-1" />
          <span className="text-xs text-gray-400">או עם אימייל וסיסמה</span>
          <div className="h-px bg-gray-200 flex-1" />
        </div>
        <input
          data-testid="signin-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="אימייל"
          dir="ltr"
          className="w-full bg-ios-gray-6 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-ios-blue/30"
        />
        <input
          data-testid="signin-password"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="סיסמה"
          dir="ltr"
          className="w-full bg-ios-gray-6 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-ios-blue/30"
        />
        {error && <p className="text-sm text-ios-red">{error}</p>}
        <button
          data-testid="signin-submit"
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-xl bg-ios-blue text-white font-semibold disabled:opacity-50"
        >
          {loading ? 'נכנס...' : 'כניסה'}
        </button>
        <p className="text-sm text-gray-500">
          משתמש חדש?{' '}
          <Link
            href={`/auth/signup?callbackUrl=${encodeURIComponent(callbackUrl)}`}
            className="text-ios-blue font-medium"
          >
            צור חשבון
          </Link>
        </p>
      </form>
    </main>
  );
}
