-- PR #21: Karigar Settlement & Account Ledger
-- Additive migration for financial entries, allocations, RETURN_UNUSED movement type, karigar GL accounts, idempotency keys, and opening balance backfill.

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

-- 3. Add Karigar Accounts and Reference Types to General Ledger
ALTER TYPE "LedgerAccountKey" ADD VALUE 'KARIGAR_ADVANCES';
ALTER TYPE "LedgerAccountKey" ADD VALUE 'KARIGAR_PAYABLE';
ALTER TYPE "LedgerAccountKey" ADD VALUE 'KARIGAR_MAKING_EXPENSE';

ALTER TYPE "JournalReferenceType" ADD VALUE 'KARIGAR_OPENING_BALANCE';
ALTER TYPE "JournalReferenceType" ADD VALUE 'KARIGAR_WAGE_ACCRUAL';
ALTER TYPE "JournalReferenceType" ADD VALUE 'KARIGAR_SETTLEMENT_PAYMENT';
ALTER TYPE "JournalReferenceType" ADD VALUE 'KARIGAR_ADVANCE_PAYMENT';
ALTER TYPE "JournalReferenceType" ADD VALUE 'KARIGAR_ADVANCE_APPLICATION';
ALTER TYPE "JournalReferenceType" ADD VALUE 'KARIGAR_ADJUSTMENT';

-- 4. Add idempotency and fingerprint columns to KarigarMetalMovement
ALTER TABLE "KarigarMetalMovement" ADD COLUMN "idempotencyKey" VARCHAR(191);
ALTER TABLE "KarigarMetalMovement" ADD COLUMN "requestFingerprint" VARCHAR(64);
CREATE UNIQUE INDEX "KarigarMetalMovement_shopId_idempotencyKey_key" ON "KarigarMetalMovement"("shopId", "idempotencyKey");

-- Update KarigarMetalMovement job foreign key to RESTRICT
ALTER TABLE "KarigarMetalMovement" DROP CONSTRAINT IF EXISTS "KarigarMetalMovement_jobId_fkey";
ALTER TABLE "KarigarMetalMovement" ADD CONSTRAINT "KarigarMetalMovement_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "KarigarJob"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 5. Create KarigarFinancialEntry Table
CREATE TABLE "KarigarFinancialEntry" (
  "id" TEXT NOT NULL,
  "shopId" TEXT NOT NULL,
  "workshopId" TEXT NOT NULL,
  "jobId" TEXT,
  "type" "KarigarFinancialEntryType" NOT NULL,
  "amount" DECIMAL(18,2) NOT NULL,
  "currency" "CurrencyCode" NOT NULL DEFAULT 'NPR',
  "paymentMethod" VARCHAR(50),
  "reference" VARCHAR(120),
  "note" VARCHAR(1000),
  "sourceMovementId" TEXT,
  "idempotencyKey" VARCHAR(191),
  "requestFingerprint" VARCHAR(64),
  "createdBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "KarigarFinancialEntry_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "KarigarFinancialEntry_amount_check" CHECK ("amount" > 0)
);

-- 6. Create KarigarFinancialAllocation Table
CREATE TABLE "KarigarFinancialAllocation" (
  "id" TEXT NOT NULL,
  "shopId" TEXT NOT NULL,
  "financialEntryId" TEXT NOT NULL,
  "jobId" TEXT NOT NULL,
  "amount" DECIMAL(18,2) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "KarigarFinancialAllocation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "KarigarFinancialAllocation_amount_check" CHECK ("amount" > 0)
);

-- 7. Indexes and Constraints
CREATE UNIQUE INDEX "KarigarFinancialEntry_sourceMovementId_key" ON "KarigarFinancialEntry"("sourceMovementId");
CREATE UNIQUE INDEX "KarigarFinancialEntry_shopId_idempotencyKey_key" ON "KarigarFinancialEntry"("shopId", "idempotencyKey");
CREATE INDEX "KarigarFinancialEntry_shopId_workshopId_createdAt_idx" ON "KarigarFinancialEntry"("shopId", "workshopId", "createdAt");
CREATE INDEX "KarigarFinancialEntry_workshopId_idx" ON "KarigarFinancialEntry"("workshopId");
CREATE INDEX "KarigarFinancialEntry_jobId_idx" ON "KarigarFinancialEntry"("jobId");

CREATE INDEX "KarigarFinancialAllocation_financialEntryId_jobId_idx" ON "KarigarFinancialAllocation"("financialEntryId", "jobId");
CREATE INDEX "KarigarFinancialAllocation_shopId_idx" ON "KarigarFinancialAllocation"("shopId");
CREATE INDEX "KarigarFinancialAllocation_jobId_idx" ON "KarigarFinancialAllocation"("jobId");

-- 8. Foreign Keys (Workshop and Job relationships are RESTRICT to protect financial and metal ledger immutability)
ALTER TABLE "KarigarFinancialEntry" ADD CONSTRAINT "KarigarFinancialEntry_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "KarigarFinancialEntry" ADD CONSTRAINT "KarigarFinancialEntry_workshopId_fkey" FOREIGN KEY ("workshopId") REFERENCES "KarigarWorkshop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "KarigarFinancialEntry" ADD CONSTRAINT "KarigarFinancialEntry_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "KarigarJob"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "KarigarFinancialEntry" ADD CONSTRAINT "KarigarFinancialEntry_sourceMovementId_fkey" FOREIGN KEY ("sourceMovementId") REFERENCES "KarigarMetalMovement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "KarigarFinancialAllocation" ADD CONSTRAINT "KarigarFinancialAllocation_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "KarigarFinancialAllocation" ADD CONSTRAINT "KarigarFinancialAllocation_financialEntryId_fkey" FOREIGN KEY ("financialEntryId") REFERENCES "KarigarFinancialEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "KarigarFinancialAllocation" ADD CONSTRAINT "KarigarFinancialAllocation_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "KarigarJob"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 9. Backfill existing positive wageDue balances into OPENING_BALANCE financial entries
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
