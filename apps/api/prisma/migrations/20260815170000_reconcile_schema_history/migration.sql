-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- Preserve defaults from earlier hand-written migrations in databases that may
-- have received these models through db push before the migrations were run.
ALTER TABLE "BackupSchedule"
ALTER COLUMN "id" SET DEFAULT (gen_random_uuid())::text,
ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "BotSession"
ALTER COLUMN "leadIntents" SET DEFAULT ARRAY[]::TEXT[];

ALTER TABLE "EmailLog"
ALTER COLUMN "id" SET DEFAULT (gen_random_uuid())::text,
ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "EmailTemplate"
ALTER COLUMN "id" SET DEFAULT (gen_random_uuid())::text,
ALTER COLUMN "variables" SET DEFAULT ARRAY[]::TEXT[],
ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "EmailTemplateVersion"
ALTER COLUMN "id" SET DEFAULT (gen_random_uuid())::text,
ALTER COLUMN "variables" SET DEFAULT ARRAY[]::TEXT[];

ALTER TABLE "Invoice"
ALTER COLUMN "verificationToken" SET DEFAULT (gen_random_uuid())::text;

-- AlterTable
ALTER TABLE "AppRelease" ADD COLUMN IF NOT EXISTS "downloadCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "customerTaxId" TEXT,
ADD COLUMN IF NOT EXISTS "customerType" TEXT NOT NULL DEFAULT 'B2C',
ADD COLUMN IF NOT EXISTS "hsnCode" TEXT,
ADD COLUMN IF NOT EXISTS "invoiceCountry" TEXT,
ADD COLUMN IF NOT EXISTS "isTaxExempt" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "makingChargeRate" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "makingChargesAmt" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "paymentMethod" TEXT,
ADD COLUMN IF NOT EXISTS "placeOfSupply" TEXT,
ADD COLUMN IF NOT EXISTS "taxBreakdown" JSONB,
ADD COLUMN IF NOT EXISTS "taxExemptReason" TEXT;

-- AlterTable
ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "embedding" vector(768),
ADD COLUMN IF NOT EXISTS "isFalsePositive" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "dateOfBirth" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "gender" TEXT;

-- CreateTable
CREATE TABLE IF NOT EXISTS "TaxExportLog" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "exportType" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "requestedBy" TEXT,
    "ipHash" TEXT,
    "shareToken" TEXT,
    "shareExpiresAt" TIMESTAMP(3),
    "rowCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaxExportLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Survey" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "targetRole" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Survey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "SurveyQuestion" (
    "id" TEXT NOT NULL,
    "surveyId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "options" JSONB,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "orderIdx" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "SurveyQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "SurveyResponse" (
    "id" TEXT NOT NULL,
    "surveyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "SurveyResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "SurveyAnswer" (
    "id" TEXT NOT NULL,
    "responseId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "SurveyAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "TaxExportLog_shareToken_key" ON "TaxExportLog"("shareToken");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TaxExportLog_shopId_createdAt_idx" ON "TaxExportLog"("shopId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TaxExportLog_shareToken_idx" ON "TaxExportLog"("shareToken");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Survey_isActive_idx" ON "Survey"("isActive");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SurveyQuestion_surveyId_idx" ON "SurveyQuestion"("surveyId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SurveyQuestion_surveyId_orderIdx_idx" ON "SurveyQuestion"("surveyId", "orderIdx");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SurveyResponse_userId_idx" ON "SurveyResponse"("userId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "SurveyResponse_surveyId_userId_key" ON "SurveyResponse"("surveyId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "SurveyAnswer_responseId_questionId_key" ON "SurveyAnswer"("responseId", "questionId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Invoice_shopId_issuedAt_idx" ON "Invoice"("shopId", "issuedAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Invoice_invoiceCountry_idx" ON "Invoice"("invoiceCountry");

-- AddForeignKeys idempotently because these tables may already exist in databases
-- that received the original schema changes through db push.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SurveyQuestion_surveyId_fkey') THEN
    ALTER TABLE "SurveyQuestion" ADD CONSTRAINT "SurveyQuestion_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "Survey"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SurveyResponse_surveyId_fkey') THEN
    ALTER TABLE "SurveyResponse" ADD CONSTRAINT "SurveyResponse_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "Survey"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SurveyResponse_userId_fkey') THEN
    ALTER TABLE "SurveyResponse" ADD CONSTRAINT "SurveyResponse_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SurveyAnswer_responseId_fkey') THEN
    ALTER TABLE "SurveyAnswer" ADD CONSTRAINT "SurveyAnswer_responseId_fkey" FOREIGN KEY ("responseId") REFERENCES "SurveyResponse"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SurveyAnswer_questionId_fkey') THEN
    ALTER TABLE "SurveyAnswer" ADD CONSTRAINT "SurveyAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "SurveyQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;
