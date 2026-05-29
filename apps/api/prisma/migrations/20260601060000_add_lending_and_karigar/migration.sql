-- CreateEnum
CREATE TYPE "GoldLoanStatus" AS ENUM ('ACTIVE', 'REDEEMED', 'DEFAULTED');

-- CreateTable
CREATE TABLE "GoldLoan" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "clientId" TEXT,
    "loanNumber" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT,
    "principal" DOUBLE PRECISION NOT NULL,
    "interestRate" DOUBLE PRECISION NOT NULL,
    "rateType" TEXT NOT NULL DEFAULT 'MONTHLY',
    "interestType" TEXT NOT NULL DEFAULT 'SIMPLE',
    "compoundFrequency" TEXT,
    "pawnedItems" JSONB NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'NPR',
    "status" "GoldLoanStatus" NOT NULL DEFAULT 'ACTIVE',
    "loanDate" TIMESTAMP(3) NOT NULL,
    "redeemedDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GoldLoan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KarigarWorkshop" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "artisan" TEXT NOT NULL,
    "location" TEXT NOT NULL DEFAULT 'Local',
    "phone" TEXT,
    "email" TEXT,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 5,
    "metalIssued" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "metalReturned" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "wastagePercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "wastageLimit" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "wageRatePerGram" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "outstandingBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "wageDue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KarigarWorkshop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KarigarJob" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "product" TEXT NOT NULL,
    "artisan" TEXT NOT NULL,
    "grossWeight" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "steps" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KarigarJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KarigarVaultReserve" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "materialKey" TEXT NOT NULL,
    "label" TEXT NOT NULL DEFAULT '',
    "customKey" TEXT,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isCustom" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KarigarVaultReserve_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GoldLoan_clientId_key" ON "GoldLoan"("clientId");
CREATE INDEX "GoldLoan_shopId_idx" ON "GoldLoan"("shopId");
CREATE INDEX "GoldLoan_shopId_status_idx" ON "GoldLoan"("shopId", "status");
CREATE INDEX "GoldLoan_shopId_createdAt_idx" ON "GoldLoan"("shopId", "createdAt");

CREATE INDEX "KarigarWorkshop_shopId_idx" ON "KarigarWorkshop"("shopId");
CREATE INDEX "KarigarJob_shopId_idx" ON "KarigarJob"("shopId");

CREATE UNIQUE INDEX "KarigarVaultReserve_shopId_materialKey_key" ON "KarigarVaultReserve"("shopId", "materialKey");
CREATE INDEX "KarigarVaultReserve_shopId_idx" ON "KarigarVaultReserve"("shopId");

-- AddForeignKey
ALTER TABLE "GoldLoan" ADD CONSTRAINT "GoldLoan_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "KarigarWorkshop" ADD CONSTRAINT "KarigarWorkshop_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "KarigarJob" ADD CONSTRAINT "KarigarJob_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "KarigarVaultReserve" ADD CONSTRAINT "KarigarVaultReserve_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
