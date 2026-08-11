-- Billing wastage % on walk-in quotes (set when marking READY / built)
ALTER TABLE "ShopQuote" ADD COLUMN IF NOT EXISTS "wastagePercent" DOUBLE PRECISION;
