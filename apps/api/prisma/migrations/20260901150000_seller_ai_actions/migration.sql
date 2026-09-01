-- Pending and completed write proposals from seller-connected AI clients.
-- No financial action is represented here; sellers confirm each supported
-- inventory or order-status change from the authenticated dashboard.
ALTER TABLE "ShopApiKey"
  ADD COLUMN "kind" TEXT NOT NULL DEFAULT 'INTEGRATION';

CREATE TYPE "SellerAiActionStatus" AS ENUM ('PENDING', 'PROCESSING', 'CONFIRMED', 'REJECTED', 'EXPIRED', 'FAILED');

CREATE TABLE "SellerAiAction" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "apiKeyId" TEXT NOT NULL,
    "keyPrefix" TEXT NOT NULL,
    "toolName" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "SellerAiActionStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "confirmedByUserId" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "rejectedByUserId" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SellerAiAction_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "SellerAiAction"
  ADD CONSTRAINT "SellerAiAction_shopId_fkey"
  FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "SellerAiAction_shopId_status_createdAt_idx"
  ON "SellerAiAction"("shopId", "status", "createdAt");
CREATE INDEX "SellerAiAction_shopId_status_expiresAt_idx"
  ON "SellerAiAction"("shopId", "status", "expiresAt");
CREATE INDEX "SellerAiAction_apiKeyId_createdAt_idx"
  ON "SellerAiAction"("apiKeyId", "createdAt");
CREATE INDEX "SellerAiAction_expiresAt_idx" ON "SellerAiAction"("expiresAt");
