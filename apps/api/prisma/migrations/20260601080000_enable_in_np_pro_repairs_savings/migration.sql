-- Enable mobileRepairs and mobileSavings for India (IN) and Nepal (NP) PRO plans.
-- These regions historically had the flags disabled while AE/UK/EU/US PRO had
-- them enabled. This backfill aligns IN/NP PRO with the seed source of truth,
-- which sets both flags to true for every region.
UPDATE "SubscriptionPlan"
SET features = features || '{"mobileRepairs": true, "mobileSavings": true}'::jsonb
WHERE name = 'PRO'
  AND country IN ('IN', 'NP');
