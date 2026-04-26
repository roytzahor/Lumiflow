"use client";

import { useEffect, useRef, useState } from "react";
import { X, User, LockKeyhole } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

type ProfileSheetMode = "details" | "password";

interface ProfileEditSheetProps {
  isOpen: boolean;
  mode: ProfileSheetMode;
  initialName: string;
  initialEmail: string;
  isSaving: boolean;
  onClose: () => void;
  onSaveDetails: (payload: { name: string; email: string }) => Promise<boolean>;
  onSavePassword: (payload: { currentPassword: string; newPassword: string }) => Promise<boolean>;
}

export default function ProfileEditSheet({
  isOpen,
  mode,
  initialName,
  initialEmail,
  isSaving,
  onClose,
  onSaveDetails,
  onSavePassword,
}: ProfileEditSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setName(initialName);
    setEmail(initialEmail);
    setCurrentPassword("");
    setNewPassword("");
  }, [isOpen, initialName, initialEmail, mode]);

  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      const focusable = sheetRef.current?.querySelector<HTMLElement>(
        "button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex=\"-1\"])",
      );
      focusable?.focus();
    }, 60);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSaving) onClose();
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen, isSaving, onClose]);

  const handleDetailsSubmit = async () => {
    const success = await onSaveDetails({ name, email });
    if (success) onClose();
  };

  const handlePasswordSubmit = async () => {
    const success = await onSavePassword({ currentPassword, newPassword });
    if (success) onClose();
  };

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
              if (!isSaving) onClose();
            }}
          />
          <motion.div
            ref={sheetRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="profile-sheet-title"
            initial={{ y: "100%", opacity: 0.9 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0.95 }}
            transition={{ type: "spring", damping: 32, stiffness: 360, mass: 0.8 }}
            className="fixed bottom-0 left-0 right-0 z-[110] mx-auto w-full max-w-md rounded-t-[20px] bg-ios-bg dark:bg-ios-dark-bg shadow-sheet pb-safe"
          >
            <div className="flex w-full justify-center pt-3 pb-2">
              <div className="h-[5px] w-9 rounded-full bg-gray-300 dark:bg-ios-dark-subtle/60" />
            </div>

            <div className="px-5 pb-8">
              <div className="mb-5 flex items-center justify-between">
                <h3 id="profile-sheet-title" className="text-lg font-bold text-ios-text dark:text-ios-dark-text">
                  {mode === "details" ? "עריכת פרטים" : "עדכון סיסמה"}
                </h3>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSaving}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-gray-600 disabled:opacity-50 dark:bg-ios-dark-fill dark:text-ios-dark-subtle"
                  aria-label="סגור"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {mode === "details" ? (
                <div className="space-y-3">
                  <div className="rounded-2xl bg-white p-4 shadow-card dark:bg-ios-dark-card">
                    <label className="mb-1.5 block text-xs font-medium text-ios-subtle dark:text-ios-dark-subtle">שם</label>
                    <div className="mb-3 flex items-center gap-2 rounded-xl bg-ios-gray-6 px-3 py-2.5 dark:bg-ios-dark-fill">
                      <User className="h-4 w-4 text-ios-subtle dark:text-ios-dark-subtle" />
                      <input
                        type="text"
                        data-testid="settings-profile-name-input"
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        placeholder="שם תצוגה"
                        className="w-full bg-transparent text-sm text-ios-text focus:outline-none dark:text-ios-dark-text"
                      />
                    </div>

                    <label className="mb-1.5 block text-xs font-medium text-ios-subtle dark:text-ios-dark-subtle">אימייל</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="name@example.com"
                      dir="ltr"
                      className="w-full rounded-xl bg-ios-gray-6 px-3 py-2.5 text-sm text-ios-text focus:outline-none focus:ring-2 focus:ring-ios-blue/30 dark:bg-ios-dark-fill dark:text-ios-dark-text"
                    />
                  </div>

                  <button
                    type="button"
                    data-testid="settings-profile-save"
                    onClick={handleDetailsSubmit}
                    disabled={isSaving}
                    className="w-full rounded-2xl bg-ios-blue py-3.5 text-sm font-bold text-white disabled:opacity-50"
                  >
                    {isSaving ? "שומר..." : "שמור פרטים"}
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="rounded-2xl bg-white p-4 shadow-card dark:bg-ios-dark-card">
                    <label className="mb-1.5 block text-xs font-medium text-ios-subtle dark:text-ios-dark-subtle">סיסמה נוכחית</label>
                    <div className="mb-3 flex items-center gap-2 rounded-xl bg-ios-gray-6 px-3 py-2.5 dark:bg-ios-dark-fill">
                      <LockKeyhole className="h-4 w-4 text-ios-subtle dark:text-ios-dark-subtle" />
                      <input
                        type="password"
                        value={currentPassword}
                        onChange={(event) => setCurrentPassword(event.target.value)}
                        placeholder="הקלד/י סיסמה נוכחית"
                        dir="ltr"
                        className="w-full bg-transparent text-sm text-ios-text focus:outline-none dark:text-ios-dark-text"
                      />
                    </div>

                    <label className="mb-1.5 block text-xs font-medium text-ios-subtle dark:text-ios-dark-subtle">סיסמה חדשה</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.target.value)}
                      placeholder="לפחות 6 תווים"
                      dir="ltr"
                      className="w-full rounded-xl bg-ios-gray-6 px-3 py-2.5 text-sm text-ios-text focus:outline-none focus:ring-2 focus:ring-ios-indigo/30 dark:bg-ios-dark-fill dark:text-ios-dark-text"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handlePasswordSubmit}
                    disabled={isSaving}
                    className="w-full rounded-2xl bg-ios-indigo py-3.5 text-sm font-bold text-white disabled:opacity-50"
                  >
                    {isSaving ? "מעדכן..." : "עדכן סיסמה"}
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}
