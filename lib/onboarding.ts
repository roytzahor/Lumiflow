import { ensureDefaultWorkspace } from '@/app/actions/onboarding';
import { getCachedServerSession } from '@/lib/get-cached-server-session';
import { prisma } from '@/lib/prisma';
import { resolveOrRestoreSessionUserId } from '@/lib/session-user';
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
  const session = await getCachedServerSession();
  if (!session?.user) return;

  let userId: string;
  try {
    userId = await resolveOrRestoreSessionUserId({
      userId: session.user.id,
      email: session.user.email,
      name: session.user.name,
    });
  } catch {
    // During fresh sign-in, session identity can be briefly stale.
    // Avoid flashing route-level error UI; next request resolves normally.
    return;
  }

  await ensureDefaultWorkspace();

  const onboarded = await isUserOnboarded(userId);
  if (!onboarded) redirect('/welcome');
}

export async function redirectToHomeIfAlreadyOnboarded() {
  const session = await getCachedServerSession();
  if (!session?.user) return;

  let userId: string;
  try {
    userId = await resolveOrRestoreSessionUserId({
      userId: session.user.id,
      email: session.user.email,
      name: session.user.name,
    });
  } catch {
    // Keep onboarding page rendering instead of tripping error boundaries.
    return;
  }

  const onboarded = await isUserOnboarded(userId);
  if (onboarded) redirect('/');
}
