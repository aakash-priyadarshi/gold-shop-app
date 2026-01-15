-- CreateTable
CREATE TABLE "CustomerPurchaseStats" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "currency" "CurrencyCode" NOT NULL,
    "orderCount" INTEGER NOT NULL DEFAULT 0,
    "totalSpent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastOrderAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerPurchaseStats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CustomerPurchaseStats_customerId_idx" ON "CustomerPurchaseStats"("customerId");

-- CreateIndex
CREATE INDEX "CustomerPurchaseStats_currency_idx" ON "CustomerPurchaseStats"("currency");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerPurchaseStats_customerId_currency_key" ON "CustomerPurchaseStats"("customerId", "currency");

-- AddForeignKey
ALTER TABLE "CustomerPurchaseStats" ADD CONSTRAINT "CustomerPurchaseStats_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
