'use client';

type InsightsErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function InsightsError({ error, reset }: InsightsErrorProps) {
  return (
    <main className="min-h-screen bg-ios-bg dark:bg-ios-dark-bg flex items-center justify-center px-5 transition-colors">
      <section className="w-full max-w-md bg-ios-card dark:bg-ios-dark-card rounded-2xl shadow-card p-6 space-y-3">
        <h1 className="text-xl font-bold text-ios-text dark:text-ios-dark-text">לא הצלחנו לטעון את התובנות</h1>
        <p className="text-sm text-ios-subtle dark:text-ios-dark-subtle">
          בעיה זמנית בניתוח הנתונים. אפשר לנסות שוב.
        </p>
        {process.env.NODE_ENV !== 'production' && (
          <p className="text-xs text-ios-subtle dark:text-ios-dark-subtle break-all">{error.message}</p>
        )}
        <button
          type="button"
          onClick={reset}
          className="w-full py-3 rounded-xl bg-ios-blue text-white font-semibold active:scale-[0.96] transition-transform"
        >
          נסה שוב
        </button>
      </section>
    </main>
  );
}
