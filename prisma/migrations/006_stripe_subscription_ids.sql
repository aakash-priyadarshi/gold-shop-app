-- 006: Add Stripe Product/Price IDs to SubscriptionPlan for proper recurring billing
-- Maps each plan to a Stripe Product + monthly/annual Price objects

ALTER TABLE "SubscriptionPlan"
  ADD COLUMN IF NOT EXISTS "stripeProductId"     TEXT,
  ADD COLUMN IF NOT EXISTS "stripePriceId"       TEXT,     -- monthly recurring price
  ADD COLUMN IF NOT EXISTS "stripeAnnualPriceId" TEXT;     -- annual recurring price (optional)
