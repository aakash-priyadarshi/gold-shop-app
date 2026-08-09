-- Bill QR verification token + walk-in customer link on invoices.
-- Migration file only — apply with `prisma migrate deploy` after confirmation.

ALTER TABLE "Invoice" ADD COLUMN "walkInCustomerId" TEXT;
ALTER TABLE "Invoice" ADD COLUMN "verificationToken" TEXT NOT NULL DEFAULT gen_random_uuid()::text;

-- Ensure existing rows get unique tokens (gen_random_uuid default handles it,
-- but enforce uniqueness for the new column).
CREATE UNIQUE INDEX "Invoice_verificationToken_key" ON "Invoice"("verificationToken");
CREATE INDEX "Invoice_walkInCustomerId_idx" ON "Invoice"("walkInCustomerId");

ALTER TABLE "Invoice"
  ADD CONSTRAINT "Invoice_walkInCustomerId_fkey"
  FOREIGN KEY ("walkInCustomerId") REFERENCES "WalkInCustomer"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
