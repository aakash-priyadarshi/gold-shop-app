/*
  Warnings:

  - A unique constraint covering the columns `[currentVersionId]` on the table `Order` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "OrderVersionStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'SUPERSEDED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "WeightUnit" AS ENUM ('GRAM', 'KILOGRAM', 'TOLA', 'LAAL', 'OUNCE', 'POUND');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CARD', 'BANK_TRANSFER', 'CASH', 'UPI', 'ESEWA', 'KHALTI', 'CONNECTIPS', 'PAYPAL', 'STRIPE', 'PAID_AT_SHOP');

-- CreateEnum
CREATE TYPE "PaymentStatusEnum" AS ENUM ('UNPAID', 'PAID', 'PAID_ON_SHOP', 'PARTIAL', 'REFUNDED');

-- CreateEnum
CREATE TYPE "DetailedOrderStatus" AS ENUM ('PLACED', 'CONFIRMED', 'IN_PROGRESS', 'READY', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "CommissionStatus" AS ENUM ('PENDING', 'PAID', 'OVERDUE', 'WAIVED');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "adminNotes" TEXT,
ADD COLUMN     "createdByAdmin" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "currentVersionId" TEXT,
ADD COLUMN     "detailedStatus" "DetailedOrderStatus" NOT NULL DEFAULT 'PLACED',
ADD COLUMN     "displayCurrency" "CurrencyCode" NOT NULL DEFAULT 'NPR',
ADD COLUMN     "marketCountry" "MarketRegion" NOT NULL DEFAULT 'NP',
ADD COLUMN     "paidAtShopConfirmed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "paidAtShopConfirmedAt" TIMESTAMP(3),
ADD COLUMN     "paidAtShopRequested" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "paidAtShopRequestedAt" TIMESTAMP(3),
ADD COLUMN     "paymentMethodEnum" "PaymentMethod",
ADD COLUMN     "paymentStatusEnum" "PaymentStatusEnum" NOT NULL DEFAULT 'UNPAID',
ADD COLUMN     "paymentVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "paymentVerifiedByAdmin" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "paymentVerifiedById" TEXT,
ALTER COLUMN "paymentMethod" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Shop" ADD COLUMN     "holdAt" TIMESTAMP(3),
ADD COLUMN     "holdReason" TEXT,
ADD COLUMN     "isOnHold" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastComplianceCheckAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "OrderVersion" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "createdByRole" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "productSnapshot" JSONB NOT NULL,
    "subtotalNpr" DOUBLE PRECISION NOT NULL,
    "taxNpr" DOUBLE PRECISION NOT NULL,
    "shippingNpr" DOUBLE PRECISION NOT NULL,
    "discountNpr" DOUBLE PRECISION NOT NULL,
    "totalNpr" DOUBLE PRECISION NOT NULL,
    "makingChargesNpr" DOUBLE PRECISION,
    "materials" JSONB,
    "gemstones" JSONB,
    "finishes" JSONB,
    "timeline" JSONB,
    "status" "OrderVersionStatus" NOT NULL DEFAULT 'PENDING',
    "customerResponse" TEXT,
    "customerNotes" TEXT,
    "respondedAt" TIMESTAMP(3),
    "changeSummary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketConfig" (
    "id" TEXT NOT NULL,
    "countryCode" "MarketRegion" NOT NULL,
    "countryName" TEXT NOT NULL,
    "defaultCurrency" "CurrencyCode" NOT NULL,
    "supportedCurrencies" "CurrencyCode"[],
    "defaultWeightUnit" "WeightUnit" NOT NULL DEFAULT 'GRAM',
    "supportedWeightUnits" "WeightUnit"[],
    "supportedPaymentMethods" "PaymentMethod"[],
    "heroHeadline" TEXT NOT NULL,
    "heroSubheadline" TEXT,
    "footerContactTitle" TEXT,
    "contactEmail" TEXT NOT NULL,
    "contactPhone" TEXT NOT NULL,
    "contactAddress" TEXT,
    "contactWhatsapp" TEXT,
    "taxPercentage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taxName" TEXT,
    "priceMultiplier" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "codEnabled" BOOLEAN NOT NULL DEFAULT false,
    "customOrdersEnabled" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommissionLedger" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "orderTotal" DOUBLE PRECISION NOT NULL,
    "commissionRate" DOUBLE PRECISION NOT NULL DEFAULT 0.01,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" "CurrencyCode" NOT NULL,
    "status" "CommissionStatus" NOT NULL DEFAULT 'PENDING',
    "dueAt" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommissionLedger_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OrderVersion_orderId_idx" ON "OrderVersion"("orderId");

-- CreateIndex
CREATE INDEX "OrderVersion_status_idx" ON "OrderVersion"("status");

-- CreateIndex
CREATE UNIQUE INDEX "OrderVersion_orderId_versionNumber_key" ON "OrderVersion"("orderId", "versionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "MarketConfig_countryCode_key" ON "MarketConfig"("countryCode");

-- CreateIndex
CREATE INDEX "MarketConfig_countryCode_idx" ON "MarketConfig"("countryCode");

-- CreateIndex
CREATE INDEX "MarketConfig_isActive_idx" ON "MarketConfig"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "CommissionLedger_orderId_key" ON "CommissionLedger"("orderId");

-- CreateIndex
CREATE INDEX "CommissionLedger_shopId_idx" ON "CommissionLedger"("shopId");

-- CreateIndex
CREATE INDEX "CommissionLedger_status_idx" ON "CommissionLedger"("status");

-- CreateIndex
CREATE INDEX "CommissionLedger_dueAt_idx" ON "CommissionLedger"("dueAt");

-- CreateIndex
CREATE UNIQUE INDEX "Order_currentVersionId_key" ON "Order"("currentVersionId");

-- CreateIndex
CREATE INDEX "Order_createdByAdmin_idx" ON "Order"("createdByAdmin");

-- CreateIndex
CREATE INDEX "Order_paymentVerifiedByAdmin_idx" ON "Order"("paymentVerifiedByAdmin");

-- CreateIndex
CREATE INDEX "Order_marketCountry_idx" ON "Order"("marketCountry");

-- CreateIndex
CREATE INDEX "Order_detailedStatus_idx" ON "Order"("detailedStatus");

-- AddForeignKey
ALTER TABLE "OrderVersion" ADD CONSTRAINT "OrderVersion_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionLedger" ADD CONSTRAINT "CommissionLedger_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionLedger" ADD CONSTRAINT "CommissionLedger_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
