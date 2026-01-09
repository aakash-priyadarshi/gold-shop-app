-- AlterTable
ALTER TABLE "ApiToken" ADD COLUMN     "encryptedToken" TEXT,
ADD COLUMN     "tokenViewableUntil" TIMESTAMP(3);
