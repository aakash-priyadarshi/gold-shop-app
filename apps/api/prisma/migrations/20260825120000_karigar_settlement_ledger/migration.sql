-- PR #21: Karigar Settlement & Account Ledger
-- Additive migration for financial entries, allocations, RETURN_UNUSED movement type, and opening balance backfill.

-- 1. Add RETURN_UNUSED to KarigarMovementType
ALTER TYPE "KarigarMovementType" ADD VALUE 'RETURN_UNUSED';

-- 2. Create KarigarFinancialEntryType Enum
CREATE TYPE "KarigarFinancialEntryType" AS ENUM (
  'OPENING_BALANCE',
  'WAGE_ACCRUAL',
  'SETTLEMENT_PAYMENT',
  'ADVANCE_PAYMENT',
  'ADJUSTMENT_INCREASE',
  'ADJUSTMENT_DECREASE'
);

-- 3. Create KarigarFinancialEntry Table
CREATE TABLE "KarigarFinancialEntry" (
  "id" TEXT NOT NULL,
  "shopId" TEXT NOT NULL,
  "workshopId" TEXT NOT NULL,
  "jobId" TEXT,
  "type" "KarigarFinancialEntryType" NOT NULL,
  "amount" DECIMAL(18,2) NOT NULL,
  "currency" "CurrencyCode" NOT NULL DEFAULT 'NPR',
  "paymentMethod" TEXT,
  "reference" VARCHAR(120),
  "note" VARCHAR(1000),
  "sourceMovementId" TEXT,
  "idempotencyKey" TEXT,
  "createdBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "KarigarFinancialEntry_pkey" PRIMARY KEY ("id")
);

-- 4. Create KarigarFinancialAllocation Table
CREATE TABLE "KarigarFinancialAllocation" (
  "id" TEXT NOT NULL,
  "shopId" TEXT NOT NULL,
  "financialEntryId" TEXT NOT NULL,
  "jobId" TEXT NOT NULL,
  "amount" DECIMAL(18,2) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "KarigarFinancialAllocation_pkey" PRIMARY KEY ("id")
);

-- 5. Indexes and Constraints
CREATE UNIQUE INDEX "KarigarFinancialEntry_sourceMovementId_key" ON "KarigarFinancialEntry"("sourceMovementId");
CREATE UNIQUE INDEX "KarigarFinancialEntry_shopId_idempotencyKey_key" ON "KarigarFinancialEntry"("shopId", "idempotencyKey");
CREATE INDEX "KarigarFinancialEntry_shopId_workshopId_createdAt_idx" ON "KarigarFinancialEntry"("shopId", "workshopId", "createdAt");
CREATE INDEX "KarigarFinancialEntry_workshopId_idx" ON "KarigarFinancialEntry"("workshopId");
CREATE INDEX "KarigarFinancialEntry_jobId_idx" ON "KarigarFinancialEntry"("jobId");
CREATE INDEX "KarigarFinancialEntry_sourceMovementId_idx" ON "KarigarFinancialEntry"("sourceMovementId");

CREATE UNIQUE INDEX "KarigarFinancialAllocation_financialEntryId_jobId_key" ON "KarigarFinancialAllocation"("financialEntryId", "jobId");
CREATE INDEX "KarigarFinancialAllocation_shopId_idx" ON "KarigarFinancialAllocation"("shopId");
CREATE INDEX "KarigarFinancialAllocation_jobId_idx" ON "KarigarFinancialAllocation"("jobId");

-- 6. Foreign Keys
ALTER TABLE "KarigarFinancialEntry" ADD CONSTRAINT "KarigarFinancialEntry_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "KarigarFinancialEntry" ADD CONSTRAINT "KarigarFinancialEntry_workshopId_fkey" FOREIGN KEY ("workshopId") REFERENCES "KarigarWorkshop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "KarigarFinancialEntry" ADD CONSTRAINT "KarigarFinancialEntry_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "KarigarJob"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "KarigarFinancialEntry" ADD CONSTRAINT "KarigarFinancialEntry_sourceMovementId_fkey" FOREIGN KEY ("sourceMovementId") REFERENCES "KarigarMetalMovement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "KarigarFinancialAllocation" ADD CONSTRAINT "KarigarFinancialAllocation_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "KarigarFinancialAllocation" ADD CONSTRAINT "KarigarFinancialAllocation_financialEntryId_fkey" FOREIGN KEY ("financialEntryId") REFERENCES "KarigarFinancialEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "KarigarFinancialAllocation" ADD CONSTRAINT "KarigarFinancialAllocation_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "KarigarJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 7. Backfill existing positive wageDue balances into OPENING_BALANCE financial entries
INSERT INTO "KarigarFinancialEntry" ("id", "shopId", "workshopId", "type", "amount", "currency", "note", "createdAt")
SELECT 
  gen_random_uuid()::text,
  w."shopId",
  w."id",
  'OPENING_BALANCE'::"KarigarFinancialEntryType",
  ROUND(w."wageDue"::numeric, 2),
  s."currency",
  'Opening balance migrated from existing karigar wage balance',
  NOW()
FROM "KarigarWorkshop" w
JOIN "Shop" s ON s."id" = w."shopId"
WHERE w."wageDue" > 0;
