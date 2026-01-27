-- Sync migration for schema changes that were applied via db push
-- This migration captures: Design, DesignLike, CustomerAddress tables and related changes

-- CreateEnum
CREATE TYPE "DesignImageSource" AS ENUM ('AI_GENERATED', 'USER_UPLOADED', 'REFERENCE');

-- CreateTable
CREATE TABLE "CustomerAddress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "label" TEXT NOT NULL DEFAULT 'Home',
    "fullName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "addressLine1" TEXT NOT NULL,
    "addressLine2" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'IN',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerAddress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Design" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT,
    "imageUrl" TEXT NOT NULL,
    "imageHash" TEXT,
    "thumbnailUrl" TEXT,
    "prompt" TEXT,
    "title" TEXT,
    "description" TEXT,
    "aiDescription" TEXT,
    "jewelryType" TEXT NOT NULL,
    "metalType" TEXT,
    "buildMethod" TEXT,
    "estimatedWeight" DOUBLE PRECISION,
    "primaryStone" TEXT,
    "secondaryStones" TEXT[],
    "style" TEXT[],
    "tags" TEXT[],
    "imageSource" "DesignImageSource" NOT NULL DEFAULT 'AI_GENERATED',
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "viewsCount" INTEGER NOT NULL DEFAULT 0,
    "likesCount" INTEGER NOT NULL DEFAULT 0,
    "ordersCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Design_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DesignLike" (
    "id" TEXT NOT NULL,
    "designId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DesignLike_pkey" PRIMARY KEY ("id")
);

-- AlterTable (Add designId to RfqRequest)
ALTER TABLE "RfqRequest" ADD COLUMN IF NOT EXISTS "designId" TEXT;

-- CreateIndexes for CustomerAddress
CREATE INDEX "CustomerAddress_userId_idx" ON "CustomerAddress"("userId");
CREATE INDEX "CustomerAddress_userId_isDefault_idx" ON "CustomerAddress"("userId", "isDefault");

-- CreateIndexes for Design
CREATE UNIQUE INDEX IF NOT EXISTS "Design_imageHash_key" ON "Design"("imageHash");
CREATE INDEX "Design_creatorId_idx" ON "Design"("creatorId");
CREATE INDEX "Design_jewelryType_idx" ON "Design"("jewelryType");
CREATE INDEX "Design_metalType_idx" ON "Design"("metalType");
CREATE INDEX "Design_buildMethod_idx" ON "Design"("buildMethod");
CREATE INDEX "Design_primaryStone_idx" ON "Design"("primaryStone");
CREATE INDEX "Design_isPublic_isApproved_idx" ON "Design"("isPublic", "isApproved");
CREATE INDEX "Design_isFeatured_idx" ON "Design"("isFeatured");
CREATE INDEX "Design_viewsCount_idx" ON "Design"("viewsCount");
CREATE INDEX "Design_likesCount_idx" ON "Design"("likesCount");
CREATE INDEX "Design_ordersCount_idx" ON "Design"("ordersCount");
CREATE INDEX "Design_createdAt_idx" ON "Design"("createdAt");

-- CreateIndexes for DesignLike
CREATE UNIQUE INDEX "DesignLike_designId_userId_key" ON "DesignLike"("designId", "userId");
CREATE INDEX "DesignLike_designId_idx" ON "DesignLike"("designId");
CREATE INDEX "DesignLike_userId_idx" ON "DesignLike"("userId");

-- CreateIndex for RfqRequest.designId
CREATE INDEX IF NOT EXISTS "RfqRequest_designId_idx" ON "RfqRequest"("designId");

-- AddForeignKey
ALTER TABLE "CustomerAddress" ADD CONSTRAINT "CustomerAddress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Design" ADD CONSTRAINT "Design_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DesignLike" ADD CONSTRAINT "DesignLike_designId_fkey" FOREIGN KEY ("designId") REFERENCES "Design"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DesignLike" ADD CONSTRAINT "DesignLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RfqRequest" ADD CONSTRAINT "RfqRequest_designId_fkey" FOREIGN KEY ("designId") REFERENCES "Design"("id") ON DELETE SET NULL ON UPDATE CASCADE;
