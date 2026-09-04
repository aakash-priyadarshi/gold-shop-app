-- Optional block-based email design for the advanced product-update builder.
-- When null, campaigns keep rendering through the existing Handlebars templates.
ALTER TABLE "OfferCampaign" ADD COLUMN "emailDesign" JSONB;
