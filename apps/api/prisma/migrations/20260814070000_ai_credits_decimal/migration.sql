-- Additive: existing whole-credit balances stay the same value with .00.
-- Needed so Pro+ product-description generation can debit 0.25 credits.

ALTER TABLE "User"
  ALTER COLUMN "aiCreditsBalance" TYPE DECIMAL(12,2)
  USING "aiCreditsBalance"::DECIMAL(12,2);

ALTER TABLE "AiCreditLedger"
  ALTER COLUMN "amount" TYPE DECIMAL(12,2) USING "amount"::DECIMAL(12,2),
  ALTER COLUMN "balanceBefore" TYPE DECIMAL(12,2) USING "balanceBefore"::DECIMAL(12,2),
  ALTER COLUMN "balanceAfter" TYPE DECIMAL(12,2) USING "balanceAfter"::DECIMAL(12,2);
