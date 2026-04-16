-- CreateTable
CREATE TABLE "SavingsLabel" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "isCustom" BOOLEAN NOT NULL DEFAULT false,
    "hidden" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "SavingsLabel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavingsAllocation" (
    "id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "accountId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavingsAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SavingsLabel_userId_name_key" ON "SavingsLabel"("userId", "name");

-- CreateIndex
CREATE INDEX "SavingsAllocation_accountId_date_idx" ON "SavingsAllocation"("accountId", "date");

-- CreateIndex
CREATE INDEX "SavingsAllocation_userId_idx" ON "SavingsAllocation"("userId");

-- AddForeignKey
ALTER TABLE "SavingsLabel" ADD CONSTRAINT "SavingsLabel_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavingsAllocation" ADD CONSTRAINT "SavingsAllocation_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavingsAllocation" ADD CONSTRAINT "SavingsAllocation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
