"use client";

import { acceptPendingAccountInvite, getPendingAccountInvites } from "@/app/actions";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type PendingInvite = {
  id: string;
  accountName: string;
  invitedByName: string;
  expiresAt: string;
};

export default function PendingInviteGate() {
  const pathname = usePathname();
  const router = useRouter();
  const [invite, setInvite] = useState<PendingInvite | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (pathname?.startsWith('/auth') || pathname === '/onboarding') return;
    if (hidden) return;

    getPendingAccountInvites().then((res) => {
      if (!res.success || !res.invites?.length) return;
      setInvite(res.invites[0]);
    });
  }, [pathname, hidden]);

  if (!invite || hidden) return null;

  return (
    <div className="fixed inset-0 z-[99] bg-black/35 backdrop-blur-sm flex items-center justify-center px-5">
      <div className="w-full max-w-sm bg-ios-card dark:bg-ios-dark-card rounded-2xl shadow-card p-5 space-y-4">
        <h3 className="text-lg font-bold text-ios-text dark:text-ios-dark-text">הזמנה להצטרפות לחשבון</h3>
        <p className="text-sm text-ios-subtle dark:text-ios-dark-subtle leading-relaxed">
          <span className="font-semibold">{invite.invitedByName}</span> הזמין אותך להצטרף לחשבון{" "}
          <span className="font-semibold">{invite.accountName}</span>.
        </p>
        <p className="text-xs text-ios-subtle dark:text-ios-dark-subtle">
          תוקף ההזמנה עד {new Date(invite.expiresAt).toLocaleDateString("he-IL")}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setHidden(true)}
            className="flex-1 py-2.5 rounded-xl bg-ios-gray-6 dark:bg-ios-dark-fill text-ios-text dark:text-ios-dark-text text-sm font-medium"
          >
            לא עכשיו
          </button>
          <button
            type="button"
            onClick={async () => {
              setAccepting(true);
              const res = await acceptPendingAccountInvite(invite.id);
              setAccepting(false);
              if (!res.success) {
                toast.error(res.error ?? "אישור ההזמנה נכשל");
                return;
              }
              toast.success("ההזמנה אושרה בהצלחה");
              setInvite(null);
              router.refresh();
            }}
            disabled={accepting}
            className="flex-1 py-2.5 rounded-xl bg-ios-blue text-white text-sm font-semibold disabled:opacity-50"
          >
            {accepting ? "מאשר..." : "אשר הצטרפות"}
          </button>
        </div>
      </div>
    </div>
  );
}
