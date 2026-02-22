-- 004: Add display customization columns to SubscriptionPlan
-- Allows admin to set badge text (e.g. "Most Popular") and CTA button color per plan.

ALTER TABLE "SubscriptionPlan"
  ADD COLUMN IF NOT EXISTS "badgeText"    TEXT,
  ADD COLUMN IF NOT EXISTS "buttonColor"  TEXT;

-- Backfill defaults for existing plans
UPDATE "SubscriptionPlan"
  SET "badgeText" = 'Most Popular'
  WHERE "name" = 'PRO_PLUS' AND "badgeText" IS NULL;
