'use server';

import { hashInviteToken } from '@/lib/invite-utils';
import { prisma } from '@/lib/prisma';
import { requireUserId } from '@/lib/server-user';
import { randomBytes } from 'crypto';
import { assertUserHasAccount, normalizeInviteEmail, refreshAllViews } from './_shared';

export async function createAccountInvite(input: { accountId: string; invitedEmail?: string | null }) {
  try {
    const userId = await requireUserId();
    const member = await assertUserHasAccount(userId, input.accountId);
    if (member.role !== 'OWNER') return { success: false, error: 'Only owners can invite' };
    const account = await prisma.account.findUnique({ where: { id: input.accountId } });
    if (!account) return { success: false, error: 'Account not found' };

    const rawToken = randomBytes(24).toString('hex');
    const tokenHash = hashInviteToken(rawToken);
    const expiresInMinutes = 30;
    const expiresAt = new Date(Date.now() + 1000 * 60 * expiresInMinutes);
    const invitedEmail = normalizeInviteEmail(input.invitedEmail);

    await prisma.accountInvite.create({
      data: {
        accountId: input.accountId,
        createdById: userId,
        invitedEmail,
        tokenHash,
        expiresAt,
      },
    });

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXTAUTH_URL ?? 'http://localhost:3000';
    const inviteUrl = `${baseUrl}/settings?invite=${rawToken}`;
    return { success: true, inviteUrl, accountName: account.name, expiresInMinutes, invitedEmail };
  } catch {
    return { success: false, error: 'Failed to create invite link' };
  }
}

export async function getInvitePreview(rawToken: string) {
  try {
    await requireUserId();
    const tokenHash = hashInviteToken(rawToken);
    const invite = await prisma.accountInvite.findUnique({
      where: { tokenHash },
      include: {
        account: true,
        createdBy: true,
      },
    });
    if (!invite) return { success: false, error: 'Invalid invite' };
    if (invite.acceptedAt) return { success: false, error: 'Invite already used' };
    if (invite.expiresAt < new Date()) return { success: false, error: 'Invite expired' };

    return {
      success: true,
      invite: {
        accountName: invite.account.name,
        invitedByName: invite.createdBy.name ?? invite.createdBy.email,
        expiresAt: invite.expiresAt.toISOString(),
      },
    };
  } catch {
    return { success: false, error: 'Failed to load invite' };
  }
}

export async function acceptAccountInvite(rawToken: string) {
  try {
    const userId = await requireUserId();
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    const userEmail = user?.email?.toLowerCase() ?? '';
    const tokenHash = hashInviteToken(rawToken);

    const invite = await prisma.accountInvite.findUnique({ where: { tokenHash } });
    if (!invite) return { success: false, error: 'Invalid invite' };
    if (invite.acceptedAt) return { success: false, error: 'Invite already used' };
    if (invite.expiresAt < new Date()) return { success: false, error: 'Invite expired' };
    if (invite.invitedEmail && invite.invitedEmail !== userEmail) {
      return { success: false, error: 'Invite is assigned to a different email' };
    }

    const acceptedAt = new Date();
    const consumed = await prisma.$transaction(async (tx) => {
      const mark = await tx.accountInvite.updateMany({
        where: { id: invite.id, acceptedAt: null },
        data: { acceptedAt, acceptedById: userId },
      });
      if (mark.count !== 1) return false;
      await tx.accountMember.upsert({
        where: { userId_accountId: { userId, accountId: invite.accountId } },
        create: {
          userId,
          accountId: invite.accountId,
          role: 'MEMBER',
        },
        update: {},
      });
      return true;
    });

    if (!consumed) {
      return { success: false, error: 'Invite already used' };
    }

    refreshAllViews(userId);
    return { success: true };
  } catch {
    return { success: false, error: 'Failed to accept invite' };
  }
}

export async function getPendingAccountInvites() {
  try {
    const userId = await requireUserId();
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    const userEmail = user?.email?.toLowerCase();
    if (!userEmail) return { success: true, invites: [] };

    const invites = await prisma.accountInvite.findMany({
      where: {
        invitedEmail: userEmail,
        acceptedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: {
        account: true,
        createdBy: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      success: true,
      invites: invites.map((invite) => ({
        id: invite.id,
        accountName: invite.account.name,
        invitedByName: invite.createdBy.name ?? invite.createdBy.email,
        expiresAt: invite.expiresAt.toISOString(),
      })),
    };
  } catch {
    return { success: false, invites: [] as Array<{ id: string; accountName: string; invitedByName: string; expiresAt: string }> };
  }
}

export async function acceptPendingAccountInvite(inviteId: string) {
  try {
    const userId = await requireUserId();
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    const userEmail = user?.email?.toLowerCase() ?? '';

    const invite = await prisma.accountInvite.findUnique({ where: { id: inviteId } });
    if (!invite) return { success: false, error: 'Invite not found' };
    if (invite.acceptedAt) return { success: false, error: 'Invite already used' };
    if (invite.expiresAt < new Date()) return { success: false, error: 'Invite expired' };
    if (!invite.invitedEmail || invite.invitedEmail !== userEmail) {
      return { success: false, error: 'Invite does not match your email' };
    }

    const acceptedAt = new Date();
    const consumed = await prisma.$transaction(async (tx) => {
      const mark = await tx.accountInvite.updateMany({
        where: { id: invite.id, acceptedAt: null },
        data: { acceptedAt, acceptedById: userId },
      });
      if (mark.count !== 1) return false;
      await tx.accountMember.upsert({
        where: { userId_accountId: { userId, accountId: invite.accountId } },
        create: {
          userId,
          accountId: invite.accountId,
          role: 'MEMBER',
        },
        update: {},
      });
      return true;
    });

    if (!consumed) {
      return { success: false, error: 'Invite already used' };
    }

    refreshAllViews(userId);
    return { success: true };
  } catch {
    return { success: false, error: 'Failed to accept invite' };
  }
}
