-- Migration 005: Unified Payment Gateway System
-- Adds isDefault, envKeysRequired, commissionInfo to PaymentGatewayConfig
-- Adds PHONEPE to PaymentMethod enum

-- Add PHONEPE to PaymentMethod enum (idempotent check)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'PHONEPE' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'PaymentMethod')) THEN
    ALTER TYPE "PaymentMethod" ADD VALUE 'PHONEPE';
  END IF;
END$$;

-- Add isDefault column
ALTER TABLE "PaymentGatewayConfig"
  ADD COLUMN IF NOT EXISTS "isDefault" BOOLEAN NOT NULL DEFAULT false;

-- Add envKeysRequired (JSON array of env key names the gateway needs)
ALTER TABLE "PaymentGatewayConfig"
  ADD COLUMN IF NOT EXISTS "envKeysRequired" JSONB;

-- Add commissionInfo (human-readable commission description)
ALTER TABLE "PaymentGatewayConfig"
  ADD COLUMN IF NOT EXISTS "commissionInfo" TEXT;

-- Create index on isDefault for quick lookups
CREATE INDEX IF NOT EXISTS "PaymentGatewayConfig_isDefault_idx"
  ON "PaymentGatewayConfig" ("isDefault");
