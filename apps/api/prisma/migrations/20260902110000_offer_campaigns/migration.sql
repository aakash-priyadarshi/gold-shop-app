CREATE TYPE "OfferCampaignKind" AS ENUM ('RECOVERY', 'FESTIVAL');
CREATE TYPE "OfferCampaignRedemptionStatus" AS ENUM ('RESERVED', 'REDEEMED', 'RELEASED');

CREATE TABLE "OfferCampaign" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "kind" "OfferCampaignKind" NOT NULL,
  "complimentaryDays" INTEGER NOT NULL,
  "discountPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3) NOT NULL,
  "emailSubject" TEXT NOT NULL,
  "emailHeading" TEXT NOT NULL,
  "emailBody" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OfferCampaign_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "OfferCampaign_valid_days" CHECK ("complimentaryDays" BETWEEN 1 AND 90),
  CONSTRAINT "OfferCampaign_valid_discount" CHECK ("discountPercent" BETWEEN 0 AND 100),
  CONSTRAINT "OfferCampaign_valid_window" CHECK ("startsAt" < "endsAt")
);

CREATE TABLE "OfferCampaignRedemption" (
  "id" TEXT NOT NULL,
  "campaignId" TEXT NOT NULL,
  "shopId" TEXT NOT NULL,
  "discountPercent" DOUBLE PRECISION NOT NULL,
  "status" "OfferCampaignRedemptionStatus" NOT NULL DEFAULT 'RESERVED',
  "stripeSessionId" TEXT,
  "reservationEndsAt" TIMESTAMP(3),
  "redeemedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OfferCampaignRedemption_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OfferCampaign_key_key" ON "OfferCampaign"("key");
CREATE INDEX "OfferCampaign_kind_isActive_startsAt_endsAt_idx"
  ON "OfferCampaign"("kind", "isActive", "startsAt", "endsAt");
CREATE INDEX "OfferCampaign_endsAt_idx" ON "OfferCampaign"("endsAt");

CREATE UNIQUE INDEX "OfferCampaignRedemption_stripeSessionId_key"
  ON "OfferCampaignRedemption"("stripeSessionId");
CREATE UNIQUE INDEX "OfferCampaignRedemption_campaignId_shopId_key"
  ON "OfferCampaignRedemption"("campaignId", "shopId");
CREATE INDEX "OfferCampaignRedemption_shopId_status_idx"
  ON "OfferCampaignRedemption"("shopId", "status");
CREATE INDEX "OfferCampaignRedemption_status_reservationEndsAt_idx"
  ON "OfferCampaignRedemption"("status", "reservationEndsAt");

ALTER TABLE "OfferCampaignRedemption"
  ADD CONSTRAINT "OfferCampaignRedemption_campaignId_fkey"
  FOREIGN KEY ("campaignId") REFERENCES "OfferCampaign"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OfferCampaignRedemption"
  ADD CONSTRAINT "OfferCampaignRedemption_shopId_fkey"
  FOREIGN KEY ("shopId") REFERENCES "Shop"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
