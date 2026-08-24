-- Leftover referral cash-out: bank details + admin payout queue
-- (Stripe Connect is unavailable for NP/IN/AE shops from a UK platform)

ALTER TYPE "ReferralCommissionStatus" ADD VALUE IF NOT EXISTS 'REQUESTED';

ALTER TABLE "ReferralPayoutProfile"
  ADD COLUMN IF NOT EXISTS "bankHolderName" TEXT,
  ADD COLUMN IF NOT EXISTS "bankName" TEXT,
  ADD COLUMN IF NOT EXISTS "bankAccountNumber" TEXT,
  ADD COLUMN IF NOT EXISTS "bankRoutingCode" TEXT,
  ADD COLUMN IF NOT EXISTS "bankCountry" TEXT;

DO $$ BEGIN
  CREATE TYPE "ReferralPayoutRequestStatus" AS ENUM ('PENDING', 'PAID', 'REJECTED', 'CONVERTED_TO_SUB');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "ReferralPayoutRequest" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL,
    "status" "ReferralPayoutRequestStatus" NOT NULL DEFAULT 'PENDING',
    "bankHolderName" TEXT,
    "bankName" TEXT,
    "bankAccountNumber" TEXT,
    "bankRoutingCode" TEXT,
    "bankCountry" TEXT,
    "monthsGranted" DOUBLE PRECISION,
    "payoutReference" TEXT,
    "adminNote" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReferralPayoutRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ReferralPayoutRequest_status_createdAt_idx" ON "ReferralPayoutRequest"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "ReferralPayoutRequest_shopId_idx" ON "ReferralPayoutRequest"("shopId");

DO $$ BEGIN
  ALTER TABLE "ReferralPayoutRequest" ADD CONSTRAINT "ReferralPayoutRequest_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
