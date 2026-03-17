-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('PRIVATE', 'SHARED');

-- CreateEnum
CREATE TYPE "AccountMemberRole" AS ENUM ('OWNER', 'MEMBER');

-- CreateEnum
CREATE TYPE "RecurringMonthPolicy" AS ENUM ('ROLL_TO_LAST_DAY', 'SKIP_MONTH');

-- Ensure uuid generator exists for bootstrap records if needed
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- User auth fields
ALTER TABLE "User" ADD COLUMN "passwordHash" TEXT NOT NULL DEFAULT '';
ALTER TABLE "User" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "User" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "User" ALTER COLUMN "name" DROP NOT NULL;

-- Bootstrap a user only when existing data exists without users
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM "User")
     AND (
      EXISTS (SELECT 1 FROM "Account")
      OR EXISTS (SELECT 1 FROM "Category")
      OR EXISTS (SELECT 1 FROM "BudgetSettings")
      OR EXISTS (SELECT 1 FROM "Transaction")
      OR EXISTS (SELECT 1 FROM "RecurringTransaction")
     )
  THEN
    INSERT INTO "User" ("id", "name", "email", "passwordHash")
    VALUES (gen_random_uuid()::text, 'Owner', 'owner@local.lumiflow', '');
  END IF;
END $$;

-- Generic account upgrades
ALTER TABLE "Account" ADD COLUMN "color" TEXT;
ALTER TABLE "Account" ADD COLUMN "icon" TEXT;
ALTER TABLE "Account" ADD COLUMN "isArchived" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Account" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Account" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Account" ADD COLUMN "type_new" "AccountType";

UPDATE "Account"
SET "type_new" = CASE WHEN UPPER("type") = 'JOINT' THEN 'SHARED'::"AccountType" ELSE 'PRIVATE'::"AccountType" END;

ALTER TABLE "Account" ALTER COLUMN "type_new" SET NOT NULL;
ALTER TABLE "Account" DROP COLUMN "type";
ALTER TABLE "Account" RENAME COLUMN "type_new" TO "type";

-- Replace implicit many-to-many with explicit membership
CREATE TABLE "AccountMember" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "accountId" TEXT NOT NULL,
  "role" "AccountMemberRole" NOT NULL DEFAULT 'MEMBER',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AccountMember_pkey" PRIMARY KEY ("id")
);

INSERT INTO "AccountMember" ("id", "userId", "accountId", "role")
SELECT gen_random_uuid()::text, "B", "A", 'OWNER'::"AccountMemberRole"
FROM "_AccountToUser";

INSERT INTO "AccountMember" ("id", "userId", "accountId", "role")
SELECT gen_random_uuid()::text, u."id", a."id", 'OWNER'::"AccountMemberRole"
FROM "User" u
CROSS JOIN "Account" a
WHERE NOT EXISTS (
  SELECT 1
  FROM "AccountMember" am
  WHERE am."userId" = u."id" AND am."accountId" = a."id"
)
AND (SELECT COUNT(*) FROM "AccountMember") = 0;

CREATE UNIQUE INDEX "AccountMember_userId_accountId_key" ON "AccountMember"("userId", "accountId");

-- Scope categories/settings to user
ALTER TABLE "BudgetSettings" ADD COLUMN "userId" TEXT;
ALTER TABLE "Category" ADD COLUMN "userId" TEXT;

UPDATE "BudgetSettings"
SET "userId" = (SELECT "id" FROM "User" ORDER BY "createdAt" ASC LIMIT 1)
WHERE "userId" IS NULL;

UPDATE "Category"
SET "userId" = (SELECT "id" FROM "User" ORDER BY "createdAt" ASC LIMIT 1)
WHERE "userId" IS NULL;

ALTER TABLE "BudgetSettings" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "Category" ALTER COLUMN "userId" SET NOT NULL;

-- Recurring linkage + policy
ALTER TABLE "Transaction" ADD COLUMN "recurringTransactionId" TEXT;
ALTER TABLE "Transaction" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "RecurringTransaction" ADD COLUMN "dayOfMonth" INTEGER;
ALTER TABLE "RecurringTransaction" ADD COLUMN "monthPolicy" "RecurringMonthPolicy" NOT NULL DEFAULT 'ROLL_TO_LAST_DAY';
UPDATE "RecurringTransaction" SET "dayOfMonth" = EXTRACT(DAY FROM "startDate")::int WHERE "dayOfMonth" IS NULL;
ALTER TABLE "RecurringTransaction" ALTER COLUMN "dayOfMonth" SET NOT NULL;

-- Invite links
CREATE TABLE "AccountInvite" (
  "id" TEXT NOT NULL,
  "accountId" TEXT NOT NULL,
  "createdById" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "acceptedAt" TIMESTAMP(3),
  "acceptedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AccountInvite_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AccountInvite_tokenHash_key" ON "AccountInvite"("tokenHash");
CREATE UNIQUE INDEX "BudgetSettings_userId_key" ON "BudgetSettings"("userId");
DROP INDEX IF EXISTS "Category_name_key";
CREATE UNIQUE INDEX "Category_userId_name_key" ON "Category"("userId", "name");

-- Foreign keys
ALTER TABLE "AccountMember"
  ADD CONSTRAINT "AccountMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AccountMember"
  ADD CONSTRAINT "AccountMember_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BudgetSettings"
  ADD CONSTRAINT "BudgetSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Category"
  ADD CONSTRAINT "Category_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Transaction"
  ADD CONSTRAINT "Transaction_recurringTransactionId_fkey" FOREIGN KEY ("recurringTransactionId") REFERENCES "RecurringTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AccountInvite"
  ADD CONSTRAINT "AccountInvite_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AccountInvite"
  ADD CONSTRAINT "AccountInvite_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AccountInvite"
  ADD CONSTRAINT "AccountInvite_acceptedById_fkey" FOREIGN KEY ("acceptedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Remove legacy implicit relation table
DROP TABLE IF EXISTS "_AccountToUser";
