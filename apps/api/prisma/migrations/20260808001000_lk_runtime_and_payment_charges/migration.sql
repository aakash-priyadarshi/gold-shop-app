-- This migration intentionally follows the enum-only LK/LKR migration so the
-- new PostgreSQL enum values are committed before they are used in data/DML.

ALTER TABLE "Payment"
  ADD COLUMN "chargedAmount" DOUBLE PRECISION,
  ADD COLUMN "chargedCurrency" "CurrencyCode",
  ADD COLUMN "fxRate" DOUBLE PRECISION,
  ADD COLUMN "fxSource" TEXT,
  ADD COLUMN "fxQuotedAt" TIMESTAMP(3),
  ADD COLUMN "idempotencyKey" TEXT;

CREATE UNIQUE INDEX "Payment_idempotencyKey_key"
  ON "Payment"("idempotencyKey");

DROP INDEX IF EXISTS "Payment_gatewayPaymentId_idx";

-- Legacy webhook handlers could write the same non-null gateway ID more than
-- once. Keep the authoritative row (COMPLETED first, then newest) and retain
-- every duplicate payment as audit history before enforcing uniqueness.
WITH ranked_gateway_payments AS (
  SELECT
    "id",
    "gatewayPaymentId",
    ROW_NUMBER() OVER (
      PARTITION BY "gatewayPaymentId"
      ORDER BY
        CASE WHEN "status" = 'COMPLETED' THEN 0 ELSE 1 END,
        "completedAt" DESC NULLS LAST,
        "updatedAt" DESC,
        "createdAt" DESC,
        "id" DESC
    ) AS duplicate_rank
  FROM "Payment"
  WHERE "gatewayPaymentId" IS NOT NULL
), duplicate_gateway_payments AS (
  SELECT "id", "gatewayPaymentId"
  FROM ranked_gateway_payments
  WHERE duplicate_rank > 1
)
UPDATE "Payment" AS payment
SET
  "metadata" = COALESCE(payment."metadata", '{}'::jsonb) ||
    jsonb_build_object(
      'legacyDuplicateGatewayPaymentId', duplicate."gatewayPaymentId",
      'gatewayPaymentIdDeduplicatedAt', NOW()
    ),
  "gatewayPaymentId" = NULL
FROM duplicate_gateway_payments AS duplicate
WHERE payment."id" = duplicate."id";

CREATE UNIQUE INDEX "Payment_gatewayPaymentId_key"
  ON "Payment"("gatewayPaymentId");

-- Repair legacy rows that labelled canonical amountNpr values with a display
-- currency. Preserve the old label in metadata for audit/debugging.
UPDATE "Payment"
SET "metadata" = COALESCE("metadata", '{}'::jsonb) ||
  jsonb_build_object('legacyCurrencyLabel', "currency"::text)
WHERE "currency" <> 'NPR';

UPDATE "Payment" SET "currency" = 'NPR' WHERE "currency" <> 'NPR';

-- Commission orderTotal/amount were calculated from Order.totalNpr.
UPDATE "CommissionLedger" SET "currency" = 'NPR' WHERE "currency" <> 'NPR';

-- Backfill display/configuration state only. Canonical *Npr amounts are never
-- relabelled or converted by this migration.
UPDATE "Shop"
SET "currency" = 'LKR'
WHERE UPPER("country") = 'LK' AND "currency" = 'NPR';

UPDATE "User"
SET "preferredCurrency" = 'LKR'
WHERE UPPER("preferredCountry") = 'LK' AND "preferredCurrency" = 'NPR';

CREATE TYPE "VatRegistrationStatus" AS ENUM (
  'NOT_REGISTERED', 'PENDING', 'VERIFIED', 'REJECTED'
);
ALTER TABLE "Shop"
  ADD COLUMN "vatRegistrationStatus" "VatRegistrationStatus" NOT NULL DEFAULT 'NOT_REGISTERED',
  ADD COLUMN "vatRegistrationVerifiedAt" TIMESTAMP(3);
UPDATE "Shop"
SET "vatRegistrationStatus" = 'PENDING'
WHERE UPPER("country") = 'LK' AND "vatNumber" ~ '^\d{9}$';

-- Seed-equivalent runtime configuration for production migrate deploy.
INSERT INTO "MarketConfig" (
  "id", "countryCode", "countryName", "isActive", "defaultCurrency",
  "supportedCurrencies", "defaultWeightUnit", "supportedWeightUnits",
  "supportedPaymentMethods", "heroHeadline", "heroSubheadline",
  "contactEmail", "contactPhone", "contactAddress", "taxPercentage",
  "taxName", "priceMultiplier", "codEnabled", "customOrdersEnabled",
  "createdAt", "updatedAt"
)
VALUES (
  gen_random_uuid(), 'LK', 'Sri Lanka', TRUE, 'LKR',
  ARRAY['LKR','USD','INR']::"CurrencyCode"[], 'GRAM',
  ARRAY['GRAM','TOLA','KILOGRAM']::"WeightUnit"[],
  ARRAY['CARD','BANK_TRANSFER','CASH','PAID_AT_SHOP']::"PaymentMethod"[],
  'Sri Lanka''s Trusted Jewellery Platform',
  'Billing, schemes, and inventory for local jewellers',
  'srilanka@orivraa.com', '+94-11-XXXXXXX', 'Colombo, Sri Lanka',
  18, 'VAT', 1.0, TRUE, TRUE, NOW(), NOW()
)
ON CONFLICT ("countryCode") DO UPDATE SET
  "countryName" = EXCLUDED."countryName",
  "isActive" = TRUE,
  "defaultCurrency" = EXCLUDED."defaultCurrency",
  "supportedCurrencies" = EXCLUDED."supportedCurrencies",
  "defaultWeightUnit" = EXCLUDED."defaultWeightUnit",
  "supportedWeightUnits" = EXCLUDED."supportedWeightUnits",
  "supportedPaymentMethods" = EXCLUDED."supportedPaymentMethods",
  "taxPercentage" = EXCLUDED."taxPercentage",
  "taxName" = EXCLUDED."taxName",
  "priceMultiplier" = 1.0,
  "codEnabled" = EXCLUDED."codEnabled",
  "customOrdersEnabled" = EXCLUDED."customOrdersEnabled",
  "updatedAt" = NOW();

-- Correct any partial/pre-launch LK standard VAT rule in place. Tax/legal
-- applicability is still determined by the verified seller registration flow.
UPDATE "TaxRuleConfig"
SET
  "taxName" = 'VAT',
  "rate" = 0.18,
  "isCompounding" = FALSE,
  "priority" = 1,
  "description" = 'Configured standard VAT rate; verify current applicability with Sri Lankan tax counsel.',
  "isActive" = TRUE,
  "effectiveUntil" = NULL,
  "updatedAt" = NOW()
WHERE "marketRegion" = 'LK'
  AND UPPER("taxType") = 'VAT'
  AND UPPER("category") = 'ALL';

INSERT INTO "TaxRuleConfig" (
  "id", "marketRegion", "taxType", "taxName", "category", "rate",
  "isCompounding", "priority", "description", "isActive",
  "effectiveFrom", "createdAt", "updatedAt"
)
SELECT
  gen_random_uuid(), 'LK', 'VAT', 'VAT', 'ALL', 0.18,
  FALSE, 1,
  'Configured standard VAT rate; verify current applicability with Sri Lankan tax counsel.',
  TRUE, NOW(), NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "TaxRuleConfig"
  WHERE "marketRegion" = 'LK'
    AND UPPER("taxType") = 'VAT'
    AND UPPER("category") = 'ALL'
);

-- Preserve every existing Stripe administrator setting and only append LK.
UPDATE "PaymentGatewayConfig"
SET "supportedCountries" = array_append(
  "supportedCountries",
  'LK'::"MarketRegion"
)
WHERE LOWER("gatewayName") = 'stripe'
  AND NOT ('LK'::"MarketRegion" = ANY("supportedCountries"));

ALTER TABLE "Invoice"
  ADD COLUMN "invoiceTitle" TEXT NOT NULL DEFAULT 'INVOICE',
  ADD COLUMN "supplierName" TEXT,
  ADD COLUMN "supplierAddress" TEXT,
  ADD COLUMN "supplierPhone" TEXT,
  ADD COLUMN "supplierTaxId" TEXT,
  ADD COLUMN "sellerVatStatus" "VatRegistrationStatus" NOT NULL DEFAULT 'NOT_REGISTERED',
  ADD COLUMN "taxSource" TEXT,
  ADD COLUMN "taxExemptEvidence" TEXT,
  ADD COLUMN "supplyDate" TIMESTAMP(3),
  ADD COLUMN "serialSequence" INTEGER;

ALTER TABLE "Invoice" ADD COLUMN "taxableAmount" DOUBLE PRECISION NOT NULL DEFAULT 0;
UPDATE "Invoice"
SET "taxableAmount" = GREATEST("subtotal" - "discountAmount", 0);

CREATE TABLE "InvoiceSequence" (
  "id" TEXT NOT NULL,
  "shopId" TEXT NOT NULL,
  "marketRegion" "MarketRegion" NOT NULL,
  "lastNumber" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "InvoiceSequence_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "InvoiceSequence_shopId_marketRegion_key"
  ON "InvoiceSequence"("shopId", "marketRegion");

CREATE TYPE "InvoicePaymentStatus" AS ENUM ('RECEIVED', 'VOIDED', 'REVERSED');

CREATE TABLE "InvoicePayment" (
  "id" TEXT NOT NULL,
  "invoiceId" TEXT NOT NULL,
  "amount" DECIMAL(18,2) NOT NULL,
  "currency" "CurrencyCode" NOT NULL,
  "method" TEXT NOT NULL,
  "reference" TEXT,
  "idempotencyKey" TEXT NOT NULL,
  "status" "InvoicePaymentStatus" NOT NULL DEFAULT 'RECEIVED',
  "notes" TEXT,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "voidedAt" TIMESTAMP(3),
  "voidReason" TEXT,
  "reversalOfId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "InvoicePayment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "InvoicePayment_idempotencyKey_key"
  ON "InvoicePayment"("idempotencyKey");
CREATE UNIQUE INDEX "InvoicePayment_reversalOfId_key"
  ON "InvoicePayment"("reversalOfId");
CREATE INDEX "InvoicePayment_invoiceId_receivedAt_idx"
  ON "InvoicePayment"("invoiceId", "receivedAt");
CREATE INDEX "InvoicePayment_status_idx" ON "InvoicePayment"("status");

ALTER TABLE "InvoicePayment"
  ADD CONSTRAINT "InvoicePayment_invoiceId_fkey"
  FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InvoicePayment"
  ADD CONSTRAINT "InvoicePayment_reversalOfId_fkey"
  FOREIGN KEY ("reversalOfId") REFERENCES "InvoicePayment"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
