import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="min-h-screen bg-ios-bg dark:bg-ios-dark-bg flex items-center justify-center px-5 transition-colors" dir="rtl">
      <section className="w-full max-w-md bg-ios-card dark:bg-ios-dark-card rounded-2xl shadow-card p-6 space-y-4 text-center">
        <p className="text-5xl font-black text-ios-blue tabular-nums">404</p>
        <h1 className="text-xl font-bold text-ios-text dark:text-ios-dark-text">הדף לא נמצא</h1>
        <p className="text-sm text-ios-subtle dark:text-ios-dark-subtle text-pretty">
          הקישור שגוי, או שהדף הוסר. חזרה לדשבורד תפתור את זה.
        </p>
        <Link
          href="/"
          className="block w-full py-3 rounded-xl bg-ios-blue text-white font-semibold active:scale-[0.96] transition-transform"
        >
          חזרה לדשבורד
        </Link>
      </section>
    </main>
  );
}
