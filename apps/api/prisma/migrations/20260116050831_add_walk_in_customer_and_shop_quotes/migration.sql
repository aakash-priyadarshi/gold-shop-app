-- CreateEnum
CREATE TYPE "ShopQuoteStatus" AS ENUM ('QUOTED', 'CONFIRMED', 'IN_PROGRESS', 'READY', 'COMPLETED', 'CANCELLED');

-- DropForeignKey
ALTER TABLE "RfqRequest" DROP CONSTRAINT "RfqRequest_customerId_fkey";

-- AlterTable
ALTER TABLE "RfqRequest" ALTER COLUMN "customerId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "WalkInCustomer" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "phoneCountryCode" TEXT NOT NULL DEFAULT '+91',
    "name" TEXT NOT NULL,
    "email" TEXT,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'India',
    "createdByShopId" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WalkInCustomer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopQuote" (
    "id" TEXT NOT NULL,
    "quoteNumber" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "walkInCustomerId" TEXT NOT NULL,
    "jewelleryType" "JewelleryType" NOT NULL,
    "buildMethod" "BuildMethod" NOT NULL,
    "composition" JSONB NOT NULL,
    "targetTotalWeightG" DOUBLE PRECISION,
    "targetGoldWeightG" DOUBLE PRECISION,
    "specialInstructions" TEXT,
    "referenceImages" TEXT[],
    "metalCostNpr" DOUBLE PRECISION,
    "makingChargeNpr" DOUBLE PRECISION,
    "gemstoneCostNpr" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "finishCostNpr" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taxNpr" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalPriceNpr" DOUBLE PRECISION,
    "goldPriceSnapshot" DOUBLE PRECISION,
    "estimatedDays" INTEGER,
    "status" "ShopQuoteStatus" NOT NULL DEFAULT 'QUOTED',
    "confirmedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "readyAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancelReason" TEXT,
    "advancePaidNpr" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "balanceDueNpr" DOUBLE PRECISION,
    "paidInFullAt" TIMESTAMP(3),
    "shopNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopQuote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WalkInCustomer_phone_key" ON "WalkInCustomer"("phone");

-- CreateIndex
CREATE INDEX "WalkInCustomer_phone_idx" ON "WalkInCustomer"("phone");

-- CreateIndex
CREATE INDEX "WalkInCustomer_createdByShopId_idx" ON "WalkInCustomer"("createdByShopId");

-- CreateIndex
CREATE UNIQUE INDEX "ShopQuote_quoteNumber_key" ON "ShopQuote"("quoteNumber");

-- CreateIndex
CREATE INDEX "ShopQuote_shopId_idx" ON "ShopQuote"("shopId");

-- CreateIndex
CREATE INDEX "ShopQuote_walkInCustomerId_idx" ON "ShopQuote"("walkInCustomerId");

-- CreateIndex
CREATE INDEX "ShopQuote_status_idx" ON "ShopQuote"("status");

-- CreateIndex
CREATE INDEX "ShopQuote_quoteNumber_idx" ON "ShopQuote"("quoteNumber");

-- AddForeignKey
ALTER TABLE "RfqRequest" ADD CONSTRAINT "RfqRequest_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalkInCustomer" ADD CONSTRAINT "WalkInCustomer_createdByShopId_fkey" FOREIGN KEY ("createdByShopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopQuote" ADD CONSTRAINT "ShopQuote_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopQuote" ADD CONSTRAINT "ShopQuote_walkInCustomerId_fkey" FOREIGN KEY ("walkInCustomerId") REFERENCES "WalkInCustomer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
