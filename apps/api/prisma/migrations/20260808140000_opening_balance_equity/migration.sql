-- Demo-ready opening balance equity + journal reference for shop opening balances.
-- Migration file only — apply with prisma migrate deploy after confirmation.
-- Account rows are created lazily by AccountingService.ensureDefaultAccounts.

ALTER TYPE "LedgerAccountKey" ADD VALUE 'OPENING_BALANCE_EQUITY';
ALTER TYPE "JournalReferenceType" ADD VALUE 'OPENING_BALANCE';
