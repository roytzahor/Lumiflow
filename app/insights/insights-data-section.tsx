import { getCategoryAnomalies, getCategories, getSavingsAllocationInsights } from "@/app/actions";
import { formatIlsAmount } from "@/lib/formatters";
import InsightsAnomalyCard from "@/components/insights-anomaly-card";
import type { Category, CategoryAnomaly } from "@/lib/types";

function getCategoryIcon(categories: Category[], categoryName: string): string {
    return categories.find((c) => c.name === categoryName)?.icon ?? "🛒";
}

const INSIGHTS_EXAMPLE_ROWS: { anomaly: CategoryAnomaly; icon: string }[] = [
    {
        anomaly: {
            accountName: "חשבון לדוגמה",
            category: "מזון",
            currentAmount: 2400,
            monthlyAverage: 1500,
            difference: 900,
            percentChange: 60,
            direction: "up",
        },
        icon: "🍽️",
    },
    {
        anomaly: {
            accountName: "חשבון לדוגמה",
            category: "תחבורה",
            currentAmount: 400,
            monthlyAverage: 800,
            difference: -400,
            percentChange: -50,
            direction: "down",
        },
        icon: "🚌",
    },
];

export default async function InsightsDataSection() {
    const [{ anomalies, hasEnoughHistory }, categories, savingsInsight] = await Promise.all([
        getCategoryAnomalies(),
        getCategories(),
        getSavingsAllocationInsights(),
    ]);

    const showSavingsBlock =
        savingsInsight != null &&
        (savingsInsight.thisMonthTotal > 0 ||
            savingsInsight.prevMonthTotal > 0 ||
            savingsInsight.thisMonthIncome > 0);

    return (
        <section>
            <h2 className="text-base font-bold mb-3">שינויים בולטים החודש</h2>

            {!hasEnoughHistory ? (
                <div className="space-y-5">
                    <div className="bg-ios-card dark:bg-ios-dark-card rounded-3xl p-6 shadow-card text-center">
                        <div className="w-12 h-12 rounded-full bg-ios-indigo/10 flex items-center justify-center mx-auto mb-3">
                            <span className="text-2xl">📊</span>
                        </div>
                        <p className="text-sm font-semibold text-ios-text dark:text-ios-dark-text mb-1">
                            עדיין אין מספיק היסטוריה
                        </p>
                        <p className="text-xs text-ios-subtle dark:text-ios-dark-subtle leading-relaxed">
                            כדי לזהות שינויים בולטים נדרשים לפחות שני חודשים של נתונים. המשיכו לרשום הוצאות ותובנות
                            יופיעו כאן.
                        </p>
                    </div>

                    <div>
                        <p className="text-xs font-semibold text-ios-subtle dark:text-ios-dark-subtle mb-2 text-center">
                            דוגמה בלבד — כך זה ייראה
                        </p>
                        <div className="space-y-3">
                            {INSIGHTS_EXAMPLE_ROWS.map(({ anomaly, icon }) => (
                                <InsightsAnomalyCard
                                    key={`example-${anomaly.category}`}
                                    anomaly={anomaly}
                                    icon={icon}
                                    variant="example"
                                />
                            ))}
                        </div>
                    </div>
                </div>
            ) : anomalies.length === 0 ? (
                <div className="bg-ios-card dark:bg-ios-dark-card rounded-3xl p-6 shadow-card text-center">
                    <div className="w-12 h-12 rounded-full bg-ios-green/10 flex items-center justify-center mx-auto mb-3">
                        <span className="text-2xl">✅</span>
                    </div>
                    <p className="text-sm font-semibold text-ios-text dark:text-ios-dark-text mb-1">הכל בסדר החודש</p>
                    <p className="text-xs text-ios-subtle dark:text-ios-dark-subtle leading-relaxed">
                        לא זוהו שינויים בולטים בקטגוריות לעומת הממוצע החודשי הרגיל.
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {anomalies.map((a) => (
                        <InsightsAnomalyCard
                            key={`${a.accountName}-${a.category}`}
                            anomaly={a}
                            icon={getCategoryIcon(categories, a.category)}
                        />
                    ))}
                </div>
            )}

            {showSavingsBlock && savingsInsight ? (
                <div className="mt-8">
                    <h2 className="text-base font-bold mb-3">הפרשות חיסכון</h2>
                    <div className="bg-ios-card dark:bg-ios-dark-card rounded-3xl p-5 shadow-card space-y-4">
                        <div className="flex items-center justify-between gap-3">
                            <span className="text-sm text-ios-subtle dark:text-ios-dark-subtle">החודש</span>
                            <span className="text-lg font-bold text-ios-green tabular-nums">
                                ₪{formatIlsAmount(Math.round(savingsInsight.thisMonthTotal))}
                            </span>
                        </div>
                        <div className="flex items-center justify-between gap-3 rounded-xl bg-ios-gray-6/80 dark:bg-ios-dark-fill/80 px-3 py-2.5">
                            <span className="text-xs text-ios-subtle dark:text-ios-dark-subtle">חודש קודם</span>
                            <span className="text-sm font-semibold text-ios-text dark:text-ios-dark-text tabular-nums">
                                ₪{formatIlsAmount(Math.round(savingsInsight.prevMonthTotal))}
                            </span>
                        </div>
                        {savingsInsight.percentOfIncomeThisMonth != null && savingsInsight.thisMonthTotal > 0 ? (
                            <p className="text-xs text-ios-subtle dark:text-ios-dark-subtle leading-relaxed text-center">
                                הפרשתם כ־
                                <span className="font-bold text-ios-text dark:text-ios-dark-text mx-1">
                                    {savingsInsight.percentOfIncomeThisMonth}%
                                </span>
                                מההכנסה החודשית (כולל תרומות חודשיות והכנסות חד־פעמיות) ליעדי חיסכון.
                            </p>
                        ) : savingsInsight.thisMonthIncome <= 0 && savingsInsight.thisMonthTotal > 0 ? (
                            <p className="text-xs text-ios-subtle dark:text-ios-dark-subtle leading-relaxed text-center">
                                הגדירו הכנסות חודשיות כדי לראות אחוז מההכנסה שהוקצה לחיסכון.
                            </p>
                        ) : null}
                    </div>
                </div>
            ) : null}
        </section>
    );
}
