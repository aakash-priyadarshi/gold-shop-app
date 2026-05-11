-- AlterTable: add invoice and tracking fields to ShopQuote
ALTER TABLE "ShopQuote"
  ADD COLUMN "invoiceNumber"        TEXT,
  ADD COLUMN "invoicedAt"           TIMESTAMP(3),
  ADD COLUMN "trackingToken"        TEXT,
  ADD COLUMN "trackingEmailSent"    BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "trackingSmsSent"      BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "registeredCustomerId" TEXT;

-- CreateIndex for unique constraints
CREATE UNIQUE INDEX "ShopQuote_invoiceNumber_key" ON "ShopQuote"("invoiceNumber");
CREATE UNIQUE INDEX "ShopQuote_trackingToken_key" ON "ShopQuote"("trackingToken");

-- CreateIndex for tracking token lookup
CREATE INDEX "ShopQuote_trackingToken_idx" ON "ShopQuote"("trackingToken");

-- CreateIndex for registered customer
CREATE INDEX "ShopQuote_registeredCustomerId_idx" ON "ShopQuote"("registeredCustomerId");
