-- Subscription & Billing System Migration
-- Creates tables for subscription plans, seller subscriptions, subscription payments,
-- AI credit ledger, and payment gateway configuration.

-- ═══════════════════════════════════════════
-- NEW ENUMS
-- ═══════════════════════════════════════════

CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'PAST_DUE', 'CANCELLED', 'EXPIRED', 'TRIALING');
CREATE TYPE "OverageBehavior" AS ENUM ('BLOCK', 'AUTO_CHARGE');
CREATE TYPE "CreditAction" AS ENUM ('GRANT', 'DEBIT', 'REFUND', 'EXPIRE', 'ADMIN_ADJUST', 'OVERAGE');

-- ═══════════════════════════════════════════
-- SUBSCRIPTION PLAN TABLE
-- ═══════════════════════════════════════════

CREATE TABLE "SubscriptionPlan" (
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

CREATE UNIQUE INDEX "SubscriptionPlan_name_country_key" ON "SubscriptionPlan"("name", "country");
CREATE INDEX "SubscriptionPlan_country_isActive_idx" ON "SubscriptionPlan"("country", "isActive");
CREATE INDEX "SubscriptionPlan_isActive_sortOrder_idx" ON "SubscriptionPlan"("isActive", "sortOrder");

-- ═══════════════════════════════════════════
-- SELLER SUBSCRIPTION TABLE
-- ═══════════════════════════════════════════

CREATE TABLE "SellerSubscription" (
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

CREATE UNIQUE INDEX "SellerSubscription_stripeSubscriptionId_key" ON "SellerSubscription"("stripeSubscriptionId");
CREATE INDEX "SellerSubscription_shopId_idx" ON "SellerSubscription"("shopId");
CREATE INDEX "SellerSubscription_planId_idx" ON "SellerSubscription"("planId");
CREATE INDEX "SellerSubscription_status_idx" ON "SellerSubscription"("status");
CREATE INDEX "SellerSubscription_stripeSubscriptionId_idx" ON "SellerSubscription"("stripeSubscriptionId");
CREATE INDEX "SellerSubscription_currentPeriodEnd_idx" ON "SellerSubscription"("currentPeriodEnd");

ALTER TABLE "SellerSubscription" ADD CONSTRAINT "SellerSubscription_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SellerSubscription" ADD CONSTRAINT "SellerSubscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "SubscriptionPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ═══════════════════════════════════════════
-- SUBSCRIPTION PAYMENT TABLE
-- ═══════════════════════════════════════════

CREATE TABLE "SubscriptionPayment" (
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

CREATE INDEX "SubscriptionPayment_subscriptionId_idx" ON "SubscriptionPayment"("subscriptionId");
CREATE INDEX "SubscriptionPayment_gatewayPaymentId_idx" ON "SubscriptionPayment"("gatewayPaymentId");
CREATE INDEX "SubscriptionPayment_status_idx" ON "SubscriptionPayment"("status");

ALTER TABLE "SubscriptionPayment" ADD CONSTRAINT "SubscriptionPayment_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "SellerSubscription"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ═══════════════════════════════════════════
-- AI CREDIT LEDGER TABLE
-- ═══════════════════════════════════════════

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "aiCreditsBalance" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "aiCreditsGrantedAt" TIMESTAMP(3);

CREATE TABLE "AiCreditLedger" (
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

CREATE UNIQUE INDEX "AiCreditLedger_idempotencyKey_key" ON "AiCreditLedger"("idempotencyKey");
CREATE INDEX "AiCreditLedger_userId_createdAt_idx" ON "AiCreditLedger"("userId", "createdAt");
CREATE INDEX "AiCreditLedger_shopId_createdAt_idx" ON "AiCreditLedger"("shopId", "createdAt");
CREATE INDEX "AiCreditLedger_idempotencyKey_idx" ON "AiCreditLedger"("idempotencyKey");
CREATE INDEX "AiCreditLedger_action_idx" ON "AiCreditLedger"("action");

ALTER TABLE "AiCreditLedger" ADD CONSTRAINT "AiCreditLedger_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ═══════════════════════════════════════════
-- PAYMENT GATEWAY CONFIGURATION TABLE
-- ═══════════════════════════════════════════

CREATE TABLE "PaymentGatewayConfig" (
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

CREATE UNIQUE INDEX "PaymentGatewayConfig_gatewayName_key" ON "PaymentGatewayConfig"("gatewayName");
