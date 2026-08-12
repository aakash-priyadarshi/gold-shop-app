-- Immutable walk-in quote payment history and registered-customer links on
-- counter/manual invoices. Existing aggregate quote balances are retained.

ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "registeredCustomerId" TEXT;
CREATE INDEX IF NOT EXISTS "Invoice_registeredCustomerId_idx"
  ON "Invoice"("registeredCustomerId");

CREATE TABLE IF NOT EXISTS "ShopQuotePayment" (
  "id" TEXT NOT NULL,
  "shopQuoteId" TEXT NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "method" TEXT NOT NULL DEFAULT 'UNSPECIFIED',
  "reference" TEXT,
  "notes" TEXT,
  "idempotencyKey" TEXT NOT NULL,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ShopQuotePayment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ShopQuotePayment_idempotencyKey_key"
  ON "ShopQuotePayment"("idempotencyKey");
CREATE INDEX IF NOT EXISTS "ShopQuotePayment_shopQuoteId_receivedAt_idx"
  ON "ShopQuotePayment"("shopQuoteId", "receivedAt");

DO $$ BEGIN
  ALTER TABLE "ShopQuotePayment"
    ADD CONSTRAINT "ShopQuotePayment_shopQuoteId_fkey"
    FOREIGN KEY ("shopQuoteId") REFERENCES "ShopQuote"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
