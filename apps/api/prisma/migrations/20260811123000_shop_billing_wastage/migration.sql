-- Customer-facing billing wastage (jarti) shop defaults.
-- AUTO follows invoice-country market defaults from @gold-shop/shared.
ALTER TABLE "Shop"
ADD COLUMN IF NOT EXISTS "billingWastageMode" TEXT NOT NULL DEFAULT 'AUTO',
ADD COLUMN IF NOT EXISTS "billingWastagePercent" DOUBLE PRECISION;
