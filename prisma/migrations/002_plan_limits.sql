-- Plan Limits: Add resource limit columns to SubscriptionPlan
-- Run on Neon production database

-- New nullable limit columns (NULL = unlimited)
ALTER TABLE "SubscriptionPlan" ADD COLUMN IF NOT EXISTS "maxProducts"          INT;
ALTER TABLE "SubscriptionPlan" ADD COLUMN IF NOT EXISTS "maxInvoicesPerMonth"  INT;
ALTER TABLE "SubscriptionPlan" ADD COLUMN IF NOT EXISTS "maxCatalogues"        INT;
ALTER TABLE "SubscriptionPlan" ADD COLUMN IF NOT EXISTS "maxOrdersPerMonth"    INT;

-- Backfill FREE plans with sensible defaults
UPDATE "SubscriptionPlan"
SET "maxProducts" = 50,
    "maxInvoicesPerMonth" = 20,
    "maxCatalogues" = 2,
    "maxOrdersPerMonth" = 30
WHERE "name" = 'FREE';

-- PRO / PRO_PLUS / ENTERPRISE stay NULL (unlimited)
