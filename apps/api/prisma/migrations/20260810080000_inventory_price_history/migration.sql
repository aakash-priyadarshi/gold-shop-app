-- Additive: catalog reprice audit trail (shop base currency amounts)

CREATE TABLE "InventoryPriceHistory" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "oldValues" JSONB NOT NULL,
    "newValues" JSONB NOT NULL,
    "reason" TEXT,
    "rateSnapshot" JSONB,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryPriceHistory_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "InventoryPriceHistory_shopId_createdAt_idx" ON "InventoryPriceHistory"("shopId", "createdAt");
CREATE INDEX "InventoryPriceHistory_inventoryItemId_createdAt_idx" ON "InventoryPriceHistory"("inventoryItemId", "createdAt");

ALTER TABLE "InventoryPriceHistory" ADD CONSTRAINT "InventoryPriceHistory_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InventoryPriceHistory" ADD CONSTRAINT "InventoryPriceHistory_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
