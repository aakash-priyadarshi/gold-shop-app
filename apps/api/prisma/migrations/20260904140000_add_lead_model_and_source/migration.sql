-- CreateEnum
CREATE TYPE "LeadSource" AS ENUM ('GOOGLE_MAPS', 'AI_CHATBOT', 'MANUAL_IMPORT', 'REFERRAL');

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "shopName" TEXT NOT NULL,
    "contactName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "website" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT NOT NULL DEFAULT 'NP',
    "source" "LeadSource" NOT NULL DEFAULT 'GOOGLE_MAPS',
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "rating" DOUBLE PRECISION,
    "reviewCount" INTEGER,
    "notes" TEXT,
    "outreachCount" INTEGER NOT NULL DEFAULT 0,
    "lastEmailedAt" TIMESTAMP(3),
    "lastCampaignKey" TEXT,
    "metadata" JSONB,
    "botSessionId" TEXT,
    "convertedUserId" TEXT,
    "convertedShopId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Lead_status_idx" ON "Lead"("status");
CREATE INDEX "Lead_source_idx" ON "Lead"("source");
CREATE INDEX "Lead_country_city_idx" ON "Lead"("country", "city");
CREATE INDEX "Lead_email_idx" ON "Lead"("email");
CREATE INDEX "Lead_phone_idx" ON "Lead"("phone");
CREATE INDEX "Lead_createdAt_idx" ON "Lead"("createdAt");

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_botSessionId_fkey" FOREIGN KEY ("botSessionId") REFERENCES "BotSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
