'use server';

import { hashInviteToken } from '@/lib/invite-utils';
import { prisma } from '@/lib/prisma';
import { logServerDev } from '@/lib/server-log';
import { ensureUserBootstrap, requireUserId } from '@/lib/server-user';
import { randomBytes } from 'crypto';
import type { AccountType } from '@prisma/client';
import { deferRefreshAllViews, normalizeInviteEmail, recalculateAccountIncome, refreshAllViews } from './_shared';

/** Creates a default private account + membership when missing; heals missing onboardingCompletedAt. Idempotent. */
export async function ensureDefaultWorkspace() {
  try {
    const userId = await requireUserId();
    await ensureUserBootstrap(userId);

    const memberCount = await prisma.accountMember.count({ where: { userId } });
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { onboardingCompletedAt: true },
    });

    if (memberCount > 0) {
      if (!user?.onboardingCompletedAt) {
        await prisma.user.update({
          where: { id: userId },
          data: { onboardingCompletedAt: new Date() },
        });
      }
      deferRefreshAllViews(userId);
      return { ok: true as const, createdAccount: false };
    }

    // `Account` has no unique constraint tied to its owner, so a plain
    // check-then-create here can't be guarded by a DB constraint the way
    // duplicate categories/invites are: two concurrent requests for the same
    // brand-new user (two tabs on first load, a retried request) would both
    // see `memberCount === 0` and both succeed, creating two default accounts.
    // A Postgres advisory lock scoped to this transaction serializes the
    // critical section per-user without any schema change: the second
    // transaction blocks until the first commits, then its re-check inside
    // the lock correctly observes the already-created membership and skips.
    const result = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${userId}))`;

      const recheckedCount = await tx.accountMember.count({ where: { userId } });
      if (recheckedCount > 0) {
        return { createdAccount: false, newAccountId: null as string | null };
      }

      const personal = await tx.account.create({
        data: {
          name: 'החשבון האישי שלי',
          type: 'PRIVATE',
          income: 0,
        },
      });
      await tx.accountMember.create({
        data: {
          userId,
          accountId: personal.id,
          role: 'OWNER',
        },
      });
      await tx.user.update({
        where: { id: userId },
        data: { onboardingCompletedAt: new Date() },
      });

      return { createdAccount: true, newAccountId: personal.id };
    });

    if (result.newAccountId) {
      await recalculateAccountIncome(result.newAccountId);
    }
    deferRefreshAllViews(userId);
    return { ok: true as const, createdAccount: result.createdAccount };
  } catch (error) {
    logServerDev('ensure_default_workspace_failed', error);
    return { ok: false as const, createdAccount: false };
  }
}

export async function markWelcomeTourCompleted() {
  try {
    const userId = await requireUserId();
    await prisma.user.update({
      where: { id: userId },
      data: { welcomeTourCompletedAt: new Date() },
    });
    refreshAllViews(userId);
    return { success: true as const };
  } catch {
    return { success: false as const, error: 'Failed to save tour state' };
  }
}

/**
 * Permanently deletes the signed-in user and all personal data.
 * Blocks when the user owns a shared account that still has other members (they must leave or remove co-members first).
 */
export async function deleteCurrentUserAccount() {
  try {
    const userId = await requireUserId();

    const ownsSharedWithOthers = await prisma.accountMember.findFirst({
      where: {
        userId,
        role: 'OWNER',
        account: {
          type: 'SHARED',
          members: { some: { userId: { not: userId } } },
        },
      },
      select: { accountId: true },
    });

    if (ownsSharedWithOthers) {
      return {
        success: false as const,
        error:
          'לא ניתן למחוק את החשבון כל עוד אתם בעלי חשבון משותף עם משתמשים אחרים. הסירו משתתפים או מחקו את החשבון המשותף תחילה.',
      };
    }

    const soleMemberAccounts = await prisma.account.findMany({
      where: {
        members: {
          every: {
            userId,
          },
        },
      },
      select: { id: true },
    });

    await prisma.$transaction(async (tx) => {
      if (soleMemberAccounts.length > 0) {
        await tx.account.deleteMany({
          where: { id: { in: soleMemberAccounts.map((a) => a.id) } },
        });
      }
      await tx.user.delete({ where: { id: userId } });
    });

    return { success: true as const };
  } catch {
    return { success: false as const, error: 'מחיקת החשבון נכשלה. נסו שוב או פנו לתמיכה.' };
  }
}

export async function completeOnboarding(input: {
  createPersonal?: boolean;
  createShared?: boolean;
  sharedAccountName?: string;
  accounts?: Array<{
    draftId?: string;
    name: string;
    type: AccountType;
  }>;
  inviteAccountDraftId?: string | null;
  invitedEmail?: string;
  monthlyIncomeNet?: number | null;
  autoSplitContributions?: boolean;
  personalContributionAmount?: number | null;
}) {
  try {
    const userId = await requireUserId();
    const normalizedSharedName = input.sharedAccountName?.trim() || 'חשבון משותף';
    const normalizedInvitedEmail = normalizeInviteEmail(input.invitedEmail);
    const hasMonthlyIncomeInput = input.monthlyIncomeNet != null && Number.isFinite(input.monthlyIncomeNet) && input.monthlyIncomeNet >= 0;
    const normalizedMonthlyIncome = hasMonthlyIncomeInput ? Number(input.monthlyIncomeNet) : null;
    const shouldAutoSplitContributions = Boolean(input.autoSplitContributions);
    const normalizedAccounts = Array.isArray(input.accounts)
      ? input.accounts
        .filter((account) => account && (account.type === 'PRIVATE' || account.type === 'SHARED'))
        .map((account) => {
          return {
            draftId: typeof account.draftId === 'string' && account.draftId ? account.draftId : null,
            name: account.name.trim(),
            type: account.type as AccountType,
          };
        })
        .filter((account) => account.name.length > 0)
      : [];
    const hasAccountsPayload = normalizedAccounts.length > 0;
    const shouldCreatePersonal = hasAccountsPayload
      ? normalizedAccounts.some((account) => account.type === 'PRIVATE')
      : Boolean(input.createPersonal);
    const shouldCreateShared = hasAccountsPayload
      ? normalizedAccounts.some((account) => account.type === 'SHARED')
      : Boolean(input.createShared);
    const hasCustomSplitAmountInput =
      input.personalContributionAmount != null &&
      Number.isFinite(input.personalContributionAmount);
    const normalizedPersonalContributionAmount = hasCustomSplitAmountInput
      ? Math.max(0, Number(input.personalContributionAmount))
      : null;

    if (!shouldCreatePersonal && !shouldCreateShared) {
      return { success: false, error: 'Choose at least one option', code: 'INVALID_INPUT' as const };
    }

    const result = await prisma.$transaction(async (tx) => {
      const createdAccounts: { id: string; name: string; type: AccountType }[] = [];
      const createdAccountDraftMap = new Map<string, { id: string; name: string; type: AccountType }>();
      let inviteUrl: string | null = null;

      if (hasAccountsPayload) {
        const duplicateAccountKeys = new Set<string>();
        for (let i = 0; i < normalizedAccounts.length; i += 1) {
          const account = normalizedAccounts[i];
          const duplicateKey = `${account.type}:${account.name.toLowerCase()}`;
          if (duplicateAccountKeys.has(duplicateKey)) {
            return { createdAccounts: [], inviteUrl: null, error: 'Duplicate account names are not allowed by type' };
          }
          duplicateAccountKeys.add(duplicateKey);
        }

        for (let i = 0; i < normalizedAccounts.length; i += 1) {
          const accountInput = normalizedAccounts[i];
          let account = await tx.account.findFirst({
            where: {
              type: accountInput.type,
              isArchived: false,
              name: accountInput.name,
              members: {
                some: {
                  userId,
                  role: 'OWNER',
                },
              },
            },
          });

          if (!account) {
            account = await tx.account.create({
              data: {
                name: accountInput.name,
                type: accountInput.type,
                income: 0,
              },
            });
          }

          await tx.accountMember.upsert({
            where: { userId_accountId: { userId, accountId: account.id } },
            create: { userId, accountId: account.id, role: 'OWNER' },
            update: { role: 'OWNER' },
          });

          const created = { id: account.id, name: account.name, type: account.type };
          createdAccounts.push(created);
          if (accountInput.draftId) {
            createdAccountDraftMap.set(accountInput.draftId, created);
          }
        }
      } else {
        if (shouldCreatePersonal) {
          let personal = await tx.account.findFirst({
            where: {
              type: 'PRIVATE',
              isArchived: false,
              members: { some: { userId } },
            },
          });

          if (!personal) {
            personal = await tx.account.create({
              data: {
                name: 'החשבון האישי שלי',
                type: 'PRIVATE',
              },
            });
          }

          await tx.accountMember.upsert({
            where: { userId_accountId: { userId, accountId: personal.id } },
            create: { userId, accountId: personal.id, role: 'OWNER' },
            update: { role: 'OWNER' },
          });

          createdAccounts.push({ id: personal.id, name: personal.name, type: personal.type });
        }

        if (shouldCreateShared) {
          let shared = await tx.account.findFirst({
            where: {
              type: 'SHARED',
              isArchived: false,
              name: normalizedSharedName,
              members: {
                some: {
                  userId,
                  role: 'OWNER',
                },
              },
            },
          });

          if (!shared) {
            shared = await tx.account.create({
              data: {
                name: normalizedSharedName,
                type: 'SHARED',
              },
            });
          }

          await tx.accountMember.upsert({
            where: { userId_accountId: { userId, accountId: shared.id } },
            create: { userId, accountId: shared.id, role: 'OWNER' },
            update: { role: 'OWNER' },
          });

          createdAccounts.push({ id: shared.id, name: shared.name, type: shared.type });
        }
      }

      const sharedInviteTarget = (() => {
        if (!shouldCreateShared) return null;
        if (input.inviteAccountDraftId && createdAccountDraftMap.has(input.inviteAccountDraftId)) {
          const selected = createdAccountDraftMap.get(input.inviteAccountDraftId);
          return selected?.type === 'SHARED' ? selected : null;
        }
        return createdAccounts.find((account) => account.type === 'SHARED') ?? null;
      })();

      if (sharedInviteTarget) {
        const rawToken = randomBytes(24).toString('hex');
        const tokenHash = hashInviteToken(rawToken);
        const expiresInMinutes = 30;
        const expiresAt = new Date(Date.now() + 1000 * 60 * expiresInMinutes);

        await tx.accountInvite.create({
          data: {
            accountId: sharedInviteTarget.id,
            createdById: userId,
            invitedEmail: normalizedInvitedEmail,
            tokenHash,
            expiresAt,
          },
        });

        const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXTAUTH_URL ?? 'http://localhost:3000';
        inviteUrl = `${baseUrl}/settings?invite=${rawToken}`;
      }

      if (createdAccounts.length === 0) {
        return { createdAccounts: [], inviteUrl, error: 'No accounts were created' };
      }

      if (createdAccounts.length > 0) {
        const incomeInCents = hasMonthlyIncomeInput && normalizedMonthlyIncome != null
          ? Math.max(Math.round(normalizedMonthlyIncome * 100), 0)
          : 0;
        const contributionByAccountId = new Map<string, number>();

        if (hasMonthlyIncomeInput && normalizedMonthlyIncome != null) {
          if (createdAccounts.length === 1) {
            contributionByAccountId.set(createdAccounts[0].id, incomeInCents / 100);
          } else if (shouldAutoSplitContributions) {
            const personalAccount = createdAccounts.find((account) => account.type === 'PRIVATE');
            const sharedAccount = createdAccounts.find((account) => account.type === 'SHARED');
            const canApplyPersonalSharedSplit = Boolean(personalAccount && sharedAccount);

            if (canApplyPersonalSharedSplit && personalAccount && sharedAccount) {
              const desiredPersonalInCents = normalizedPersonalContributionAmount != null
                ? Math.round(normalizedPersonalContributionAmount * 100)
                : Math.round(incomeInCents / 2);
              const personalInCents = Math.max(0, Math.min(desiredPersonalInCents, incomeInCents));
              const sharedInCents = Math.max(incomeInCents - personalInCents, 0);
              contributionByAccountId.set(personalAccount.id, personalInCents / 100);
              contributionByAccountId.set(sharedAccount.id, sharedInCents / 100);
            } else {
              const basePerAccountInCents = Math.floor(incomeInCents / createdAccounts.length);
              const remainderInCents = incomeInCents % createdAccounts.length;
              for (let i = 0; i < createdAccounts.length; i += 1) {
                const account = createdAccounts[i];
                const monthlyAmount = (basePerAccountInCents + (i < remainderInCents ? 1 : 0)) / 100;
                contributionByAccountId.set(account.id, monthlyAmount);
              }
            }
          }
        }

        if (contributionByAccountId.size > 0) {
          for (let i = 0; i < createdAccounts.length; i += 1) {
            const account = createdAccounts[i];
            const monthlyAmount = contributionByAccountId.get(account.id);
            if (monthlyAmount == null) continue;
            await tx.accountContributionPlan.upsert({
              where: {
                userId_accountId: {
                  userId,
                  accountId: account.id,
                },
              },
              create: {
                userId,
                accountId: account.id,
                monthlyAmount,
              },
              update: {
                monthlyAmount,
              },
            });
          }
        }
      }

      await tx.user.update({
        where: { id: userId },
        data: { onboardingCompletedAt: new Date() },
      });

      return { createdAccounts, inviteUrl };
    }, { timeout: 30000, maxWait: 30000 });

    if ('error' in result && result.error) {
      return {
        success: false,
        error: 'השלמת האשף נכשלה. יש לעדכן את החשבונות ולנסות שוב.',
        code: 'INVALID_INPUT' as const,
      };
    }

    await Promise.all(result.createdAccounts.map((account) => recalculateAccountIncome(account.id)));

    refreshAllViews(userId);
    return {
      success: true,
      createdAccounts: result.createdAccounts,
      inviteUrl: result.inviteUrl,
      code: null,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('completeOnboarding failed', {
      error: errorMessage,
      input: {
        createPersonal: Boolean(input.createPersonal),
        createShared: Boolean(input.createShared),
        hasSharedAccountName: Boolean(input.sharedAccountName?.trim()),
      },
    });

    const lowerMessage = errorMessage.toLowerCase();
    const errorCode = lowerMessage.includes('unauthorized')
      ? 'AUTH_STALE'
      : lowerMessage.includes('constraint')
        ? 'DB_CONSTRAINT'
        : lowerMessage.includes('invite')
          ? 'INVITE_CREATE_FAILED'
          : 'UNKNOWN';

    if (process.env.NODE_ENV !== 'production') {
      return {
        success: false,
        error: `השלמת האשף נכשלה: ${errorMessage}`,
        code: errorCode,
      };
    }

    return {
      success: false,
      error: 'השלמת האשף נכשלה. נסה/י שוב בעוד רגע.',
      code: errorCode,
    };
  }
}
