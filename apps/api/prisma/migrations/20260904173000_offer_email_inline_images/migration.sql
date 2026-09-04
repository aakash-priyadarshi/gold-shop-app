-- Store short-lived offer header images in Railway PostgreSQL so they survive
-- API redeploys without relying on the service's ephemeral filesystem.
CREATE TABLE "OfferEmailImage" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "byteSize" INTEGER NOT NULL,
    "content" BYTEA NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OfferEmailImage_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "OfferCampaign" ADD COLUMN "emailImageId" TEXT;

CREATE UNIQUE INDEX "OfferCampaign_emailImageId_key" ON "OfferCampaign"("emailImageId");
CREATE INDEX "OfferEmailImage_expiresAt_idx" ON "OfferEmailImage"("expiresAt");

ALTER TABLE "OfferCampaign"
ADD CONSTRAINT "OfferCampaign_emailImageId_fkey"
FOREIGN KEY ("emailImageId") REFERENCES "OfferEmailImage"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
