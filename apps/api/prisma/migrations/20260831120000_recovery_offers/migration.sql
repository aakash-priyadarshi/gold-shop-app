CREATE TYPE "RecoveryOfferStatus" AS ENUM (
  'PREPARED',
  'SENT',
  'CLAIMING',
  'CLAIMED',
  'SEND_FAILED',
  'CANCELLED',
  'EXPIRED'
);

CREATE TABLE "RecoveryOffer" (
  "id" TEXT NOT NULL,
  "campaignKey" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "shopId" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "tokenHash" VARCHAR(64) NOT NULL,
  "days" INTEGER NOT NULL DEFAULT 40,
  "status" "RecoveryOfferStatus" NOT NULL DEFAULT 'PREPARED',
  "sourceReportIds" TEXT[] NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "sentAt" TIMESTAMP(3),
  "claimedAt" TIMESTAMP(3),
  "grantedSubscriptionId" TEXT,
  "deliveryMessageId" TEXT,
  "failureReason" TEXT,
  "createdBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "RecoveryOffer_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RecoveryOffer_tokenHash_key" ON "RecoveryOffer"("tokenHash");
CREATE UNIQUE INDEX "RecoveryOffer_campaignKey_shopId_key" ON "RecoveryOffer"("campaignKey", "shopId");
CREATE INDEX "RecoveryOffer_status_createdAt_idx" ON "RecoveryOffer"("status", "createdAt");
CREATE INDEX "RecoveryOffer_userId_idx" ON "RecoveryOffer"("userId");
CREATE INDEX "RecoveryOffer_shopId_idx" ON "RecoveryOffer"("shopId");
CREATE INDEX "RecoveryOffer_expiresAt_idx" ON "RecoveryOffer"("expiresAt");

ALTER TABLE "RecoveryOffer"
  ADD CONSTRAINT "RecoveryOffer_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RecoveryOffer"
  ADD CONSTRAINT "RecoveryOffer_shopId_fkey"
  FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
