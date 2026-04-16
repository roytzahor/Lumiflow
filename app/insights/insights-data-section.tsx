import { getCategoryAnomalies, getCategories, getSavingsAllocationInsights } from "@/app/actions";
import { formatIlsAmount } from "@/lib/formatters";
import InsightsAnomalyCard from "@/components/insights-anomaly-card";
import InfoHint from "@/components/InfoHint";
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
            <div className="mb-3 flex items-center gap-2">
                <h2 className="min-w-0 flex-1 text-base font-bold">שינויים בולטים החודש</h2>
                <InfoHint ariaLabel="הסבר על שינויים בולטים">
                    מזוהות קטגוריות שההוצאה בהן החודש חורגת במידה ניכרת מהממוצע בחודשים קודמים. נדרשים לפחות
                    שני חודשים עם נתונים בקטגוריה, והשוואה מבוססת על הוצאות בפועל.
                </InfoHint>
            </div>

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
                            המשיכו לרשום הוצאות — כשתהיה מספיק היסטוריה, תובנות יופיעו כאן.
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
                    <div className="mb-3 flex items-center gap-2">
                        <h2 className="min-w-0 flex-1 text-base font-bold">הפרשות חיסכון</h2>
                        <InfoHint ariaLabel="הסבר על הפרשות חיסכון">
                            {savingsInsight.percentOfIncomeThisMonth != null && savingsInsight.thisMonthTotal > 0 ? (
                                <span>
                                    הפרשתם כ־
                                    <span className="font-bold">
                                        {savingsInsight.percentOfIncomeThisMonth}%
                                    </span>
                                    מההכנסה החודשית (כולל תרומות חודשיות והכנסות חד־פעמיות) ליעדי חיסכון.
                                </span>
                            ) : savingsInsight.thisMonthIncome <= 0 && savingsInsight.thisMonthTotal > 0 ? (
                                <span>הגדירו הכנסות חודשיות כדי לראות אחוז מההכנסה שהוקצה לחיסכון.</span>
                            ) : (
                                <span>סכומי ההפרשות לחודש זה מול חודש קודם; אחוזי הכנסה מופיעים כשיש בסיס הכנסה מתאים.</span>
                            )}
                        </InfoHint>
                    </div>
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
                    </div>
                </div>
            ) : null}
        </section>
    );
}
