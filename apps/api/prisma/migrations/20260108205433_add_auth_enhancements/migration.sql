/*
  Warnings:

  - The `currency` column on the `FinishPriceConfig` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `inrToNPR` on the `FxRateSnapshot` table. All the data in the column will be lost.
  - You are about to drop the column `usdToINR` on the `FxRateSnapshot` table. All the data in the column will be lost.
  - You are about to drop the column `usdToNPR` on the `FxRateSnapshot` table. All the data in the column will be lost.
  - The `currency` column on the `GemPriceConfig` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `country` on the `MarketRateSnapshot` table. All the data in the column will be lost.
  - The `currency` column on the `ShopPriceOverride` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[metalCode]` on the table `BaseMetalPriceConfig` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[finishType,tier]` on the table `FinishPriceConfig` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[pair]` on the table `FxRateSnapshot` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[region,currency]` on the table `MarketRateSnapshot` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[currency]` on the table `RoundingRuleConfig` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[shopId,overrideType,itemCode]` on the table `ShopPriceOverride` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `pair` to the `FxRateSnapshot` table without a default value. This is not possible if the table is not empty.
  - Added the required column `rate` to the `FxRateSnapshot` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `marketRegion` on the `MarketAdjustmentConfig` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `region` to the `MarketRateSnapshot` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `currency` on the `MarketRateSnapshot` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `marketRegion` on the `PriceCalculationLog` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `displayCurrency` on the `PriceCalculationLog` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `currency` on the `RoundingRuleConfig` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `marketRegion` on the `TaxRuleConfig` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "CurrencyCode" AS ENUM ('NPR', 'INR', 'AED', 'USD', 'GBP', 'EUR');

-- CreateEnum
CREATE TYPE "MarketRegion" AS ENUM ('NP', 'IN', 'AE', 'UK', 'EU', 'US');

-- DropIndex
DROP INDEX "MarketRateSnapshot_country_updatedAt_idx";

-- AlterTable
ALTER TABLE "BaseMetalPriceConfig" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "FinishPriceConfig" DROP COLUMN "currency",
ADD COLUMN     "currency" "CurrencyCode" NOT NULL DEFAULT 'USD',
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "FxRateSnapshot" DROP COLUMN "inrToNPR",
DROP COLUMN "usdToINR",
DROP COLUMN "usdToNPR",
ADD COLUMN     "pair" TEXT NOT NULL,
ADD COLUMN     "rate" DOUBLE PRECISION NOT NULL;

-- AlterTable
ALTER TABLE "GemPriceConfig" DROP COLUMN "currency",
ADD COLUMN     "currency" "CurrencyCode" NOT NULL DEFAULT 'USD',
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "MarketAdjustmentConfig" DROP COLUMN "marketRegion",
ADD COLUMN     "marketRegion" "MarketRegion" NOT NULL,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "MarketRateSnapshot" DROP COLUMN "country",
ADD COLUMN     "region" "MarketRegion" NOT NULL,
DROP COLUMN "currency",
ADD COLUMN     "currency" "CurrencyCode" NOT NULL;

-- AlterTable
ALTER TABLE "MetalPurityConfig" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "PriceCalculationLog" DROP COLUMN "marketRegion",
ADD COLUMN     "marketRegion" "MarketRegion" NOT NULL,
DROP COLUMN "displayCurrency",
ADD COLUMN     "displayCurrency" "CurrencyCode" NOT NULL;

-- AlterTable
ALTER TABLE "RoundingRuleConfig" DROP COLUMN "currency",
ADD COLUMN     "currency" "CurrencyCode" NOT NULL,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "ShopPriceOverride" DROP COLUMN "currency",
ADD COLUMN     "currency" "CurrencyCode" NOT NULL DEFAULT 'NPR',
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "SystemPriceConfig" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "TaxRuleConfig" DROP COLUMN "marketRegion",
ADD COLUMN     "marketRegion" "MarketRegion" NOT NULL,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "preferredCurrency" "CurrencyCode" NOT NULL DEFAULT 'NPR',
ADD COLUMN     "themeMode" TEXT NOT NULL DEFAULT 'system';

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash");

-- CreateIndex
CREATE INDEX "RefreshToken_userId_idx" ON "RefreshToken"("userId");

-- CreateIndex
CREATE INDEX "RefreshToken_tokenHash_idx" ON "RefreshToken"("tokenHash");

-- CreateIndex
CREATE INDEX "RefreshToken_expiresAt_idx" ON "RefreshToken"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "BaseMetalPriceConfig_metalCode_key" ON "BaseMetalPriceConfig"("metalCode");

-- CreateIndex
CREATE INDEX "BaseMetalPriceConfig_isActive_idx" ON "BaseMetalPriceConfig"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "FinishPriceConfig_finishType_tier_key" ON "FinishPriceConfig"("finishType", "tier");

-- CreateIndex
CREATE UNIQUE INDEX "FxRateSnapshot_pair_key" ON "FxRateSnapshot"("pair");

-- CreateIndex
CREATE INDEX "FxRateSnapshot_pair_idx" ON "FxRateSnapshot"("pair");

-- CreateIndex
CREATE INDEX "MarketAdjustmentConfig_marketRegion_idx" ON "MarketAdjustmentConfig"("marketRegion");

-- CreateIndex
CREATE INDEX "MarketAdjustmentConfig_marketRegion_category_isActive_idx" ON "MarketAdjustmentConfig"("marketRegion", "category", "isActive");

-- CreateIndex
CREATE INDEX "MarketRateSnapshot_region_currency_updatedAt_idx" ON "MarketRateSnapshot"("region", "currency", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "MarketRateSnapshot_region_currency_key" ON "MarketRateSnapshot"("region", "currency");

-- CreateIndex
CREATE UNIQUE INDEX "RoundingRuleConfig_currency_key" ON "RoundingRuleConfig"("currency");

-- CreateIndex
CREATE UNIQUE INDEX "ShopPriceOverride_shopId_overrideType_itemCode_key" ON "ShopPriceOverride"("shopId", "overrideType", "itemCode");

-- CreateIndex
CREATE INDEX "TaxRuleConfig_marketRegion_isActive_idx" ON "TaxRuleConfig"("marketRegion", "isActive");

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "GemPriceConfig_stoneType_quality_idx" RENAME TO "GemPriceConfig_stoneType_qualityGrade_idx";

-- RenameIndex
ALTER INDEX "MetalPurityConfig_metalType_purityCode_idx" RENAME TO "MetalPurityConfig_metalType_purityCode_key";
