-- AlterEnum
ALTER TYPE "LeadSource" ADD VALUE IF NOT EXISTS 'WHATSAPP';

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "MessageDirection" AS ENUM ('INBOUND', 'OUTBOUND');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "MessageChannel" AS ENUM ('WHATSAPP', 'SMS');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "MessageSender" AS ENUM ('LEAD', 'AI_BOT', 'ADMIN', 'SYSTEM');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "MessageStatus" AS ENUM ('QUEUED', 'SENT', 'DELIVERED', 'READ', 'FAILED', 'RECEIVED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AlterTable Lead
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "whatsappOptOut" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "aiBotPaused" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "customerServiceWindowExpiresAt" TIMESTAMP(3);
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "lastMessageAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Lead_customerServiceWindowExpiresAt_idx" ON "Lead"("customerServiceWindowExpiresAt");

-- CreateTable
CREATE TABLE IF NOT EXISTS "lead_messages" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "direction" "MessageDirection" NOT NULL,
    "channel" "MessageChannel" NOT NULL DEFAULT 'WHATSAPP',
    "sender" "MessageSender" NOT NULL,
    "body" TEXT NOT NULL,
    "mediaUrl" TEXT,
    "status" "MessageStatus" NOT NULL DEFAULT 'SENT',
    "twilioMessageSid" TEXT,
    "rawPayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lead_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "lead_messages_leadId_createdAt_idx" ON "lead_messages"("leadId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "lead_messages_twilioMessageSid_idx" ON "lead_messages"("twilioMessageSid");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "lead_messages_twilioMessageSid_key" ON "lead_messages"("twilioMessageSid");

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "lead_messages" ADD CONSTRAINT "lead_messages_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Backfill existing local-format lead phone numbers to canonical E.164
UPDATE "Lead"
SET "phone" = '+977' || regexp_replace("phone", '^0', '')
WHERE ("country" = 'NP' OR "country" IS NULL)
  AND "phone" IS NOT NULL
  AND "phone" NOT LIKE '+%'
  AND "phone" ~ '^0?9[78]\d{8}$';

UPDATE "Lead"
SET "phone" = '+91' || regexp_replace("phone", '^0', '')
WHERE "country" = 'IN'
  AND "phone" IS NOT NULL
  AND "phone" NOT LIKE '+%'
  AND "phone" ~ '^0?[6-9]\d{9}$';

