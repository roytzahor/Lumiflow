-- CreateEnum
CREATE TYPE "ThemePreference" AS ENUM ('LIGHT', 'DARK', 'SYSTEM');

-- User onboarding/theme state
ALTER TABLE "User" ADD COLUMN "onboardingCompletedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "themePreference" "ThemePreference" NOT NULL DEFAULT 'SYSTEM';

-- Existing users are considered onboarded
UPDATE "User"
SET "onboardingCompletedAt" = CURRENT_TIMESTAMP
WHERE "onboardingCompletedAt" IS NULL;

-- Optional invite targeting by email
ALTER TABLE "AccountInvite" ADD COLUMN "invitedEmail" TEXT;

CREATE INDEX "AccountInvite_invitedEmail_acceptedAt_expiresAt_idx"
ON "AccountInvite"("invitedEmail", "acceptedAt", "expiresAt");
