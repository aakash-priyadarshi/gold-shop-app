-- Persistent translation cache (source of truth for AI translations).
-- Read pipeline: Memory → Redis → Translation (this table) → Gemini.
CREATE TABLE "Translation" (
    "id" TEXT NOT NULL,
    "locale" VARCHAR(8) NOT NULL,
    "sourceHash" VARCHAR(32) NOT NULL,
    "sourceText" TEXT NOT NULL,
    "translation" TEXT NOT NULL,
    "model" VARCHAR(64) NOT NULL DEFAULT 'gemini-2.0-flash',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Translation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Translation_locale_sourceHash_key" ON "Translation"("locale", "sourceHash");
CREATE INDEX "Translation_locale_idx" ON "Translation"("locale");
CREATE INDEX "Translation_createdAt_idx" ON "Translation"("createdAt");

-- Persistent cache of fully-assembled HTML translations.
CREATE TABLE "HtmlTranslation" (
    "id" TEXT NOT NULL,
    "locale" VARCHAR(8) NOT NULL,
    "contentHash" VARCHAR(40) NOT NULL,
    "html" TEXT NOT NULL,
    "model" VARCHAR(64) NOT NULL DEFAULT 'gemini-2.0-flash',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HtmlTranslation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "HtmlTranslation_locale_contentHash_key" ON "HtmlTranslation"("locale", "contentHash");
CREATE INDEX "HtmlTranslation_locale_idx" ON "HtmlTranslation"("locale");
