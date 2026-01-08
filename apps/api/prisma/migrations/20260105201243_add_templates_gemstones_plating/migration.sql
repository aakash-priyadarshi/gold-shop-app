-- CreateEnum
CREATE TYPE "WeightCategory" AS ENUM ('LIGHT', 'MEDIUM', 'HEAVY');

-- CreateEnum
CREATE TYPE "GemstoneType" AS ENUM ('DIAMOND_NATURAL', 'DIAMOND_LAB', 'MOISSANITE', 'CUBIC_ZIRCONIA', 'RUBY', 'SAPPHIRE', 'EMERALD', 'PEARL', 'AMETHYST', 'TOPAZ', 'GARNET', 'OPAL', 'TURQUOISE', 'AQUAMARINE', 'PERIDOT', 'CITRINE', 'OTHER');

-- CreateEnum
CREATE TYPE "GemstoneShape" AS ENUM ('ROUND', 'OVAL', 'PRINCESS', 'CUSHION', 'EMERALD_CUT', 'MARQUISE', 'PEAR', 'HEART', 'RADIANT', 'ASSCHER', 'BAGUETTE', 'TRILLION', 'CABOCHON');

-- CreateEnum
CREATE TYPE "SettingStyle" AS ENUM ('PRONG', 'BEZEL', 'CHANNEL', 'PAVE', 'FLUSH', 'TENSION', 'HALO', 'CLUSTER', 'BAR', 'INVISIBLE');

-- CreateEnum
CREATE TYPE "PlatingType" AS ENUM ('GOLD_PLATING', 'ROSE_GOLD_PLATING', 'RHODIUM_PLATING', 'SILVER_PLATING', 'VERMEIL', 'PVD_COATING');

-- CreateEnum
CREATE TYPE "PlatingTier" AS ENUM ('LIGHT', 'STANDARD', 'PREMIUM');

-- CreateEnum
CREATE TYPE "SurfaceFinish" AS ENUM ('HIGH_POLISH', 'MATTE', 'BRUSHED', 'SATIN', 'HAMMERED', 'SANDBLASTED', 'FLORENTINE', 'BARK_TEXTURE', 'DIAMOND_CUT', 'ENGRAVED');

-- CreateEnum
CREATE TYPE "PreciousMetal" AS ENUM ('GOLD_24K', 'GOLD_22K', 'GOLD_18K', 'GOLD_14K', 'GOLD_10K', 'SILVER_999', 'SILVER_925', 'PLATINUM_950', 'PLATINUM_900', 'PALLADIUM_950');

-- CreateEnum
CREATE TYPE "BaseMetal" AS ENUM ('BRASS', 'BRONZE', 'COPPER', 'STAINLESS_STEEL_316L', 'TITANIUM', 'TUNGSTEN_CARBIDE', 'COBALT_CHROME');

-- CreateEnum
CREATE TYPE "JewelleryAlloy" AS ENUM ('COPPER_ALLOY', 'ZINC_ALLOY', 'NICKEL_ALLOY', 'BRASS_ALLOY', 'BRONZE_ALLOY');

-- AlterTable
ALTER TABLE "RfqRequest" ADD COLUMN     "addGoldPlating" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "platingTier" TEXT,
ADD COLUMN     "platingType" TEXT,
ADD COLUMN     "surfaceFinish" TEXT,
ADD COLUMN     "templateId" TEXT,
ADD COLUMN     "weightCategory" "WeightCategory";

-- CreateTable
CREATE TABLE "RfqGemstone" (
    "id" TEXT NOT NULL,
    "rfqId" TEXT NOT NULL,
    "stoneType" TEXT NOT NULL,
    "shape" TEXT NOT NULL,
    "sizeMm" DOUBLE PRECISION,
    "caratWeight" DOUBLE PRECISION,
    "color" TEXT,
    "clarity" TEXT,
    "settingStyle" TEXT,
    "count" INTEGER NOT NULL DEFAULT 1,
    "position" TEXT,
    "estimatedPriceNpr" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RfqGemstone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JewelleryTemplate" (
    "id" TEXT NOT NULL,
    "jewelleryType" "JewelleryType" NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameNe" TEXT,
    "nameHi" TEXT,
    "descriptionEn" TEXT,
    "descriptionNe" TEXT,
    "descriptionHi" TEXT,
    "lightWeightMin" DOUBLE PRECISION NOT NULL,
    "lightWeightMax" DOUBLE PRECISION NOT NULL,
    "mediumWeightMin" DOUBLE PRECISION NOT NULL,
    "mediumWeightMax" DOUBLE PRECISION NOT NULL,
    "heavyWeightMin" DOUBLE PRECISION NOT NULL,
    "heavyWeightMax" DOUBLE PRECISION NOT NULL,
    "defaultDimensions" JSONB,
    "recommendedMaterials" TEXT[],
    "imageUrl" TEXT,
    "iconName" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JewelleryTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GemstonePreset" (
    "id" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameNe" TEXT,
    "nameHi" TEXT,
    "stoneType" "GemstoneType" NOT NULL,
    "shape" "GemstoneShape" NOT NULL,
    "settingStyle" "SettingStyle" NOT NULL,
    "sizeOptions" JSONB NOT NULL,
    "colorOptions" TEXT[],
    "defaultCount" INTEGER NOT NULL DEFAULT 1,
    "imageUrl" TEXT,
    "templateId" TEXT,
    "basePriceNpr" DOUBLE PRECISION NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GemstonePreset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatingOption" (
    "id" TEXT NOT NULL,
    "platingType" "PlatingType" NOT NULL,
    "tier" "PlatingTier" NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameNe" TEXT,
    "descriptionEn" TEXT,
    "thicknessMin" DOUBLE PRECISION NOT NULL,
    "thicknessMax" DOUBLE PRECISION NOT NULL,
    "basePriceNpr" DOUBLE PRECISION NOT NULL,
    "durabilityMonths" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "PlatingOption_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RfqGemstone_rfqId_idx" ON "RfqGemstone"("rfqId");

-- CreateIndex
CREATE INDEX "JewelleryTemplate_jewelleryType_idx" ON "JewelleryTemplate"("jewelleryType");

-- CreateIndex
CREATE UNIQUE INDEX "JewelleryTemplate_jewelleryType_nameEn_key" ON "JewelleryTemplate"("jewelleryType", "nameEn");

-- CreateIndex
CREATE INDEX "GemstonePreset_stoneType_idx" ON "GemstonePreset"("stoneType");

-- CreateIndex
CREATE INDEX "GemstonePreset_templateId_idx" ON "GemstonePreset"("templateId");

-- CreateIndex
CREATE UNIQUE INDEX "PlatingOption_platingType_tier_key" ON "PlatingOption"("platingType", "tier");

-- AddForeignKey
ALTER TABLE "RfqGemstone" ADD CONSTRAINT "RfqGemstone_rfqId_fkey" FOREIGN KEY ("rfqId") REFERENCES "RfqRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GemstonePreset" ADD CONSTRAINT "GemstonePreset_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "JewelleryTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
