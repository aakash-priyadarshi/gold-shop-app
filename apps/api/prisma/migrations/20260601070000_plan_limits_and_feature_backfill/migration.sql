-- Backfill plan product caps + feature flags for newly gated modules.
-- SAFE/IDEMPOTENT: only sets values that are currently unset, so any
-- admin-customised price/limit/feature in the live DB is preserved.

-- ─── Product caps (match the public pricing page) ────────────────────
-- Only fill where NULL (the bug: caps were never seeded → unlimited).
UPDATE "SubscriptionPlan" SET "maxProducts" = 20   WHERE "maxProducts" IS NULL AND "name" = 'FREE';
UPDATE "SubscriptionPlan" SET "maxProducts" = 200  WHERE "maxProducts" IS NULL AND "name" = 'PRO';
UPDATE "SubscriptionPlan" SET "maxProducts" = 1000 WHERE "maxProducts" IS NULL AND "name" = 'PRO_PLUS';
-- ENTERPRISE intentionally left unlimited (NULL).

-- ─── Feature flags for newly gated modules ───────────────────────────
-- A feature is ENABLED only when features[key] === true. Missing key = blocked.
-- These newly gated controllers (lending, karigar, repairs, savings) would
-- otherwise 403 for paying customers whose rows predate the flag, so we
-- guarantee the key exists. We only fill ABSENT keys (NOT (features ? 'key'))
-- so an admin who already toggled a value keeps their choice.

-- lending (Gold Loan / Girvi) — paid tiers on, free off
UPDATE "SubscriptionPlan"
SET "features" = COALESCE("features", '{}'::jsonb) || '{"lending": true}'::jsonb
WHERE "name" IN ('PRO', 'PRO_PLUS', 'ENTERPRISE')
  AND NOT (COALESCE("features", '{}'::jsonb) ? 'lending');

UPDATE "SubscriptionPlan"
SET "features" = COALESCE("features", '{}'::jsonb) || '{"lending": false}'::jsonb
WHERE "name" = 'FREE'
  AND NOT (COALESCE("features", '{}'::jsonb) ? 'lending');

-- karigarSupplyChain — paid tiers on, free off
UPDATE "SubscriptionPlan"
SET "features" = COALESCE("features", '{}'::jsonb) || '{"karigarSupplyChain": true}'::jsonb
WHERE "name" IN ('PRO', 'PRO_PLUS', 'ENTERPRISE')
  AND NOT (COALESCE("features", '{}'::jsonb) ? 'karigarSupplyChain');

UPDATE "SubscriptionPlan"
SET "features" = COALESCE("features", '{}'::jsonb) || '{"karigarSupplyChain": false}'::jsonb
WHERE "name" = 'FREE'
  AND NOT (COALESCE("features", '{}'::jsonb) ? 'karigarSupplyChain');

-- mobileRepairs — paid tiers on, free off
UPDATE "SubscriptionPlan"
SET "features" = COALESCE("features", '{}'::jsonb) || '{"mobileRepairs": true}'::jsonb
WHERE "name" IN ('PRO', 'PRO_PLUS', 'ENTERPRISE')
  AND NOT (COALESCE("features", '{}'::jsonb) ? 'mobileRepairs');

UPDATE "SubscriptionPlan"
SET "features" = COALESCE("features", '{}'::jsonb) || '{"mobileRepairs": false}'::jsonb
WHERE "name" = 'FREE'
  AND NOT (COALESCE("features", '{}'::jsonb) ? 'mobileRepairs');

-- mobileSavings — paid tiers on, free off
UPDATE "SubscriptionPlan"
SET "features" = COALESCE("features", '{}'::jsonb) || '{"mobileSavings": true}'::jsonb
WHERE "name" IN ('PRO', 'PRO_PLUS', 'ENTERPRISE')
  AND NOT (COALESCE("features", '{}'::jsonb) ? 'mobileSavings');

UPDATE "SubscriptionPlan"
SET "features" = COALESCE("features", '{}'::jsonb) || '{"mobileSavings": false}'::jsonb
WHERE "name" = 'FREE'
  AND NOT (COALESCE("features", '{}'::jsonb) ? 'mobileSavings');
