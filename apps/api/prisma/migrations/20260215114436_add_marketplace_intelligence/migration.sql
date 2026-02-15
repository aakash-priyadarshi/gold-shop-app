-- AlterTable: Add loss reason fields to RfqOffer
ALTER TABLE "RfqOffer" ADD COLUMN "lossReasonCategory" TEXT;
ALTER TABLE "RfqOffer" ADD COLUMN "lossReasonNote" TEXT;

-- CreateTable: RfqOrderInsight
CREATE TABLE "RfqOrderInsight" (
    "id" TEXT NOT NULL,
    "rfqId" TEXT NOT NULL,
    "rfqCreatedAt" TIMESTAMP(3) NOT NULL,
    "rfqJewelleryType" TEXT NOT NULL,
    "rfqBuildMethod" TEXT NOT NULL,
    "rfqComposition" JSONB,
    "rfqBudgetMin" DOUBLE PRECISION,
    "rfqBudgetMax" DOUBLE PRECISION,
    "rfqMarketRegion" TEXT,
    "totalOffers" INTEGER NOT NULL DEFAULT 0,
    "avgOfferPrice" DOUBLE PRECISION,
    "minOfferPrice" DOUBLE PRECISION,
    "maxOfferPrice" DOUBLE PRECISION,
    "avgMakingChargePct" DOUBLE PRECISION,
    "selectedOfferId" TEXT,
    "selectedShopId" TEXT,
    "selectedPrice" DOUBLE PRECISION,
    "orderId" TEXT,
    "orderCompleted" BOOLEAN NOT NULL DEFAULT false,
    "orderRating" INTEGER,
    "lossReasons" JSONB,
    "timingRfqToFirstOffer" INTEGER,
    "timingRfqToSelection" INTEGER,
    "timingSelectionToOrder" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RfqOrderInsight_pkey" PRIMARY KEY ("id")
);

-- CreateTable: AiPhaseMilestone
CREATE TABLE "AiPhaseMilestone" (
    "id" TEXT NOT NULL,
    "phase" INTEGER NOT NULL,
    "milestoneName" TEXT NOT NULL,
    "description" TEXT,
    "thresholdValue" INTEGER NOT NULL DEFAULT 0,
    "currentValue" INTEGER NOT NULL DEFAULT 0,
    "isReached" BOOLEAN NOT NULL DEFAULT false,
    "reachedAt" TIMESTAMP(3),
    "adminNotifiedAt" TIMESTAMP(3),
    "actionItems" JSONB,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiPhaseMilestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable: QuoteAnomaly
CREATE TABLE "QuoteAnomaly" (
    "id" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "rfqId" TEXT NOT NULL,
    "anomalyType" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'MEDIUM',
    "expectedValue" DOUBLE PRECISION,
    "actualValue" DOUBLE PRECISION,
    "deviationPct" DOUBLE PRECISION,
    "isReviewed" BOOLEAN NOT NULL DEFAULT false,
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuoteAnomaly_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: RfqOrderInsight indexes
CREATE INDEX "RfqOrderInsight_rfqJewelleryType_idx" ON "RfqOrderInsight"("rfqJewelleryType");
CREATE INDEX "RfqOrderInsight_rfqBuildMethod_idx" ON "RfqOrderInsight"("rfqBuildMethod");
CREATE INDEX "RfqOrderInsight_selectedShopId_idx" ON "RfqOrderInsight"("selectedShopId");
CREATE INDEX "RfqOrderInsight_orderCompleted_idx" ON "RfqOrderInsight"("orderCompleted");
CREATE INDEX "RfqOrderInsight_rfqCreatedAt_idx" ON "RfqOrderInsight"("rfqCreatedAt");
CREATE INDEX "RfqOrderInsight_rfqMarketRegion_idx" ON "RfqOrderInsight"("rfqMarketRegion");

-- CreateIndex: AiPhaseMilestone unique constraint
CREATE UNIQUE INDEX "AiPhaseMilestone_phase_milestoneName_key" ON "AiPhaseMilestone"("phase", "milestoneName");

-- CreateIndex: QuoteAnomaly indexes
CREATE INDEX "QuoteAnomaly_shopId_idx" ON "QuoteAnomaly"("shopId");
CREATE INDEX "QuoteAnomaly_anomalyType_idx" ON "QuoteAnomaly"("anomalyType");
CREATE INDEX "QuoteAnomaly_isReviewed_idx" ON "QuoteAnomaly"("isReviewed");
CREATE INDEX "QuoteAnomaly_severity_idx" ON "QuoteAnomaly"("severity");
CREATE INDEX "QuoteAnomaly_createdAt_idx" ON "QuoteAnomaly"("createdAt");

-- AddForeignKey
ALTER TABLE "QuoteAnomaly" ADD CONSTRAINT "QuoteAnomaly_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "RfqOffer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "QuoteAnomaly" ADD CONSTRAINT "QuoteAnomaly_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "QuoteAnomaly" ADD CONSTRAINT "QuoteAnomaly_rfqId_fkey" FOREIGN KEY ("rfqId") REFERENCES "RfqRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
