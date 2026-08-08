-- Add Sri Lanka market (LK) and Sri Lankan Rupee (LKR).
-- Additive enum values only — safe for prisma migrate deploy.

ALTER TYPE "CurrencyCode" ADD VALUE IF NOT EXISTS 'LKR';
ALTER TYPE "MarketRegion" ADD VALUE IF NOT EXISTS 'LK';
