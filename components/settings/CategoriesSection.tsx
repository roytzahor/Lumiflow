"use client";

import { Tag, Plus, Pencil, Check, X, Trash2 } from 'lucide-react';
import { CATEGORY_EMOJIS } from '@/lib/category-emojis';
import type { Category } from '@/lib/types';
import SettingsCollapsibleSection from './SettingsCollapsibleSection';

interface CategoriesSectionProps {
  categories: Category[];
  open: boolean;
  onToggle: () => void;
  newCatName: string;
  newCatEmojiInput: string;
  editingCategoryId: string | null;
  editingCategoryName: string;
  editingCategoryEmojiInput: string;
  onNewCatNameChange: (v: string) => void;
  onNewCatEmojiChange: (v: string) => void;
  onAddCategory: () => void;
  onStartEdit: (id: string, name: string, emoji: string) => void;
  onSaveEdit: (id: string) => void;
  onCancelEdit: () => void;
  onEditNameChange: (v: string) => void;
  onEditEmojiChange: (v: string) => void;
  onDeleteCategory: (id: string, name: string) => void;
}

export default function CategoriesSection({
  categories,
  open,
  onToggle,
  newCatName,
  newCatEmojiInput,
  editingCategoryId,
  editingCategoryName,
  editingCategoryEmojiInput,
  onNewCatNameChange,
  onNewCatEmojiChange,
  onAddCategory,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onEditNameChange,
  onEditEmojiChange,
  onDeleteCategory,
}: CategoriesSectionProps) {
  return (
    <SettingsCollapsibleSection
      open={open}
      onToggle={onToggle}
      title="קטגוריות"
      headerStart={
        <div className="w-8 h-8 bg-ios-orange/15 rounded-lg flex items-center justify-center shrink-0">
          <Tag className="w-4 h-4 text-ios-orange" aria-hidden />
        </div>
      }
    >
      <div className="space-y-3">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="שם קטגוריה חדשה"
            value={newCatName}
            onChange={(e) => onNewCatNameChange(e.target.value)}
            className="flex-1 bg-ios-gray-6 dark:bg-ios-dark-fill rounded-xl px-3.5 py-2.5 text-sm text-ios-text dark:text-ios-dark-text"
          />
          <input
            type="text"
            value={newCatEmojiInput}
            onChange={(e) => onNewCatEmojiChange(e.target.value)}
            placeholder="בחר/י או הקלד/י 😀"
            list="settings-category-emoji-list"
            className="w-20 text-center bg-ios-gray-6 dark:bg-ios-dark-fill rounded-xl px-1 py-2.5 text-sm text-ios-text dark:text-ios-dark-text"
            aria-label="בחירת אימוג׳י לקטגוריה"
          />
          <datalist id="settings-category-emoji-list">
            {CATEGORY_EMOJIS.map((emoji) => <option key={emoji} value={emoji}>{emoji}</option>)}
          </datalist>
          <button type="button" onClick={onAddCategory} aria-label="הוספת קטגוריה" className="w-11 bg-ios-blue text-white rounded-xl flex items-center justify-center">
            <Plus className="w-5 h-5" aria-hidden />
          </button>
        </div>

        <div className="bg-ios-gray-6 dark:bg-ios-dark-fill rounded-xl divide-y divide-gray-200/50 dark:divide-white/10 overflow-hidden max-h-52 overflow-y-auto">
          {categories.map((cat) => (
            <div key={cat.id} className="flex items-center justify-between px-4 py-3">
              {editingCategoryId === cat.id ? (
                <div className="flex items-center gap-2 flex-1">
                  <input
                    type="text"
                    value={editingCategoryEmojiInput}
                    onChange={(e) => onEditEmojiChange(e.target.value)}
                    placeholder="אימוג׳י"
                    list="settings-category-emoji-list"
                    className="w-20 text-center bg-ios-card dark:bg-ios-dark-card rounded-lg px-1 py-2 text-sm text-ios-text dark:text-ios-dark-text"
                    aria-label="בחירת אימוג׳י לעריכת קטגוריה"
                  />
                  <input
                    value={editingCategoryName}
                    onChange={(e) => onEditNameChange(e.target.value)}
                    className="flex-1 bg-ios-card dark:bg-ios-dark-card rounded-lg px-3 py-2 text-sm text-ios-text dark:text-ios-dark-text"
                  />
                  <button type="button" onClick={() => onSaveEdit(cat.id)} aria-label="שמירת עריכת קטגוריה" className="text-ios-green p-1">
                    <Check className="w-4 h-4" aria-hidden />
                  </button>
                  <button type="button" onClick={onCancelEdit} aria-label="ביטול עריכת קטגוריה" className="text-ios-subtle dark:text-ios-dark-subtle p-1">
                    <X className="w-4 h-4" aria-hidden />
                  </button>
                </div>
              ) : (
                <>
                  <span className="flex items-center gap-2.5 text-sm font-medium text-ios-text dark:text-ios-dark-text">
                    <span className="text-lg">{cat.icon}</span>
                    {cat.name}
                  </span>
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={() => onStartEdit(cat.id, cat.name, cat.icon || '✨')} aria-label={`עריכת קטגוריה ${cat.name}`} className="text-ios-blue/80 hover:text-ios-blue p-1">
                      <Pencil className="w-4 h-4" aria-hidden />
                    </button>
                    <button type="button" onClick={() => onDeleteCategory(cat.id, cat.name)} aria-label={`מחיקת קטגוריה ${cat.name}`} className="text-ios-red/70 hover:text-ios-red p-1">
                      <Trash2 className="w-4 h-4" aria-hidden />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </SettingsCollapsibleSection>
  );
}
