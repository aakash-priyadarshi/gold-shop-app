-- Workshop manufacturing (factory UI). Additive only.
-- Does not alter invoice / catalogue billing wastage.

-- Shop setting: off = Supply Chain karigar book; on + plan flag = Workshop nav.
ALTER TABLE "Shop" ADD COLUMN "workshopMode" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Shop" ADD COLUMN "workshopDepartments" JSONB;

-- Work-order fields on existing karigar jobs (no second job table).
ALTER TABLE "KarigarJob" ADD COLUMN "walkInCustomerId" TEXT;
ALTER TABLE "KarigarJob" ADD COLUMN "shopQuoteId" TEXT;
ALTER TABLE "KarigarJob" ADD COLUMN "inventoryItemId" TEXT;
ALTER TABLE "KarigarJob" ADD COLUMN "dueAt" TIMESTAMP(3);
ALTER TABLE "KarigarJob" ADD COLUMN "priority" TEXT NOT NULL DEFAULT 'NORMAL';
ALTER TABLE "KarigarJob" ADD COLUMN "qty" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "KarigarJob" ADD COLUMN "sizeLabel" TEXT;
ALTER TABLE "KarigarJob" ADD COLUMN "purity" TEXT;
ALTER TABLE "KarigarJob" ADD COLUMN "metalColor" TEXT;
ALTER TABLE "KarigarJob" ADD COLUMN "photos" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "KarigarJob" ADD COLUMN "notes" TEXT;
ALTER TABLE "KarigarJob" ADD COLUMN "bom" JSONB;
ALTER TABLE "KarigarJob" ADD COLUMN "currentStage" "KarigarStage";

CREATE UNIQUE INDEX "KarigarJob_inventoryItemId_key" ON "KarigarJob"("inventoryItemId");
CREATE INDEX "KarigarJob_shopId_currentStage_idx" ON "KarigarJob"("shopId", "currentStage");
CREATE INDEX "KarigarJob_walkInCustomerId_idx" ON "KarigarJob"("walkInCustomerId");
CREATE INDEX "KarigarJob_shopQuoteId_idx" ON "KarigarJob"("shopQuoteId");

ALTER TABLE "KarigarJob" ADD CONSTRAINT "KarigarJob_walkInCustomerId_fkey" FOREIGN KEY ("walkInCustomerId") REFERENCES "WalkInCustomer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "KarigarJob" ADD CONSTRAINT "KarigarJob_shopQuoteId_fkey" FOREIGN KEY ("shopQuoteId") REFERENCES "ShopQuote"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "KarigarJob" ADD CONSTRAINT "KarigarJob_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Stage routing / QC fields.
ALTER TABLE "KarigarJobStage" ADD COLUMN "notes" TEXT;
ALTER TABLE "KarigarJobStage" ADD COLUMN "photos" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "KarigarJobStage" ADD COLUMN "reworkCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "KarigarJobStage" ADD COLUMN "rejectionReason" TEXT;
ALTER TABLE "KarigarJobStage" ADD COLUMN "startedAt" TIMESTAMP(3);

-- Lot id on metal movements for later genealogy (not a full lot table).
ALTER TABLE "KarigarMetalMovement" ADD COLUMN "lotId" TEXT;

-- Missing-key merge: enable factory flag on Pro+ / Enterprise only if absent.
-- Live admin toggles are preserved. FREE / PRO stay off unless already set.
UPDATE "SubscriptionPlan"
SET "features" = COALESCE("features", '{}'::jsonb) || '{"workshopManufacturing": true}'::jsonb
WHERE "name" IN ('PRO_PLUS', 'ENTERPRISE')
  AND NOT (COALESCE("features", '{}'::jsonb) ? 'workshopManufacturing');

UPDATE "SubscriptionPlan"
SET "features" = COALESCE("features", '{}'::jsonb) || '{"workshopManufacturing": false}'::jsonb
WHERE "name" IN ('FREE', 'PRO')
  AND NOT (COALESCE("features", '{}'::jsonb) ? 'workshopManufacturing');
