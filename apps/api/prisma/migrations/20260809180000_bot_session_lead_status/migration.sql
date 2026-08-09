-- Lead follow-up fields + awaitingContact for deterministic capture

CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'CONTACTED', 'WON', 'LOST');

ALTER TABLE "BotSession"
  ADD COLUMN "awaitingContact" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "leadStatus" "LeadStatus",
  ADD COLUMN "leadNotes" TEXT,
  ADD COLUMN "leadContactedAt" TIMESTAMP(3);

-- Backfill existing captured contacts as NEW leads
UPDATE "BotSession"
SET "leadStatus" = 'NEW'
WHERE "contactCaptured" = true AND "leadStatus" IS NULL;

CREATE INDEX "BotSession_contactCaptured_leadStatus_idx"
  ON "BotSession"("contactCaptured", "leadStatus");

CREATE INDEX "BotSession_awaitingContact_idx"
  ON "BotSession"("awaitingContact");
