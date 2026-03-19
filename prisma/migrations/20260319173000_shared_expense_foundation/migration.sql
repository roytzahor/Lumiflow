-- AlterTable
ALTER TABLE "Transaction"
ADD COLUMN "paidByUserId" TEXT,
ADD COLUMN "attributedToUserId" TEXT;

-- CreateIndex
CREATE INDEX "Transaction_accountId_date_idx" ON "Transaction"("accountId", "date");

-- CreateIndex
CREATE INDEX "Transaction_paidByUserId_idx" ON "Transaction"("paidByUserId");

-- CreateIndex
CREATE INDEX "Transaction_attributedToUserId_idx" ON "Transaction"("attributedToUserId");

-- CreateIndex
CREATE INDEX "RecurringTransaction_accountId_active_nextRun_idx" ON "RecurringTransaction"("accountId", "active", "nextRun");

-- AddForeignKey
ALTER TABLE "Transaction"
ADD CONSTRAINT "Transaction_paidByUserId_fkey"
FOREIGN KEY ("paidByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction"
ADD CONSTRAINT "Transaction_attributedToUserId_fkey"
FOREIGN KEY ("attributedToUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
