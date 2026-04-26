-- Improve lookups by user membership and savings allocations by month scope
CREATE INDEX "AccountMember_userId_idx" ON "AccountMember"("userId");
CREATE INDEX "SavingsAllocation_userId_accountId_date_idx" ON "SavingsAllocation"("userId", "accountId", "date");
