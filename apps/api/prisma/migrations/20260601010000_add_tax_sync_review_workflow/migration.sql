-- CreateTable: TaxSyncRun
CREATE TABLE "TaxSyncRun" (
  "id" TEXT NOT NULL,
  "triggerSource" TEXT NOT NULL DEFAULT 'MANUAL',
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "region" "MarketRegion",
  "summary" JSONB,
  "errorMessage" TEXT,
  "triggeredBy" TEXT,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "TaxSyncRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable: TaxRuleChangeProposal
CREATE TABLE "TaxRuleChangeProposal" (
  "id" TEXT NOT NULL,
  "syncRunId" TEXT NOT NULL,
  "marketRegion" "MarketRegion" NOT NULL,
  "taxType" TEXT NOT NULL,
  "taxName" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "stateCode" TEXT,
  "currentRate" DOUBLE PRECISION,
  "proposedRate" DOUBLE PRECISION NOT NULL,
  "changeDelta" DOUBLE PRECISION,
  "proposedDescription" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "sourceLabel" TEXT NOT NULL,
  "sourceUrl" TEXT NOT NULL,
  "sourceExcerpt" TEXT,
  "evidence" JSONB,
  "confidence" DOUBLE PRECISION,
  "rationale" TEXT,
  "dedupeKey" TEXT NOT NULL,
  "effectiveFrom" TIMESTAMP(3),
  "reviewedBy" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "reviewNotes" TEXT,
  "appliedRuleId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "TaxRuleChangeProposal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TaxSyncRun_status_startedAt_idx" ON "TaxSyncRun"("status", "startedAt");
CREATE INDEX "TaxSyncRun_region_startedAt_idx" ON "TaxSyncRun"("region", "startedAt");
CREATE UNIQUE INDEX "TaxRuleChangeProposal_dedupeKey_key" ON "TaxRuleChangeProposal"("dedupeKey");
CREATE INDEX "TaxRuleChangeProposal_status_marketRegion_createdAt_idx" ON "TaxRuleChangeProposal"("status", "marketRegion", "createdAt");
CREATE INDEX "TaxRuleChangeProposal_marketRegion_category_status_idx" ON "TaxRuleChangeProposal"("marketRegion", "category", "status");
CREATE INDEX "TaxRuleChangeProposal_syncRunId_idx" ON "TaxRuleChangeProposal"("syncRunId");

-- AddForeignKey
ALTER TABLE "TaxRuleChangeProposal"
ADD CONSTRAINT "TaxRuleChangeProposal_syncRunId_fkey"
FOREIGN KEY ("syncRunId") REFERENCES "TaxSyncRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;