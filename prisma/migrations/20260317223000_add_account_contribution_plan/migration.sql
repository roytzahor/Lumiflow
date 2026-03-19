CREATE TABLE "AccountContributionPlan" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "accountId" TEXT NOT NULL,
  "monthlyAmount" DOUBLE PRECISION NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AccountContributionPlan_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AccountContributionPlan_userId_accountId_key"
ON "AccountContributionPlan"("userId", "accountId");

ALTER TABLE "AccountContributionPlan"
  ADD CONSTRAINT "AccountContributionPlan_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AccountContributionPlan"
  ADD CONSTRAINT "AccountContributionPlan_accountId_fkey"
  FOREIGN KEY ("accountId") REFERENCES "Account"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
