"use client";

import { User } from 'lucide-react';
import SettingsCollapsibleSection from '@/components/settings/SettingsCollapsibleSection';

interface ProfileSectionProps {
  name: string | null;
  email: string;
  open: boolean;
  onToggle: () => void;
  onEditProfile: () => void;
  onEditPassword: () => void;
}

export default function ProfileSection({
  name,
  email,
  open,
  onToggle,
  onEditProfile,
  onEditPassword,
}: ProfileSectionProps) {
  return (
    <SettingsCollapsibleSection
      open={open}
      onToggle={onToggle}
      title="פרופיל משתמש"
      headerStart={
        <div className="w-8 h-8 bg-ios-blue/12 rounded-lg flex items-center justify-center shrink-0">
          <User className="w-4 h-4 text-ios-blue" aria-hidden />
        </div>
      }
    >
      <div className="space-y-4">
        <div className="rounded-xl bg-ios-gray-6 dark:bg-ios-dark-fill px-4 py-3">
          <p className="text-xs text-ios-subtle dark:text-ios-dark-subtle">שם</p>
          <p className="text-sm font-semibold text-ios-text dark:text-ios-dark-text">{name?.trim() || 'לא הוגדר עדיין'}</p>
          <div className="my-2 border-t border-gray-200/70 dark:border-white/10" />
          <p className="text-xs text-ios-subtle dark:text-ios-dark-subtle">אימייל</p>
          <p dir="ltr" className="text-[13px] text-ios-text dark:text-ios-dark-text">{email || '—'}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button
            data-testid="settings-edit-profile"
            type="button"
            onClick={onEditProfile}
            className="w-full py-2.5 rounded-xl bg-ios-blue text-white text-sm font-semibold"
          >
            עריכת פרטים
          </button>
          <button
            type="button"
            onClick={onEditPassword}
            className="w-full py-2.5 rounded-xl bg-ios-indigo text-white text-sm font-semibold"
          >
            עדכון סיסמה
          </button>
        </div>
      </div>
    </SettingsCollapsibleSection>
  );
}
