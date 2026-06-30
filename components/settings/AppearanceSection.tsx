"use client";

import { MoonStar } from 'lucide-react';
import SettingsCollapsibleSection from './SettingsCollapsibleSection';

interface AppearanceSectionProps {
  themePreference: 'LIGHT' | 'DARK' | 'SYSTEM';
  isThemeSaving: boolean;
  open: boolean;
  onToggle: () => void;
  onThemeChange: (t: 'LIGHT' | 'DARK' | 'SYSTEM') => void;
}

export default function AppearanceSection({
  themePreference,
  isThemeSaving,
  open,
  onToggle,
  onThemeChange,
}: AppearanceSectionProps) {
  return (
    <SettingsCollapsibleSection
      open={open}
      onToggle={onToggle}
      title="תצוגה"
      headerStart={
        <div className="w-8 h-8 bg-ios-purple/15 rounded-lg flex items-center justify-center shrink-0">
          <MoonStar className="w-4 h-4 text-ios-purple" aria-hidden />
        </div>
      }
    >
      <div className="grid grid-cols-3 gap-2">
        <button
          data-testid="settings-theme-light"
          type="button"
          onClick={() => onThemeChange('LIGHT')}
          disabled={isThemeSaving}
          className={`py-2.5 rounded-xl text-sm font-semibold transition ${
            themePreference === 'LIGHT'
              ? 'bg-ios-blue text-white'
              : 'bg-ios-gray-6 dark:bg-ios-dark-fill text-ios-text dark:text-ios-dark-text'
          } ${isThemeSaving ? 'opacity-60 cursor-wait' : ''}`}
        >
          בהיר
        </button>
        <button
          data-testid="settings-theme-dark"
          type="button"
          onClick={() => onThemeChange('DARK')}
          disabled={isThemeSaving}
          className={`py-2.5 rounded-xl text-sm font-semibold transition ${
            themePreference === 'DARK'
              ? 'bg-ios-blue text-white'
              : 'bg-ios-gray-6 dark:bg-ios-dark-fill text-ios-text dark:text-ios-dark-text'
          } ${isThemeSaving ? 'opacity-60 cursor-wait' : ''}`}
        >
          כהה
        </button>
        <button
          type="button"
          onClick={() => onThemeChange('SYSTEM')}
          disabled={isThemeSaving}
          className={`py-2.5 rounded-xl text-sm font-semibold transition ${
            themePreference === 'SYSTEM'
              ? 'bg-ios-blue text-white'
              : 'bg-ios-gray-6 dark:bg-ios-dark-fill text-ios-text dark:text-ios-dark-text'
          } ${isThemeSaving ? 'opacity-60 cursor-wait' : ''}`}
        >
          מערכת
        </button>
      </div>
    </SettingsCollapsibleSection>
  );
}
