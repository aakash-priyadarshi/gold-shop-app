-- Single source of truth + throttle/monitoring for external metal-price fetches.

-- Raw USD-per-troy-ounce spot prices (one row per actual external fetch).
CREATE TABLE "MetalSpotSnapshot" (
    "id" TEXT NOT NULL,
    "goldUsdOz" DOUBLE PRECISION NOT NULL,
    "silverUsdOz" DOUBLE PRECISION NOT NULL,
    "platinumUsdOz" DOUBLE PRECISION NOT NULL,
    "palladiumUsdOz" DOUBLE PRECISION NOT NULL,
    "providerTimestamp" TIMESTAMP(3) NOT NULL,
    "source" TEXT NOT NULL,
    "trigger" TEXT NOT NULL DEFAULT 'cron',
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MetalSpotSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MetalSpotSnapshot_fetchedAt_idx" ON "MetalSpotSnapshot"("fetchedAt");

-- Singleton config controlling how often the external API may be called.
CREATE TABLE "MetalPriceConfig" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "fetchIntervalSeconds" INTEGER NOT NULL DEFAULT 86400,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "MetalPriceConfig_pkey" PRIMARY KEY ("id")
);

-- Seed the singleton row (defaults to once per day).
INSERT INTO "MetalPriceConfig" ("id", "fetchIntervalSeconds", "updatedAt")
VALUES ('singleton', 86400, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

-- Audit log of every external fetch attempt (success or failure).
CREATE TABLE "MetalPriceFetchLog" (
    "id" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "source" TEXT NOT NULL,
    "trigger" TEXT NOT NULL,
    "goldUsdOz" DOUBLE PRECISION,
    "silverUsdOz" DOUBLE PRECISION,
    "errorMessage" TEXT,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MetalPriceFetchLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MetalPriceFetchLog_fetchedAt_idx" ON "MetalPriceFetchLog"("fetchedAt");
