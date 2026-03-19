'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

type DashboardLoadErrorProps = {
  message?: string;
};

export default function DashboardLoadError({ message }: DashboardLoadErrorProps) {
  const router = useRouter();
  const [retrying, setRetrying] = useState(false);

  return (
    <main className="min-h-screen bg-ios-bg dark:bg-ios-dark-bg flex items-center justify-center px-5 transition-colors">
      <section className="w-full max-w-md bg-ios-card dark:bg-ios-dark-card rounded-2xl shadow-card p-6 space-y-3">
        <h1 className="text-xl font-bold text-ios-text dark:text-ios-dark-text">לא הצלחנו לטעון את הדשבורד</h1>
        <p className="text-sm text-ios-subtle dark:text-ios-dark-subtle">
          נשארים כאן ולא מחזירים אותך לאשף. אפשר לנסות שוב מייד.
        </p>
        {message && (
          <p className="text-xs text-ios-subtle dark:text-ios-dark-subtle break-all">{message}</p>
        )}
        <button
          data-testid="dashboard-retry"
          type="button"
          onClick={() => {
            setRetrying(true);
            router.refresh();
          }}
          disabled={retrying}
          className="w-full py-3 rounded-xl bg-ios-blue text-white font-semibold disabled:opacity-50"
        >
          {retrying ? 'טוען מחדש...' : 'נסה שוב'}
        </button>
      </section>
    </main>
  );
}
