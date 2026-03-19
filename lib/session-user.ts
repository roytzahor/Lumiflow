import { prisma } from './prisma';

type SessionIdentity = {
  userId?: string | null;
  email?: string | null;
  name?: string | null;
};

export async function resolveOrRestoreSessionUserId(identity: SessionIdentity) {
  const normalizedEmail = identity.email?.trim().toLowerCase();

  if (identity.userId) {
    const userById = await prisma.user.findUnique({
      where: { id: identity.userId },
      select: { id: true },
    });
    if (userById) return userById.id;
  }

  if (normalizedEmail) {
    const userByEmail = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
    });
    if (userByEmail) return userByEmail.id;

    const restoredUser = await prisma.user.create({
      data: {
        email: normalizedEmail,
        name: identity.name ?? null,
        passwordHash: '',
        onboardingCompletedAt: null,
        themePreference: 'SYSTEM',
      },
      select: { id: true },
    });
    return restoredUser.id;
  }

  throw new Error('Unauthorized: stale session user');
}
