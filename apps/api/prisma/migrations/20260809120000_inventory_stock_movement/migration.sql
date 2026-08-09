-- Inventory stock movement ledger (POS sales, void restores, adjustments)
-- Applied via Deploy Guard with pre-migrate backup (PGDG pg_dump 17)
CREATE TABLE IF NOT EXISTS "InventoryStockMovement" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "variantId" TEXT,
    "delta" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "referenceType" TEXT,
    "referenceId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryStockMovement_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "InventoryStockMovement_shopId_createdAt_idx" ON "InventoryStockMovement"("shopId", "createdAt");
CREATE INDEX IF NOT EXISTS "InventoryStockMovement_inventoryItemId_createdAt_idx" ON "InventoryStockMovement"("inventoryItemId", "createdAt");
CREATE INDEX IF NOT EXISTS "InventoryStockMovement_referenceType_referenceId_idx" ON "InventoryStockMovement"("referenceType", "referenceId");

DO $$ BEGIN
  ALTER TABLE "InventoryStockMovement" ADD CONSTRAINT "InventoryStockMovement_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "InventoryStockMovement" ADD CONSTRAINT "InventoryStockMovement_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
