-- Chat moderation: blocked messages + chat violation notifications
--
-- This migration is intentionally written to be safe on PostgreSQL (Neon):
-- - Adds new enum values using IF NOT EXISTS
-- - Adds Message.isBlocked column using IF NOT EXISTS

-- 1) NotificationType enum additions
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'CHAT_VIOLATION_WARNING';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'ACCOUNT_SUSPENDED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'SHOP_ON_HOLD';

-- 2) Message table: add isBlocked flag
ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "isBlocked" BOOLEAN NOT NULL DEFAULT false;
