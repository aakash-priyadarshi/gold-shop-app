-- Add durable delivery and engagement metrics for customer recovery campaigns.
ALTER TABLE "RecoveryOffer"
  ADD COLUMN "deliveredAt" TIMESTAMP(3),
  ADD COLUMN "firstOpenedAt" TIMESTAMP(3),
  ADD COLUMN "lastOpenedAt" TIMESTAMP(3),
  ADD COLUMN "openCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "firstClickedAt" TIMESTAMP(3),
  ADD COLUMN "lastClickedAt" TIMESTAMP(3),
  ADD COLUMN "clickCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "bouncedAt" TIMESTAMP(3),
  ADD COLUMN "complainedAt" TIMESTAMP(3),
  ADD COLUMN "failedAt" TIMESTAMP(3),
  ADD COLUMN "suppressedAt" TIMESTAMP(3);

CREATE TABLE "RecoveryOfferEmailEvent" (
  "id" TEXT NOT NULL,
  "webhookId" TEXT NOT NULL,
  "offerId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "eventAt" TIMESTAMP(3) NOT NULL,
  "linkKind" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "RecoveryOfferEmailEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RecoveryOfferEmailEvent_webhookId_key"
  ON "RecoveryOfferEmailEvent"("webhookId");
CREATE INDEX "RecoveryOfferEmailEvent_offerId_eventAt_idx"
  ON "RecoveryOfferEmailEvent"("offerId", "eventAt");
CREATE INDEX "RecoveryOfferEmailEvent_type_eventAt_idx"
  ON "RecoveryOfferEmailEvent"("type", "eventAt");
CREATE INDEX "RecoveryOffer_campaignKey_sentAt_idx"
  ON "RecoveryOffer"("campaignKey", "sentAt");
CREATE INDEX "RecoveryOffer_deliveryMessageId_idx"
  ON "RecoveryOffer"("deliveryMessageId");

ALTER TABLE "RecoveryOfferEmailEvent"
  ADD CONSTRAINT "RecoveryOfferEmailEvent_offerId_fkey"
  FOREIGN KEY ("offerId") REFERENCES "RecoveryOffer"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
