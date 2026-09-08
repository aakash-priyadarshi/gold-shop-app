-- Product-update campaigns announce shipped features to registered
-- shopkeepers. Complimentary days may be 0 for that kind; the API still
-- requires 1–90 for recovery and festival campaigns.
ALTER TYPE "OfferCampaignKind" ADD VALUE IF NOT EXISTS 'PRODUCT_UPDATE';

ALTER TABLE "OfferCampaign"
  ADD COLUMN "ctaUrl" TEXT,
  ADD COLUMN "ctaLabel" TEXT;

ALTER TABLE "OfferCampaign" DROP CONSTRAINT "OfferCampaign_valid_days";
ALTER TABLE "OfferCampaign" ADD CONSTRAINT "OfferCampaign_valid_days" CHECK (
  "complimentaryDays" BETWEEN 0 AND 90
);
