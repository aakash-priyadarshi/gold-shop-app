-- Per-piece catalog default for customer billing wastage (jarti).
ALTER TABLE "InventoryItem"
ADD COLUMN IF NOT EXISTS "wastagePercent" DOUBLE PRECISION NOT NULL DEFAULT 0;
