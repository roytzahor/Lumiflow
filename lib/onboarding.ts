import { authOptions } from '@/auth';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';

export async function isUserOnboarded(userId: string) {
  const [user, accountCount] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { onboardingCompletedAt: true },
    }),
    prisma.accountMember.count({ where: { userId } }),
  ]);

  return Boolean(user?.onboardingCompletedAt) && accountCount > 0;
}

export async function redirectToOnboardingIfNeeded() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return;

  const onboarded = await isUserOnboarded(userId);
  if (!onboarded) redirect('/onboarding');
}

export async function redirectToHomeIfAlreadyOnboarded() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return;

  const onboarded = await isUserOnboarded(userId);
  if (onboarded) redirect('/');
}
