-- CreateTable
CREATE TABLE "MaterialRate" (
    "id" TEXT NOT NULL,
    "materialCode" TEXT NOT NULL,
    "ratePerGramUsd" DOUBLE PRECISION NOT NULL,
    "ratePerGramLocal" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'seed',
    "isRestricted" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MaterialRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinishPrice" (
    "id" TEXT NOT NULL,
    "finishType" TEXT NOT NULL,
    "tier" TEXT NOT NULL,
    "flatFee" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'seed',
    "note" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinishPrice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GemstoneCatalog" (
    "id" TEXT NOT NULL,
    "stoneType" TEXT NOT NULL,
    "origin" TEXT,
    "sizeUnit" TEXT NOT NULL,
    "sizeMin" DOUBLE PRECISION NOT NULL,
    "sizeMax" DOUBLE PRECISION NOT NULL,
    "qualityTier" TEXT NOT NULL,
    "pricePerStone" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'seed',
    "note" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GemstoneCatalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SettingPrice" (
    "id" TEXT NOT NULL,
    "settingType" TEXT NOT NULL,
    "flatFeePerStone" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'seed',
    "note" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SettingPrice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FxRateSnapshot" (
    "id" TEXT NOT NULL,
    "usdToINR" DOUBLE PRECISION NOT NULL,
    "usdToNPR" DOUBLE PRECISION NOT NULL,
    "inrToNPR" DOUBLE PRECISION NOT NULL,
    "source" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FxRateSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MaterialRate_materialCode_idx" ON "MaterialRate"("materialCode");

-- CreateIndex
CREATE UNIQUE INDEX "MaterialRate_materialCode_currency_key" ON "MaterialRate"("materialCode", "currency");

-- CreateIndex
CREATE INDEX "FinishPrice_finishType_idx" ON "FinishPrice"("finishType");

-- CreateIndex
CREATE UNIQUE INDEX "FinishPrice_finishType_tier_currency_key" ON "FinishPrice"("finishType", "tier", "currency");

-- CreateIndex
CREATE INDEX "GemstoneCatalog_stoneType_qualityTier_idx" ON "GemstoneCatalog"("stoneType", "qualityTier");

-- CreateIndex
CREATE INDEX "GemstoneCatalog_sizeMin_sizeMax_idx" ON "GemstoneCatalog"("sizeMin", "sizeMax");

-- CreateIndex
CREATE INDEX "SettingPrice_settingType_idx" ON "SettingPrice"("settingType");

-- CreateIndex
CREATE UNIQUE INDEX "SettingPrice_settingType_currency_key" ON "SettingPrice"("settingType", "currency");

-- CreateIndex
CREATE INDEX "FxRateSnapshot_updatedAt_idx" ON "FxRateSnapshot"("updatedAt");
