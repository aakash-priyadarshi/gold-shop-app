-- Custom plan quotes: sales inquiries from the billing page plus
-- admin-prepared custom-priced quotes redeemed via Stripe Checkout.
CREATE TYPE "PlanInquiryStatus" AS ENUM ('NEW', 'QUOTED', 'CLOSED');
CREATE TYPE "PlanQuoteStatus" AS ENUM ('SENT', 'REDEEMED', 'REVOKED');

CREATE TABLE "PlanInquiry" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planName" TEXT NOT NULL,
    "message" TEXT,
    "status" "PlanInquiryStatus" NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanInquiry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PlanQuote" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "inquiryId" TEXT,
    "monthlyPrice" DOUBLE PRECISION,
    "annualPrice" DOUBLE PRECISION,
    "validUntil" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "status" "PlanQuoteStatus" NOT NULL DEFAULT 'SENT',
    "monthlyPriceId" TEXT,
    "annualPriceId" TEXT,
    "redeemedAt" TIMESTAMP(3),
    "redeemedSubscriptionId" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanQuote_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PlanQuote_token_key" ON "PlanQuote"("token");
CREATE UNIQUE INDEX "PlanQuote_inquiryId_key" ON "PlanQuote"("inquiryId");
CREATE UNIQUE INDEX "PlanInquiry_id_shopId_key" ON "PlanInquiry"("id", "shopId");

CREATE INDEX "PlanInquiry_status_createdAt_idx" ON "PlanInquiry"("status", "createdAt");
CREATE INDEX "PlanInquiry_shopId_idx" ON "PlanInquiry"("shopId");
CREATE INDEX "PlanQuote_shopId_status_idx" ON "PlanQuote"("shopId", "status");
CREATE INDEX "PlanQuote_status_validUntil_idx" ON "PlanQuote"("status", "validUntil");

ALTER TABLE "PlanInquiry" ADD CONSTRAINT "PlanInquiry_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlanInquiry" ADD CONSTRAINT "PlanInquiry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PlanQuote" ADD CONSTRAINT "PlanQuote_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlanQuote" ADD CONSTRAINT "PlanQuote_planId_fkey" FOREIGN KEY ("planId") REFERENCES "SubscriptionPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PlanQuote" ADD CONSTRAINT "PlanQuote_inquiryId_fkey" FOREIGN KEY ("inquiryId") REFERENCES "PlanInquiry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
