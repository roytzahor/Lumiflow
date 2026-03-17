'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

export default function SignUpPage() {
  const searchParams = useSearchParams();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const callbackUrl = searchParams.get('callbackUrl') || '/onboarding';

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

    window.location.href = signInResult.url ?? '/';
  };

  const signUpWithProvider = async (provider: 'google' | 'apple' | 'facebook') => {
    await signIn(provider, { callbackUrl: '/onboarding' });
  };

  return (
    <main className="min-h-screen bg-ios-bg flex items-center justify-center px-5">
      <form onSubmit={onSubmit} className="w-full max-w-sm bg-white rounded-2xl shadow-card p-6 space-y-4">
        <h1 className="text-2xl font-bold text-gray-900">יצירת חשבון חדש</h1>
        <div className="space-y-2">
          <button type="button" onClick={() => signUpWithProvider('google')} className="w-full py-2.5 rounded-xl bg-ios-gray-6 text-sm font-medium">המשך עם Google</button>
          <button type="button" onClick={() => signUpWithProvider('apple')} className="w-full py-2.5 rounded-xl bg-ios-gray-6 text-sm font-medium">המשך עם Apple</button>
          <button type="button" onClick={() => signUpWithProvider('facebook')} className="w-full py-2.5 rounded-xl bg-ios-gray-6 text-sm font-medium">המשך עם Facebook</button>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-px bg-gray-200 flex-1" />
          <span className="text-xs text-gray-400">או הרשמה עם אימייל וסיסמה</span>
          <div className="h-px bg-gray-200 flex-1" />
        </div>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="שם (אופציונלי)"
          className="w-full bg-ios-gray-6 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-ios-blue/30"
        />
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="אימייל"
          dir="ltr"
          className="w-full bg-ios-gray-6 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-ios-blue/30"
        />
        <input
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="סיסמה"
          dir="ltr"
          className="w-full bg-ios-gray-6 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-ios-blue/30"
        />
        {error && <p className="text-sm text-ios-red">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-xl bg-ios-blue text-white font-semibold disabled:opacity-50"
        >
          {loading ? 'יוצר...' : 'צור חשבון'}
        </button>
        <p className="text-sm text-gray-500">
          כבר יש לך חשבון?{' '}
          <Link
            href={`/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`}
            className="text-ios-blue font-medium"
          >
            התחבר
          </Link>
        </p>
      </form>
    </main>
  );
}
