-- DropIndex
DROP INDEX "Shop_userId_key";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "activeShopId" TEXT,
ADD COLUMN     "twoFactorBackupCodes" TEXT[],
ADD COLUMN     "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "twoFactorSecret" TEXT;

-- CreateIndex
CREATE INDEX "Shop_userId_idx" ON "Shop"("userId");

-- CreateIndex
CREATE INDEX "User_activeShopId_idx" ON "User"("activeShopId");
