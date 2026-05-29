-- Enforce at most one live (ACTIVE/TRIALING) subscription per shop.
-- PAST_DUE/CANCELLED/EXPIRED are intentionally excluded so a replaced or
-- lapsed subscription can coexist with the new live one during transitions.
-- This is the hard DB-level backstop behind the transactional cancel-then-create
-- logic in SellerSubscriptionsService.
CREATE UNIQUE INDEX IF NOT EXISTS "SellerSubscription_one_live_per_shop"
ON "SellerSubscription" ("shopId")
WHERE status IN ('ACTIVE', 'TRIALING');
