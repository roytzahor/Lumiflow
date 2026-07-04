import Money from '@/components/ui/Money';
import { Plus } from 'lucide-react';

interface PersonalIncomeSummaryCardProps {
  netIncome: number;
  contributions: Array<{ accountName: string; amount: number }>;
  privateSpend: number;
  onAddIncome?: () => void;
}

export default function PersonalIncomeSummaryCard({
  netIncome,
  contributions,
  privateSpend,
  onAddIncome,
}: PersonalIncomeSummaryCardProps) {
  if (netIncome <= 0) return null;

  const totalContributed = contributions.reduce((s, c) => s + c.amount, 0);
  const discretionary = netIncome - totalContributed - privateSpend;

  return (
    <div className="rounded-3xl bg-ios-card dark:bg-ios-dark-card p-4 shadow-card">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold text-ios-text dark:text-ios-dark-text text-balance">
          ההכנסה האישית שלי
        </h2>
        {onAddIncome && (
          <button
            type="button"
            onClick={onAddIncome}
            className="flex items-center gap-1 rounded-xl bg-ios-green/15 px-3 py-2 text-xs font-bold text-ios-green transition-colors active:bg-ios-green/25"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
            הכנסה
          </button>
        )}
      </div>

      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-ios-subtle dark:text-ios-dark-subtle">הכנסה נטו חודשית</p>
        <p className="text-sm font-bold tabular-nums text-ios-text dark:text-ios-dark-text">
          <Money amount={netIncome} signed={false} />
        </p>
      </div>

      {contributions.length > 0 ? (
        <div className="mb-3">
          <p className="text-xs font-medium text-ios-subtle dark:text-ios-dark-subtle mb-1.5">
            תרומות לחשבונות משותפים
          </p>
          <div className="space-y-1">
            {contributions.map((c) => (
              <div key={c.accountName} className="flex items-center justify-between text-xs text-ios-subtle dark:text-ios-dark-subtle">
                <span>{c.accountName}</span>
                <span className="tabular-nums">
                  <Money amount={c.amount} signed={false} />
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-ios-subtle dark:text-ios-dark-subtle">הוצאות מחשבונות פרטיים</p>
        <p className="text-sm font-semibold tabular-nums text-ios-text dark:text-ios-dark-text">
          <Money amount={privateSpend} signed={false} />
        </p>
      </div>

      <div className="border-t border-gray-200/50 dark:border-white/10 pt-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-ios-text dark:text-ios-dark-text">נשאר לשימוש חופשי</p>
        <p className={`text-lg font-bold tabular-nums ${discretionary >= 0 ? 'text-ios-green' : 'text-ios-red'}`}>
          <Money amount={discretionary} />
        </p>
      </div>
    </div>
  );
}
