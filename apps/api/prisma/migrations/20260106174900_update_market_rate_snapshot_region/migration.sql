-- Migration: Update MarketRateSnapshot to use region enum instead of country text
-- This migration adds the region column, migrates data, and updates constraints

-- Step 1: Drop old index (country-based)
DROP INDEX IF EXISTS "MarketRateSnapshot_country_updatedAt_idx";

-- Step 2: Add region column (nullable first for migration)
ALTER TABLE "MarketRateSnapshot" ADD COLUMN "region" "MarketRegion";

-- Step 3: Migrate existing data from country to region
-- Map: NP->NP, IN->IN, default to NP if unknown
UPDATE "MarketRateSnapshot"
SET "region" = CASE
    WHEN "country" = 'NP' THEN 'NP'::"MarketRegion"
    WHEN "country" = 'IN' THEN 'IN'::"MarketRegion"
    WHEN "country" = 'AE' THEN 'AE'::"MarketRegion"
    WHEN "country" = 'UK' THEN 'UK'::"MarketRegion"
    WHEN "country" = 'EU' THEN 'EU'::"MarketRegion"
    WHEN "country" = 'US' THEN 'US'::"MarketRegion"
    ELSE 'NP'::"MarketRegion"
END;

-- Step 4: Make region NOT NULL (after data migration)
ALTER TABLE "MarketRateSnapshot" ALTER COLUMN "region" SET NOT NULL;

-- Step 5: Convert currency column from TEXT to CurrencyCode enum
-- First create a temp column
ALTER TABLE "MarketRateSnapshot" ADD COLUMN "currency_new" "CurrencyCode";

-- Migrate currency data
UPDATE "MarketRateSnapshot"
SET "currency_new" = CASE
    WHEN "currency" = 'NPR' THEN 'NPR'::"CurrencyCode"
    WHEN "currency" = 'INR' THEN 'INR'::"CurrencyCode"
    WHEN "currency" = 'AED' THEN 'AED'::"CurrencyCode"
    WHEN "currency" = 'USD' THEN 'USD'::"CurrencyCode"
    WHEN "currency" = 'GBP' THEN 'GBP'::"CurrencyCode"
    WHEN "currency" = 'EUR' THEN 'EUR'::"CurrencyCode"
    ELSE 'NPR'::"CurrencyCode"
END;

-- Step 6: Drop old currency column and rename new one
ALTER TABLE "MarketRateSnapshot" DROP COLUMN "currency";
ALTER TABLE "MarketRateSnapshot" RENAME COLUMN "currency_new" TO "currency";
ALTER TABLE "MarketRateSnapshot" ALTER COLUMN "currency" SET NOT NULL;

-- Step 7: Drop old country column
ALTER TABLE "MarketRateSnapshot" DROP COLUMN "country";

-- Step 8: Create composite unique constraint (for upsert)
ALTER TABLE "MarketRateSnapshot" ADD CONSTRAINT "MarketRateSnapshot_region_currency_key" UNIQUE ("region", "currency");

-- Step 9: Create new indexes
CREATE INDEX "MarketRateSnapshot_region_currency_updatedAt_idx" ON "MarketRateSnapshot"("region", "currency", "updatedAt");
