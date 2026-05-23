-- AlterTable: add guestPhone and contactCaptured to BotSession
ALTER TABLE "BotSession" ADD COLUMN IF NOT EXISTS "guestPhone" TEXT;
ALTER TABLE "BotSession" ADD COLUMN IF NOT EXISTS "contactCaptured" BOOLEAN NOT NULL DEFAULT false;
