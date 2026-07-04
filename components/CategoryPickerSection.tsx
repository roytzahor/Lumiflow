'use client';

import { Search, Plus } from 'lucide-react';
import type { Category } from '@/lib/types';
import { CATEGORY_EMOJIS } from '@/lib/category-emojis';

interface CategoryPickerSectionProps {
    /** Already-filtered list of categories to display in the grid */
    categories: Category[];
    /** Full unfiltered list — used to decide whether to show the 'כללי' fallback button */
    allCategories: Category[];
    selectedCategory: string;
    categorySearch: string;
    newCategoryName: string;
    newCategoryEmojiInput: string;
    isAddingCategory: boolean;
    /** When set, shows a "זוהה אוטומטית" chip to indicate AI auto-detection. */
    autoDetectedCategory?: string;
    onSelectCategory: (name: string) => void;
    onSearchChange: (v: string) => void;
    onNewNameChange: (v: string) => void;
    onNewEmojiChange: (v: string) => void;
    onConfirmAddCategory: () => void;
}

export default function CategoryPickerSection({
    categories,
    allCategories,
    selectedCategory,
    categorySearch,
    newCategoryName,
    newCategoryEmojiInput,
    isAddingCategory,
    autoDetectedCategory,
    onSelectCategory,
    onSearchChange,
    onNewNameChange,
    onNewEmojiChange,
    onConfirmAddCategory,
}: CategoryPickerSectionProps) {
    return (
        <div className="bg-ios-card dark:bg-ios-dark-card rounded-2xl shadow-card mb-4 p-4">
            <div className="flex items-center gap-2 mb-3">
                <p className="text-xs font-semibold text-ios-subtle dark:text-ios-dark-subtle uppercase tracking-wider">קטגוריה</p>
                {autoDetectedCategory && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-ios-teal/15 dark:bg-ios-teal/25 px-2 py-0.5 text-[10px] font-semibold text-ios-teal">
                        ✨ זוהה אוטומטית
                    </span>
                )}
            </div>

            {/* Add new category row */}
            <div className="flex gap-2 mb-3">
                <input
                    type="text"
                    placeholder="שם קטגוריה חדשה"
                    value={newCategoryName}
                    onChange={(e) => onNewNameChange(e.target.value)}
                    className="flex-1 bg-ios-gray-6 dark:bg-ios-dark-fill rounded-xl px-3.5 py-2.5 text-sm text-ios-text dark:text-ios-dark-text placeholder:text-ios-subtle dark:placeholder:text-ios-dark-subtle focus:outline-none focus:ring-2 focus:ring-ios-blue/30"
                />
                <input
                    type="text"
                    value={newCategoryEmojiInput}
                    onChange={(e) => onNewEmojiChange(e.target.value)}
                    placeholder="בחר/י או הקלד/י 😀"
                    list="quickadd-category-emoji-list"
                    className="w-20 text-center bg-ios-gray-6 dark:bg-ios-dark-fill rounded-xl px-1 py-2.5 text-sm text-ios-text dark:text-ios-dark-text focus:outline-none focus:ring-2 focus:ring-ios-blue/30"
                    aria-label="בחירת אימוג׳י לקטגוריה"
                />
                <datalist id="quickadd-category-emoji-list">
                    {CATEGORY_EMOJIS.map((emoji) => (
                        <option key={emoji} value={emoji}>
                            {emoji}
                        </option>
                    ))}
                </datalist>
                <button
                    type="button"
                    onClick={onConfirmAddCategory}
                    disabled={isAddingCategory}
                    className="w-11 shrink-0 bg-ios-blue text-white rounded-xl flex items-center justify-center disabled:opacity-50 active:scale-[0.96] transition-[background-color,color,transform]"
                    aria-label="הוספת קטגוריה"
                >
                    <Plus className="w-5 h-5" />
                </button>
            </div>

            {/* Search existing categories */}
            <div className="flex gap-2 mb-2">
                <div className="flex-1 relative">
                    <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-ios-subtle dark:text-ios-dark-subtle" aria-hidden="true" />
                    <input
                        type="text"
                        value={categorySearch}
                        onChange={(e) => onSearchChange(e.target.value)}
                        placeholder="חיפוש קטגוריה קיימת"
                        className="w-full bg-ios-gray-6 dark:bg-ios-dark-fill rounded-xl py-2.5 pe-9 ps-3 text-sm text-ios-text dark:text-ios-dark-text placeholder:text-ios-subtle dark:placeholder:text-ios-dark-subtle focus:outline-none focus:ring-2 focus:ring-ios-blue/30"
                    />
                </div>
            </div>

            {/* Category grid */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1" style={{ WebkitOverflowScrolling: 'touch' }}>
                {categories.map((cat) => (
                    <button
                        key={cat.id}
                        type="button"
                        onClick={() => onSelectCategory(cat.name)}
                        className={`flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-[background-color,color,box-shadow] active:scale-[0.96] ${
                            selectedCategory === cat.name
                                ? 'bg-ios-blue text-white shadow-sm'
                                : 'bg-ios-gray-6 dark:bg-ios-dark-fill text-ios-subtle dark:text-ios-dark-subtle'
                        }`}
                    >
                        <span>{cat.icon}</span>
                        <span>{cat.name}</span>
                    </button>
                ))}
                {!allCategories.some((c) => c.name === 'כללי') && (
                    <button
                        type="button"
                        onClick={() => onSelectCategory('כללי')}
                        className={`flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-[background-color,color,box-shadow] active:scale-[0.96] ${
                            selectedCategory === 'כללי'
                                ? 'bg-ios-blue text-white shadow-sm'
                                : 'bg-ios-gray-6 dark:bg-ios-dark-fill text-ios-subtle dark:text-ios-dark-subtle'
                        }`}
                    >
                        <span>✨</span>
                        <span>כללי</span>
                    </button>
                )}
            </div>

            {categories.length === 0 && (
                <p className="text-xs text-ios-subtle dark:text-ios-dark-subtle mt-2">
                    לא נמצאו קטגוריות תואמות לחיפוש. ניתן להוסיף קטגוריה חדשה בשורה למעלה.
                </p>
            )}
        </div>
    );
}
