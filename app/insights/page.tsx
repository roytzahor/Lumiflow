import { getCategoryAnomalies, getCategories } from "@/app/actions";
import BottomNav from "@/components/BottomNav";
import { formatIlsAmount } from "@/lib/formatters";
import { redirectToOnboardingIfNeeded } from "@/lib/onboarding";
import type { Category } from "@/lib/types";
import { format } from "date-fns";
import { he } from "date-fns/locale";

export const dynamic = "force-dynamic";

function getCategoryIcon(categories: Category[], categoryName: string): string {
  return categories.find((c) => c.name === categoryName)?.icon ?? "🛒";
}

export default async function InsightsPage() {
  await redirectToOnboardingIfNeeded();

  const now = new Date();
  const [{ anomalies, hasEnoughHistory }, categories] = await Promise.all([
    getCategoryAnomalies(),
    getCategories(),
  ]);

  const thisMonthLabel = format(now, "MMMM yyyy", { locale: he });

  return (
    <main className="min-h-screen pb-28 pt-safe bg-ios-bg dark:bg-ios-dark-bg text-ios-text dark:text-ios-dark-text">
      <div className="w-full max-w-md mx-auto px-5 py-8 space-y-4">
        <header className="mb-2">
          <h1 className="text-3xl font-bold tracking-tight">תובנות</h1>
          <p className="text-sm text-ios-subtle dark:text-ios-dark-subtle mt-0.5">{thisMonthLabel}</p>
        </header>

        <section>
          <h2 className="text-base font-bold mb-3">שינויים בולטים החודש</h2>

          {!hasEnoughHistory ? (
            <div className="bg-ios-card dark:bg-ios-dark-card rounded-3xl p-6 shadow-card text-center">
              <div className="w-12 h-12 rounded-full bg-ios-indigo/10 flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">📊</span>
              </div>
              <p className="text-sm font-semibold text-ios-text dark:text-ios-dark-text mb-1">
                עדיין אין מספיק היסטוריה
              </p>
              <p className="text-xs text-ios-subtle dark:text-ios-dark-subtle leading-relaxed">
                כדי לזהות שינויים בולטים נדרשים לפחות שני חודשים של נתונים. המשיכו לרשום הוצאות ותובנות יופיעו כאן.
              </p>
            </div>
          ) : anomalies.length === 0 ? (
            <div className="bg-ios-card dark:bg-ios-dark-card rounded-3xl p-6 shadow-card text-center">
              <div className="w-12 h-12 rounded-full bg-ios-green/10 flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">✅</span>
              </div>
              <p className="text-sm font-semibold text-ios-text dark:text-ios-dark-text mb-1">
                הכל בסדר החודש
              </p>
              <p className="text-xs text-ios-subtle dark:text-ios-dark-subtle leading-relaxed">
                לא זוהו שינויים בולטים בקטגוריות לעומת הממוצע החודשי הרגיל.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {anomalies.map((a) => {
                const icon = getCategoryIcon(categories, a.category);
                const isUp = a.direction === "up";
                return (
                  <div
                    key={`${a.accountName}-${a.category}`}
                    className="bg-ios-card dark:bg-ios-dark-card rounded-3xl p-4 shadow-card"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-gray-50 dark:bg-ios-dark-fill flex items-center justify-center text-xl flex-shrink-0">
                        {icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[15px] font-semibold text-ios-text dark:text-ios-dark-text truncate">
                            {a.category}
                          </span>
                          <span
                            className={`text-sm font-bold tabular-nums flex-shrink-0 ${
                              isUp ? "text-ios-red" : "text-ios-green"
                            }`}
                          >
                            {isUp ? "+" : "-"}₪{formatIlsAmount(Math.abs(Math.round(a.difference)))}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2 mt-0.5">
                          <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded-md text-ios-indigo bg-ios-indigo/8 truncate">
                            {a.accountName}
                          </span>
                          <span
                            className={`text-xs flex-shrink-0 ${
                              isUp ? "text-ios-red/80" : "text-ios-green/80"
                            }`}
                          >
                            {isUp ? "עלייה" : "ירידה"} של {Math.round(Math.abs(a.percentChange))}%
                          </span>
                        </div>
                      </div>
                    </div>

                    <div
                      className={`mt-3 rounded-xl px-3 py-2 flex items-center justify-between ${
                        isUp ? "bg-ios-red/8" : "bg-ios-green/8"
                      }`}
                    >
                      <span className="text-xs text-ios-subtle dark:text-ios-dark-subtle">
                        החודש
                      </span>
                      <span className="text-xs font-semibold tabular-nums text-ios-text dark:text-ios-dark-text">
                        ₪{formatIlsAmount(Math.round(a.currentAmount))}
                      </span>
                    </div>
                    <div className="mt-1 rounded-xl px-3 py-2 flex items-center justify-between bg-ios-gray-6 dark:bg-ios-dark-fill">
                      <span className="text-xs text-ios-subtle dark:text-ios-dark-subtle">
                        ממוצע חודשים קודמים
                      </span>
                      <span className="text-xs font-semibold tabular-nums text-ios-text dark:text-ios-dark-text">
                        ₪{formatIlsAmount(Math.round(a.monthlyAverage))}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      <BottomNav />
    </main>
  );
}
