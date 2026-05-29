-- Mobile shopkeeper tools: Repairs + Gold Savings schemes (offline-first capable).
-- Each table carries an optional unique `clientId` so the PWA / native app can
-- create records offline and replay them idempotently on reconnect.

-- CreateEnum
CREATE TYPE "RepairStatus" AS ENUM ('RECEIVED', 'DIAGNOSING', 'IN_REPAIR', 'READY', 'DELIVERED');

-- CreateEnum
CREATE TYPE "SavingsSchemeType" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY');

-- CreateEnum
CREATE TYPE "SavingsMemberStatus" AS ENUM ('ACTIVE', 'MATURED', 'REDEEMED', 'CANCELLED');

-- CreateTable
CREATE TABLE "RepairJob" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "clientId" TEXT,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT,
    "itemDescription" TEXT NOT NULL,
    "issueDescription" TEXT NOT NULL,
    "status" "RepairStatus" NOT NULL DEFAULT 'RECEIVED',
    "estimatedCost" DOUBLE PRECISION,
    "finalCost" DOUBLE PRECISION,
    "expectedReadyDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RepairJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavingsMember" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "clientId" TEXT,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT,
    "schemeType" "SavingsSchemeType" NOT NULL DEFAULT 'MONTHLY',
    "installmentAmount" DOUBLE PRECISION NOT NULL,
    "installmentsPaid" INTEGER NOT NULL DEFAULT 0,
    "totalInstallments" INTEGER NOT NULL,
    "bonusInstallments" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'NPR',
    "startDate" TIMESTAMP(3) NOT NULL,
    "maturityDate" TIMESTAMP(3) NOT NULL,
    "status" "SavingsMemberStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SavingsMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavingsPayment" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "clientId" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavingsPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RepairJob_clientId_key" ON "RepairJob"("clientId");

-- CreateIndex
CREATE INDEX "RepairJob_shopId_idx" ON "RepairJob"("shopId");

-- CreateIndex
CREATE INDEX "RepairJob_shopId_status_idx" ON "RepairJob"("shopId", "status");

-- CreateIndex
CREATE INDEX "RepairJob_shopId_createdAt_idx" ON "RepairJob"("shopId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SavingsMember_clientId_key" ON "SavingsMember"("clientId");

-- CreateIndex
CREATE INDEX "SavingsMember_shopId_idx" ON "SavingsMember"("shopId");

-- CreateIndex
CREATE INDEX "SavingsMember_shopId_status_idx" ON "SavingsMember"("shopId", "status");

-- CreateIndex
CREATE INDEX "SavingsMember_shopId_createdAt_idx" ON "SavingsMember"("shopId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SavingsPayment_clientId_key" ON "SavingsPayment"("clientId");

-- CreateIndex
CREATE INDEX "SavingsPayment_memberId_idx" ON "SavingsPayment"("memberId");

-- AddForeignKey
ALTER TABLE "RepairJob" ADD CONSTRAINT "RepairJob_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavingsMember" ADD CONSTRAINT "SavingsMember_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavingsPayment" ADD CONSTRAINT "SavingsPayment_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "SavingsMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;
