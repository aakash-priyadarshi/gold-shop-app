-- Validate the already-created FK after the initial POS migration has committed.
-- Keeping this separate shortens the stronger lock held during the feature migration.
ALTER TABLE "InvoicePayment"
  VALIDATE CONSTRAINT "InvoicePayment_posReturnId_fkey";
