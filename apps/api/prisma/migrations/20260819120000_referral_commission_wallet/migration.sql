-- AlterTable
ALTER TABLE "Shop" ADD COLUMN IF NOT EXISTS "referralCode" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "Shop_referralCode_key" ON "Shop"("referralCode");

-- AlterTable
ALTER TABLE "ReferralSettings" ADD COLUMN IF NOT EXISTS "commissionPercent" DOUBLE PRECISION NOT NULL DEFAULT 10,
ADD COLUMN IF NOT EXISTS "applyToInvoiceFirst" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS "minCashoutAmount" DOUBLE PRECISION NOT NULL DEFAULT 10;

-- Legacy month/credit rewards are unused; keep columns, zero the singleton.
UPDATE "ReferralSettings"
SET "freeMonths" = 0,
    "aiCreditsReward" = 0
WHERE "id" = 'singleton';

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "ReferralCommissionStatus" AS ENUM ('ACCRUED', 'APPLIED', 'PAID_OUT', 'VOID');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "ReferralCommission" (
    "id" TEXT NOT NULL,
    "referrerShopId" TEXT NOT NULL,
    "refereeShopId" TEXT NOT NULL,
    "referralId" TEXT NOT NULL,
    "stripeInvoiceId" TEXT NOT NULL,
    "grossAmount" DOUBLE PRECISION NOT NULL,
    "commissionAmount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL,
    "status" "ReferralCommissionStatus" NOT NULL DEFAULT 'ACCRUED',
    "appliedAt" TIMESTAMP(3),
    "paidOutAt" TIMESTAMP(3),
    "payoutId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReferralCommission_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ReferralCommission_stripeInvoiceId_key" ON "ReferralCommission"("stripeInvoiceId");
CREATE INDEX IF NOT EXISTS "ReferralCommission_referrerShopId_status_idx" ON "ReferralCommission"("referrerShopId", "status");
CREATE INDEX IF NOT EXISTS "ReferralCommission_refereeShopId_idx" ON "ReferralCommission"("refereeShopId");
CREATE INDEX IF NOT EXISTS "ReferralCommission_referralId_idx" ON "ReferralCommission"("referralId");

-- CreateTable
CREATE TABLE IF NOT EXISTS "ReferralPayoutProfile" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "stripeConnectAccountId" TEXT,
    "detailsSubmitted" BOOLEAN NOT NULL DEFAULT false,
    "payoutsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReferralPayoutProfile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ReferralPayoutProfile_shopId_key" ON "ReferralPayoutProfile"("shopId");
CREATE UNIQUE INDEX IF NOT EXISTS "ReferralPayoutProfile_stripeConnectAccountId_key" ON "ReferralPayoutProfile"("stripeConnectAccountId");

DO $$ BEGIN
  ALTER TABLE "ReferralCommission" ADD CONSTRAINT "ReferralCommission_referrerShopId_fkey" FOREIGN KEY ("referrerShopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "ReferralCommission" ADD CONSTRAINT "ReferralCommission_refereeShopId_fkey" FOREIGN KEY ("refereeShopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "ReferralCommission" ADD CONSTRAINT "ReferralCommission_referralId_fkey" FOREIGN KEY ("referralId") REFERENCES "Referral"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "ReferralPayoutProfile" ADD CONSTRAINT "ReferralPayoutProfile_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
