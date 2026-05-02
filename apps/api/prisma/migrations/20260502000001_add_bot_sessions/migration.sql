-- CreateTable: BotSession
-- Stores one record per SupportBot chat session (browser-tab lifetime).
-- Groups all AiChatLog rows so full conversations can be replayed.
-- expiresAt = startedAt + 12 months (retention policy for investor metrics + PDPB compliance).
CREATE TABLE "BotSession" (
    "id"            TEXT        NOT NULL,
    "ipAddress"     TEXT,
    "userAgent"     TEXT,
    "messageCount"  INTEGER     NOT NULL DEFAULT 0,
    "escalated"     BOOLEAN     NOT NULL DEFAULT false,
    "leadIntents"   TEXT[]      NOT NULL DEFAULT '{}',
    "guestName"     TEXT,
    "guestEmail"    TEXT,
    "startedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt"     TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BotSession_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BotSession_startedAt_idx" ON "BotSession"("startedAt");
CREATE INDEX "BotSession_expiresAt_idx" ON "BotSession"("expiresAt");

-- AddForeignKey: AiChatLog → BotSession
-- ON DELETE SET NULL so deleting expired sessions doesn't orphan log rows.
ALTER TABLE "AiChatLog" ADD CONSTRAINT "AiChatLog_sessionId_fkey"
    FOREIGN KEY ("sessionId") REFERENCES "BotSession"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
