-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'ORDER_PLACED';
ALTER TYPE "NotificationType" ADD VALUE 'ORDER_CONFIRMED';
ALTER TYPE "NotificationType" ADD VALUE 'ORDER_PACKED';
ALTER TYPE "NotificationType" ADD VALUE 'ORDER_OUT_FOR_DELIVERY';
ALTER TYPE "NotificationType" ADD VALUE 'ORDER_CANCELLED';
ALTER TYPE "NotificationType" ADD VALUE 'ORDER_STATUS_UPDATE';
ALTER TYPE "NotificationType" ADD VALUE 'OFFER_REJECTED';
ALTER TYPE "NotificationType" ADD VALUE 'PAYMENT_PENDING';
