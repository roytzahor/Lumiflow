"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { updateBudgetSettings, updateAccountNames, addCategory, deleteCategory, deleteRecurringTransaction } from '../actions';
import { Trash2, Save, Plus, Wallet } from 'lucide-react';
import { useHaptics } from '@/hooks/use-haptics';
import type { BudgetSettings, Account, Category, RecurringWithAccount } from '@/lib/types';

const DEFAULT_BUDGET: BudgetSettings = {
    id: '',
    monthlyIncome: 21000,
    needsPercent: 50,
    wantsPercent: 30,
    savingsPercent: 20,
    savingsGoal: null,
    savingsGoalAmount: null,
};

interface SettingsContentProps {
    initialBudget: BudgetSettings | null;
    initialCategories: Category[];
    initialAccounts: Account[];
    initialRecurring: RecurringWithAccount[];
}

export default function SettingsContent({ initialBudget, initialCategories, initialAccounts, initialRecurring }: SettingsContentProps) {
    const router = useRouter();
    const [budget, setBudget] = useState<BudgetSettings>(initialBudget ?? DEFAULT_BUDGET);
    const [categories, setCategories] = useState<Category[]>(initialCategories);
    const [accounts, setAccounts] = useState<Account[]>(initialAccounts);
    const [recurring, setRecurring] = useState<RecurringWithAccount[]>(initialRecurring);

    useEffect(() => {
        setCategories(initialCategories);
        setRecurring(initialRecurring);
    }, [initialCategories, initialRecurring]);

    const [loading, setLoading] = useState(false);
    const { trigger } = useHaptics();

    const [jointName, setJointName] = useState(accounts.find((a) => a.type === 'JOINT')?.name ?? 'משותף');
    const [royPrivateName, setRoyPrivateName] = useState(accounts.find((a) => a.name.toLowerCase().includes('roy'))?.name ?? 'Roy Private');
    const [romiPrivateName, setRomiPrivateName] = useState(accounts.find((a) => a.name.toLowerCase().includes('romi'))?.name ?? 'Romi Private');

    const [newCatName, setNewCatName] = useState('');
    const [newCatIcon, setNewCatIcon] = useState('🍕');

    const handleSliderChange = (type: 'needs' | 'wants' | 'savings', value: number) => {
        let newNeeds = type === 'needs' ? value : budget.needsPercent;
        let newWants = type === 'wants' ? value : budget.wantsPercent;
        let newSavings = type === 'savings' ? value : budget.savingsPercent;

        const diff = (newNeeds + newWants + newSavings) - 100;
        if (diff !== 0) {
            if (type === 'needs') { newWants -= diff / 2; newSavings -= diff / 2; }
            else if (type === 'wants') { newNeeds -= diff / 2; newSavings -= diff / 2; }
            else { newNeeds -= diff / 2; newWants -= diff / 2; }
        }

        newNeeds = Math.round(newNeeds);
        newWants = Math.round(newWants);
        newSavings = 100 - newNeeds - newWants;

        setBudget({ ...budget, needsPercent: newNeeds, wantsPercent: newWants, savingsPercent: newSavings });
    };

    const saveProfile = async () => {
        setLoading(true);
        const res = await updateBudgetSettings({
            monthlyIncome: parseFloat(budget.monthlyIncome as unknown as string),
            needsPercent: budget.needsPercent,
            wantsPercent: budget.wantsPercent,
            savingsPercent: budget.savingsPercent
        });

        if (res.success) trigger('success');
        else trigger('error');

        const updates: { id: string; name: string }[] = [];
        const joint = accounts.find((a) => a.type === 'JOINT');
        if (joint) updates.push({ id: joint.id, name: jointName });
        const roy = accounts.find((a) => a.name.toLowerCase().includes('roy'));
        if (roy) updates.push({ id: roy.id, name: royPrivateName });
        const romi = accounts.find((a) => a.name.toLowerCase().includes('romi'));
        if (romi) updates.push({ id: romi.id, name: romiPrivateName });

        await updateAccountNames(updates);
        setLoading(false);
        toast.success('נשמר בהצלחה!');
    };

    const handleAddCategory = async () => {
        if (!newCatName.trim()) return;
        trigger('medium');
        const res = await addCategory(newCatName.trim(), newCatIcon, 'expense');
        if (res.success) {
            toast.success('קטגוריה נוספה');
            router.refresh();
        } else {
            toast.error('הוספת קטגוריה נכשלה');
        }
        setNewCatName('');
    };

    const handleDeleteCategory = async (id: string) => {
        if (confirm('למחוק את הקטגוריה?')) {
            await deleteCategory(id);
            setCategories(categories.filter((c) => c.id !== id));
        }
    };

    const handleDeleteRecurring = async (id: string) => {
        if (confirm('לבטל את ההוצאה הקבועה? העסקאות שכבר נוצרו לא יימחקו.')) {
            await deleteRecurringTransaction(id);
            setRecurring(recurring.filter((r) => r.id !== id));
        }
    };

    return (
        <div className="space-y-6 animate-fade-in pb-8">

            {/* Profile & Income */}
            <section className="bg-white rounded-2xl shadow-card overflow-hidden">
                <div className="px-5 pt-5 pb-3">
                    <div className="flex items-center gap-2.5 mb-1">
                        <div className="w-8 h-8 bg-ios-blue/10 rounded-lg flex items-center justify-center">
                            <Wallet className="w-4 h-4 text-ios-blue" />
                        </div>
                        <h2 className="text-base font-bold text-gray-900">פרופיל והכנסות</h2>
                    </div>
                </div>

                <div className="divide-y divide-gray-100">
                    {/* Monthly income */}
                    <div className="px-5 py-4">
                        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                            הכנסה חודשית משותפת (נטו)
                        </label>
                        <div className="relative">
                            <input
                                type="number"
                                value={budget.monthlyIncome}
                                onChange={(e) => setBudget({ ...budget, monthlyIncome: parseFloat(e.target.value) || 0 })}
                                className="w-full bg-ios-gray-6 rounded-xl px-4 py-3.5 text-xl font-bold text-gray-900 focus:ring-2 focus:ring-ios-blue/30 focus:outline-none text-right transition"
                            />
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-lg">₪</span>
                        </div>
                    </div>

                    {/* Account names */}
                    <div className="px-5 py-4 space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-semibold text-gray-400 mb-1.5">צד א׳</label>
                                <input
                                    type="text"
                                    value={royPrivateName}
                                    onChange={(e) => setRoyPrivateName(e.target.value)}
                                    className="w-full bg-ios-gray-6 rounded-xl px-3.5 py-3 text-sm text-gray-900 focus:ring-2 focus:ring-ios-blue/30 focus:outline-none transition"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-400 mb-1.5">צד ב׳</label>
                                <input
                                    type="text"
                                    value={romiPrivateName}
                                    onChange={(e) => setRomiPrivateName(e.target.value)}
                                    className="w-full bg-ios-gray-6 rounded-xl px-3.5 py-3 text-sm text-gray-900 focus:ring-2 focus:ring-ios-blue/30 focus:outline-none transition"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-400 mb-1.5">חשבון משותף</label>
                            <input
                                type="text"
                                value={jointName}
                                onChange={(e) => setJointName(e.target.value)}
                                className="w-full bg-ios-gray-6 rounded-xl px-3.5 py-3 text-sm text-gray-900 focus:ring-2 focus:ring-ios-blue/30 focus:outline-none transition"
                            />
                        </div>
                    </div>
                </div>
            </section>

            {/* Budget Targets */}
            <section className="bg-white rounded-2xl shadow-card overflow-hidden">
                <div className="px-5 pt-5 pb-3">
                    <div className="flex items-center gap-2.5 mb-1">
                        <div className="w-8 h-8 bg-ios-green/10 rounded-lg flex items-center justify-center">
                            <span className="text-sm">📊</span>
                        </div>
                        <h2 className="text-base font-bold text-gray-900">יעדי תקציב</h2>
                    </div>
                </div>

                <div className="px-5 pb-5 space-y-6">
                    {/* Needs */}
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium text-gray-600">🏠 צרכים</span>
                            <span className="text-sm font-bold text-gray-900 tabular-nums">{budget.needsPercent}%</span>
                        </div>
                        <input
                            type="range" min="0" max="100"
                            value={budget.needsPercent}
                            onChange={(e) => { handleSliderChange('needs', parseInt(e.target.value)); trigger('light'); }}
                            className="w-full h-2 bg-ios-gray-5 rounded-lg appearance-none cursor-pointer accent-ios-blue"
                        />
                    </div>

                    {/* Wants */}
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium text-gray-600">🎉 רצונות</span>
                            <span className="text-sm font-bold text-gray-900 tabular-nums">{budget.wantsPercent}%</span>
                        </div>
                        <input
                            type="range" min="0" max="100"
                            value={budget.wantsPercent}
                            onChange={(e) => { handleSliderChange('wants', parseInt(e.target.value)); trigger('light'); }}
                            className="w-full h-2 bg-ios-gray-5 rounded-lg appearance-none cursor-pointer accent-ios-indigo"
                        />
                    </div>

                    {/* Savings */}
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium text-gray-600">💰 חיסכון</span>
                            <span className="text-sm font-bold text-ios-green tabular-nums">{budget.savingsPercent}%</span>
                        </div>
                        <input
                            type="range" min="0" max="100"
                            value={budget.savingsPercent}
                            onChange={(e) => { handleSliderChange('savings', parseInt(e.target.value)); trigger('light'); }}
                            className="w-full h-2 bg-ios-gray-5 rounded-lg appearance-none cursor-pointer accent-ios-green"
                        />
                    </div>

                    {/* Total indicator */}
                    <div className="flex justify-between text-xs text-gray-400">
                        <span>חלוקה חכמה</span>
                        <span className="tabular-nums">סה״כ: {budget.needsPercent + budget.wantsPercent + budget.savingsPercent}%</span>
                    </div>

                    {/* Save Button */}
                    <button
                        onClick={saveProfile}
                        disabled={loading}
                        className="w-full py-3.5 bg-ios-blue text-white rounded-xl font-bold text-sm hover:bg-ios-blue/90 transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-40"
                    >
                        {loading ? 'שומר...' : <>
                            <Save className="w-4 h-4" />
                            שמור שינויים
                        </>}
                    </button>
                </div>
            </section>

            {/* Categories */}
            <section className="bg-white rounded-2xl shadow-card overflow-hidden">
                <div className="px-5 pt-5 pb-3">
                    <div className="flex items-center gap-2.5 mb-1">
                        <div className="w-8 h-8 bg-ios-orange/10 rounded-lg flex items-center justify-center">
                            <span className="text-sm">🏷️</span>
                        </div>
                        <h2 className="text-base font-bold text-gray-900">קטגוריות</h2>
                    </div>
                </div>

                <div className="px-5 pb-5 space-y-3">
                    {/* Add category */}
                    <div className="flex gap-2">
                        <input
                            type="text"
                            placeholder="שם קטגוריה חדשה"
                            value={newCatName}
                            onChange={(e) => setNewCatName(e.target.value)}
                            className="flex-1 bg-ios-gray-6 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-ios-blue/30"
                        />
                        <input
                            type="text"
                            value={newCatIcon}
                            onChange={(e) => setNewCatIcon(e.target.value)}
                            className="w-11 text-center bg-ios-gray-6 rounded-xl px-1 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ios-blue/30"
                            title="אמוג׳י"
                        />
                        <button
                            onClick={handleAddCategory}
                            className="w-11 bg-ios-blue text-white rounded-xl flex items-center justify-center active:scale-95 transition"
                        >
                            <Plus className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Category list */}
                    <div className="bg-ios-gray-6 rounded-xl divide-y divide-gray-200/50 overflow-hidden max-h-52 overflow-y-auto">
                        {categories.map((cat) => (
                            <div key={cat.id || cat.name} className="flex items-center justify-between px-4 py-3">
                                <span className="flex items-center gap-2.5 text-sm font-medium text-gray-700">
                                    <span className="text-lg">{cat.icon}</span>
                                    {cat.name}
                                </span>
                                {cat.isCustom && (
                                    <button onClick={() => handleDeleteCategory(cat.id)} className="text-ios-red/70 hover:text-ios-red p-1">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Recurring */}
            <section className="bg-white rounded-2xl shadow-card overflow-hidden">
                <div className="px-5 pt-5 pb-3">
                    <div className="flex items-center gap-2.5 mb-1">
                        <div className="w-8 h-8 bg-ios-purple/10 rounded-lg flex items-center justify-center">
                            <span className="text-sm">🔄</span>
                        </div>
                        <h2 className="text-base font-bold text-gray-900">הוראות קבע</h2>
                    </div>
                </div>

                <div className="px-5 pb-5">
                    {recurring.length === 0 ? (
                        <p className="text-center text-gray-400 text-sm py-6">אין הוראות קבע פעילות</p>
                    ) : (
                        <div className="bg-ios-gray-6 rounded-xl divide-y divide-gray-200/50 overflow-hidden">
                            {recurring.map((item) => (
                                <div key={item.id} className="flex items-center justify-between px-4 py-3.5">
                                    <div className="flex flex-col">
                                        <span className="text-sm font-semibold text-gray-900">{item.description}</span>
                                        <span className="text-xs text-gray-400">{item.account.name} &middot; ₪{item.amount}/חודש</span>
                                    </div>
                                    <button onClick={() => handleDeleteRecurring(item.id)} className="text-ios-red/70 hover:text-ios-red p-1.5">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}
