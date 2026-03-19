-- DropForeignKey
ALTER TABLE "RecurringTransaction" DROP CONSTRAINT "RecurringTransaction_accountId_fkey";

-- DropForeignKey
ALTER TABLE "Transaction" DROP CONSTRAINT "Transaction_accountId_fkey";

-- DropIndex
DROP INDEX IF EXISTS "AccountInvite_invitedEmail_acceptedAt_expiresAt_idx";

-- AlterTable
ALTER TABLE "Account" ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "type" SET DEFAULT 'PRIVATE';

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "passwordHash" DROP DEFAULT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringTransaction" ADD CONSTRAINT "RecurringTransaction_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;
