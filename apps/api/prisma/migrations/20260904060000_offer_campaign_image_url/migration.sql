-- Editable hero image for offer campaign emails (falls back to the
-- default artwork when empty). Editable until 5 minutes before a send.
ALTER TABLE "OfferCampaign"
  ADD COLUMN "imageUrl" TEXT;
