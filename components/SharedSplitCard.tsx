import Money from '@/components/ui/Money';
import type { CategoryMemberSplit } from '@/lib/types';

interface SharedSplitCardProps {
  accountName: string;
  splits: CategoryMemberSplit[];
  currentUserId: string;
  hasAllMembersContributing: boolean;
}

export default function SharedSplitCard({
  accountName,
  splits,
  currentUserId,
  hasAllMembersContributing,
}: SharedSplitCardProps) {
  const visibleSplits = splits.filter((s) => s.total > 0 && s.members.length > 0).slice(0, 6);
  if (visibleSplits.length === 0) return null;

  return (
    <div className="rounded-3xl bg-ios-card dark:bg-ios-dark-card p-4 shadow-card">
      <h2 className="text-lg font-bold text-ios-text dark:text-ios-dark-text text-balance mb-3">
        חלוקת הוצאות — {accountName}
      </h2>
      {!hasAllMembersContributing ? (
        <p className="mb-3 rounded-xl bg-ios-orange/10 text-ios-orange text-xs leading-relaxed p-2.5">
          חלק מהחברים בחשבון עדיין לא הגדירו תרומה חודשית. החלוקה למטה לא משקפת את כולם.
        </p>
      ) : null}
      <div className="space-y-3">
        {visibleSplits.map(({ category, total, members }) => (
          <div key={category} className="rounded-xl bg-ios-gray-6 dark:bg-ios-dark-fill p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-ios-text dark:text-ios-dark-text">{category}</p>
              <p className="text-sm font-bold tabular-nums text-ios-text dark:text-ios-dark-text">
                <Money amount={total} signed={false} />
              </p>
            </div>
            <div className="space-y-1">
              {members.map((m) => (
                <div key={m.userId} className="flex items-center justify-between text-xs text-ios-subtle dark:text-ios-dark-subtle">
                  <span>{m.userId === currentUserId ? 'את/ה' : m.name}</span>
                  <span className="tabular-nums">
                    <Money amount={m.amount} signed={false} /> · {Math.round(m.ratio * 100)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
