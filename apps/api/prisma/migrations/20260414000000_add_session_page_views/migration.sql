-- Migration: add_session_page_views
-- Purely ADDITIVE - adds SessionPageView table as a child of WebSession.
-- No existing tables or columns are dropped or modified.

CREATE TABLE IF NOT EXISTS "SessionPageView" (
    "id"          TEXT NOT NULL,
    "sessionId"   TEXT NOT NULL,
    "path"        TEXT NOT NULL,
    "title"       TEXT,
    "durationSec" INTEGER,
    "visitedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SessionPageView_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "SessionPageView_sessionId_idx" ON "SessionPageView"("sessionId");
CREATE INDEX IF NOT EXISTS "SessionPageView_path_idx"      ON "SessionPageView"("path");

ALTER TABLE "SessionPageView"
    ADD CONSTRAINT "SessionPageView_sessionId_fkey"
    FOREIGN KEY ("sessionId")
    REFERENCES "WebSession"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
