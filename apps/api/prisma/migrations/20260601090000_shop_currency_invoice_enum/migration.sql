-- Multi-currency hardening:
--   1. Add Shop.currency (CurrencyCode enum), backfilled from the shop's country.
--   2. Convert Invoice.currency from free-text TEXT to the CurrencyCode enum.
-- Both default to NPR (home market) for any unmapped / unrecognised value.

-- ── 1. Shop.currency ────────────────────────────────────────────────
ALTER TABLE "Shop" ADD COLUMN "currency" "CurrencyCode" NOT NULL DEFAULT 'NPR';

-- Backfill existing shops from their registered country.
UPDATE "Shop" SET "currency" = 'INR' WHERE "country" = 'IN';
UPDATE "Shop" SET "currency" = 'AED' WHERE "country" = 'AE';
UPDATE "Shop" SET "currency" = 'USD' WHERE "country" = 'US';
UPDATE "Shop" SET "currency" = 'GBP' WHERE "country" IN ('GB', 'UK');
UPDATE "Shop" SET "currency" = 'EUR' WHERE "country" IN ('EU', 'DE', 'FR', 'IT');
-- All other countries (incl. NP) keep the NPR default.

-- ── 2. Invoice.currency TEXT -> CurrencyCode enum ───────────────────
-- Coerce any value that is not a valid enum member to NPR before casting,
-- otherwise the USING cast would fail on unexpected data.
UPDATE "Invoice"
SET "currency" = 'NPR'
WHERE "currency" IS NULL
   OR "currency" NOT IN ('NPR', 'INR', 'AED', 'USD', 'GBP', 'EUR');

-- Drop the old TEXT default, change the column type with an explicit cast,
-- then restore the default as the enum value.
ALTER TABLE "Invoice" ALTER COLUMN "currency" DROP DEFAULT;
ALTER TABLE "Invoice"
  ALTER COLUMN "currency" TYPE "CurrencyCode"
  USING ("currency"::text::"CurrencyCode");
ALTER TABLE "Invoice" ALTER COLUMN "currency" SET DEFAULT 'NPR';
