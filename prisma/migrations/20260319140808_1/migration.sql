-- DropIndex
DROP INDEX "AccountInvite_invitedEmail_acceptedAt_expiresAt_idx";

-- AlterTable
ALTER TABLE "AccountContributionPlan" ALTER COLUMN "updatedAt" DROP DEFAULT;
