import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  CurrencyCode,
  JournalEntryStatus,
  JournalReferenceType,
  LedgerAccountKey,
  LedgerAccountType,
  Prisma,
} from "@prisma/client";
import { createHash, randomUUID } from "crypto";
import { PrismaService } from "../../prisma/prisma.service";
import { FxRatesService } from "../fx-rates/fx-rates.service";
import {
  DateRange,
  DEFAULT_LEDGER_ACCOUNTS,
  MonetaryContext,
  PostJournalEntryInput,
} from "./accounting.types";

type DbClient = Prisma.TransactionClient | PrismaService;

@Injectable()
export class AccountingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fxRates: FxRatesService,
  ) {}

  private money(value: Prisma.Decimal.Value): Prisma.Decimal {
    const amount = new Prisma.Decimal(value).toDecimalPlaces(4);
    if (!amount.isFinite()) {
      throw new BadRequestException("Ledger amount must be finite");
    }
    return amount;
  }

  private deterministicAccountId(
    shopId: string,
    key: LedgerAccountKey,
  ): string {
    const hash = createHash("md5").update(`${shopId}:${key}`).digest("hex");
    return `acct_${hash.slice(0, 24)}`;
  }

  private dateWhere(range: DateRange) {
    if (!range.from && !range.to) return undefined;
    return {
      ...(range.from ? { gte: range.from } : {}),
      ...(range.to ? { lte: range.to } : {}),
    };
  }

  async prepareMonetaryContext(
    transactionAmount: Prisma.Decimal.Value,
    transactionCurrency: CurrencyCode,
    supplied?: {
      canonicalAmountNpr: Prisma.Decimal.Value;
      fxRate: Prisma.Decimal.Value;
      fxSource: string;
      fxQuotedAt: Date;
    },
  ): Promise<MonetaryContext> {
    const amount = this.money(transactionAmount);
    if (amount.lte(0)) {
      throw new BadRequestException("Ledger transaction amount must be positive");
    }

    if (supplied) {
      const canonical = this.money(supplied.canonicalAmountNpr);
      const rate = new Prisma.Decimal(supplied.fxRate).toDecimalPlaces(10);
      if (
        canonical.lte(0) ||
        !rate.isFinite() ||
        rate.lte(0) ||
        !supplied.fxSource?.trim() ||
        !Number.isFinite(supplied.fxQuotedAt.getTime())
      ) {
        throw new BadRequestException("Invalid ledger FX audit context");
      }
      return {
        transactionCurrency,
        transactionAmount: amount,
        canonicalAmountNpr: canonical,
        fxRate: rate,
        fxSource: supplied.fxSource,
        fxQuotedAt: supplied.fxQuotedAt,
      };
    }

    if (transactionCurrency === CurrencyCode.NPR) {
      return {
        transactionCurrency,
        transactionAmount: amount,
        canonicalAmountNpr: amount,
        fxRate: new Prisma.Decimal(1),
        fxSource: "identity",
        fxQuotedAt: new Date(),
      };
    }

    const quote = await this.fxRates.convertCurrency(
      amount.toNumber(),
      transactionCurrency as any,
      CurrencyCode.NPR as any,
    );
    const canonical = this.money(quote.amount);
    const rate = new Prisma.Decimal(quote.rate).toDecimalPlaces(10);
    const quotedAt = new Date(quote.quotedAt);
    if (
      canonical.lte(0) ||
      !rate.isFinite() ||
      rate.lte(0) ||
      !quote.source?.trim() ||
      !Number.isFinite(quotedAt.getTime())
    ) {
      throw new BadRequestException("Unable to establish a valid NPR ledger value");
    }
    return {
      transactionCurrency,
      transactionAmount: amount,
      canonicalAmountNpr: canonical,
      fxRate: rate,
      fxSource: quote.source,
      fxQuotedAt: quotedAt,
    };
  }

  async ensureDefaultAccounts(
    client: DbClient,
    shopId: string,
  ): Promise<Map<LedgerAccountKey, string>> {
    const accounts = await Promise.all(
      DEFAULT_LEDGER_ACCOUNTS.map((account) =>
        client.ledgerAccount.upsert({
          where: {
            shopId_systemKey: { shopId, systemKey: account.systemKey },
          },
          update: {
            code: account.code,
            name: account.name,
            type: account.type,
            isSystem: true,
            isActive: true,
          },
          create: {
            id: this.deterministicAccountId(shopId, account.systemKey),
            shopId,
            ...account,
            isSystem: true,
          },
        }),
      ),
    );
    return new Map(accounts.map((account) => [account.systemKey!, account.id]));
  }

  async postEntry(
    tx: Prisma.TransactionClient,
    input: PostJournalEntryInput,
  ): Promise<{ entry: any; idempotent: boolean }> {
    if (input.lines.length < 2) {
      throw new BadRequestException("A journal entry requires at least two lines");
    }
    if (!input.idempotencyKey.trim() || !input.referenceId.trim()) {
      throw new BadRequestException(
        "Journal reference and idempotency key are required",
      );
    }
    if (input.transactionCurrency === undefined) {
      throw new BadRequestException("Transaction currency is required");
    }

    const existingByReference = await tx.journalEntry.findUnique({
      where: {
        shopId_referenceType_referenceId: {
          shopId: input.shopId,
          referenceType: input.referenceType,
          referenceId: input.referenceId,
        },
      },
      include: { lines: true },
    });
    if (existingByReference) {
      if (existingByReference.status !== JournalEntryStatus.POSTED) {
        throw new BadRequestException(
          "A draft journal already exists for this source event",
        );
      }
      return { entry: existingByReference, idempotent: true };
    }
    const existingByKey = await tx.journalEntry.findUnique({
      where: {
        shopId_idempotencyKey: {
          shopId: input.shopId,
          idempotencyKey: input.idempotencyKey,
        },
      },
      include: { lines: true },
    });
    if (existingByKey) {
      if (
        existingByKey.referenceType !== input.referenceType ||
        existingByKey.referenceId !== input.referenceId
      ) {
        throw new BadRequestException(
          "Ledger idempotency key is associated with another reference",
        );
      }
      if (existingByKey.status !== JournalEntryStatus.POSTED) {
        throw new BadRequestException(
          "A draft journal already exists for this idempotency key",
        );
      }
      return { entry: existingByKey, idempotent: true };
    }

    const accounts = await this.ensureDefaultAccounts(tx, input.shopId);
    let debitNpr = new Prisma.Decimal(0);
    let creditNpr = new Prisma.Decimal(0);
    let debitTransaction = new Prisma.Decimal(0);
    let creditTransaction = new Prisma.Decimal(0);

    const lines = input.lines.map((line) => {
      const dn = this.money(line.debitNpr || 0);
      const cn = this.money(line.creditNpr || 0);
      const dt = this.money(line.transactionDebit || 0);
      const ct = this.money(line.transactionCredit || 0);
      if (!((dn.gt(0) && cn.isZero()) || (cn.gt(0) && dn.isZero()))) {
        throw new BadRequestException(
          "Every journal line must contain one positive NPR debit or credit",
        );
      }
      if (!((dt.gt(0) && ct.isZero()) || (ct.gt(0) && dt.isZero()))) {
        throw new BadRequestException(
          "Every journal line must contain one positive transaction debit or credit",
        );
      }
      if ((dn.gt(0)) !== (dt.gt(0))) {
        throw new BadRequestException(
          "Canonical and transaction amounts must use the same journal side",
        );
      }
      const accountId = line.accountId ||
        (line.accountKey ? accounts.get(line.accountKey) : undefined);
      if (!accountId) {
        throw new BadRequestException(
          `Missing ledger account ${line.accountKey || line.accountId || "unknown"}`,
        );
      }
      debitNpr = debitNpr.plus(dn);
      creditNpr = creditNpr.plus(cn);
      debitTransaction = debitTransaction.plus(dt);
      creditTransaction = creditTransaction.plus(ct);
      return {
        accountId,
        description: line.description || null,
        debitNpr: dn,
        creditNpr: cn,
        transactionDebit: dt,
        transactionCredit: ct,
        transactionCurrency: input.transactionCurrency,
      };
    });

    if (!debitNpr.eq(creditNpr) || !debitTransaction.eq(creditTransaction)) {
      throw new BadRequestException("Journal entry debits and credits must balance");
    }
    const canonicalAmount = this.money(input.canonicalAmountNpr);
    const transactionAmount = this.money(input.transactionAmount);
    if (!debitNpr.eq(canonicalAmount) || !debitTransaction.eq(transactionAmount)) {
      throw new BadRequestException(
        "Journal header amounts must match the balanced line totals",
      );
    }
    const fxRate = new Prisma.Decimal(input.fxRate).toDecimalPlaces(10);
    if (
      canonicalAmount.lte(0) ||
      transactionAmount.lte(0) ||
      !fxRate.isFinite() ||
      fxRate.lte(0) ||
      !input.fxSource.trim() ||
      !Number.isFinite(input.fxQuotedAt.getTime())
    ) {
      throw new BadRequestException("Invalid journal monetary audit fields");
    }

    const id = randomUUID();
    const draft = await tx.journalEntry.create({
      data: {
        id,
        shopId: input.shopId,
        status: JournalEntryStatus.DRAFT,
        entryNumber: `JE-${id.replace(/-/g, "").slice(0, 20).toUpperCase()}`,
        referenceType: input.referenceType,
        referenceId: input.referenceId,
        idempotencyKey: input.idempotencyKey,
        description: input.description,
        transactionDate: input.transactionDate,
        canonicalCurrency: CurrencyCode.NPR,
        transactionCurrency: input.transactionCurrency,
        transactionAmount,
        canonicalAmountNpr: canonicalAmount,
        fxRate,
        fxSource: input.fxSource,
        fxQuotedAt: input.fxQuotedAt,
        actorUserId: input.actorUserId || null,
        metadata: input.metadata,
        reversalOfId: input.reversalOfId,
        lines: { create: lines },
      },
    });
    const entry = await tx.journalEntry.update({
      where: { id: draft.id },
      data: { status: JournalEntryStatus.POSTED },
      include: { lines: { include: { account: true } } },
    });
    return { entry, idempotent: false };
  }

  async postInvoiceIssuance(
    tx: Prisma.TransactionClient,
    input: MonetaryContext & {
      shopId: string;
      invoiceId: string;
      invoiceNumber: string;
      taxAmount: Prisma.Decimal.Value;
      transactionDate: Date;
      actorUserId?: string;
    },
  ) {
    const taxTransaction = this.money(input.taxAmount);
    if (taxTransaction.lt(0) || taxTransaction.gt(input.transactionAmount)) {
      throw new BadRequestException("Invoice tax amount is invalid");
    }
    const revenueTransaction = input.transactionAmount.minus(taxTransaction);
    const taxNpr = input.transactionAmount.isZero()
      ? new Prisma.Decimal(0)
      : input.canonicalAmountNpr
          .mul(taxTransaction)
          .div(input.transactionAmount)
          .toDecimalPlaces(4);
    const revenueNpr = input.canonicalAmountNpr.minus(taxNpr);

    const lines: PostJournalEntryInput["lines"] = [
      {
        accountKey: LedgerAccountKey.ACCOUNTS_RECEIVABLE,
        debitNpr: input.canonicalAmountNpr,
        transactionDebit: input.transactionAmount,
        description: `Invoice ${input.invoiceNumber}`,
      },
    ];
    if (revenueTransaction.gt(0)) {
      lines.push({
        accountKey: LedgerAccountKey.SALES_REVENUE,
        creditNpr: revenueNpr,
        transactionCredit: revenueTransaction,
        description: "Net sales revenue",
      });
    }
    if (taxTransaction.gt(0)) {
      lines.push({
        accountKey: LedgerAccountKey.TAX_PAYABLE,
        creditNpr: taxNpr,
        transactionCredit: taxTransaction,
        description: "Output tax payable",
      });
    }
    return this.postEntry(tx, {
      ...input,
      referenceType: JournalReferenceType.INVOICE_ISSUED,
      referenceId: input.invoiceId,
      idempotencyKey: `invoice-issued:${input.invoiceId}`,
      description: `Issue invoice ${input.invoiceNumber}`,
      lines,
    });
  }

  async postInvoicePayment(
    tx: Prisma.TransactionClient,
    input: MonetaryContext & {
      shopId: string;
      invoicePaymentId: string;
      invoiceNumber: string;
      method: string;
      transactionDate: Date;
      actorUserId?: string;
    },
  ) {
    return this.postEntry(tx, {
      ...input,
      referenceType: JournalReferenceType.INVOICE_PAYMENT,
      referenceId: input.invoicePaymentId,
      idempotencyKey: `invoice-payment:${input.invoicePaymentId}`,
      description: `Receive payment for invoice ${input.invoiceNumber}`,
      lines: [
        {
          accountKey: this.receiptAccount(input.method),
          debitNpr: input.canonicalAmountNpr,
          transactionDebit: input.transactionAmount,
        },
        {
          accountKey: LedgerAccountKey.ACCOUNTS_RECEIVABLE,
          creditNpr: input.canonicalAmountNpr,
          transactionCredit: input.transactionAmount,
        },
      ],
    });
  }

  async postOrderPayment(
    tx: Prisma.TransactionClient,
    input: MonetaryContext & {
      shopId: string;
      orderId: string;
      paymentReferenceId: string;
      orderNumber: string;
      method: string;
      transactionDate: Date;
      actorUserId?: string;
    },
  ) {
    return this.postEntry(tx, {
      ...input,
      referenceType: JournalReferenceType.ORDER_PAYMENT,
      referenceId: input.paymentReferenceId,
      idempotencyKey: `order-payment:${input.paymentReferenceId}`,
      description: `Customer advance received for order ${input.orderNumber}`,
      metadata: { orderId: input.orderId, orderNumber: input.orderNumber },
      lines: [
        {
          accountKey: this.receiptAccount(input.method),
          debitNpr: input.canonicalAmountNpr,
          transactionDebit: input.transactionAmount,
        },
        {
          accountKey: LedgerAccountKey.CUSTOMER_ADVANCES,
          creditNpr: input.canonicalAmountNpr,
          transactionCredit: input.transactionAmount,
        },
      ],
    });
  }

  async postOrderAdvanceApplied(
    tx: Prisma.TransactionClient,
    input: MonetaryContext & {
      shopId: string;
      orderId: string;
      invoiceId: string;
      invoiceNumber: string;
      orderNumber: string;
      transactionDate: Date;
    },
  ) {
    return this.postEntry(tx, {
      ...input,
      referenceType: JournalReferenceType.ORDER_ADVANCE_APPLIED,
      referenceId: input.invoiceId,
      idempotencyKey: `order-advance-applied:${input.invoiceId}`,
      description: `Apply order ${input.orderNumber} advance to invoice ${input.invoiceNumber}`,
      metadata: {
        orderId: input.orderId,
        invoiceId: input.invoiceId,
        orderNumber: input.orderNumber,
      },
      lines: [
        {
          accountKey: LedgerAccountKey.CUSTOMER_ADVANCES,
          debitNpr: input.canonicalAmountNpr,
          transactionDebit: input.transactionAmount,
        },
        {
          accountKey: LedgerAccountKey.ACCOUNTS_RECEIVABLE,
          creditNpr: input.canonicalAmountNpr,
          transactionCredit: input.transactionAmount,
        },
      ],
    });
  }

  async postOrderRefund(
    tx: Prisma.TransactionClient,
    input: MonetaryContext & {
      shopId: string;
      orderId: string;
      refundReferenceId: string;
      orderNumber: string;
      method: string;
      transactionDate: Date;
      invoicedTaxRatio?: Prisma.Decimal.Value;
      actorUserId?: string;
    },
  ) {
    const taxRatio = new Prisma.Decimal(input.invoicedTaxRatio || 0);
    if (!taxRatio.isFinite() || taxRatio.lt(0) || taxRatio.gt(1)) {
      throw new BadRequestException("Refund tax ratio must be between zero and one");
    }
    const taxNpr = input.canonicalAmountNpr.mul(taxRatio).toDecimalPlaces(4);
    const netNpr = input.canonicalAmountNpr.minus(taxNpr);
    const taxTransaction = input.transactionAmount
      .mul(taxRatio)
      .toDecimalPlaces(4);
    const netTransaction = input.transactionAmount.minus(taxTransaction);
    const lines: PostJournalEntryInput["lines"] = [];
    if (input.invoicedTaxRatio !== undefined) {
      if (netNpr.gt(0)) {
        lines.push({
          accountKey: LedgerAccountKey.SALES_RETURNS,
          debitNpr: netNpr,
          transactionDebit: netTransaction,
        });
      }
      if (taxNpr.gt(0)) {
        lines.push({
          accountKey: LedgerAccountKey.TAX_PAYABLE,
          debitNpr: taxNpr,
          transactionDebit: taxTransaction,
        });
      }
    } else {
      lines.push({
        accountKey: LedgerAccountKey.CUSTOMER_ADVANCES,
        debitNpr: input.canonicalAmountNpr,
        transactionDebit: input.transactionAmount,
      });
    }
    lines.push({
      accountKey: this.receiptAccount(input.method),
      creditNpr: input.canonicalAmountNpr,
      transactionCredit: input.transactionAmount,
    });
    return this.postEntry(tx, {
      ...input,
      referenceType: JournalReferenceType.ORDER_REFUND,
      referenceId: input.refundReferenceId,
      idempotencyKey: `order-refund:${input.refundReferenceId}`,
      description: `Refund for order ${input.orderNumber}`,
      metadata: { orderId: input.orderId, orderNumber: input.orderNumber },
      lines,
    });
  }

  async postCommissionAccrual(
    tx: Prisma.TransactionClient,
    input: MonetaryContext & {
      shopId: string;
      commissionId: string;
      orderNumber: string;
      transactionDate: Date;
    },
  ) {
    return this.postEntry(tx, {
      ...input,
      referenceType: JournalReferenceType.COMMISSION_ACCRUAL,
      referenceId: input.commissionId,
      idempotencyKey: `commission-accrual:${input.commissionId}`,
      description: `Platform commission for order ${input.orderNumber}`,
      lines: [
        {
          accountKey: LedgerAccountKey.PLATFORM_COMMISSION_EXPENSE,
          debitNpr: input.canonicalAmountNpr,
          transactionDebit: input.transactionAmount,
        },
        {
          accountKey: LedgerAccountKey.PLATFORM_COMMISSION_PAYABLE,
          creditNpr: input.canonicalAmountNpr,
          transactionCredit: input.transactionAmount,
        },
      ],
    });
  }

  async postCommissionPayment(
    tx: Prisma.TransactionClient,
    input: MonetaryContext & {
      shopId: string;
      commissionId: string;
      transactionDate: Date;
      actorUserId?: string;
    },
  ) {
    return this.postEntry(tx, {
      ...input,
      referenceType: JournalReferenceType.COMMISSION_PAYMENT,
      referenceId: input.commissionId,
      idempotencyKey: `commission-payment:${input.commissionId}`,
      description: "Platform commission paid",
      lines: [
        {
          accountKey: LedgerAccountKey.PLATFORM_COMMISSION_PAYABLE,
          debitNpr: input.canonicalAmountNpr,
          transactionDebit: input.transactionAmount,
        },
        {
          accountKey: LedgerAccountKey.BANK,
          creditNpr: input.canonicalAmountNpr,
          transactionCredit: input.transactionAmount,
        },
      ],
    });
  }

  async postCommissionRefundAdjustment(
    tx: Prisma.TransactionClient,
    input: MonetaryContext & {
      shopId: string;
      refundReferenceId: string;
      orderNumber: string;
      transactionDate: Date;
      actorUserId?: string;
    },
  ) {
    return this.postEntry(tx, {
      ...input,
      referenceType: JournalReferenceType.COMMISSION_REFUND_ADJUSTMENT,
      referenceId: input.refundReferenceId,
      idempotencyKey: `commission-refund-adjustment:${input.refundReferenceId}`,
      description: `Commission adjustment for refund on order ${input.orderNumber}`,
      lines: [
        {
          accountKey: LedgerAccountKey.PLATFORM_COMMISSION_PAYABLE,
          debitNpr: input.canonicalAmountNpr,
          transactionDebit: input.transactionAmount,
        },
        {
          accountKey: LedgerAccountKey.PLATFORM_COMMISSION_EXPENSE,
          creditNpr: input.canonicalAmountNpr,
          transactionCredit: input.transactionAmount,
        },
      ],
    });
  }

  async reverseEntry(
    tx: Prisma.TransactionClient,
    input: {
      shopId: string;
      originalEntryId: string;
      referenceType?: JournalReferenceType;
      referenceId?: string;
      reason: string;
      actorUserId?: string;
      transactionDate?: Date;
    },
  ) {
    const original = await tx.journalEntry.findFirst({
      where: {
        id: input.originalEntryId,
        shopId: input.shopId,
        status: JournalEntryStatus.POSTED,
      },
      include: { lines: { include: { account: true } }, reversedBy: true },
    });
    if (!original) throw new NotFoundException("Journal entry not found");
    if (original.reversedBy) {
      return { entry: original.reversedBy, idempotent: true };
    }
    return this.postEntry(tx, {
      shopId: input.shopId,
      referenceType: input.referenceType || JournalReferenceType.REVERSAL,
      referenceId: input.referenceId || original.id,
      idempotencyKey: `journal-reversal:${original.id}`,
      description: `Reversal of ${original.entryNumber}: ${input.reason}`,
      transactionDate: input.transactionDate || new Date(),
      transactionCurrency: original.transactionCurrency,
      transactionAmount: original.transactionAmount,
      canonicalAmountNpr: original.canonicalAmountNpr,
      fxRate: original.fxRate,
      fxSource: original.fxSource,
      fxQuotedAt: original.fxQuotedAt,
      actorUserId: input.actorUserId,
      reversalOfId: original.id,
      metadata: { reason: input.reason, originalEntryNumber: original.entryNumber },
      lines: original.lines.map((line) => ({
        accountId: line.accountId,
        description: `Reversal: ${line.description || original.description}`,
        debitNpr: line.creditNpr,
        creditNpr: line.debitNpr,
        transactionDebit: line.transactionCredit,
        transactionCredit: line.transactionDebit,
      })),
    });
  }

  async reverseReference(
    tx: Prisma.TransactionClient,
    input: {
      shopId: string;
      originalReferenceType: JournalReferenceType;
      originalReferenceId: string;
      reversalReferenceType: JournalReferenceType;
      reversalReferenceId: string;
      reason: string;
      actorUserId?: string;
    },
  ) {
    const original = await tx.journalEntry.findUnique({
      where: {
        shopId_referenceType_referenceId: {
          shopId: input.shopId,
          referenceType: input.originalReferenceType,
          referenceId: input.originalReferenceId,
        },
      },
    });
    if (!original) return null;
    return this.reverseEntry(tx, {
      shopId: input.shopId,
      originalEntryId: original.id,
      referenceType: input.reversalReferenceType,
      referenceId: input.reversalReferenceId,
      reason: input.reason,
      actorUserId: input.actorUserId,
    });
  }

  private receiptAccount(method: string): LedgerAccountKey {
    const normalized = method.trim().toUpperCase();
    if (normalized === "CASH" || normalized === "PAID_AT_SHOP") {
      return LedgerAccountKey.CASH_ON_HAND;
    }
    if (normalized === "BANK_TRANSFER" || normalized === "BANK") {
      return LedgerAccountKey.BANK;
    }
    return LedgerAccountKey.GATEWAY_CLEARING;
  }

  async getChartOfAccounts(shopId: string, range: DateRange = {}) {
    await this.ensureDefaultAccounts(this.prisma, shopId);
    const accounts = await this.prisma.ledgerAccount.findMany({
      where: { shopId },
      orderBy: { code: "asc" },
    });
    const totals = await this.prisma.journalLine.groupBy({
      by: ["accountId"],
      where: {
        account: { shopId },
        ...(this.dateWhere(range)
          ? {
              journalEntry: {
                status: JournalEntryStatus.POSTED,
                transactionDate: this.dateWhere(range),
              },
            }
          : { journalEntry: { status: JournalEntryStatus.POSTED } }),
      },
      _sum: { debitNpr: true, creditNpr: true },
    });
    const byAccount = new Map(totals.map((row) => [row.accountId, row._sum]));
    return accounts.map((account) => {
      const sum = byAccount.get(account.id);
      const debit = sum?.debitNpr || new Prisma.Decimal(0);
      const credit = sum?.creditNpr || new Prisma.Decimal(0);
      const debitNormal =
        account.type === LedgerAccountType.ASSET ||
        account.type === LedgerAccountType.EXPENSE;
      const balance = debitNormal ? debit.minus(credit) : credit.minus(debit);
      return {
        ...account,
        debitNpr: debit.toFixed(4),
        creditNpr: credit.toFixed(4),
        balanceNpr: balance.toFixed(4),
      };
    });
  }

  async getTrialBalance(shopId: string, range: DateRange = {}) {
    const accounts = await this.getChartOfAccounts(shopId, range);
    const debit = accounts.reduce(
      (sum, account) => sum.plus(account.debitNpr),
      new Prisma.Decimal(0),
    );
    const credit = accounts.reduce(
      (sum, account) => sum.plus(account.creditNpr),
      new Prisma.Decimal(0),
    );
    return {
      canonicalCurrency: CurrencyCode.NPR,
      from: range.from || null,
      to: range.to || null,
      accounts,
      totalDebitNpr: debit.toFixed(4),
      totalCreditNpr: credit.toFixed(4),
      balanced: debit.eq(credit),
    };
  }

  async getShopLedger(
    shopId: string,
    options: DateRange & { page?: number; limit?: number } = {},
  ) {
    const page =
      Number.isInteger(options.page) && (options.page || 0) > 0
        ? options.page!
        : 1;
    const limit =
      Number.isInteger(options.limit) && (options.limit || 0) > 0
        ? Math.min(100, options.limit!)
        : 25;
    const where = {
      shopId,
      status: JournalEntryStatus.POSTED,
      ...(this.dateWhere(options)
        ? { transactionDate: this.dateWhere(options) }
        : {}),
    };
    const [entries, total] = await Promise.all([
      this.prisma.journalEntry.findMany({
        where,
        include: {
          lines: { include: { account: true }, orderBy: { createdAt: "asc" } },
        },
        orderBy: [{ transactionDate: "desc" }, { createdAt: "desc" }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.journalEntry.count({ where }),
    ]);
    return { entries, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async getGeneralLedger(
    shopId: string,
    options: DateRange & { accountId?: string; page?: number; limit?: number } = {},
  ) {
    const page =
      Number.isInteger(options.page) && (options.page || 0) > 0
        ? options.page!
        : 1;
    const limit =
      Number.isInteger(options.limit) && (options.limit || 0) > 0
        ? Math.min(200, options.limit!)
        : 50;
    const where = {
      account: { shopId },
      ...(options.accountId ? { accountId: options.accountId } : {}),
      ...(this.dateWhere(options)
        ? {
            journalEntry: {
              status: JournalEntryStatus.POSTED,
              transactionDate: this.dateWhere(options),
            },
          }
        : { journalEntry: { status: JournalEntryStatus.POSTED } }),
    };
    const [lines, total] = await Promise.all([
      this.prisma.journalLine.findMany({
        where,
        include: { account: true, journalEntry: true },
        orderBy: [{ journalEntry: { transactionDate: "asc" } }, { createdAt: "asc" }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.journalLine.count({ where }),
    ]);
    return { lines, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async getJournalDetail(shopId: string, journalId: string) {
    const entry = await this.prisma.journalEntry.findFirst({
      where: { id: journalId, shopId, status: JournalEntryStatus.POSTED },
      include: {
        lines: { include: { account: true }, orderBy: { createdAt: "asc" } },
        reversalOf: true,
        reversedBy: true,
      },
    });
    if (!entry) throw new NotFoundException("Journal entry not found");
    return entry;
  }
}
