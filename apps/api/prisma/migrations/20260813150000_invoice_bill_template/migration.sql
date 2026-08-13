-- Additive: shops keep Classic until they pick another layout on Invoice Settings.
-- No existing invoice data is rewritten.

ALTER TABLE "InvoiceSettings" ADD COLUMN "billTemplateId" TEXT NOT NULL DEFAULT 'classic';
