-- Pricing Engine Tables Migration
-- This migration adds comprehensive pricing configuration tables

-- ══════════════════════════════════════
-- SYSTEM PRICE CONFIGURATION (Versioned)
-- ══════════════════════════════════════

-- System-level pricing configuration with versioning
CREATE TABLE IF NOT EXISTS "SystemPriceConfig" (
    "id" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "configType" TEXT NOT NULL, -- 'METAL_PURITY', 'BASE_METAL', 'FINISH', 'GEMSTONE', 'SETTING', 'TAX'
    "configKey" TEXT NOT NULL, -- e.g., 'GOLD_24K', 'BRASS', 'GOLD_PLATING_STANDARD'
    "configData" JSONB NOT NULL, -- Flexible config data
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveUntil" TIMESTAMP(3),
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "SystemPriceConfig_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SystemPriceConfig_configType_configKey_idx" ON "SystemPriceConfig"("configType", "configKey");
CREATE INDEX "SystemPriceConfig_isActive_effectiveFrom_idx" ON "SystemPriceConfig"("isActive", "effectiveFrom");

-- ══════════════════════════════════════
-- MARKET ADJUSTMENT CONFIGURATION
-- ══════════════════════════════════════

CREATE TABLE IF NOT EXISTS "MarketAdjustmentConfig" (
    "id" TEXT NOT NULL,
    "marketRegion" TEXT NOT NULL, -- NP, IN, AE, UK, EU, US
    "category" TEXT NOT NULL, -- 'PRECIOUS_METAL', 'BASE_METAL', 'GEMSTONE', 'FINISH', 'ALL'
    "adjustmentType" TEXT NOT NULL, -- 'MULTIPLIER', 'FIXED_ADDON', 'PERCENTAGE'
    "adjustmentValue" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveUntil" TIMESTAMP(3),
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "MarketAdjustmentConfig_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MarketAdjustmentConfig_region_category_type_idx" 
    ON "MarketAdjustmentConfig"("marketRegion", "category", "adjustmentType") 
    WHERE "isActive" = true AND "effectiveUntil" IS NULL;
CREATE INDEX "MarketAdjustmentConfig_marketRegion_idx" ON "MarketAdjustmentConfig"("marketRegion");

-- ══════════════════════════════════════
-- TAX RULE CONFIGURATION
-- ══════════════════════════════════════

CREATE TABLE IF NOT EXISTS "TaxRuleConfig" (
    "id" TEXT NOT NULL,
    "marketRegion" TEXT NOT NULL, -- NP, IN, AE, UK, EU, US
    "taxType" TEXT NOT NULL, -- 'GST', 'VAT', 'SALES_TAX'
    "taxName" TEXT NOT NULL, -- Display name: "GST (3%)", "VAT (13%)"
    "category" TEXT NOT NULL, -- 'PRECIOUS_METAL', 'MAKING_CHARGE', 'GEMSTONE', 'FINISH', 'ALL'
    "rate" DOUBLE PRECISION NOT NULL, -- 0.03 for 3%
    "isCompounding" BOOLEAN NOT NULL DEFAULT false, -- If taxes compound
    "priority" INTEGER NOT NULL DEFAULT 0, -- Order of application
    "stateCode" TEXT, -- For US state-specific taxes
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveUntil" TIMESTAMP(3),
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "TaxRuleConfig_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TaxRuleConfig_marketRegion_isActive_idx" ON "TaxRuleConfig"("marketRegion", "isActive");
CREATE INDEX "TaxRuleConfig_category_idx" ON "TaxRuleConfig"("category");

-- ══════════════════════════════════════
-- SHOP PRICE OVERRIDES
-- ══════════════════════════════════════

CREATE TABLE IF NOT EXISTS "ShopPriceOverride" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "overrideType" TEXT NOT NULL, -- 'METAL_RATE', 'MAKING_CHARGE', 'FINISH', 'GEMSTONE', 'MARKUP'
    "itemCode" TEXT NOT NULL, -- e.g., 'GOLD_24K', 'GOLD_PLATING_PREMIUM'
    "overrideMode" TEXT NOT NULL, -- 'FIXED', 'PERCENTAGE', 'MULTIPLIER'
    "overrideValue" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'NPR',
    "minValue" DOUBLE PRECISION, -- Admin-enforced minimum
    "maxValue" DOUBLE PRECISION, -- Admin-enforced maximum
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "approvedBy" TEXT, -- Admin approval for overrides
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "ShopPriceOverride_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ShopPriceOverride_shop_type_item_idx" 
    ON "ShopPriceOverride"("shopId", "overrideType", "itemCode") 
    WHERE "isActive" = true;
CREATE INDEX "ShopPriceOverride_shopId_idx" ON "ShopPriceOverride"("shopId");

-- ══════════════════════════════════════
-- GEMSTONE PRICE CONFIGURATION
-- ══════════════════════════════════════

CREATE TABLE IF NOT EXISTS "GemPriceConfig" (
    "id" TEXT NOT NULL,
    "stoneType" TEXT NOT NULL, -- 'DIAMOND_NATURAL', 'DIAMOND_LAB', 'MOISSANITE', etc.
    "origin" TEXT, -- 'NATURAL', 'LAB' (for diamonds)
    "qualityGrade" TEXT NOT NULL, -- 'A', 'B', 'C' or 'BUDGET', 'STANDARD', 'PREMIUM'
    "sizeUnit" TEXT NOT NULL DEFAULT 'CARAT', -- 'CARAT' or 'MM'
    "sizeRangeMin" DOUBLE PRECISION NOT NULL,
    "sizeRangeMax" DOUBLE PRECISION NOT NULL,
    "pricePerUnit" DOUBLE PRECISION NOT NULL, -- Price per carat/mm in USD
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "source" TEXT NOT NULL DEFAULT 'SYSTEM', -- 'SYSTEM', 'MARKET', 'MANUAL'
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveUntil" TIMESTAMP(3),
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "GemPriceConfig_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "GemPriceConfig_stoneType_quality_idx" ON "GemPriceConfig"("stoneType", "qualityGrade");
CREATE INDEX "GemPriceConfig_isActive_idx" ON "GemPriceConfig"("isActive");

-- ══════════════════════════════════════
-- FINISH PRICE CONFIGURATION
-- ══════════════════════════════════════

CREATE TABLE IF NOT EXISTS "FinishPriceConfig" (
    "id" TEXT NOT NULL,
    "finishType" TEXT NOT NULL, -- 'GOLD_PLATING', 'VERMEIL', 'PVD', 'RHODIUM_PLATING', etc.
    "tier" TEXT NOT NULL, -- 'LIGHT', 'STANDARD', 'PREMIUM'
    "pricingModel" TEXT NOT NULL, -- 'FIXED', 'PERCENTAGE', 'PER_GRAM'
    "basePrice" DOUBLE PRECISION NOT NULL, -- Base price in USD
    "percentageUplift" DOUBLE PRECISION, -- If PERCENTAGE model
    "perGramRate" DOUBLE PRECISION, -- If PER_GRAM model
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "minThickness" DOUBLE PRECISION, -- Microns
    "maxThickness" DOUBLE PRECISION,
    "durabilityMonths" INTEGER,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveUntil" TIMESTAMP(3),
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "FinishPriceConfig_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FinishPriceConfig_finishType_tier_idx" 
    ON "FinishPriceConfig"("finishType", "tier") 
    WHERE "isActive" = true AND "effectiveUntil" IS NULL;
CREATE INDEX "FinishPriceConfig_finishType_idx" ON "FinishPriceConfig"("finishType");

-- ══════════════════════════════════════
-- BASE METAL PRICE CONFIGURATION
-- ══════════════════════════════════════

CREATE TABLE IF NOT EXISTS "BaseMetalPriceConfig" (
    "id" TEXT NOT NULL,
    "metalCode" TEXT NOT NULL, -- 'COPPER', 'ZINC', 'NICKEL', 'BRASS', 'BRONZE', etc.
    "pricePerGramUsd" DOUBLE PRECISION NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'SYSTEM', -- 'SYSTEM', 'LME', 'MANUAL'
    "isRestricted" BOOLEAN NOT NULL DEFAULT false, -- For Nickel compliance
    "complianceNotes" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveUntil" TIMESTAMP(3),
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "BaseMetalPriceConfig_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BaseMetalPriceConfig_metalCode_idx" 
    ON "BaseMetalPriceConfig"("metalCode") 
    WHERE "isActive" = true AND "effectiveUntil" IS NULL;

-- ══════════════════════════════════════
-- METAL PURITY MULTIPLIERS
-- ══════════════════════════════════════

CREATE TABLE IF NOT EXISTS "MetalPurityConfig" (
    "id" TEXT NOT NULL,
    "metalType" TEXT NOT NULL, -- 'GOLD', 'SILVER', 'PLATINUM', 'PALLADIUM'
    "purityCode" TEXT NOT NULL, -- '24K', '22K', '18K', '14K', '10K', '999', '925', 'PT950', etc.
    "purityMultiplier" DOUBLE PRECISION NOT NULL, -- 1.0, 0.9167, 0.75, etc.
    "displayName" TEXT NOT NULL, -- 'Gold 24K (Pure)', 'Gold 22K'
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "MetalPurityConfig_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MetalPurityConfig_metalType_purityCode_idx" 
    ON "MetalPurityConfig"("metalType", "purityCode");

-- ══════════════════════════════════════
-- ROUNDING RULES
-- ══════════════════════════════════════

CREATE TABLE IF NOT EXISTS "RoundingRuleConfig" (
    "id" TEXT NOT NULL,
    "currency" TEXT NOT NULL, -- 'INR', 'NPR', 'USD', 'GBP', 'EUR', 'AED'
    "roundingMode" TEXT NOT NULL, -- 'ROUND', 'FLOOR', 'CEIL'
    "precision" INTEGER NOT NULL, -- 0 for no decimals, 2 for 2 decimals
    "roundToNearest" DOUBLE PRECISION, -- e.g., 1 for nearest rupee, 0.01 for nearest cent
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "RoundingRuleConfig_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RoundingRuleConfig_currency_idx" 
    ON "RoundingRuleConfig"("currency") 
    WHERE "isActive" = true;

-- ══════════════════════════════════════
-- PRICE CALCULATION AUDIT LOG
-- ══════════════════════════════════════

CREATE TABLE IF NOT EXISTS "PriceCalculationLog" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL, -- Unique request identifier
    "marketRegion" TEXT NOT NULL,
    "displayCurrency" TEXT NOT NULL,
    "shopId" TEXT,
    "requestPayload" JSONB NOT NULL, -- Full request
    "calculationSteps" JSONB NOT NULL, -- Step-by-step breakdown
    "spotPricesUsed" JSONB, -- Spot prices at calculation time
    "fxRatesUsed" JSONB, -- FX rates at calculation time
    "marketAdjustments" JSONB, -- Adjustments applied
    "shopOverrides" JSONB, -- Shop overrides applied
    "taxBreakdown" JSONB, -- Tax calculation details
    "finalResult" JSONB NOT NULL, -- Final pricing result
    "calculationTimeMs" INTEGER, -- Time taken
    "source" TEXT NOT NULL, -- 'PLATFORM', 'SHOP'
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "PriceCalculationLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PriceCalculationLog_requestId_idx" ON "PriceCalculationLog"("requestId");
CREATE INDEX "PriceCalculationLog_shopId_idx" ON "PriceCalculationLog"("shopId");
CREATE INDEX "PriceCalculationLog_createdAt_idx" ON "PriceCalculationLog"("createdAt");

-- ══════════════════════════════════════
-- ADD FOREIGN KEY TO SHOP
-- ══════════════════════════════════════

-- Add compliantFlag to Shop if not exists
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'Shop' AND column_name = 'nickelCompliantFlag') THEN
        ALTER TABLE "Shop" ADD COLUMN "nickelCompliantFlag" BOOLEAN NOT NULL DEFAULT false;
    END IF;
END $$;

-- Foreign key for ShopPriceOverride
ALTER TABLE "ShopPriceOverride" 
    ADD CONSTRAINT "ShopPriceOverride_shopId_fkey" 
    FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
