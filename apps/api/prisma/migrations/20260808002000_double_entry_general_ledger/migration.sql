-- Production double-entry ledger. This migration intentionally follows the
-- already-applied 20260808001000 migration and does not modify its history.

CREATE TYPE "LedgerAccountType" AS ENUM (
  'ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'
);

CREATE TYPE "LedgerAccountKey" AS ENUM (
  'CASH_ON_HAND',
  'BANK',
  'GATEWAY_CLEARING',
  'ACCOUNTS_RECEIVABLE',
  'CUSTOMER_ADVANCES',
  'TAX_PAYABLE',
  'PLATFORM_COMMISSION_PAYABLE',
  'SALES_REVENUE',
  'SALES_RETURNS',
  'PLATFORM_COMMISSION_EXPENSE'
);

CREATE TYPE "JournalEntryStatus" AS ENUM ('DRAFT', 'POSTED');

CREATE TYPE "JournalReferenceType" AS ENUM (
  'INVOICE_ISSUED',
  'INVOICE_PAYMENT',
  'ORDER_PAYMENT',
  'ORDER_ADVANCE_APPLIED',
  'ORDER_REFUND',
  'COMMISSION_ACCRUAL',
  'COMMISSION_PAYMENT',
  'COMMISSION_REFUND_ADJUSTMENT',
  'COMMISSION_WAIVER',
  'REVERSAL'
);

CREATE TABLE "LedgerAccount" (
  "id" TEXT NOT NULL,
  "shopId" TEXT NOT NULL,
  "code" VARCHAR(32) NOT NULL,
  "name" TEXT NOT NULL,
  "type" "LedgerAccountType" NOT NULL,
  "systemKey" "LedgerAccountKey",
  "isSystem" BOOLEAN NOT NULL DEFAULT FALSE,
  "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LedgerAccount_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "JournalEntry" (
  "id" TEXT NOT NULL,
  "shopId" TEXT NOT NULL,
  "entryNumber" VARCHAR(64) NOT NULL,
  "status" "JournalEntryStatus" NOT NULL DEFAULT 'DRAFT',
  "referenceType" "JournalReferenceType" NOT NULL,
  "referenceId" TEXT NOT NULL,
  "idempotencyKey" VARCHAR(191) NOT NULL,
  "description" TEXT NOT NULL,
  "transactionDate" TIMESTAMP(3) NOT NULL,
  "postedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "canonicalCurrency" "CurrencyCode" NOT NULL DEFAULT 'NPR',
  "transactionCurrency" "CurrencyCode" NOT NULL,
  "transactionAmount" DECIMAL(24,4) NOT NULL,
  "canonicalAmountNpr" DECIMAL(24,4) NOT NULL,
  "fxRate" DECIMAL(24,10) NOT NULL,
  "fxSource" TEXT NOT NULL,
  "fxQuotedAt" TIMESTAMP(3) NOT NULL,
  "actorUserId" TEXT,
  "metadata" JSONB,
  "reversalOfId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "JournalEntry_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "JournalEntry_positive_amounts_check" CHECK (
    "transactionAmount" > 0 AND "canonicalAmountNpr" > 0 AND "fxRate" > 0
  ),
  CONSTRAINT "JournalEntry_canonical_npr_check" CHECK (
    "canonicalCurrency" = 'NPR'
  )
);

CREATE TABLE "JournalLine" (
  "id" TEXT NOT NULL,
  "journalEntryId" TEXT NOT NULL,
  "accountId" TEXT NOT NULL,
  "description" TEXT,
  "debitNpr" DECIMAL(24,4) NOT NULL DEFAULT 0,
  "creditNpr" DECIMAL(24,4) NOT NULL DEFAULT 0,
  "transactionDebit" DECIMAL(24,4) NOT NULL DEFAULT 0,
  "transactionCredit" DECIMAL(24,4) NOT NULL DEFAULT 0,
  "transactionCurrency" "CurrencyCode" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "JournalLine_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "JournalLine_debit_credit_xor_check" CHECK (
    ("debitNpr" > 0 AND "creditNpr" = 0) OR
    ("creditNpr" > 0 AND "debitNpr" = 0)
  ),
  CONSTRAINT "JournalLine_transaction_debit_credit_xor_check" CHECK (
    ("transactionDebit" > 0 AND "transactionCredit" = 0) OR
    ("transactionCredit" > 0 AND "transactionDebit" = 0)
  )
);

CREATE UNIQUE INDEX "LedgerAccount_shopId_code_key"
  ON "LedgerAccount"("shopId", "code");
CREATE UNIQUE INDEX "LedgerAccount_shopId_systemKey_key"
  ON "LedgerAccount"("shopId", "systemKey");
CREATE INDEX "LedgerAccount_shopId_type_idx"
  ON "LedgerAccount"("shopId", "type");
CREATE INDEX "LedgerAccount_shopId_isActive_idx"
  ON "LedgerAccount"("shopId", "isActive");

CREATE UNIQUE INDEX "JournalEntry_shopId_entryNumber_key"
  ON "JournalEntry"("shopId", "entryNumber");
CREATE UNIQUE INDEX "JournalEntry_shopId_idempotencyKey_key"
  ON "JournalEntry"("shopId", "idempotencyKey");
CREATE UNIQUE INDEX "JournalEntry_shopId_referenceType_referenceId_key"
  ON "JournalEntry"("shopId", "referenceType", "referenceId");
CREATE UNIQUE INDEX "JournalEntry_reversalOfId_key"
  ON "JournalEntry"("reversalOfId");
CREATE INDEX "JournalEntry_shopId_transactionDate_idx"
  ON "JournalEntry"("shopId", "transactionDate");
CREATE INDEX "JournalEntry_shopId_referenceType_referenceId_idx"
  ON "JournalEntry"("shopId", "referenceType", "referenceId");
CREATE INDEX "JournalEntry_reversalOfId_idx"
  ON "JournalEntry"("reversalOfId");

CREATE INDEX "JournalLine_journalEntryId_idx"
  ON "JournalLine"("journalEntryId");
CREATE INDEX "JournalLine_accountId_idx"
  ON "JournalLine"("accountId");

ALTER TABLE "LedgerAccount"
  ADD CONSTRAINT "LedgerAccount_shopId_fkey"
  FOREIGN KEY ("shopId") REFERENCES "Shop"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "JournalEntry"
  ADD CONSTRAINT "JournalEntry_shopId_fkey"
  FOREIGN KEY ("shopId") REFERENCES "Shop"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "JournalEntry"
  ADD CONSTRAINT "JournalEntry_reversalOfId_fkey"
  FOREIGN KEY ("reversalOfId") REFERENCES "JournalEntry"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "JournalLine"
  ADD CONSTRAINT "JournalLine_journalEntryId_fkey"
  FOREIGN KEY ("journalEntryId") REFERENCES "JournalEntry"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "JournalLine"
  ADD CONSTRAINT "JournalLine_accountId_fkey"
  FOREIGN KEY ("accountId") REFERENCES "LedgerAccount"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- New invoice receipts retain the same transaction currency amount while also
-- recording the canonical NPR value and the exact conversion evidence.
ALTER TABLE "InvoicePayment"
  ADD COLUMN "canonicalAmountNpr" DECIMAL(24,4),
  ADD COLUMN "fxRate" DECIMAL(24,10),
  ADD COLUMN "fxSource" TEXT,
  ADD COLUMN "fxQuotedAt" TIMESTAMP(3);

UPDATE "InvoicePayment"
SET
  "canonicalAmountNpr" = "amount",
  "fxRate" = 1,
  "fxSource" = 'legacy-identity',
  "fxQuotedAt" = "receivedAt"
WHERE "currency" = 'NPR';

-- Seed the deterministic system chart for every existing shop. The same IDs
-- are generated by AccountingService for shops created after this migration.
INSERT INTO "LedgerAccount" (
  "id", "shopId", "code", "name", "type", "systemKey",
  "isSystem", "isActive", "createdAt", "updatedAt"
)
SELECT
  'acct_' || SUBSTRING(MD5(shop."id" || ':' || account."systemKey") FROM 1 FOR 24),
  shop."id",
  account."code",
  account."name",
  account."type"::"LedgerAccountType",
  account."systemKey"::"LedgerAccountKey",
  TRUE,
  TRUE,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "Shop" AS shop
CROSS JOIN (
  VALUES
    ('1000', 'Cash on Hand', 'ASSET', 'CASH_ON_HAND'),
    ('1010', 'Bank', 'ASSET', 'BANK'),
    ('1020', 'Payment Gateway Clearing', 'ASSET', 'GATEWAY_CLEARING'),
    ('1100', 'Accounts Receivable', 'ASSET', 'ACCOUNTS_RECEIVABLE'),
    ('2000', 'Customer Advances', 'LIABILITY', 'CUSTOMER_ADVANCES'),
    ('2100', 'Tax Payable', 'LIABILITY', 'TAX_PAYABLE'),
    ('2200', 'Platform Commission Payable', 'LIABILITY', 'PLATFORM_COMMISSION_PAYABLE'),
    ('4000', 'Sales Revenue', 'REVENUE', 'SALES_REVENUE'),
    ('4010', 'Sales Returns and Allowances', 'REVENUE', 'SALES_RETURNS'),
    ('5000', 'Platform Commission Expense', 'EXPENSE', 'PLATFORM_COMMISSION_EXPENSE')
) AS account("code", "name", "type", "systemKey")
ON CONFLICT ("shopId", "systemKey") DO NOTHING;

-- A line must use an account belonging to the same shop as its journal entry.
CREATE OR REPLACE FUNCTION ledger_assert_line_tenant()
RETURNS TRIGGER AS $$
DECLARE
  entry_shop TEXT;
  account_shop TEXT;
BEGIN
  SELECT "shopId" INTO entry_shop FROM "JournalEntry" WHERE "id" = NEW."journalEntryId";
  SELECT "shopId" INTO account_shop FROM "LedgerAccount" WHERE "id" = NEW."accountId";
  IF entry_shop IS NULL OR account_shop IS NULL OR entry_shop <> account_shop THEN
    RAISE EXCEPTION 'Journal line account and entry must belong to the same shop';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "JournalLine_tenant_guard"
BEFORE INSERT OR UPDATE ON "JournalLine"
FOR EACH ROW EXECUTE FUNCTION ledger_assert_line_tenant();

-- Both canonical NPR and transaction currency sides must balance exactly and
-- every posted journal requires at least two lines.
CREATE OR REPLACE FUNCTION ledger_assert_entry_balanced(entry_id TEXT)
RETURNS VOID AS $$
DECLARE
  line_count BIGINT;
  debit_npr DECIMAL(24,4);
  credit_npr DECIMAL(24,4);
  debit_tx DECIMAL(24,4);
  credit_tx DECIMAL(24,4);
  currency_count BIGINT;
  line_currency TEXT;
  header_currency TEXT;
  header_transaction_amount DECIMAL(24,4);
  header_canonical_amount DECIMAL(24,4);
BEGIN
  SELECT
    "transactionCurrency"::TEXT,
    "transactionAmount",
    "canonicalAmountNpr"
  INTO header_currency, header_transaction_amount, header_canonical_amount
  FROM "JournalEntry"
  WHERE "id" = entry_id;

  IF header_currency IS NULL THEN
    RAISE EXCEPTION 'Journal entry % does not exist', entry_id;
  END IF;

  SELECT
    COUNT(*),
    COALESCE(SUM("debitNpr"), 0),
    COALESCE(SUM("creditNpr"), 0),
    COALESCE(SUM("transactionDebit"), 0),
    COALESCE(SUM("transactionCredit"), 0),
    COUNT(DISTINCT "transactionCurrency"),
    MIN("transactionCurrency"::TEXT)
  INTO line_count, debit_npr, credit_npr, debit_tx, credit_tx, currency_count, line_currency
  FROM "JournalLine"
  WHERE "journalEntryId" = entry_id;

  IF line_count < 2
    OR debit_npr <> credit_npr
    OR debit_tx <> credit_tx
    OR currency_count <> 1
    OR line_currency <> header_currency
    OR debit_npr <> header_canonical_amount
    OR debit_tx <> header_transaction_amount
  THEN
    RAISE EXCEPTION 'Journal entry % is not balanced', entry_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Lines are mutable only while their parent is DRAFT. This closes the less
-- obvious append hole where an attacker could add a second balanced pair to a
-- journal that was already posted without changing the original rows.
CREATE OR REPLACE FUNCTION ledger_guard_line_mutation()
RETURNS TRIGGER AS $$
DECLARE
  old_parent_status "JournalEntryStatus";
  new_parent_status "JournalEntryStatus";
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    SELECT "status" INTO old_parent_status
    FROM "JournalEntry" WHERE "id" = OLD."journalEntryId";
    IF old_parent_status IS NULL THEN
      RAISE EXCEPTION 'Original journal entry % does not exist', OLD."journalEntryId";
    END IF;
    IF old_parent_status = 'POSTED' THEN
      RAISE EXCEPTION 'Posted journal lines are immutable; create a reversal entry';
    END IF;
  END IF;

  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    SELECT "status" INTO new_parent_status
    FROM "JournalEntry" WHERE "id" = NEW."journalEntryId";
    IF new_parent_status IS NULL THEN
      RAISE EXCEPTION 'Target journal entry % does not exist', NEW."journalEntryId";
    END IF;
    IF new_parent_status = 'POSTED' THEN
      RAISE EXCEPTION 'Posted journal lines are immutable; create a reversal entry';
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "JournalLine_mutation_guard"
BEFORE INSERT OR UPDATE OR DELETE ON "JournalLine"
FOR EACH ROW EXECUTE FUNCTION ledger_guard_line_mutation();

-- The sole permitted mutation is a balanced DRAFT becoming POSTED. The
-- header cannot be changed during that transition. Any later header mutation
-- is rejected; corrections are immutable compensating entries.
CREATE OR REPLACE FUNCTION ledger_guard_entry_mutation()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW."status" <> 'DRAFT' THEN
      RAISE EXCEPTION 'Journal entries must be inserted as DRAFT';
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    IF OLD."status" = 'POSTED' THEN
      RAISE EXCEPTION 'Posted journal entries are immutable; create a reversal entry';
    END IF;
    RETURN OLD;
  END IF;

  IF OLD."status" = 'POSTED' THEN
    RAISE EXCEPTION 'Posted journal entries are immutable; create a reversal entry';
  END IF;

  IF OLD."status" = 'DRAFT' AND NEW."status" = 'POSTED' THEN
    IF (TO_JSONB(OLD) - 'status') <> (TO_JSONB(NEW) - 'status') THEN
      RAISE EXCEPTION 'Only status may change while posting a draft journal';
    END IF;
    PERFORM ledger_assert_entry_balanced(NEW."id");
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Draft journal headers are immutable except for DRAFT to POSTED';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "JournalEntry_mutation_guard"
BEFORE INSERT OR UPDATE OR DELETE ON "JournalEntry"
FOR EACH ROW EXECUTE FUNCTION ledger_guard_entry_mutation();
