import SignInClient from './SignInClient';
import { Suspense } from 'react';

function SignInFallback() {
  return (
    <main className="min-h-screen bg-ios-bg dark:bg-ios-dark-bg flex items-center justify-center px-5 py-8">
      <div className="w-full max-w-sm rounded-3xl border border-gray-100 dark:border-white/10 p-8 animate-pulse bg-ios-card/50 dark:bg-ios-dark-card/50 h-80" />
    </main>
  );
}

export default function SignInPage() {
  const googleAuthEnabled = Boolean(
    process.env.GOOGLE_CLIENT_ID?.trim() && process.env.GOOGLE_CLIENT_SECRET?.trim()
  );

  return (
    <Suspense fallback={<SignInFallback />}>
      <SignInClient googleAuthEnabled={googleAuthEnabled} />
    </Suspense>
  );
}
