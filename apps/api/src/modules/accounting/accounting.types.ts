import {
  CurrencyCode,
  JournalReferenceType,
  LedgerAccountKey,
  LedgerAccountType,
  Prisma,
} from "@prisma/client";

export const DEFAULT_LEDGER_ACCOUNTS: ReadonlyArray<{
  code: string;
  name: string;
  type: LedgerAccountType;
  systemKey: LedgerAccountKey;
}> = [
  { code: "1000", name: "Cash on Hand", type: LedgerAccountType.ASSET, systemKey: LedgerAccountKey.CASH_ON_HAND },
  { code: "1010", name: "Bank", type: LedgerAccountType.ASSET, systemKey: LedgerAccountKey.BANK },
  { code: "1020", name: "Payment Gateway Clearing", type: LedgerAccountType.ASSET, systemKey: LedgerAccountKey.GATEWAY_CLEARING },
  { code: "1100", name: "Accounts Receivable", type: LedgerAccountType.ASSET, systemKey: LedgerAccountKey.ACCOUNTS_RECEIVABLE },
  { code: "2000", name: "Customer Advances", type: LedgerAccountType.LIABILITY, systemKey: LedgerAccountKey.CUSTOMER_ADVANCES },
  { code: "2100", name: "Tax Payable", type: LedgerAccountType.LIABILITY, systemKey: LedgerAccountKey.TAX_PAYABLE },
  { code: "2200", name: "Platform Commission Payable", type: LedgerAccountType.LIABILITY, systemKey: LedgerAccountKey.PLATFORM_COMMISSION_PAYABLE },
  { code: "3000", name: "Opening Balance Equity", type: LedgerAccountType.EQUITY, systemKey: LedgerAccountKey.OPENING_BALANCE_EQUITY },
  { code: "4000", name: "Sales Revenue", type: LedgerAccountType.REVENUE, systemKey: LedgerAccountKey.SALES_REVENUE },
  { code: "4010", name: "Sales Returns and Allowances", type: LedgerAccountType.REVENUE, systemKey: LedgerAccountKey.SALES_RETURNS },
  { code: "5000", name: "Platform Commission Expense", type: LedgerAccountType.EXPENSE, systemKey: LedgerAccountKey.PLATFORM_COMMISSION_EXPENSE },
];

export interface MonetaryContext {
  transactionCurrency: CurrencyCode;
  transactionAmount: Prisma.Decimal;
  canonicalAmountNpr: Prisma.Decimal;
  fxRate: Prisma.Decimal;
  fxSource: string;
  fxQuotedAt: Date;
}

export interface JournalLineInput {
  accountKey?: LedgerAccountKey;
  accountId?: string;
  description?: string;
  debitNpr?: Prisma.Decimal.Value;
  creditNpr?: Prisma.Decimal.Value;
  transactionDebit?: Prisma.Decimal.Value;
  transactionCredit?: Prisma.Decimal.Value;
}

export interface PostJournalEntryInput extends MonetaryContext {
  shopId: string;
  referenceType: JournalReferenceType;
  referenceId: string;
  idempotencyKey: string;
  description: string;
  transactionDate: Date;
  actorUserId?: string | null;
  metadata?: Prisma.InputJsonValue;
  reversalOfId?: string;
  lines: JournalLineInput[];
}

export interface DateRange {
  from?: Date;
  to?: Date;
}
