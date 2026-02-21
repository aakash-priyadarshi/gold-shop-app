-- Enterprise Features Schema Migration
-- Adds: ShopBranch, StaffAccount, ShopApiKey, WebhookSubscription,
--        WhiteLabelConfig, ScheduledReport, BulkImportJob, DemandForecast, RepricingRule

-- ─── Enums ─────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE "StaffRole" AS ENUM ('MANAGER', 'INVENTORY', 'CASHIER', 'VIEWER', 'AUDITOR');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "WebhookEvent" AS ENUM (
    'ORDER_CREATED', 'ORDER_STATUS_CHANGED', 'ORDER_COMPLETED', 'ORDER_CANCELLED',
    'PAYMENT_RECEIVED', 'INVENTORY_LOW_STOCK', 'INVENTORY_UPDATED',
    'RFQ_RECEIVED', 'OFFER_ACCEPTED', 'PRICE_ALERT', 'SUBSCRIPTION_CHANGED'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ReportType" AS ENUM (
    'SALES_SUMMARY', 'INVENTORY_STATUS', 'COMMISSION_STATEMENT',
    'CUSTOMER_ANALYTICS', 'REVENUE_TREND', 'TAX_REPORT', 'STAFF_PERFORMANCE'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ReportFrequency" AS ENUM ('DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ReportFormat" AS ENUM ('PDF', 'EXCEL', 'CSV');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "BulkImportType" AS ENUM (
    'INVENTORY_ITEMS', 'PRODUCT_VARIANTS', 'CUSTOMER_LIST', 'PRICE_SHEET', 'CATALOGUE_ITEMS'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "BulkJobStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "RepricingType" AS ENUM (
    'GOLD_RATE_CHANGE', 'LOW_STOCK', 'COMPETITOR_MATCH', 'TIME_BASED', 'DEMAND_BASED'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── Tables ────────────────────────────────────────

-- Multi-branch support
CREATE TABLE IF NOT EXISTS "ShopBranch" (
  "id"            TEXT NOT NULL DEFAULT gen_random_uuid(),
  "shopId"        TEXT NOT NULL,
  "branchName"    TEXT NOT NULL,
  "branchCode"    TEXT NOT NULL,
  "country"       TEXT NOT NULL,
  "state"         TEXT,
  "city"          TEXT NOT NULL,
  "address"       TEXT NOT NULL,
  "pincode"       TEXT,
  "latitude"      DOUBLE PRECISION,
  "longitude"     DOUBLE PRECISION,
  "contactPhone"  TEXT NOT NULL,
  "contactEmail"  TEXT,
  "isActive"      BOOLEAN NOT NULL DEFAULT true,
  "isHeadquarter" BOOLEAN NOT NULL DEFAULT false,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ShopBranch_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ShopBranch_shopId_branchCode_key" UNIQUE ("shopId", "branchCode"),
  CONSTRAINT "ShopBranch_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "ShopBranch_shopId_isActive_idx" ON "ShopBranch"("shopId", "isActive");
CREATE INDEX IF NOT EXISTS "ShopBranch_country_city_idx" ON "ShopBranch"("country", "city");

-- Staff accounts
CREATE TABLE IF NOT EXISTS "StaffAccount" (
  "id"              TEXT NOT NULL DEFAULT gen_random_uuid(),
  "shopId"          TEXT NOT NULL,
  "userId"          TEXT NOT NULL,
  "staffRole"       "StaffRole" NOT NULL,
  "permissions"     JSONB NOT NULL,
  "branchIds"       TEXT[] DEFAULT '{}',
  "isActive"        BOOLEAN NOT NULL DEFAULT true,
  "invitedByUserId" TEXT NOT NULL,
  "invitedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "acceptedAt"      TIMESTAMP(3),
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StaffAccount_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "StaffAccount_shopId_userId_key" UNIQUE ("shopId", "userId"),
  CONSTRAINT "StaffAccount_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE,
  CONSTRAINT "StaffAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "StaffAccount_shopId_isActive_idx" ON "StaffAccount"("shopId", "isActive");
CREATE INDEX IF NOT EXISTS "StaffAccount_userId_idx" ON "StaffAccount"("userId");

-- API keys
CREATE TABLE IF NOT EXISTS "ShopApiKey" (
  "id"              TEXT NOT NULL DEFAULT gen_random_uuid(),
  "shopId"          TEXT NOT NULL,
  "keyName"         TEXT NOT NULL,
  "keyHash"         TEXT NOT NULL,
  "keyPrefix"       TEXT NOT NULL,
  "scopes"          TEXT[] DEFAULT '{}',
  "expiresAt"       TIMESTAMP(3),
  "lastUsedAt"      TIMESTAMP(3),
  "lastUsedIp"      TEXT,
  "isActive"        BOOLEAN NOT NULL DEFAULT true,
  "createdByUserId" TEXT NOT NULL,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ShopApiKey_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ShopApiKey_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "ShopApiKey_shopId_isActive_idx" ON "ShopApiKey"("shopId", "isActive");
CREATE INDEX IF NOT EXISTS "ShopApiKey_keyPrefix_idx" ON "ShopApiKey"("keyPrefix");

-- Webhook subscriptions
CREATE TABLE IF NOT EXISTS "WebhookSubscription" (
  "id"              TEXT NOT NULL DEFAULT gen_random_uuid(),
  "shopId"          TEXT NOT NULL,
  "url"             TEXT NOT NULL,
  "secret"          TEXT NOT NULL,
  "events"          "WebhookEvent"[] DEFAULT '{}',
  "isActive"        BOOLEAN NOT NULL DEFAULT true,
  "failureCount"    INTEGER NOT NULL DEFAULT 0,
  "lastDeliveredAt" TIMESTAMP(3),
  "lastFailedAt"    TIMESTAMP(3),
  "lastHttpStatus"  INTEGER,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WebhookSubscription_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "WebhookSubscription_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "WebhookSubscription_shopId_isActive_idx" ON "WebhookSubscription"("shopId", "isActive");

-- White-label config
CREATE TABLE IF NOT EXISTS "WhiteLabelConfig" (
  "id"              TEXT NOT NULL DEFAULT gen_random_uuid(),
  "shopId"          TEXT NOT NULL,
  "customDomain"    TEXT,
  "logoUrl"         TEXT,
  "faviconUrl"      TEXT,
  "primaryColor"    TEXT,
  "secondaryColor"  TEXT,
  "accentColor"     TEXT,
  "fontFamily"      TEXT,
  "headerHtml"      TEXT,
  "footerHtml"      TEXT,
  "hideOrivraa"     BOOLEAN NOT NULL DEFAULT false,
  "customCss"       TEXT,
  "metaTitle"       TEXT,
  "metaDescription" TEXT,
  "ogImageUrl"      TEXT,
  "isActive"        BOOLEAN NOT NULL DEFAULT false,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WhiteLabelConfig_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "WhiteLabelConfig_shopId_key" UNIQUE ("shopId"),
  CONSTRAINT "WhiteLabelConfig_customDomain_key" UNIQUE ("customDomain"),
  CONSTRAINT "WhiteLabelConfig_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE
);

-- Scheduled reports
CREATE TABLE IF NOT EXISTS "ScheduledReport" (
  "id"              TEXT NOT NULL DEFAULT gen_random_uuid(),
  "shopId"          TEXT NOT NULL,
  "reportType"      "ReportType" NOT NULL,
  "frequency"       "ReportFrequency" NOT NULL,
  "recipients"      TEXT[] DEFAULT '{}',
  "format"          "ReportFormat" NOT NULL DEFAULT 'PDF',
  "filters"         JSONB,
  "isActive"        BOOLEAN NOT NULL DEFAULT true,
  "lastSentAt"      TIMESTAMP(3),
  "nextRunAt"       TIMESTAMP(3),
  "createdByUserId" TEXT NOT NULL,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ScheduledReport_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ScheduledReport_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "ScheduledReport_shopId_isActive_idx" ON "ScheduledReport"("shopId", "isActive");
CREATE INDEX IF NOT EXISTS "ScheduledReport_nextRunAt_idx" ON "ScheduledReport"("nextRunAt");

-- Bulk import jobs
CREATE TABLE IF NOT EXISTS "BulkImportJob" (
  "id"              TEXT NOT NULL DEFAULT gen_random_uuid(),
  "shopId"          TEXT NOT NULL,
  "importType"      "BulkImportType" NOT NULL,
  "status"          "BulkJobStatus" NOT NULL DEFAULT 'PENDING',
  "fileUrl"         TEXT NOT NULL,
  "totalRows"       INTEGER,
  "processedRows"   INTEGER NOT NULL DEFAULT 0,
  "successRows"     INTEGER NOT NULL DEFAULT 0,
  "failedRows"      INTEGER NOT NULL DEFAULT 0,
  "errorLog"        JSONB,
  "resultFileUrl"   TEXT,
  "startedAt"       TIMESTAMP(3),
  "completedAt"     TIMESTAMP(3),
  "createdByUserId" TEXT NOT NULL,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BulkImportJob_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "BulkImportJob_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "BulkImportJob_shopId_status_idx" ON "BulkImportJob"("shopId", "status");
CREATE INDEX IF NOT EXISTS "BulkImportJob_createdAt_idx" ON "BulkImportJob"("createdAt");

-- Demand forecasts
CREATE TABLE IF NOT EXISTS "DemandForecast" (
  "id"              TEXT NOT NULL DEFAULT gen_random_uuid(),
  "shopId"          TEXT NOT NULL,
  "period"          TEXT NOT NULL,
  "category"        TEXT NOT NULL,
  "predictedDemand" INTEGER NOT NULL,
  "confidenceScore" DOUBLE PRECISION NOT NULL,
  "factors"         JSONB,
  "recommendation"  TEXT,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DemandForecast_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DemandForecast_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "DemandForecast_shopId_period_idx" ON "DemandForecast"("shopId", "period");
CREATE INDEX IF NOT EXISTS "DemandForecast_category_idx" ON "DemandForecast"("category");

-- Repricing rules
CREATE TABLE IF NOT EXISTS "RepricingRule" (
  "id"              TEXT NOT NULL DEFAULT gen_random_uuid(),
  "shopId"          TEXT NOT NULL,
  "ruleName"        TEXT NOT NULL,
  "ruleType"        "RepricingType" NOT NULL,
  "conditions"      JSONB NOT NULL,
  "action"          JSONB NOT NULL,
  "isActive"        BOOLEAN NOT NULL DEFAULT true,
  "priority"        INTEGER NOT NULL DEFAULT 0,
  "lastTriggeredAt" TIMESTAMP(3),
  "triggerCount"    INTEGER NOT NULL DEFAULT 0,
  "createdByUserId" TEXT NOT NULL,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RepricingRule_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "RepricingRule_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "RepricingRule_shopId_isActive_idx" ON "RepricingRule"("shopId", "isActive");
