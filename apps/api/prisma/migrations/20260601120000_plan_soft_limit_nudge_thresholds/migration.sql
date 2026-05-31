-- Add per-plan soft-limit nudge thresholds.
-- These NEVER block usage — they only control when the gentle, dismissible
-- "you're outgrowing free → upgrade" nudge appears (fires at ~80% of value).
-- Each market has its own plan row, so this is automatically per-region tunable
-- from the admin pricing panel.

-- ─── Add columns (nullable; NULL = no nudge for that metric) ─────────
ALTER TABLE "SubscriptionPlan" ADD COLUMN IF NOT EXISTS "softLimitCustomers" INTEGER;
ALTER TABLE "SubscriptionPlan" ADD COLUMN IF NOT EXISTS "softLimitInvoicesPerMonth" INTEGER;
ALTER TABLE "SubscriptionPlan" ADD COLUMN IF NOT EXISTS "softLimitProducts" INTEGER;
ALTER TABLE "SubscriptionPlan" ADD COLUMN IF NOT EXISTS "softLimitSavingsSchemes" INTEGER;

-- ─── Seed sensible defaults on the FREE plan only ────────────────────
-- SAFE/IDEMPOTENT: only fills where NULL, so any admin-customised value is
-- preserved. Paid plans stay NULL (they don't get soft-limit nudges).
UPDATE "SubscriptionPlan" SET "softLimitCustomers"        = 100 WHERE "softLimitCustomers"        IS NULL AND "name" = 'FREE';
UPDATE "SubscriptionPlan" SET "softLimitInvoicesPerMonth" = 50  WHERE "softLimitInvoicesPerMonth" IS NULL AND "name" = 'FREE';
UPDATE "SubscriptionPlan" SET "softLimitProducts"         = 100 WHERE "softLimitProducts"         IS NULL AND "name" = 'FREE';
UPDATE "SubscriptionPlan" SET "softLimitSavingsSchemes"   = 5   WHERE "softLimitSavingsSchemes"   IS NULL AND "name" = 'FREE';
