import { getMonthlyStats, getRecurringTransactions } from "@/app/actions";
import BottomNav from "@/components/BottomNav";
import InsightsAI from "@/components/InsightsAI";
import { redirectToOnboardingIfNeeded } from "@/lib/onboarding";
import { format } from "date-fns";
import { he } from "date-fns/locale";

export const dynamic = "force-dynamic";

export default async function InsightsPage() {
  await redirectToOnboardingIfNeeded();

  const now = new Date();
  const [{ total, transactions }, recurring] = await Promise.all([
    getMonthlyStats(now.getFullYear(), now.getMonth()),
    getRecurringTransactions(),
  ]);

  const average = transactions.length > 0 ? total / transactions.length : 0;
  const topCategoryEntry = Object.entries(
    transactions.reduce<Record<string, number>>((acc, row) => {
      const key = row.category || "כללי";
      acc[key] = (acc[key] ?? 0) + row.amount;
      return acc;
    }, {})
  ).sort((a, b) => b[1] - a[1])[0];

  const thisMonthLabel = format(now, "MMMM yyyy", { locale: he });

  return (
    <main className="min-h-screen pb-28 px-5 pt-safe bg-ios-bg dark:bg-ios-dark-bg text-ios-text dark:text-ios-dark-text">
      <div className="max-w-md mx-auto py-8 space-y-4">
        <header className="mb-2">
          <h1 className="text-3xl font-bold tracking-tight">תובנות</h1>
          <p className="text-sm text-ios-subtle dark:text-ios-dark-subtle mt-0.5">{thisMonthLabel}</p>
          <div className="flex flex-wrap gap-2 mt-3">
            <span className="text-[11px] px-2.5 py-1 rounded-full bg-ios-indigo/10 text-ios-indigo">מגמות</span>
            <span className="text-[11px] px-2.5 py-1 rounded-full bg-ios-purple/10 text-ios-purple">אנומליות</span>
            <span className="text-[11px] px-2.5 py-1 rounded-full bg-ios-blue/10 text-ios-blue">צעדים מומלצים</span>
          </div>
        </header>

        <section className="bg-ios-card dark:bg-ios-dark-card rounded-3xl p-5 shadow-card">
          <h2 className="text-base font-bold mb-4">תמונת מצב חודשית</h2>
          <div className="space-y-2">
            <div className="flex items-center justify-between bg-ios-gray-6 dark:bg-ios-dark-fill rounded-xl px-4 py-3">
              <span className="text-sm text-ios-subtle dark:text-ios-dark-subtle">סה״כ הוצאות</span>
              <span className="text-lg font-bold tabular-nums">₪{total.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between bg-ios-gray-6 dark:bg-ios-dark-fill rounded-xl px-4 py-3">
              <span className="text-sm text-ios-subtle dark:text-ios-dark-subtle">ממוצע פעולה</span>
              <span className="text-lg font-bold tabular-nums">₪{Math.round(average).toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between bg-ios-gray-6 dark:bg-ios-dark-fill rounded-xl px-4 py-3">
              <span className="text-sm text-ios-subtle dark:text-ios-dark-subtle">קטגוריה מובילה</span>
              <span className="text-sm font-semibold">{topCategoryEntry ? `${topCategoryEntry[0]} · ₪${Math.round(topCategoryEntry[1]).toLocaleString()}` : "אין נתונים"}</span>
            </div>
            <div className="flex items-center justify-between bg-ios-gray-6 dark:bg-ios-dark-fill rounded-xl px-4 py-3">
              <span className="text-sm text-ios-subtle dark:text-ios-dark-subtle">הוצאות חוזרות פעילות</span>
              <span className="text-sm font-semibold">{recurring.length}</span>
            </div>
          </div>
        </section>

        <InsightsAI />
      </div>

      <BottomNav />
    </main>
  );
}
