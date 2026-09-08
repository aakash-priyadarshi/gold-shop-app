-- Validate after the feature migration commits so the stronger lock used to
-- add the foreign key is not held while PostgreSQL checks existing rows.
ALTER TABLE "OfferCampaign"
VALIDATE CONSTRAINT "OfferCampaign_emailImageId_fkey";
