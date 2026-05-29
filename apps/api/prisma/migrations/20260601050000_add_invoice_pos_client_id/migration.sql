-- Add idempotency key for offline-replayed POS sales.
ALTER TABLE "Invoice" ADD COLUMN "posClientId" TEXT;

CREATE UNIQUE INDEX "Invoice_posClientId_key" ON "Invoice"("posClientId");
