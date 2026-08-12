-- A physical RFID/EPC code is optional and unique when supplied. QR labels
-- encode the existing immutable inventory id, so no QR column is needed.
ALTER TABLE "InventoryItem" ADD COLUMN IF NOT EXISTS "rfidCode" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "InventoryItem_rfidCode_key"
  ON "InventoryItem"("rfidCode");

-- Existing paid plans receive the new feature immediately. Admins can change
-- the checkbox per plan afterwards; absent/false remains unavailable on Free.
UPDATE "SubscriptionPlan"
SET "features" = COALESCE("features", '{}'::jsonb) || '{"multiTagPrint": true}'::jsonb
WHERE "name" IN ('PRO', 'PRO_PLUS', 'ENTERPRISE');
