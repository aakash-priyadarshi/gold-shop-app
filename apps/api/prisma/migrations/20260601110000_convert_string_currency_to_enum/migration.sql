-- Convert remaining String currency columns to the CurrencyCode enum.
-- The CurrencyCode enum already exists (NPR, INR, AED, USD, GBP, EUR).
--
-- This migration is self-sanitizing so it can never fail on existing prod data:
-- any value that is NULL or outside the enum set is coerced to 'NPR' before the
-- column type is altered. Defaults are dropped before the type cast and
-- re-applied afterwards (Postgres cannot cast a column type while a string
-- default is attached).

-- ── Payment (has default) ──────────────────────────────────────────────
UPDATE "Payment" SET "currency" = 'NPR'
  WHERE "currency" IS NULL OR "currency" NOT IN ('NPR', 'INR', 'AED', 'USD', 'GBP', 'EUR');
ALTER TABLE "Payment" ALTER COLUMN "currency" DROP DEFAULT;
ALTER TABLE "Payment" ALTER COLUMN "currency" TYPE "CurrencyCode" USING "currency"::"CurrencyCode";
ALTER TABLE "Payment" ALTER COLUMN "currency" SET DEFAULT 'NPR';

-- ── SavingsMember (has default) ────────────────────────────────────────
UPDATE "SavingsMember" SET "currency" = 'NPR'
  WHERE "currency" IS NULL OR "currency" NOT IN ('NPR', 'INR', 'AED', 'USD', 'GBP', 'EUR');
ALTER TABLE "SavingsMember" ALTER COLUMN "currency" DROP DEFAULT;
ALTER TABLE "SavingsMember" ALTER COLUMN "currency" TYPE "CurrencyCode" USING "currency"::"CurrencyCode";
ALTER TABLE "SavingsMember" ALTER COLUMN "currency" SET DEFAULT 'NPR';

-- ── GoldLoan (has default) ─────────────────────────────────────────────
UPDATE "GoldLoan" SET "currency" = 'NPR'
  WHERE "currency" IS NULL OR "currency" NOT IN ('NPR', 'INR', 'AED', 'USD', 'GBP', 'EUR');
ALTER TABLE "GoldLoan" ALTER COLUMN "currency" DROP DEFAULT;
ALTER TABLE "GoldLoan" ALTER COLUMN "currency" TYPE "CurrencyCode" USING "currency"::"CurrencyCode";
ALTER TABLE "GoldLoan" ALTER COLUMN "currency" SET DEFAULT 'NPR';

-- ── MaterialRate (no default) ──────────────────────────────────────────
UPDATE "MaterialRate" SET "currency" = 'NPR'
  WHERE "currency" IS NULL OR "currency" NOT IN ('NPR', 'INR', 'AED', 'USD', 'GBP', 'EUR');
ALTER TABLE "MaterialRate" ALTER COLUMN "currency" TYPE "CurrencyCode" USING "currency"::"CurrencyCode";

-- ── FinishPrice (no default) ───────────────────────────────────────────
UPDATE "FinishPrice" SET "currency" = 'NPR'
  WHERE "currency" IS NULL OR "currency" NOT IN ('NPR', 'INR', 'AED', 'USD', 'GBP', 'EUR');
ALTER TABLE "FinishPrice" ALTER COLUMN "currency" TYPE "CurrencyCode" USING "currency"::"CurrencyCode";

-- ── GemstoneCatalog (no default) ───────────────────────────────────────
UPDATE "GemstoneCatalog" SET "currency" = 'NPR'
  WHERE "currency" IS NULL OR "currency" NOT IN ('NPR', 'INR', 'AED', 'USD', 'GBP', 'EUR');
ALTER TABLE "GemstoneCatalog" ALTER COLUMN "currency" TYPE "CurrencyCode" USING "currency"::"CurrencyCode";

-- ── SettingPrice (no default) ──────────────────────────────────────────
UPDATE "SettingPrice" SET "currency" = 'NPR'
  WHERE "currency" IS NULL OR "currency" NOT IN ('NPR', 'INR', 'AED', 'USD', 'GBP', 'EUR');
ALTER TABLE "SettingPrice" ALTER COLUMN "currency" TYPE "CurrencyCode" USING "currency"::"CurrencyCode";
