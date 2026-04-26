import WelcomeClient from '@/app/welcome/WelcomeClient';
import { ensureDefaultWorkspace, getCurrentUserProfile } from '@/app/actions';
import { authOptions } from '@/auth';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';

export default async function WelcomePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    redirect('/auth/signin?callbackUrl=%2Fwelcome');
  }

  await ensureDefaultWorkspace();
  const profile = await getCurrentUserProfile();
  const initialTheme = profile?.themePreference === 'LIGHT' || profile?.themePreference === 'DARK' || profile?.themePreference === 'SYSTEM'
    ? profile.themePreference
    : 'SYSTEM';

  return (
    <WelcomeClient initialName={profile?.name?.trim() ?? ''} initialTheme={initialTheme} />
  );
}
