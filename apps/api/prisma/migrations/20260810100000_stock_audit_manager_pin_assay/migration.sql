-- CreateEnum
CREATE TYPE "AssayOffice" AS ENUM ('LONDON', 'BIRMINGHAM', 'SHEFFIELD', 'EDINBURGH');

-- AlterTable Shop: manager PIN clearance gates
ALTER TABLE "Shop" ADD COLUMN IF NOT EXISTS "managerPinHash" TEXT;
ALTER TABLE "Shop" ADD COLUMN IF NOT EXISTS "managerPinSetAt" TIMESTAMP(3);
ALTER TABLE "Shop" ADD COLUMN IF NOT EXISTS "managerPinDiscountThreshold" DOUBLE PRECISION DEFAULT 0;

-- AlterTable InventoryItem: UK assay office
ALTER TABLE "InventoryItem" ADD COLUMN IF NOT EXISTS "assayOffice" "AssayOffice";

-- CreateTable StockAudit
CREATE TABLE IF NOT EXISTS "StockAudit" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "startedByUserId" TEXT,
    "notes" TEXT,
    "summary" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockAudit_pkey" PRIMARY KEY ("id")
);

-- CreateTable StockAuditScan
CREATE TABLE IF NOT EXISTS "StockAuditScan" (
    "id" TEXT NOT NULL,
    "auditId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "inventoryItemId" TEXT,
    "matched" BOOLEAN NOT NULL DEFAULT false,
    "scannedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockAuditScan_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "StockAudit_shopId_status_idx" ON "StockAudit"("shopId", "status");
CREATE INDEX IF NOT EXISTS "StockAudit_shopId_startedAt_idx" ON "StockAudit"("shopId", "startedAt");
CREATE INDEX IF NOT EXISTS "StockAuditScan_auditId_scannedAt_idx" ON "StockAuditScan"("auditId", "scannedAt");
CREATE INDEX IF NOT EXISTS "StockAuditScan_auditId_inventoryItemId_idx" ON "StockAuditScan"("auditId", "inventoryItemId");
CREATE INDEX IF NOT EXISTS "StockAuditScan_code_idx" ON "StockAuditScan"("code");

ALTER TABLE "StockAudit" DROP CONSTRAINT IF EXISTS "StockAudit_shopId_fkey";
ALTER TABLE "StockAudit" ADD CONSTRAINT "StockAudit_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StockAuditScan" DROP CONSTRAINT IF EXISTS "StockAuditScan_auditId_fkey";
ALTER TABLE "StockAuditScan" ADD CONSTRAINT "StockAuditScan_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "StockAudit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StockAuditScan" DROP CONSTRAINT IF EXISTS "StockAuditScan_inventoryItemId_fkey";
ALTER TABLE "StockAuditScan" ADD CONSTRAINT "StockAuditScan_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
