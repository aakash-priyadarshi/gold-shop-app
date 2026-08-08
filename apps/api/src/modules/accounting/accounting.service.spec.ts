import { BadRequestException } from "@nestjs/common";
import {
  CurrencyCode,
  JournalEntryStatus,
  JournalReferenceType,
  LedgerAccountKey,
  Prisma,
} from "@prisma/client";
import { AccountingService } from "./accounting.service";
import { DEFAULT_LEDGER_ACCOUNTS } from "./accounting.types";

describe("AccountingService", () => {
  const ledgerAccountUpsert = jest.fn();
  const journalFindUnique = jest.fn();
  const journalCreate = jest.fn();
  const journalUpdate = jest.fn();
  const journalFindFirst = jest.fn();
  const tx = {
    ledgerAccount: { upsert: ledgerAccountUpsert },
    journalEntry: {
      findUnique: journalFindUnique,
      findFirst: journalFindFirst,
      create: journalCreate,
      update: journalUpdate,
    },
  } as any;
  const prisma = {} as any;
  const fxRates = { convertCurrency: jest.fn() };
  let service: AccountingService;

  const context = {
    transactionCurrency: CurrencyCode.LKR,
    transactionAmount: new Prisma.Decimal(250),
    canonicalAmountNpr: new Prisma.Decimal(100),
    fxRate: new Prisma.Decimal(0.4),
    fxSource: "provider-a",
    fxQuotedAt: new Date("2026-08-08T00:00:00Z"),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AccountingService(prisma, fxRates as any);
    journalFindUnique.mockResolvedValue(null);
    ledgerAccountUpsert.mockImplementation(({ create }: any) =>
      Promise.resolve(create),
    );
    journalCreate.mockResolvedValue({ id: "journal-1" });
    journalUpdate.mockResolvedValue({
      id: "journal-1",
      status: JournalEntryStatus.POSTED,
      lines: [],
    });
  });

  it("creates lines under DRAFT and performs one DRAFT to POSTED transition", async () => {
    await service.postEntry(tx, {
      ...context,
      shopId: "shop-1",
      referenceType: JournalReferenceType.ORDER_PAYMENT,
      referenceId: "payment-1",
      idempotencyKey: "order-payment:payment-1",
      description: "Settlement",
      transactionDate: new Date(),
      lines: [
        {
          accountKey: LedgerAccountKey.GATEWAY_CLEARING,
          debitNpr: 100,
          transactionDebit: 250,
        },
        {
          accountKey: LedgerAccountKey.CUSTOMER_ADVANCES,
          creditNpr: 100,
          transactionCredit: 250,
        },
      ],
    });

    expect(ledgerAccountUpsert).toHaveBeenCalledTimes(
      DEFAULT_LEDGER_ACCOUNTS.length,
    );
    expect(journalCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: JournalEntryStatus.DRAFT,
          transactionCurrency: CurrencyCode.LKR,
          transactionAmount: new Prisma.Decimal(250),
          canonicalAmountNpr: new Prisma.Decimal(100),
          lines: { create: expect.any(Array) },
        }),
      }),
    );
    expect(journalUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "journal-1" },
        data: { status: JournalEntryStatus.POSTED },
      }),
    );
  });

  it("rejects unbalanced debits and credits before a journal is inserted", async () => {
    await expect(
      service.postEntry(tx, {
        ...context,
        shopId: "shop-1",
        referenceType: JournalReferenceType.ORDER_PAYMENT,
        referenceId: "payment-unbalanced",
        idempotencyKey: "order-payment:unbalanced",
        description: "Bad settlement",
        transactionDate: new Date(),
        lines: [
          {
            accountKey: LedgerAccountKey.GATEWAY_CLEARING,
            debitNpr: 100,
            transactionDebit: 250,
          },
          {
            accountKey: LedgerAccountKey.CUSTOMER_ADVANCES,
            creditNpr: 99,
            transactionCredit: 250,
          },
        ],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(journalCreate).not.toHaveBeenCalled();
  });

  it("rejects a balanced line set whose totals do not match the header", async () => {
    await expect(
      service.postEntry(tx, {
        ...context,
        shopId: "shop-1",
        referenceType: JournalReferenceType.ORDER_PAYMENT,
        referenceId: "payment-header-mismatch",
        idempotencyKey: "order-payment:header-mismatch",
        description: "Header mismatch",
        transactionDate: new Date(),
        lines: [
          {
            accountKey: LedgerAccountKey.GATEWAY_CLEARING,
            debitNpr: 90,
            transactionDebit: 225,
          },
          {
            accountKey: LedgerAccountKey.CUSTOMER_ADVANCES,
            creditNpr: 90,
            transactionCredit: 225,
          },
        ],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("returns the original source event on an idempotent replay", async () => {
    journalFindUnique.mockResolvedValueOnce({
      id: "existing",
      referenceType: JournalReferenceType.ORDER_PAYMENT,
      referenceId: "payment-1",
      status: JournalEntryStatus.POSTED,
      lines: [],
    });
    const result = await service.postEntry(tx, {
      ...context,
      shopId: "shop-1",
      referenceType: JournalReferenceType.ORDER_PAYMENT,
      referenceId: "payment-1",
      idempotencyKey: "order-payment:payment-1",
      description: "Replay",
      transactionDate: new Date(),
      lines: [
        {
          accountKey: LedgerAccountKey.GATEWAY_CLEARING,
          debitNpr: 100,
          transactionDebit: 250,
        },
        {
          accountKey: LedgerAccountKey.CUSTOMER_ADVANCES,
          creditNpr: 100,
          transactionCredit: 250,
        },
      ],
    });
    expect(result.idempotent).toBe(true);
    expect(journalCreate).not.toHaveBeenCalled();
  });

  it("preserves supplied multi-currency amount and FX evidence", async () => {
    const result = await service.prepareMonetaryContext(250, CurrencyCode.LKR, {
      canonicalAmountNpr: 100,
      fxRate: 0.4,
      fxSource: "stripe-settlement-quote",
      fxQuotedAt: new Date("2026-08-08T00:00:00Z"),
    });
    expect(result.transactionAmount.toFixed(4)).toBe("250.0000");
    expect(result.canonicalAmountNpr.toFixed(4)).toBe("100.0000");
    expect(result.fxRate.toFixed(10)).toBe("0.4000000000");
    expect(result.fxSource).toBe("stripe-settlement-quote");
    expect(fxRates.convertCurrency).not.toHaveBeenCalled();
  });

  it("builds invoice issuance as AR debit, revenue and tax credits", async () => {
    const post = jest.spyOn(service, "postEntry").mockResolvedValue({
      entry: {},
      idempotent: false,
    });
    await service.postInvoiceIssuance(tx, {
      ...context,
      shopId: "shop-1",
      invoiceId: "invoice-1",
      invoiceNumber: "INV-1",
      taxAmount: 50,
      transactionDate: new Date(),
    });
    const input = post.mock.calls[0][1];
    expect(input.referenceId).toBe("invoice-1");
    expect(input.lines.map((line) => line.accountKey)).toEqual([
      LedgerAccountKey.ACCOUNTS_RECEIVABLE,
      LedgerAccountKey.SALES_REVENUE,
      LedgerAccountKey.TAX_PAYABLE,
    ]);
  });

  it("builds receipts, order advances, refunds and commission accruals without early sales revenue", async () => {
    const post = jest.spyOn(service, "postEntry").mockResolvedValue({
      entry: {},
      idempotent: false,
    });
    await service.postInvoicePayment(tx, {
      ...context,
      shopId: "shop-1",
      invoicePaymentId: "invoice-payment-1",
      invoiceNumber: "INV-1",
      method: "STRIPE",
      transactionDate: new Date(),
    });
    await service.postOrderPayment(tx, {
      ...context,
      shopId: "shop-1",
      orderId: "order-1",
      paymentReferenceId: "payment-1",
      orderNumber: "ORD-1",
      method: "STRIPE",
      transactionDate: new Date(),
    });
    await service.postOrderRefund(tx, {
      ...context,
      shopId: "shop-1",
      orderId: "order-1",
      refundReferenceId: "refund-1",
      orderNumber: "ORD-1",
      method: "STRIPE",
      transactionDate: new Date(),
    });
    await service.postCommissionAccrual(tx, {
      ...context,
      shopId: "shop-1",
      commissionId: "commission-1",
      orderNumber: "ORD-1",
      transactionDate: new Date(),
    });

    const orderSettlement = post.mock.calls[1][1];
    expect(orderSettlement.referenceId).toBe("payment-1");
    expect(orderSettlement.lines.map((line) => line.accountKey)).toEqual([
      LedgerAccountKey.GATEWAY_CLEARING,
      LedgerAccountKey.CUSTOMER_ADVANCES,
    ]);
    expect(
      orderSettlement.lines.some(
        (line) => line.accountKey === LedgerAccountKey.SALES_REVENUE,
      ),
    ).toBe(false);
    expect(post.mock.calls[2][1].referenceId).toBe("refund-1");
    expect(post.mock.calls[3][1].referenceId).toBe("commission-1");
  });

  it("creates an immutable compensating reversal with the sides swapped", async () => {
    journalFindFirst.mockResolvedValue({
      id: "journal-original",
      entryNumber: "JE-ORIGINAL",
      description: "Original",
      transactionCurrency: CurrencyCode.NPR,
      transactionAmount: new Prisma.Decimal(100),
      canonicalAmountNpr: new Prisma.Decimal(100),
      fxRate: new Prisma.Decimal(1),
      fxSource: "identity",
      fxQuotedAt: new Date(),
      reversedBy: null,
      lines: [
        {
          account: { systemKey: LedgerAccountKey.CASH_ON_HAND },
          debitNpr: new Prisma.Decimal(100),
          creditNpr: new Prisma.Decimal(0),
          transactionDebit: new Prisma.Decimal(100),
          transactionCredit: new Prisma.Decimal(0),
          description: null,
        },
        {
          account: { systemKey: LedgerAccountKey.ACCOUNTS_RECEIVABLE },
          debitNpr: new Prisma.Decimal(0),
          creditNpr: new Prisma.Decimal(100),
          transactionDebit: new Prisma.Decimal(0),
          transactionCredit: new Prisma.Decimal(100),
          description: null,
        },
      ],
    });
    const post = jest.spyOn(service, "postEntry").mockResolvedValue({
      entry: {},
      idempotent: false,
    });
    await service.reverseEntry(tx, {
      shopId: "shop-1",
      originalEntryId: "journal-original",
      reason: "Correction",
    });
    const reversal = post.mock.calls[0][1];
    expect(reversal.reversalOfId).toBe("journal-original");
    expect(new Prisma.Decimal(reversal.lines[0].creditNpr || 0).toFixed(4)).toBe(
      "100.0000",
    );
    expect(new Prisma.Decimal(reversal.lines[1].debitNpr || 0).toFixed(4)).toBe(
      "100.0000",
    );
  });
});
