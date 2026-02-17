-- Chat moderation, refunds, product variants, size charts
-- Full diff from live Neon DB to current Prisma schema

-- CreateEnum
CREATE TYPE "ConversationStatus" AS ENUM ('ACTIVE', 'LOCKED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "RefundStatus" AS ENUM ('NONE', 'REQUESTED', 'APPROVED', 'REJECTED', 'PROCESSED');

-- AlterEnum
ALTER TYPE "CommissionStatus" ADD VALUE 'REVERSED';

-- AlterEnum
ALTER TYPE "DetailedOrderStatus" ADD VALUE 'REFUND_REQUESTED';

-- AlterEnum (NotificationType)
ALTER TYPE "NotificationType" ADD VALUE 'NEW_MESSAGE';
ALTER TYPE "NotificationType" ADD VALUE 'CONVERSATION_LOCKED';
ALTER TYPE "NotificationType" ADD VALUE 'CHAT_VIOLATION_WARNING';
ALTER TYPE "NotificationType" ADD VALUE 'ACCOUNT_SUSPENDED';
ALTER TYPE "NotificationType" ADD VALUE 'SHOP_ON_HOLD';
ALTER TYPE "NotificationType" ADD VALUE 'REFUND_REQUESTED';
ALTER TYPE "NotificationType" ADD VALUE 'REFUND_APPROVED';
ALTER TYPE "NotificationType" ADD VALUE 'REFUND_REJECTED';
ALTER TYPE "NotificationType" ADD VALUE 'REFUND_PROCESSED';

-- DropForeignKey
ALTER TABLE "QuoteAnomaly" DROP CONSTRAINT "QuoteAnomaly_offerId_fkey";
ALTER TABLE "QuoteAnomaly" DROP CONSTRAINT "QuoteAnomaly_rfqId_fkey";
ALTER TABLE "QuoteAnomaly" DROP CONSTRAINT "QuoteAnomaly_shopId_fkey";

-- AlterTable
ALTER TABLE "AiPhaseMilestone" ALTER COLUMN "thresholdValue" DROP DEFAULT;

-- AlterTable
ALTER TABLE "InventoryItem" ADD COLUMN "hasSizes" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN "refundIdempotencyKey" TEXT,
ADD COLUMN "refundProcessedAt" TIMESTAMP(3),
ADD COLUMN "refundProcessedById" TEXT,
ADD COLUMN "refundReason" TEXT,
ADD COLUMN "refundRequestedAt" TIMESTAMP(3),
ADD COLUMN "refundStatus" "RefundStatus",
ADD COLUMN "refundableAmount" DOUBLE PRECISION,
ADD COLUMN "variantId" TEXT;

-- AlterTable
ALTER TABLE "QuoteAnomaly" DROP COLUMN "updatedAt",
ALTER COLUMN "expectedValue" SET NOT NULL,
ALTER COLUMN "actualValue" SET NOT NULL,
ALTER COLUMN "deviationPct" SET NOT NULL;

-- AlterTable
ALTER TABLE "RfqOrderInsight" ALTER COLUMN "rfqComposition" SET NOT NULL;

-- CreateTable
CREATE TABLE "ProductVariant" (
    "id" TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "sizeLabel" TEXT NOT NULL,
    "sizeSystem" TEXT NOT NULL DEFAULT 'US',
    "sizeValue" DOUBLE PRECISION,
    "sku" TEXT NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "priceOverride" DOUBLE PRECISION,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ProductVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL,
    "orderId" TEXT,
    "rfqId" TEXT,
    "buyerId" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "status" "ConversationStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "senderRole" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "maskedContent" TEXT,
    "hasViolation" BOOLEAN NOT NULL DEFAULT false,
    "violationType" TEXT,
    "attachmentUrl" TEXT,
    "attachmentType" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "isBlocked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SizeChart" (
    "id" TEXT NOT NULL,
    "jewelleryType" "JewelleryType" NOT NULL,
    "sizeSystem" TEXT NOT NULL,
    "region" "MarketRegion" NOT NULL,
    "sizeLabel" TEXT NOT NULL,
    "sizeValue" DOUBLE PRECISION NOT NULL,
    "diameterMm" DOUBLE PRECISION,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SizeChart_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProductVariant_sku_key" ON "ProductVariant"("sku");
CREATE INDEX "ProductVariant_inventoryItemId_idx" ON "ProductVariant"("inventoryItemId");
CREATE INDEX "ProductVariant_sku_idx" ON "ProductVariant"("sku");
CREATE UNIQUE INDEX "ProductVariant_inventoryItemId_sizeLabel_key" ON "ProductVariant"("inventoryItemId", "sizeLabel");

CREATE UNIQUE INDEX "Conversation_orderId_key" ON "Conversation"("orderId");
CREATE INDEX "Conversation_buyerId_idx" ON "Conversation"("buyerId");
CREATE INDEX "Conversation_shopId_idx" ON "Conversation"("shopId");
CREATE INDEX "Conversation_orderId_idx" ON "Conversation"("orderId");
CREATE INDEX "Conversation_rfqId_idx" ON "Conversation"("rfqId");
CREATE INDEX "Conversation_status_idx" ON "Conversation"("status");

CREATE INDEX "Message_conversationId_idx" ON "Message"("conversationId");
CREATE INDEX "Message_senderId_idx" ON "Message"("senderId");
CREATE INDEX "Message_createdAt_idx" ON "Message"("createdAt");
CREATE INDEX "Message_conversationId_createdAt_idx" ON "Message"("conversationId", "createdAt");

CREATE INDEX "SizeChart_jewelleryType_region_idx" ON "SizeChart"("jewelleryType", "region");
CREATE UNIQUE INDEX "SizeChart_jewelleryType_sizeSystem_region_sizeLabel_key" ON "SizeChart"("jewelleryType", "sizeSystem", "region", "sizeLabel");

CREATE INDEX "AiPhaseMilestone_isReached_idx" ON "AiPhaseMilestone"("isReached");
CREATE INDEX "AiPhaseMilestone_phase_idx" ON "AiPhaseMilestone"("phase");

CREATE UNIQUE INDEX "Order_refundIdempotencyKey_key" ON "Order"("refundIdempotencyKey");

-- AddForeignKey
ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
