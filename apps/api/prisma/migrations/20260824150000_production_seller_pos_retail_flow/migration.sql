-- Drop single phone unique index on WalkInCustomer if exists and add shop-scoped unique index
DROP INDEX IF EXISTS "WalkInCustomer_phone_key";

-- Add composite unique index on WalkInCustomer (createdByShopId, phone)
CREATE UNIQUE INDEX IF NOT EXISTS "WalkInCustomer_createdByShopId_phone_key" ON "WalkInCustomer"("createdByShopId", "phone");

-- Remove generic DB defaults from WalkInCustomer phoneCountryCode and country
ALTER TABLE "WalkInCustomer" ALTER COLUMN "phoneCountryCode" DROP DEFAULT;
ALTER TABLE "WalkInCustomer" ALTER COLUMN "country" DROP DEFAULT;

-- Alter enum InvoicePaymentStatus to add new statuses
ALTER TYPE "InvoicePaymentStatus" ADD VALUE IF NOT EXISTS 'PENDING';
ALTER TYPE "InvoicePaymentStatus" ADD VALUE IF NOT EXISTS 'CONFIRMED';
ALTER TYPE "InvoicePaymentStatus" ADD VALUE IF NOT EXISTS 'FAILED';
ALTER TYPE "InvoicePaymentStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';
ALTER TYPE "InvoicePaymentStatus" ADD VALUE IF NOT EXISTS 'REFUNDED';

-- AlterTable InvoicePayment
ALTER TABLE "InvoicePayment"
  ADD COLUMN IF NOT EXISTS "provider" TEXT,
  ADD COLUMN IF NOT EXISTS "providerTransactionId" TEXT,
  ADD COLUMN IF NOT EXISTS "merchantReference" TEXT,
  ADD COLUMN IF NOT EXISTS "terminalReference" TEXT,
  ADD COLUMN IF NOT EXISTS "bankReference" TEXT,
  ADD COLUMN IF NOT EXISTS "confirmedByUserId" TEXT,
  ADD COLUMN IF NOT EXISTS "verifiedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "verificationMode" TEXT,
  ADD COLUMN IF NOT EXISTS "metadata" JSONB;

-- CreateTable PosRegister
CREATE TABLE IF NOT EXISTS "PosRegister" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "terminalCode" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "hardwareConfig" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PosRegister_pkey" PRIMARY KEY ("id")
);

-- CreateTable PosShift
CREATE TABLE IF NOT EXISTS "PosShift" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "registerId" TEXT NOT NULL,
    "openedByUserId" TEXT NOT NULL,
    "closedByUserId" TEXT,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "openingCash" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "closingCash" DECIMAL(18,2),
    "expectedCash" DECIMAL(18,2),
    "variance" DECIMAL(18,2),
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "summary" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PosShift_pkey" PRIMARY KEY ("id")
);

-- CreateTable PosReturn
CREATE TABLE IF NOT EXISTS "PosReturn" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "originalInvoiceNumber" TEXT NOT NULL,
    "registerId" TEXT,
    "shiftId" TEXT,
    "cashierUserId" TEXT,
    "returnIdempotencyKey" TEXT,
    "returnType" TEXT NOT NULL DEFAULT 'RETURN',
    "exchangeInvoiceId" TEXT,
    "lines" JSONB NOT NULL,
    "subtotal" DECIMAL(18,2) NOT NULL,
    "taxAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "refundAmount" DECIMAL(18,2) NOT NULL,
    "refundMethod" TEXT NOT NULL DEFAULT 'CASH',
    "disposition" TEXT NOT NULL DEFAULT 'RESTOCK',
    "approvedByUserId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PosReturn_pkey" PRIMARY KEY ("id")
);

-- AlterTable PosSession
ALTER TABLE "PosSession"
  ADD COLUMN IF NOT EXISTS "registerId" TEXT,
  ADD COLUMN IF NOT EXISTS "cashierUserId" TEXT,
  ADD COLUMN IF NOT EXISTS "shiftId" TEXT;

-- AlterTable Invoice
ALTER TABLE "Invoice"
  ADD COLUMN IF NOT EXISTS "posSessionId" TEXT,
  ADD COLUMN IF NOT EXISTS "posRegisterId" TEXT,
  ADD COLUMN IF NOT EXISTS "posShiftId" TEXT,
  ADD COLUMN IF NOT EXISTS "posCashierUserId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "PosRegister_shopId_terminalCode_key" ON "PosRegister"("shopId", "terminalCode");
CREATE INDEX IF NOT EXISTS "PosRegister_shopId_active_idx" ON "PosRegister"("shopId", "active");

CREATE INDEX IF NOT EXISTS "PosShift_shopId_status_idx" ON "PosShift"("shopId", "status");
CREATE INDEX IF NOT EXISTS "PosShift_registerId_status_idx" ON "PosShift"("registerId", "status");
CREATE UNIQUE INDEX IF NOT EXISTS "PosShift_register_single_open_idx" ON "PosShift"("registerId") WHERE "status" = 'OPEN';

CREATE UNIQUE INDEX IF NOT EXISTS "PosReturn_returnIdempotencyKey_key" ON "PosReturn"("returnIdempotencyKey");
CREATE INDEX IF NOT EXISTS "PosReturn_shopId_createdAt_idx" ON "PosReturn"("shopId", "createdAt");
CREATE INDEX IF NOT EXISTS "PosReturn_invoiceId_idx" ON "PosReturn"("invoiceId");
CREATE INDEX IF NOT EXISTS "PosReturn_registerId_shiftId_idx" ON "PosReturn"("registerId", "shiftId");

CREATE INDEX IF NOT EXISTS "PosSession_registerId_status_idx" ON "PosSession"("registerId", "status");

CREATE INDEX IF NOT EXISTS "Invoice_posRegisterId_idx" ON "Invoice"("posRegisterId");
CREATE INDEX IF NOT EXISTS "Invoice_posShiftId_idx" ON "Invoice"("posShiftId");

-- AddForeignKey
ALTER TABLE "PosRegister" ADD CONSTRAINT "PosRegister_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PosShift" ADD CONSTRAINT "PosShift_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PosShift" ADD CONSTRAINT "PosShift_registerId_fkey" FOREIGN KEY ("registerId") REFERENCES "PosRegister"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PosShift" ADD CONSTRAINT "PosShift_openedByUserId_fkey" FOREIGN KEY ("openedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosShift" ADD CONSTRAINT "PosShift_closedByUserId_fkey" FOREIGN KEY ("closedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PosReturn" ADD CONSTRAINT "PosReturn_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PosReturn" ADD CONSTRAINT "PosReturn_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosReturn" ADD CONSTRAINT "PosReturn_registerId_fkey" FOREIGN KEY ("registerId") REFERENCES "PosRegister"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PosReturn" ADD CONSTRAINT "PosReturn_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "PosShift"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PosReturn" ADD CONSTRAINT "PosReturn_cashierUserId_fkey" FOREIGN KEY ("cashierUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PosSession" ADD CONSTRAINT "PosSession_registerId_fkey" FOREIGN KEY ("registerId") REFERENCES "PosRegister"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PosSession" ADD CONSTRAINT "PosSession_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "PosShift"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_posSessionId_fkey" FOREIGN KEY ("posSessionId") REFERENCES "PosSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_posRegisterId_fkey" FOREIGN KEY ("posRegisterId") REFERENCES "PosRegister"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_posShiftId_fkey" FOREIGN KEY ("posShiftId") REFERENCES "PosShift"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_posCashierUserId_fkey" FOREIGN KEY ("posCashierUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
