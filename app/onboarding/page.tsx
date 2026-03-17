'use client';

import { useState } from 'react';
import { completeOnboarding } from '@/app/actions';

export default function OnboardingPage() {
  const [createPersonal, setCreatePersonal] = useState(true);
  const [createShared, setCreateShared] = useState(false);
  const [sharedAccountName, setSharedAccountName] = useState('חשבון משותף');
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const res = await completeOnboarding({
      createPersonal,
      createShared,
      sharedAccountName,
    });

    setLoading(false);
    if (!res.success) {
      setError(res.error ?? 'השלמת האשף נכשלה');
      return;
    }

    setInviteUrl(res.inviteUrl ?? null);
    if (!res.inviteUrl) {
      window.location.href = '/';
    }
  };

  return (
    <main className="min-h-screen bg-ios-bg flex items-center justify-center px-5">
      <form onSubmit={onSubmit} className="w-full max-w-md bg-white rounded-2xl shadow-card p-6 space-y-4">
        <h1 className="text-2xl font-bold text-gray-900">אשף פתיחה</h1>
        <p className="text-sm text-gray-500">בחר איך תרצה להתחיל לעבוד עם LumiFlow</p>

        <label className="flex items-center gap-3 bg-ios-gray-6 rounded-xl px-4 py-3">
          <input type="checkbox" checked={createPersonal} onChange={(e) => setCreatePersonal(e.target.checked)} />
          <span className="text-sm font-medium">Personal - חשבון אישי</span>
        </label>

        <label className="flex items-center gap-3 bg-ios-gray-6 rounded-xl px-4 py-3">
          <input type="checkbox" checked={createShared} onChange={(e) => setCreateShared(e.target.checked)} />
          <span className="text-sm font-medium">Shared - חשבון משותף</span>
        </label>

        {createShared && (
          <div className="bg-ios-blue/5 rounded-xl p-3 space-y-2">
            <p className="text-sm text-gray-700">
              איזה כיף, ניתן להוסיף משתמש נוסף לעריכת אותו חשבון!
            </p>
            <select
              value={sharedAccountName}
              onChange={(e) => setSharedAccountName(e.target.value)}
              className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-sm"
            >
              <option value="חשבון משותף">חשבון משותף</option>
              <option value="ניהול בית">ניהול בית</option>
              <option value="תקציב משפחתי">תקציב משפחתי</option>
              <option value="ניהול שותפים">ניהול שותפים</option>
            </select>
          </div>
        )}

        {error && <p className="text-sm text-ios-red">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-xl bg-ios-blue text-white font-semibold disabled:opacity-50"
        >
          {loading ? 'שומר...' : 'סיום והתחלה'}
        </button>

        {inviteUrl && (
          <div className="bg-ios-gray-6 rounded-xl p-3 space-y-2">
            <p className="text-sm text-gray-700">לינק שיתוף מוכן:</p>
            <p className="text-xs text-gray-500 break-all">{inviteUrl}</p>
            <button
              type="button"
              onClick={async () => {
                await navigator.clipboard.writeText(inviteUrl);
              }}
              className="w-full py-2.5 rounded-lg bg-white text-sm font-medium border border-gray-200"
            >
              העתק לינק שיתוף
            </button>
            <button
              type="button"
              onClick={() => { window.location.href = '/'; }}
              className="w-full py-2.5 rounded-lg bg-ios-blue text-white text-sm font-semibold"
            >
              המשך לדאשבורד
            </button>
          </div>
        )}
      </form>
    </main>
  );
}
