"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Info, Trash2, X } from "lucide-react";
import type { AccountMemberSummary } from "@/app/actions/_shared";
import type { AccountType } from "@/lib/types";
import Money from "@/components/ui/Money";
import { useIsDesktop } from "@/hooks/useIsDesktop";

interface MemberContribution {
  userId: string;
  name: string;
  monthlyAmount: number;
  ratio: number;
}

interface AccountInfoSheetProps {
  isOpen: boolean;
  accountName: string;
  accountType: AccountType;
  memberContributions: MemberContribution[];
  isLoadingContributions: boolean;
  members: AccountMemberSummary[];
  currentUserId: string;
  removingUserId: string | null;
  onClose: () => void;
  onRemoveMember: (memberUserId: string) => void;
}

export default function AccountInfoSheet({
  isOpen,
  accountName,
  accountType,
  memberContributions,
  isLoadingContributions,
  members,
  currentUserId,
  removingUserId,
  onClose,
  onRemoveMember,
}: AccountInfoSheetProps) {
  const isDesktop = useIsDesktop();
  const currentMembership = members.find((m) => m.userId === currentUserId);
  const canRemoveMembers = currentMembership?.role === "OWNER";

  return (
    <AnimatePresence>
      {isOpen ? (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-[100] bg-black/35 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="account-info-title"
            initial={isDesktop ? { opacity: 0, scale: 0.96 } : { y: "100%", opacity: 0.9 }}
            animate={isDesktop ? { opacity: 1, scale: 1 } : { y: 0, opacity: 1 }}
            exit={isDesktop ? { opacity: 0, scale: 0.96 } : { y: "100%", opacity: 0.95 }}
            transition={{ type: "spring", damping: 32, stiffness: 360, mass: 0.8 }}
            className="fixed bottom-0 left-0 right-0 z-[110] mx-auto w-full max-w-md rounded-t-[20px] bg-ios-bg dark:bg-ios-dark-bg shadow-sheet pb-safe max-h-[85vh] flex flex-col lg:inset-0 lg:m-auto lg:h-fit lg:rounded-3xl"
          >
            <div className="flex w-full justify-center pt-3 pb-2 shrink-0 lg:hidden">
              <div className="h-[5px] w-9 rounded-full bg-ios-gray-4 dark:bg-ios-dark-subtle/60" />
            </div>

            <div className="space-y-4 px-5 pb-8 overflow-y-auto flex-1 min-h-0 lg:pt-6">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ios-blue/15 text-ios-blue">
                    <Info className="h-4 w-4" aria-hidden />
                  </div>
                  <div className="min-w-0">
                    <h3 id="account-info-title" className="text-lg font-bold text-ios-text dark:text-ios-dark-text truncate">
                      {accountName}
                    </h3>
                    <p className="text-xs text-ios-subtle dark:text-ios-dark-subtle">
                      {accountType === "PRIVATE" ? "חשבון פרטי" : "חשבון משותף"}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ios-gray-5 text-ios-subtle dark:bg-ios-dark-fill dark:text-ios-dark-subtle"
                  aria-label="סגור"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {accountType === "SHARED" ? (
                <div>
                  <p className="text-xs font-semibold text-ios-subtle dark:text-ios-dark-subtle mb-2">תרומות חודשיות</p>
                  {isLoadingContributions ? (
                    <div className="rounded-xl bg-ios-gray-6 dark:bg-ios-dark-fill px-3 py-2.5">
                      <div className="h-4 w-2/3 rounded bg-ios-gray-5 dark:bg-ios-dark-subtle/30 animate-pulse" />
                    </div>
                  ) : memberContributions.length === 0 ? (
                    <div className="rounded-xl bg-ios-gray-6 dark:bg-ios-dark-fill px-3 py-2.5">
                      <p className="text-xs text-ios-subtle dark:text-ios-dark-subtle">
                        אף אחד עדיין לא הגדיר תרומה חודשית לחשבון זה
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <ul className="space-y-1.5">
                        {memberContributions.map((c) => {
                          const isMe = c.userId === currentUserId;
                          return (
                            <li
                              key={c.userId}
                              className={`flex items-center justify-between gap-2 rounded-xl px-3 py-2 ${
                                isMe ? "bg-ios-blue/10" : "bg-ios-gray-6 dark:bg-ios-dark-fill"
                              }`}
                            >
                              <p className="text-sm font-medium text-ios-text dark:text-ios-dark-text truncate">
                                {c.name}
                                {isMe ? " (אתה)" : ""}
                              </p>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-[11px] text-ios-subtle dark:text-ios-dark-subtle">
                                  {Math.round(c.ratio * 100)}%
                                </span>
                                <Money amount={c.monthlyAmount} signed={false} className="text-sm font-semibold" />
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                      <div className="flex items-center justify-between gap-2 rounded-xl border border-gray-200/80 dark:border-white/10 px-3 py-2">
                        <p className="text-sm font-semibold text-ios-text dark:text-ios-dark-text">סה״כ</p>
                        <Money
                          amount={memberContributions.reduce((sum, c) => sum + c.monthlyAmount, 0)}
                          signed={false}
                          className="text-sm font-semibold"
                        />
                      </div>
                    </div>
                  )}
                </div>
              ) : null}

              <div>
                <p className="text-xs font-semibold text-ios-subtle dark:text-ios-dark-subtle mb-2">
                  {accountType === "SHARED" ? "משתמשים בחשבון" : "חבר בחשבון"}
                </p>
                <ul className="space-y-2">
                  {members.map((m) => {
                    const displayName = m.name?.trim() || m.email;
                    const roleLabel = m.role === "OWNER" ? "בעלים" : "חבר";
                    const showRemove = canRemoveMembers && m.role === "MEMBER";
                    const isRemoving = removingUserId === m.userId;
                    return (
                      <li
                        key={m.userId}
                        className="flex items-start justify-between gap-2 rounded-xl border border-gray-200/80 dark:border-white/10 bg-ios-card dark:bg-ios-dark-card px-3 py-2.5"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-ios-text dark:text-ios-dark-text truncate">{displayName}</p>
                          {m.name?.trim() ? (
                            <p className="text-xs text-ios-subtle dark:text-ios-dark-subtle truncate" dir="ltr">
                              {m.email}
                            </p>
                          ) : null}
                          <p className="text-[11px] text-ios-subtle dark:text-ios-dark-subtle mt-0.5">{roleLabel}</p>
                        </div>
                        {showRemove ? (
                          <button
                            type="button"
                            disabled={isRemoving}
                            onClick={() => onRemoveMember(m.userId)}
                            className="shrink-0 p-2 rounded-lg text-ios-red/80 hover:text-ios-red hover:bg-ios-red/10 disabled:opacity-50"
                            aria-label={`הסרת ${displayName} מהחשבון`}
                          >
                            <Trash2 className="w-4 h-4" aria-hidden />
                          </button>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              </div>

              {accountType === "SHARED" && !canRemoveMembers ? (
                <p className="text-xs text-ios-subtle dark:text-ios-dark-subtle leading-relaxed">
                  רק בעל החשבון יכול להסיר משתמשים שהצטרפו דרך קישור הזמנה.
                </p>
              ) : null}
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}
