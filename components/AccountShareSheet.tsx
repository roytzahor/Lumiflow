"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Link2, Mail, Share2, X } from "lucide-react";

interface AccountShareSheetProps {
  isOpen: boolean;
  accountName: string;
  inviteMethod: "link" | "email";
  inviteEmail: string;
  inviteEmailIsValid: boolean;
  isLoading: boolean;
  onClose: () => void;
  onMethodChange: (method: "link" | "email") => void;
  onEmailChange: (value: string) => void;
  onSubmit: () => void;
}

export default function AccountShareSheet({
  isOpen,
  accountName,
  inviteMethod,
  inviteEmail,
  inviteEmailIsValid,
  isLoading,
  onClose,
  onMethodChange,
  onEmailChange,
  onSubmit,
}: AccountShareSheetProps) {
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
            onClick={() => {
              if (!isLoading) onClose();
            }}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="account-share-title"
            initial={{ y: "100%", opacity: 0.9 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0.95 }}
            transition={{ type: "spring", damping: 32, stiffness: 360, mass: 0.8 }}
            className="fixed bottom-0 left-0 right-0 z-[110] mx-auto w-full max-w-md rounded-t-[20px] bg-ios-bg dark:bg-ios-dark-bg shadow-sheet pb-safe"
          >
            <div className="flex w-full justify-center pt-3 pb-2">
              <div className="h-[5px] w-9 rounded-full bg-gray-300 dark:bg-ios-dark-subtle/60" />
            </div>

            <div className="space-y-4 px-5 pb-8">
              <div className="flex items-center justify-between gap-2">
                <h3 id="account-share-title" className="text-lg font-bold text-ios-text dark:text-ios-dark-text">
                  שיתוף חשבון · {accountName}
                </h3>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isLoading}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-gray-600 disabled:opacity-50 dark:bg-ios-dark-fill dark:text-ios-dark-subtle"
                  aria-label="סגור"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <p className="text-xs text-ios-subtle dark:text-ios-dark-subtle">
                בחר/י איך להזמין שותף לחשבון. כל הזמנה תקפה לזמן מוגבל.
              </p>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onMethodChange("link")}
                  className={`rounded-xl px-3 py-2.5 text-sm font-semibold transition flex items-center justify-center gap-2 ${
                    inviteMethod === "link"
                      ? "bg-ios-blue text-white"
                      : "bg-ios-gray-6 dark:bg-ios-dark-fill text-ios-text dark:text-ios-dark-text"
                  }`}
                >
                  <Link2 className="w-4 h-4" />
                  שיתוף בקישור
                </button>
                <button
                  type="button"
                  onClick={() => onMethodChange("email")}
                  className={`rounded-xl px-3 py-2.5 text-sm font-semibold transition flex items-center justify-center gap-2 ${
                    inviteMethod === "email"
                      ? "bg-ios-blue text-white"
                      : "bg-ios-gray-6 dark:bg-ios-dark-fill text-ios-text dark:text-ios-dark-text"
                  }`}
                >
                  <Mail className="w-4 h-4" />
                  הזמנה במייל
                </button>
              </div>

              {inviteMethod === "email" ? (
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-ios-subtle dark:text-ios-dark-subtle">אימייל מוזמן</label>
                  <input
                    value={inviteEmail}
                    onChange={(event) => onEmailChange(event.target.value)}
                    placeholder="name@example.com"
                    className="w-full rounded-xl bg-ios-gray-6 px-3 py-2.5 text-sm text-ios-text border border-transparent dark:bg-ios-dark-fill dark:text-ios-dark-text dark:border-white/10"
                    dir="ltr"
                  />
                  {!inviteEmailIsValid ? (
                    <p className="text-xs text-ios-red">נראה שכתובת האימייל אינה תקינה.</p>
                  ) : null}
                </div>
              ) : (
                <p className="text-xs text-ios-subtle dark:text-ios-dark-subtle">
                  * ייווצר קישור חד-פעמי לשיתוף ידני דרך וואטסאפ, מייל או כל ערוץ אחר.
                </p>
              )}

              <button
                type="button"
                onClick={onSubmit}
                disabled={isLoading || (inviteMethod === "email" && (!inviteEmail.trim() || !inviteEmailIsValid))}
                className="w-full rounded-xl bg-ios-indigo px-3 py-3 text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Share2 className="w-4 h-4" />
                {isLoading ? "יוצר הזמנה..." : inviteMethod === "email" ? "צור הזמנה אישית במייל" : "צור קישור הזמנה"}
              </button>
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}
