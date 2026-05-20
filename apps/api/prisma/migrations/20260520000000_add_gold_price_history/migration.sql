-- CreateTable
CREATE TABLE "GoldPriceHistory" (
    "id"           TEXT NOT NULL,
    "region"       "MarketRegion" NOT NULL,
    "currency"     "CurrencyCode" NOT NULL,
    "gold24kRate"  DOUBLE PRECISION NOT NULL,
    "recordedDate" TEXT NOT NULL,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GoldPriceHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GoldPriceHistory_region_currency_recordedDate_key"
    ON "GoldPriceHistory"("region", "currency", "recordedDate");

CREATE INDEX "GoldPriceHistory_region_currency_recordedDate_idx"
    ON "GoldPriceHistory"("region", "currency", "recordedDate");

CREATE INDEX "GoldPriceHistory_createdAt_idx"
    ON "GoldPriceHistory"("createdAt");
