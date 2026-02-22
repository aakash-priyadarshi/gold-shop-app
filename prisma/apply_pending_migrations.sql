-- ============================================================
-- COMBINED MIGRATION: Run in Neon SQL Editor
-- Applies two pending migrations:
--   1) 20260221235148_subscription_billing_system
--   2) 002_enterprise_features
-- All statements use IF NOT EXISTS / DO $$ guards — safe to re-run.
-- ============================================================

-- ═══════════════════════════════════════════════════
-- PHASE 0: FIX LOGIN (User columns — run this FIRST)
-- ═══════════════════════════════════════════════════
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "aiCreditsBalance" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "aiCreditsGrantedAt" TIMESTAMP(3);

-- ═══════════════════════════════════════════
-- PHASE 1: PREREQUISITE ENUMS (from earlier migrations that may be missing)
-- ═══════════════════════════════════════════
DO $$ BEGIN CREATE TYPE "CurrencyCode" AS ENUM ('NPR', 'INR', 'AED', 'USD', 'GBP', 'EUR'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "MarketRegion" AS ENUM ('NP', 'IN', 'AE', 'UK', 'EU', 'US'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "PaymentMethod" AS ENUM ('CARD', 'BANK_TRANSFER', 'CASH', 'UPI', 'ESEWA', 'KHALTI', 'CONNECTIPS', 'PAYPAL', 'STRIPE', 'PAID_AT_SHOP'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ═══════════════════════════════════════════
-- PHASE 2: SUBSCRIPTION & BILLING SYSTEM
-- ═══════════════════════════════════════════

-- Subscription enums
DO $$ BEGIN CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'PAST_DUE', 'CANCELLED', 'EXPIRED', 'TRIALING'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "OverageBehavior" AS ENUM ('BLOCK', 'AUTO_CHARGE'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "CreditAction" AS ENUM ('GRANT', 'DEBIT', 'REFUND', 'EXPIRE', 'ADMIN_ADJUST', 'OVERAGE'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- SubscriptionPlan
CREATE TABLE IF NOT EXISTS "SubscriptionPlan" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "description" TEXT,
    "country" "MarketRegion" NOT NULL,
    "currency" "CurrencyCode" NOT NULL,
    "monthlyPrice" DOUBLE PRECISION NOT NULL,
    "annualPrice" DOUBLE PRECISION,
    "catalogueLimit" INTEGER,
    "commissionPercent" DOUBLE PRECISION NOT NULL,
    "includesAi" BOOLEAN NOT NULL DEFAULT false,
    "monthlyAiCredits" INTEGER NOT NULL DEFAULT 0,
    "rolloverCap" INTEGER NOT NULL DEFAULT 0,
    "extraCreditPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "overageBehavior" "OverageBehavior" NOT NULL DEFAULT 'BLOCK',
    "features" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SubscriptionPlan_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "SubscriptionPlan_name_country_key" ON "SubscriptionPlan"("name", "country");
CREATE INDEX IF NOT EXISTS "SubscriptionPlan_country_isActive_idx" ON "SubscriptionPlan"("country", "isActive");
CREATE INDEX IF NOT EXISTS "SubscriptionPlan_isActive_sortOrder_idx" ON "SubscriptionPlan"("isActive", "sortOrder");

-- SellerSubscription
CREATE TABLE IF NOT EXISTS "SellerSubscription" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "shopId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "currentPeriodStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancelReason" TEXT,
    "stripeSubscriptionId" TEXT,
    "stripeCustomerId" TEXT,
    "country" "MarketRegion" NOT NULL,
    "autoRenew" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SellerSubscription_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "SellerSubscription_stripeSubscriptionId_key" ON "SellerSubscription"("stripeSubscriptionId");
CREATE INDEX IF NOT EXISTS "SellerSubscription_shopId_idx" ON "SellerSubscription"("shopId");
CREATE INDEX IF NOT EXISTS "SellerSubscription_planId_idx" ON "SellerSubscription"("planId");
CREATE INDEX IF NOT EXISTS "SellerSubscription_status_idx" ON "SellerSubscription"("status");
CREATE INDEX IF NOT EXISTS "SellerSubscription_stripeSubscriptionId_idx" ON "SellerSubscription"("stripeSubscriptionId");
CREATE INDEX IF NOT EXISTS "SellerSubscription_currentPeriodEnd_idx" ON "SellerSubscription"("currentPeriodEnd");
DO $$ BEGIN ALTER TABLE "SellerSubscription" ADD CONSTRAINT "SellerSubscription_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "SellerSubscription" ADD CONSTRAINT "SellerSubscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "SubscriptionPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- SubscriptionPayment
CREATE TABLE IF NOT EXISTS "SubscriptionPayment" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "subscriptionId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" "CurrencyCode" NOT NULL,
    "gateway" TEXT NOT NULL,
    "gatewayPaymentId" TEXT,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "invoiceUrl" TEXT,
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SubscriptionPayment_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "SubscriptionPayment_subscriptionId_idx" ON "SubscriptionPayment"("subscriptionId");
CREATE INDEX IF NOT EXISTS "SubscriptionPayment_gatewayPaymentId_idx" ON "SubscriptionPayment"("gatewayPaymentId");
CREATE INDEX IF NOT EXISTS "SubscriptionPayment_status_idx" ON "SubscriptionPayment"("status");
DO $$ BEGIN ALTER TABLE "SubscriptionPayment" ADD CONSTRAINT "SubscriptionPayment_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "SellerSubscription"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- User columns for AI credits
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "aiCreditsBalance" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "aiCreditsGrantedAt" TIMESTAMP(3);

-- AiCreditLedger
CREATE TABLE IF NOT EXISTS "AiCreditLedger" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "userId" TEXT NOT NULL,
    "shopId" TEXT,
    "action" "CreditAction" NOT NULL,
    "amount" INTEGER NOT NULL,
    "balanceBefore" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "reason" TEXT,
    "referenceId" TEXT,
    "idempotencyKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AiCreditLedger_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "AiCreditLedger_idempotencyKey_key" ON "AiCreditLedger"("idempotencyKey");
CREATE INDEX IF NOT EXISTS "AiCreditLedger_userId_createdAt_idx" ON "AiCreditLedger"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "AiCreditLedger_shopId_createdAt_idx" ON "AiCreditLedger"("shopId", "createdAt");
CREATE INDEX IF NOT EXISTS "AiCreditLedger_idempotencyKey_idx" ON "AiCreditLedger"("idempotencyKey");
CREATE INDEX IF NOT EXISTS "AiCreditLedger_action_idx" ON "AiCreditLedger"("action");
DO $$ BEGIN ALTER TABLE "AiCreditLedger" ADD CONSTRAINT "AiCreditLedger_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- PaymentGatewayConfig
CREATE TABLE IF NOT EXISTS "PaymentGatewayConfig" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "gatewayName" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "supportedCountries" "MarketRegion"[],
    "supportedMethods" "PaymentMethod"[],
    "priority" INTEGER NOT NULL DEFAULT 0,
    "envKeyLabel" TEXT NOT NULL,
    "webhookEndpoint" TEXT,
    "updatedBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PaymentGatewayConfig_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "PaymentGatewayConfig_gatewayName_key" ON "PaymentGatewayConfig"("gatewayName");

-- Mark migration 1 as applied in Prisma
INSERT INTO "_prisma_migrations" ("id", "checksum", "migration_name", "finished_at", "applied_steps_count", "logs")
SELECT gen_random_uuid()::text, 'manual-billing', '20260221235148_subscription_billing_system', NOW(), 1, NULL
WHERE NOT EXISTS (
  SELECT 1 FROM "_prisma_migrations" WHERE "migration_name" = '20260221235148_subscription_billing_system'
);

-- ═══════════════════════════════════════════
-- MIGRATION 2: ENTERPRISE FEATURES
-- ═══════════════════════════════════════════

-- Enterprise enums
DO $$ BEGIN CREATE TYPE "StaffRole" AS ENUM ('MANAGER', 'INVENTORY', 'CASHIER', 'VIEWER', 'AUDITOR'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "WebhookEvent" AS ENUM ('ORDER_CREATED', 'ORDER_STATUS_CHANGED', 'ORDER_COMPLETED', 'ORDER_CANCELLED', 'PAYMENT_RECEIVED', 'INVENTORY_LOW_STOCK', 'INVENTORY_UPDATED', 'RFQ_RECEIVED', 'OFFER_ACCEPTED', 'PRICE_ALERT', 'SUBSCRIPTION_CHANGED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "ReportType" AS ENUM ('SALES_SUMMARY', 'INVENTORY_STATUS', 'COMMISSION_STATEMENT', 'CUSTOMER_ANALYTICS', 'REVENUE_TREND', 'TAX_REPORT', 'STAFF_PERFORMANCE'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "ReportFrequency" AS ENUM ('DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "ReportFormat" AS ENUM ('PDF', 'EXCEL', 'CSV'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "BulkImportType" AS ENUM ('INVENTORY_ITEMS', 'PRODUCT_VARIANTS', 'CUSTOMER_LIST', 'PRICE_SHEET', 'CATALOGUE_ITEMS'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "BulkJobStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "RepricingType" AS ENUM ('GOLD_RATE_CHANGE', 'LOW_STOCK', 'COMPETITOR_MATCH', 'TIME_BASED', 'DEMAND_BASED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ShopBranch
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

-- StaffAccount
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

-- ShopApiKey
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

-- WebhookSubscription
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

-- WhiteLabelConfig
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

-- ScheduledReport
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

-- BulkImportJob
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

-- DemandForecast
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

-- RepricingRule
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

-- Mark enterprise migration as applied (using a fake Prisma migration entry)
INSERT INTO "_prisma_migrations" ("id", "checksum", "migration_name", "finished_at", "applied_steps_count", "logs")
SELECT gen_random_uuid()::text, 'manual-enterprise', '20260222000000_enterprise_features', NOW(), 1, NULL
WHERE NOT EXISTS (
  SELECT 1 FROM "_prisma_migrations" WHERE "migration_name" = '20260222000000_enterprise_features'
);

-- ✅ Done! Both migrations applied.
