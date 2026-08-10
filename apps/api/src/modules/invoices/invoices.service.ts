import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  CurrencyCode,
  JournalReferenceType,
  MarketRegion,
  Prisma,
} from "@prisma/client";
import { randomUUID } from "crypto";
import { PrismaService } from "../../prisma/prisma.service";
import { roundMoney, sumMoney } from "../../common/utils/money";
import {
  getDefaultCurrencyForMarket,
  isCurrencySupportedForMarket,
  resolveMarketRegion,
} from "../../common/market/country-currency";
import { PlanLimitsService } from "../core/subscriptions/plan-limits.service";
import {
  BackendTaxEngineService,
  TaxableComponent,
} from "../core/pricing/services/backend-tax-engine.service";
import { CreateInvoiceDto, UpdatePaymentDto } from "./dto/invoice.dto";
import { AccountingService } from "../accounting/accounting.service";
import { StockCommitService } from "./stock-commit.service";
import { SaleBuilderService } from "./sale-builder.service";

export interface CreateInvoiceOptions {
  /** When true, caller commits stock itself (POS checkout path). */
  skipStockCommit?: boolean;
}

// Map a shop's registered country to its default display/billing currency.
// Used so invoices are not blindly defaulted to NPR when no currency is supplied.
const COUNTRY_TO_CURRENCY: Record<string, CurrencyCode> = {
  NP: CurrencyCode.NPR,
  IN: CurrencyCode.INR,
  AE: CurrencyCode.AED,
  US: CurrencyCode.USD,
  GB: CurrencyCode.GBP,
  UK: CurrencyCode.GBP,
  EU: CurrencyCode.EUR,
  DE: CurrencyCode.EUR,
  FR: CurrencyCode.EUR,
  IT: CurrencyCode.EUR,
  LK: CurrencyCode.LKR,
};

@Injectable()
export class InvoicesService {
  constructor(
    private prisma: PrismaService,
    private planLimitsService: PlanLimitsService,
    private backendTaxEngine: BackendTaxEngineService,
    private accounting: AccountingService,
    private stockCommit: StockCommitService,
    private saleBuilder: SaleBuilderService,
  ) {}

  /**
   * Generate a unique invoice number: INV-YYYYMMDD-XXXX
   */
  private async generateInvoiceNumber(): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "");
    const prefix = `INV-${dateStr}`;

    // Find the latest invoice for today
    const latest = await this.prisma.invoice.findFirst({
      where: { invoiceNumber: { startsWith: prefix } },
      orderBy: { invoiceNumber: "desc" },
    });

    let seq = 1;
    if (latest) {
      const parts = latest.invoiceNumber.split("-");
      seq = parseInt(parts[2] || "0", 10) + 1;
    }

    return `${prefix}-${String(seq).padStart(4, "0")}`;
  }

  private mapTaxCategory(category: string): TaxableComponent["category"] {
    const value = category.trim().toUpperCase();
    if (value.includes("DIAMOND")) return "DIAMOND";
    if (value.includes("GEM") || value.includes("STONE")) return "GEMSTONE";
    if (value.includes("PLAT")) return "PLATING";
    if (value.includes("FINISH")) return "FINISH";
    if (value.includes("SILVER") && value.includes("MAKING")) return "SILVER_MAKING";
    if (value.includes("SILVER")) return "SILVER_METAL";
    if (value.includes("MAKING")) return "GOLD_MAKING";
    if (value.includes("METAL") || value.includes("GOLD")) return "GOLD_METAL";
    return "OTHER";
  }

  private taxCategoryAliases(category: TaxableComponent["category"]): string[] {
    if (category.endsWith("_METAL")) return [category, "METAL"];
    if (category.endsWith("_MAKING")) return [category, "MAKING"];
    return [category];
  }

  private async calculateServerTax(
    region: MarketRegion,
    components: TaxableComponent[],
  ) {
    if (components.length === 0) {
      return {
        taxTotal: 0,
        effectiveRate: 0,
        label: null,
        source: "EXEMPT",
        lines: [] as any[],
      };
    }

    const now = new Date();
    const dbRules = await this.prisma.taxRuleConfig.findMany({
      where: {
        marketRegion: region,
        isActive: true,
        effectiveFrom: { lte: now },
        OR: [{ effectiveUntil: null }, { effectiveUntil: { gte: now } }],
      },
      orderBy: { priority: "asc" },
    });

    if (dbRules.length > 0) {
      const lines = components.map((component) => {
        const aliases = this.taxCategoryAliases(component.category);
        const rule = dbRules.find(
          (candidate) =>
            aliases.includes(candidate.category.toUpperCase()) ||
            candidate.category.toUpperCase() === "ALL",
        );
        const rate = rule?.rate ?? 0;
        return {
          type: rule?.taxType || "NO_TAX",
          name: rule?.taxName || "Tax",
          category: component.category,
          description: component.description,
          baseAmount: roundMoney(component.amount),
          rate,
          taxAmount: roundMoney(component.amount * rate),
        };
      });
      const taxTotal = sumMoney(lines.map((line) => line.taxAmount));
      const taxableTotal = sumMoney(components.map((item) => item.amount));
      const firstTaxLine = lines.find((line) => line.rate > 0);
      return {
        taxTotal,
        effectiveRate: taxableTotal > 0 ? taxTotal / taxableTotal : 0,
        label: firstTaxLine
          ? `${firstTaxLine.name} (${(firstTaxLine.rate * 100).toFixed(2)}%)`
          : null,
        source: "DB_CONFIG",
        lines,
      };
    }

    const result = await this.backendTaxEngine.calculateTax({
      region: region as any,
      components,
      isJewellery: true,
    });
    return {
      taxTotal: roundMoney(result.taxTotal),
      effectiveRate:
        result.components.subtotalBeforeTax > 0
          ? result.taxTotal / result.components.subtotalBeforeTax
          : 0,
      label: result.taxes[0]
        ? `${result.taxes[0].name} (${(result.taxes[0].rate * 100).toFixed(2)}%)`
        : null,
      source: result.meta.source,
      lines: result.taxes,
    };
  }

  private buildLkInvoiceNumber(
    issuedAt: Date,
    shopId: string,
    sequence: number,
  ): string {
    const months = [
      "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
      "JUL", "AUG", "SEP", "OCT", "NOV", "DEC",
    ];
    let entityCode = `S1${shopId.replace(/[^a-zA-Z0-9]/g, "").toUpperCase()}`.slice(0, 15);
    if (!/\d/.test(entityCode)) entityCode = `${entityCode.slice(0, 14)}1`;
    const number = `${String(issuedAt.getUTCFullYear()).slice(-2)}${months[issuedAt.getUTCMonth()]}_${entityCode}_${sequence}`;
    if (number.length > 40 || /\s/.test(number)) {
      throw new BadRequestException(
        "Unable to generate a compliant Sri Lankan tax invoice serial",
      );
    }
    return number;
  }

  async create(
    shopId: string,
    dto: CreateInvoiceDto,
    options: CreateInvoiceOptions = {},
  ) {
    await this.planLimitsService.checkInvoiceLimit(shopId);
    const shop = await this.prisma.shop.findUnique({
      where: { id: shopId },
      select: {
        id: true,
        shopName: true,
        country: true,
        currency: true,
        address: true,
        city: true,
        state: true,
        contactPhone: true,
        vatNumber: true,
        vatRegistrationStatus: true,
        panNumber: true,
        invoiceSettings: { select: { gstin: true } },
      },
    });
    if (!shop) throw new NotFoundException("Shop not found");

    // Reject duplicate catalog lines on the same invoice
    const stockLines = StockCommitService.linesFromInvoiceItems(dto.lineItems);
    const seenIds = new Set<string>();
    for (const line of stockLines) {
      if (seenIds.has(line.inventoryItemId)) {
        throw new BadRequestException(
          `Duplicate catalog item on invoice: ${line.label || line.inventoryItemId}`,
        );
      }
      seenIds.add(line.inventoryItemId);
    }

    if (stockLines.length > 0 && !options.skipStockCommit) {
      for (const line of stockLines) {
        const item = await this.prisma.inventoryItem.findFirst({
          where: { id: line.inventoryItemId, shopId },
          select: {
            id: true,
            nameEn: true,
            stockQuantity: true,
            status: true,
          },
        });
        if (!item) {
          throw new NotFoundException(
            `Inventory item ${line.inventoryItemId} not found in your shop`,
          );
        }
        if (item.status !== "AVAILABLE") {
          throw new BadRequestException(
            `"${item.nameEn}" is not available for sale`,
          );
        }
        if (item.stockQuantity < line.quantity) {
          throw new BadRequestException(
            `Insufficient stock for "${item.nameEn}" (have ${item.stockQuantity}, need ${line.quantity})`,
          );
        }
      }
    }

    const invoiceCountry = dto.invoiceCountry || shop.country;
    const region = resolveMarketRegion(invoiceCountry);
    if (!region) {
      throw new BadRequestException(
        `Unsupported invoice country: ${invoiceCountry}`,
      );
    }
    const issuedAt = new Date();
    const isLk = region === MarketRegion.LK;
    const isTaxExempt = !!dto.isTaxExempt;
    const supplierTaxId = isLk
      ? shop.vatNumber || null
      : shop.invoiceSettings?.gstin || shop.vatNumber || null;
    const sellerVatRegistered =
      !isLk ||
      (shop.vatRegistrationStatus === "VERIFIED" &&
        !!supplierTaxId &&
        /^\d{9}$/.test(supplierTaxId));
    if (
      dto.taxInvoiceRequested !== undefined &&
      dto.requestTaxInvoice !== undefined &&
      dto.taxInvoiceRequested !== dto.requestTaxInvoice
    ) {
      throw new BadRequestException(
        "Conflicting Sri Lankan tax invoice request flags",
      );
    }
    const taxInvoiceRequested =
      dto.taxInvoiceRequested ?? dto.requestTaxInvoice ?? false;
    const purchaserVatRegistered = dto.purchaserVatRegistered === true;
    const isLkTaxInvoice =
      isLk &&
      taxInvoiceRequested &&
      sellerVatRegistered &&
      purchaserVatRegistered &&
      !isTaxExempt;

    if (isLk && taxInvoiceRequested && !sellerVatRegistered) {
      throw new BadRequestException(
        "This shop is not verified to issue Sri Lankan TAX INVOICE documents",
      );
    }
    if (isLk && taxInvoiceRequested && !purchaserVatRegistered) {
      throw new BadRequestException(
        "A Sri Lankan TAX INVOICE request requires a VAT-registered purchaser",
      );
    }
    if (isTaxExempt && (!dto.taxExemptReason || !dto.taxExemptEvidence)) {
      throw new BadRequestException(
        "Tax-exempt invoices require both a reason and supporting evidence reference",
      );
    }

    if (isLk) {
      const hasExplicitExempt = dto.lineItems.some(
        (item) => item.taxTreatment === "EXEMPT",
      );
      const hasExplicitTaxable = dto.lineItems.some(
        (item) => item.taxTreatment === "TAXABLE",
      );
      if (hasExplicitExempt && hasExplicitTaxable) {
        throw new BadRequestException(
          "Taxable and exempt Sri Lankan supplies must be issued on separate documents",
        );
      }
      if (isLkTaxInvoice && hasExplicitExempt) {
        throw new BadRequestException(
          "A Sri Lankan TAX INVOICE may contain only VAT-subject supplies; issue exempt supplies separately",
        );
      }
      if (isTaxExempt && hasExplicitTaxable) {
        throw new BadRequestException(
          "Taxable and exempt Sri Lankan supplies must be issued on separate documents",
        );
      }
    }

    const validated = dto.lineItems.map((item) => {
      const authoritativeAmount = roundMoney(item.quantity * item.unitPrice);
      if (Math.abs(authoritativeAmount - item.amount) > 0.01) {
        throw new BadRequestException(
          `Line item amount for ${item.label} must equal quantity × unit price`,
        );
      }
      return { ...item, amount: authoritativeAmount };
    });

    // Expand collapsed jewellery lines (RING/PRODUCT + breakdown) into
    // METAL / MAKING / GEMSTONE, drop $0 PRODUCT headers, and fold
    // invoice-level makingChargesAmt into a MAKING line when needed.
    const normalized = this.saleBuilder.normalizeInvoiceLines(validated, {
      makingChargesAmt: dto.makingChargesAmt,
      makingChargeRate: dto.makingChargeRate,
    });
    if (normalized.length === 0) {
      throw new BadRequestException("Invoice must have at least one priced line item");
    }

    const lineItems = normalized.map((item) => ({
      label: item.label,
      category: item.category,
      quantity: item.quantity,
      unitPrice: roundMoney(item.unitPrice),
      amount: roundMoney(item.amount),
      details: item.details,
      inventoryItemId: item.inventoryItemId,
      variantId: item.variantId,
      taxTreatment: item.taxTreatment,
      metalType: item.metalType,
      metalWeightG: item.metalWeightG,
      metalCost: item.metalCost,
      makingCost: item.makingCost,
      gemstoneCost: item.gemstoneCost,
    }));

    const subtotal = sumMoney(lineItems.map((item) => item.amount));
    // makingChargesAmt is already folded into a MAKING line when applicable;
    // keep the field on the invoice row for POS/metadata only.
    const discountAmount = roundMoney(dto.discountAmount || 0);
    if (discountAmount > subtotal) {
      throw new BadRequestException("Discount cannot exceed the invoice subtotal");
    }
    const netSubtotal = roundMoney(subtotal - discountAmount);
    const discountFactor = subtotal > 0 ? netSubtotal / subtotal : 1;
    const shouldChargeTax = !isTaxExempt && (!isLk || sellerVatRegistered);
    const taxableLineItems = !shouldChargeTax
      ? []
      : lineItems.filter((item) => item.taxTreatment !== "EXEMPT");
    const components: TaxableComponent[] = taxableLineItems.map((item) => ({
      category: this.mapTaxCategory(item.category),
      amount: roundMoney(item.amount * discountFactor),
      description: item.label,
    }));
    const tax = await this.calculateServerTax(region, components);
    const taxableAmount = sumMoney(components.map((item) => item.amount));
    const taxAmount = shouldChargeTax ? tax.taxTotal : 0;
    const taxRate = shouldChargeTax ? tax.effectiveRate : 0;
    const totalAmount = roundMoney(netSubtotal + taxAmount);
    if (totalAmount <= 0) {
      throw new BadRequestException("Invoice total must be greater than zero");
    }

    const currency =
      dto.currency ||
      (dto.invoiceCountry
        ? getDefaultCurrencyForMarket(region)
        : shop.currency || COUNTRY_TO_CURRENCY[shop.country] || CurrencyCode.NPR);
    if (isLk && currency !== CurrencyCode.LKR) {
      throw new BadRequestException("Sri Lankan invoices must be denominated in LKR");
    }
    if (!isCurrencySupportedForMarket(region, currency)) {
      throw new BadRequestException(
        `${currency} is not supported for invoice market ${region}`,
      );
    }
    const accountingContext = await this.accounting.prepareMonetaryContext(
      totalAmount,
      currency,
    );

    if (isLkTaxInvoice) {
      if (!dto.customerTaxId || !/^\d{9}$/.test(dto.customerTaxId)) {
        throw new BadRequestException(
          "Sri Lankan TAX INVOICE requires a 9-digit purchaser TIN",
        );
      }
      if (!dto.customerAddress) {
        throw new BadRequestException(
          "Sri Lankan TAX INVOICE requires the purchaser address",
        );
      }
      if (!dto.supplyDate) {
        throw new BadRequestException(
          "Sri Lankan TAX INVOICE requires an explicit supply date",
        );
      }
    }

    const supplyDate = dto.supplyDate ? new Date(dto.supplyDate) : issuedAt;
    if (!Number.isFinite(supplyDate.getTime())) {
      throw new BadRequestException("Invalid supply date");
    }
    if (
      isLkTaxInvoice &&
      supplyDate.getTime() > issuedAt.getTime() + 24 * 60 * 60 * 1000
    ) {
      throw new BadRequestException(
        "Sri Lankan TAX INVOICE supply date cannot be in the future",
      );
    }

    const supplierAddress = [shop.address, shop.city, shop.state]
      .filter(Boolean)
      .join(", ");

    // Aggregate tax lines for Nepal audit / UI (skill fee, VAT, metal/making GST)
    const taxLines = shouldChargeTax ? tax.lines || [] : [];
    const sumTaxBy = (
      pred: (line: { type?: string; name?: string; category?: string; taxAmount?: number }) => boolean,
    ) =>
      roundMoney(
        taxLines
          .filter(pred)
          .reduce((s: number, l: any) => s + (Number(l.taxAmount) || 0), 0),
      );

    const skillPromotionFee = sumTaxBy(
      (l) =>
        String(l.type || "").toUpperCase().includes("SKILL") ||
        String(l.name || "").toUpperCase().includes("SKILL PROMOTION"),
    );
    const vatCollected = sumTaxBy(
      (l) =>
        String(l.type || "").toUpperCase() === "VAT" ||
        (String(l.name || "").toUpperCase().includes("VAT") &&
          !String(l.name || "").toUpperCase().includes("SKILL")),
    );
    const metalTax = sumTaxBy(
      (l) =>
        String(l.category || "").toUpperCase().includes("METAL") ||
        String(l.name || "").toUpperCase().includes("ON METAL"),
    );
    const makingTax = sumTaxBy(
      (l) =>
        String(l.category || "").toUpperCase().includes("MAKING") ||
        String(l.name || "").toUpperCase().includes("ON MAKING"),
    );
    const gemstoneTax = sumTaxBy(
      (l) =>
        String(l.category || "").toUpperCase().includes("GEM") ||
        String(l.category || "").toUpperCase().includes("DIAMOND") ||
        String(l.name || "").toUpperCase().includes("STONE"),
    );

    const taxBreakdown = {
      region,
      source: isTaxExempt
        ? "EXEMPT"
        : isLk && !sellerVatRegistered
          ? "NOT_VAT_REGISTERED"
          : tax.source,
      taxableAmount,
      lines: taxLines,
      // Report-friendly aggregates (Nepal audit, create-page preview parity)
      skillPromotionFee: skillPromotionFee || undefined,
      metalTax: metalTax || skillPromotionFee || undefined,
      makingTax: makingTax || undefined,
      gemstoneTax: gemstoneTax || undefined,
      vat: vatCollected || undefined,
      totalTax: taxAmount,
      // LK / filing flags from DTO (server overwrites client taxBreakdown)
      lkTaxInvoice: isLkTaxInvoice || undefined,
      supplyDate: dto.supplyDate || undefined,
      placeOfSupply: dto.placeOfSupply || undefined,
      purchaserVatRegistered:
        dto.purchaserVatRegistered ??
        (dto.customerType === "B2B" ? true : undefined),
    };

    const invoiceTitle = isLkTaxInvoice
      ? "TAX INVOICE"
      : isLk && !sellerVatRegistered
        ? "NON-VAT INVOICE / RECEIPT"
        : isLk && sellerVatRegistered && !isTaxExempt
          ? "INVOICE / RECEIPT"
          : isTaxExempt
            ? "EXEMPT INVOICE"
            : "INVOICE";

    const baseData = {
      shopId,
      orderId: dto.orderId || null,
      shopQuoteId: dto.shopQuoteId || null,
      walkInCustomerId: dto.walkInCustomerId || null,
      customerName: dto.customerName,
      customerPhone: dto.customerPhone || null,
      customerEmail: dto.customerEmail || null,
      customerAddress: dto.customerAddress || null,
      invoiceTitle,
      supplierName: shop.shopName,
      supplierAddress,
      supplierPhone: shop.contactPhone,
      supplierTaxId,
      sellerVatStatus: isLk
        ? shop.vatRegistrationStatus
        : "NOT_REGISTERED" as const,
      lineItems: lineItems as unknown as Prisma.InputJsonValue,
      subtotal,
      taxableAmount,
      taxAmount,
      taxRate,
      taxLabel: isTaxExempt
        ? "Tax Exempt"
        : isLk && !sellerVatRegistered
          ? "Not VAT Registered"
          : tax.label || dto.taxLabel || null,
      discountAmount,
      totalAmount,
      paidAmount: 0,
      balanceDue: totalAmount,
      currency,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
      notes: dto.notes || null,
      terms: dto.terms || null,
      status: "ISSUED",
      issuedAt,
      isTaxExempt,
      taxExemptReason: dto.taxExemptReason || null,
      taxExemptEvidence: dto.taxExemptEvidence || null,
      customerType: dto.customerType || "B2C",
      customerTaxId: dto.customerTaxId || null,
      invoiceCountry: region,
      placeOfSupply: dto.placeOfSupply || null,
      supplyDate,
      hsnCode: dto.hsnCode || "7113",
      taxBreakdown: taxBreakdown as unknown as Prisma.InputJsonValue,
      taxSource: taxBreakdown.source,
      paymentMethod: dto.paymentMethod || null,
      makingChargeRate: dto.makingChargeRate ?? null,
      makingChargesAmt: dto.makingChargesAmt ?? null,
    };

    const ordinaryInvoiceNumber = isLkTaxInvoice
      ? null
      : await this.generateInvoiceNumber();

    const invoice = await this.prisma.$transaction(async (tx) => {
      let invoiceNumber = ordinaryInvoiceNumber!;
      let serialSequence: number | undefined;
      if (isLkTaxInvoice) {
        const sequence = await tx.invoiceSequence.upsert({
          where: { shopId_marketRegion: { shopId, marketRegion: region } },
          update: { lastNumber: { increment: 1 } },
          create: { shopId, marketRegion: region, lastNumber: 1 },
        });
        invoiceNumber = this.buildLkInvoiceNumber(
          issuedAt,
          shopId,
          sequence.lastNumber,
        );
        serialSequence = sequence.lastNumber;
      }

      const invoice = await tx.invoice.create({
        data: {
          invoiceNumber,
          ...(serialSequence ? { serialSequence } : {}),
          ...baseData,
        },
      });
      await this.accounting.postInvoiceIssuance(tx, {
        ...accountingContext,
        shopId,
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        taxAmount,
        transactionDate: issuedAt,
      });

      let finalInvoice = invoice;
      if (dto.orderId) {
        const order = await tx.order.findFirst({
          where: { id: dto.orderId, shopId },
          select: { id: true, orderNumber: true },
        });
        if (order) {
          const advanceEntries = await tx.journalEntry.findMany({
            where: {
              shopId,
              status: "POSTED",
              referenceType: {
                in: [
                  JournalReferenceType.ORDER_PAYMENT,
                  JournalReferenceType.ORDER_ADVANCE_APPLIED,
                  JournalReferenceType.ORDER_REFUND,
                ],
              },
              metadata: { path: ["orderId"], equals: order.id },
            },
            select: { referenceType: true, canonicalAmountNpr: true },
          });
          const availableAdvance = advanceEntries.reduce(
            (sum, entry) =>
              entry.referenceType === JournalReferenceType.ORDER_PAYMENT
                ? sum.plus(entry.canonicalAmountNpr)
                : sum.minus(entry.canonicalAmountNpr),
            new Prisma.Decimal(0),
          );
          const maximumNpr = Prisma.Decimal.min(
            Prisma.Decimal.max(availableAdvance, 0),
            accountingContext.canonicalAmountNpr,
          );
          const appliedTransaction = accountingContext.canonicalAmountNpr
              .isZero()
              ? new Prisma.Decimal(0)
              : accountingContext.transactionAmount
                  .mul(maximumNpr)
                  .div(accountingContext.canonicalAmountNpr)
                  .toDecimalPlaces(2);
          const appliedNpr = accountingContext.transactionAmount.isZero()
            ? new Prisma.Decimal(0)
            : accountingContext.canonicalAmountNpr
                .mul(appliedTransaction)
                .div(accountingContext.transactionAmount)
                .toDecimalPlaces(4);
          if (appliedTransaction.gt(0) && appliedNpr.gt(0)) {
            const advancePayment = await tx.invoicePayment.create({
              data: {
                invoiceId: invoice.id,
                amount: appliedTransaction,
                currency: invoice.currency,
                canonicalAmountNpr: appliedNpr,
                fxRate: accountingContext.fxRate,
                fxSource: accountingContext.fxSource,
                fxQuotedAt: accountingContext.fxQuotedAt,
                method: "ORDER_ADVANCE",
                reference: order.id,
                idempotencyKey: `order-advance:${invoice.id}`,
                notes: `Applied customer advance from order ${order.orderNumber}`,
                receivedAt: issuedAt,
              },
            });
            const balanceDue = new Prisma.Decimal(invoice.totalAmount)
              .minus(appliedTransaction)
              .toDecimalPlaces(2);
            const isPaid = balanceDue.lte(0);
            finalInvoice = await tx.invoice.update({
              where: { id: invoice.id },
              data: {
                paidAmount: appliedTransaction.toNumber(),
                balanceDue: Prisma.Decimal.max(balanceDue, 0).toNumber(),
                status: isPaid ? "PAID" : "PARTIALLY_PAID",
                paymentStatus: isPaid ? "PAID" : "PARTIALLY_PAID",
                paidAt: isPaid ? issuedAt : null,
                paymentMethod: "ORDER_ADVANCE",
              },
            });
            await this.accounting.postOrderAdvanceApplied(tx, {
              ...accountingContext,
              transactionAmount: appliedTransaction,
              canonicalAmountNpr: appliedNpr,
              shopId,
              orderId: order.id,
              invoiceId: invoice.id,
              invoiceNumber: invoice.invoiceNumber,
              orderNumber: order.orderNumber,
              transactionDate: issuedAt,
            });
            // Keep the immutable source payment reachable in transaction
            // inspection even though no second cash receipt journal is posted.
            void advancePayment;
          }
        }
      }
      return finalInvoice;
    });

    // Commit stock for catalog-linked lines (POS uses skipStockCommit)
    if (stockLines.length > 0 && !options.skipStockCommit) {
      try {
        await this.stockCommit.commit({
          shopId,
          lines: stockLines,
          reason: "INVOICE_SALE",
          referenceType: "Invoice",
          referenceId: invoice.id,
          notes: `Invoice ${invoice.invoiceNumber}`,
        });
      } catch (err) {
        await this.voidInvoice(invoice.id, shopId).catch(() => undefined);
        throw err;
      }
    }

    return invoice;
  }

  async findAll(
    shopId: string,
    params?: {
      status?: string;
      search?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const { status, search, page = 1, limit = 20 } = params || {};

    const where: any = { shopId };
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { invoiceNumber: { contains: search, mode: "insensitive" } },
        { customerName: { contains: search, mode: "insensitive" } },
        { customerPhone: { contains: search, mode: "insensitive" } },
      ];
    }

    const [invoices, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.invoice.count({ where }),
    ]);

    return {
      invoices,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(id: string, shopId: string) {
    const invoice = await this.prisma.invoice.findUnique({ where: { id } });
    if (!invoice) throw new NotFoundException("Invoice not found");
    if (invoice.shopId !== shopId)
      throw new ForbiddenException("Not your invoice");
    return invoice;
  }

  async findByOrder(orderId: string, shopId: string) {
    const invoices = await this.prisma.invoice.findMany({
      where: { orderId, shopId },
      orderBy: { createdAt: "desc" },
    });
    return invoices;
  }

  async recordPayment(
    id: string,
    shopId: string,
    dto: Omit<UpdatePaymentDto, "idempotencyKey"> & { idempotencyKey?: string },
  ) {
    const amount = roundMoney(dto.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException("Payment amount must be greater than zero");
    }
    // Public requests require this in the DTO. Internal POS callers receive a
    // unique server key until they are migrated to propagate their own key.
    const idempotencyKey = dto.idempotencyKey || randomUUID();

    const replay = await this.prisma.invoicePayment.findUnique({
      where: { idempotencyKey },
    });
    if (replay) {
      if (replay.invoiceId !== id) {
        throw new BadRequestException(
          "Idempotency key is already associated with another invoice",
        );
      }
      const replayInvoice = await this.prisma.invoice.findFirst({
        where: { id, shopId },
      });
      if (!replayInvoice) throw new NotFoundException("Invoice not found");
      return {
        ...replayInvoice,
        recordedPayment: replay,
        idempotentReplay: true,
      };
    }

    const invoiceForQuote = await this.prisma.invoice.findFirst({
      where: { id, shopId },
      select: { currency: true },
    });
    if (!invoiceForQuote) throw new NotFoundException("Invoice not found");
    const accountingContext = await this.accounting.prepareMonetaryContext(
      amount,
      invoiceForQuote.currency,
    );

    return this.prisma.$transaction(async (tx) => {
      const existingPayment = await tx.invoicePayment.findUnique({
        where: { idempotencyKey },
      });
      if (existingPayment) {
        if (existingPayment.invoiceId !== id) {
          throw new BadRequestException(
            "Idempotency key is already associated with another invoice",
          );
        }
        const existingInvoice = await tx.invoice.findUnique({ where: { id } });
        return {
          ...existingInvoice,
          recordedPayment: existingPayment,
          idempotentReplay: true,
        };
      }

      const invoice = await tx.invoice.findFirst({ where: { id, shopId } });
      if (!invoice) throw new NotFoundException("Invoice not found");
      if (invoice.status === "VOID" || invoice.status === "CANCELLED") {
        throw new BadRequestException(
          "Cannot record payment on a voided/cancelled invoice",
        );
      }
      if (amount > roundMoney(invoice.balanceDue)) {
        throw new BadRequestException("Payment amount exceeds invoice balance");
      }

      const balanceUpdate = await tx.invoice.updateMany({
        where: {
          id,
          shopId,
          status: { notIn: ["VOID", "CANCELLED"] },
          balanceDue: { gte: amount },
        },
        data: {
          paidAmount: { increment: amount },
          balanceDue: { decrement: amount },
          ...(dto.paymentMethod
            ? { paymentMethod: dto.paymentMethod.toUpperCase() }
            : {}),
        },
      });
      if (balanceUpdate.count !== 1) {
        throw new BadRequestException(
          "Invoice balance changed; reload before recording this payment",
        );
      }

      const payment = await tx.invoicePayment.create({
        data: {
          invoiceId: id,
          amount: new Prisma.Decimal(amount),
          currency: invoice.currency,
          canonicalAmountNpr: accountingContext.canonicalAmountNpr,
          fxRate: accountingContext.fxRate,
          fxSource: accountingContext.fxSource,
          fxQuotedAt: accountingContext.fxQuotedAt,
          method: (dto.paymentMethod || "UNSPECIFIED").toUpperCase(),
          reference: dto.reference || null,
          idempotencyKey,
          notes: dto.notes || null,
          receivedAt: dto.receivedAt ? new Date(dto.receivedAt) : new Date(),
        },
      });

      const updated = await tx.invoice.findUniqueOrThrow({ where: { id } });
      const isPaid = roundMoney(updated.balanceDue) <= 0;
      const finalInvoice = await tx.invoice.update({
        where: { id },
        data: {
          status: isPaid ? "PAID" : "PARTIALLY_PAID",
          paymentStatus: isPaid ? "PAID" : "PARTIALLY_PAID",
          paidAt: isPaid ? new Date() : null,
        },
      });

      await this.accounting.postInvoicePayment(tx, {
        ...accountingContext,
        shopId,
        invoicePaymentId: payment.id,
        invoiceNumber: invoice.invoiceNumber,
        method: payment.method,
        transactionDate: payment.receivedAt,
      });

      return { ...finalInvoice, recordedPayment: payment };
    });
  }

  /**
   * Public bill verification by QR token. Returns only safe display fields so
   * anyone scanning the printed QR can confirm the bill is genuine.
   */
  async verifyByToken(token: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { verificationToken: token },
      include: {
        shop: {
          select: { shopName: true, city: true, country: true, profileImage: true },
        },
      },
    });
    if (!invoice) {
      throw new NotFoundException("Bill not found or verification link invalid");
    }
    const lineItems = Array.isArray(invoice.lineItems)
      ? (invoice.lineItems as Array<Record<string, any>>)
      : [];
    return {
      verified: true,
      invoiceNumber: invoice.invoiceNumber,
      invoiceTitle: invoice.invoiceTitle,
      issuedAt: invoice.issuedAt,
      status: invoice.status,
      paymentStatus: invoice.paymentStatus,
      totalAmount: invoice.totalAmount,
      paidAmount: invoice.paidAmount,
      balanceDue: invoice.balanceDue,
      currency: invoice.currency,
      supplierName: invoice.supplierName,
      supplierPhone: invoice.supplierPhone,
      supplierTaxId: invoice.supplierTaxId,
      customerName: invoice.customerName,
      lineItems: lineItems.slice(0, 50).map((li) => ({
        label: li.label,
        category: li.category,
        amount: li.amount,
        details: li.details,
      })),
      shop: invoice.shop
        ? { ...invoice.shop, logo: (invoice.shop as any).profileImage ?? null }
        : null,
    };
  }

  async voidInvoice(id: string, shopId: string) {
    const invoice = await this.findById(id, shopId);

    if (invoice.status === "VOID" || invoice.status === "CANCELLED") {
      throw new BadRequestException("Invoice is already voided or cancelled");
    }

    return this.prisma.$transaction(async (tx) => {
      // Reverse any received payments in the ledger and mark them REVERSED.
      const payments = await tx.invoicePayment.findMany({
        where: { invoiceId: id, status: "RECEIVED" },
        orderBy: { receivedAt: "asc" },
      });

      for (const payment of payments) {
        await this.accounting.reverseReference(tx, {
          shopId,
          originalReferenceType: JournalReferenceType.INVOICE_PAYMENT,
          originalReferenceId: payment.id,
          reversalReferenceType: JournalReferenceType.REVERSAL,
          reversalReferenceId: `invoice-payment-void:${payment.id}`,
          reason: `Invoice ${invoice.invoiceNumber} voided — payment reversed`,
        });
        await tx.invoicePayment.update({
          where: { id: payment.id },
          data: {
            status: "REVERSED",
            voidedAt: new Date(),
            voidReason: "Invoice voided",
          },
        });
      }

      // Restore stock for POS / product line items that carry inventory refs.
      const lineItems = Array.isArray(invoice.lineItems)
        ? (invoice.lineItems as Array<Record<string, any>>)
        : [];
      await this.stockCommit.restoreForVoid(tx, shopId, id, lineItems);

      const updated = await tx.invoice.update({
        where: { id },
        data: {
          status: "VOID",
          voidedAt: new Date(),
          paidAmount: 0,
          balanceDue: invoice.totalAmount,
          paymentStatus: "UNPAID",
          paidAt: null,
        },
      });
      await this.accounting.reverseReference(tx, {
        shopId,
        originalReferenceType: JournalReferenceType.INVOICE_ISSUED,
        originalReferenceId: id,
        reversalReferenceType: JournalReferenceType.REVERSAL,
        reversalReferenceId: `invoice-void:${id}`,
        reason: "Invoice voided",
      });
      return { updated, restoredStock: lineItems };
    }).then(async ({ updated, restoredStock }) => {
      for (const li of restoredStock) {
        const inventoryItemId = li.inventoryItemId as string | undefined;
        const qty = Math.max(0, Number(li.quantity) || 0);
        if (!inventoryItemId || qty <= 0) continue;
        try {
          await this.prisma.inventoryStockMovement.create({
            data: {
              shopId,
              inventoryItemId,
              variantId: (li.variantId as string) || null,
              delta: qty,
              reason: "INVOICE_VOID_RESTORE",
              referenceType: "Invoice",
              referenceId: id,
            },
          });
        } catch {
          // Table may not exist until migrate deploy
        }
      }
      return updated;
    });
  }

  async getStats(shopId: string) {
    const [total, issued, paid, partiallyPaid, overdue, voided] =
      await Promise.all([
        this.prisma.invoice.count({ where: { shopId } }),
        this.prisma.invoice.count({ where: { shopId, status: "ISSUED" } }),
        this.prisma.invoice.count({ where: { shopId, status: "PAID" } }),
        this.prisma.invoice.count({
          where: { shopId, status: "PARTIALLY_PAID" },
        }),
        this.prisma.invoice.count({ where: { shopId, status: "OVERDUE" } }),
        this.prisma.invoice.count({ where: { shopId, status: "VOID" } }),
      ]);

    // Revenue totals
    const revenue = await this.prisma.invoice.aggregate({
      where: { shopId, status: { in: ["PAID", "PARTIALLY_PAID", "ISSUED"] } },
      _sum: { totalAmount: true, paidAmount: true, balanceDue: true },
    });

    return {
      counts: { total, issued, paid, partiallyPaid, overdue, voided },
      revenue: {
        totalInvoiced: revenue._sum.totalAmount || 0,
        totalCollected: revenue._sum.paidAmount || 0,
        totalOutstanding: revenue._sum.balanceDue || 0,
      },
    };
  }

  // ── Invoice Settings ──────────────────────────────────────────

  async getSettings(shopId: string) {
    // Return existing settings or create defaults
    let settings = await this.prisma.invoiceSettings.findUnique({
      where: { shopId },
    });

    if (!settings) {
      // Auto-create with shop defaults
      const shop = await this.prisma.shop.findUnique({
        where: { id: shopId },
        select: {
          shopName: true,
          address: true,
          city: true,
          state: true,
          contactPhone: true,
          contactEmail: true,
          panNumber: true,
          vatNumber: true,
          bisLicenseNumber: true,
        },
      });

      settings = await this.prisma.invoiceSettings.create({
        data: {
          shopId,
          shopNameOnBill: shop?.shopName || null,
          shopAddress: shop
            ? [shop.address, shop.city, shop.state].filter(Boolean).join(", ")
            : null,
          shopPhone: shop?.contactPhone || null,
          shopEmail: shop?.contactEmail || null,
          gstin: shop?.vatNumber || shop?.panNumber || null,
          licenseNumber: shop?.bisLicenseNumber || null,
          footerNote: "Thank you for your business!",
          termsText: "All items are subject to hallmarking verification.",
        },
      });
    }

    return settings;
  }

  async updateSettings(shopId: string, dto: any) {
    // Whitelist allowed fields
    const allowedFields = [
      "shopNameOnBill",
      "shopLogoUrl",
      "tagline",
      "shopAddress",
      "shopPhone",
      "shopEmail",
      "gstin",
      "licenseNumber",
      "footerNote",
      "termsText",
      // Per-field positions (TOP or BOTTOM)
      "shopNamePosition",
      "logoPosition",
      "taglinePosition",
      "addressPosition",
      "phonePosition",
      "emailPosition",
      "gstinPosition",
      "licensePosition",
      "footerPosition",
      "termsPosition",
      // Visibility toggles
      "showLogo",
      "showAddress",
      "showPhone",
      "showEmail",
      "showGstin",
      "showLicense",
      "showFooter",
      "showTerms",
    ];

    const data: Record<string, any> = {};
    for (const field of allowedFields) {
      if (dto[field] !== undefined) {
        data[field] = dto[field];
      }
    }

    // Validate position fields
    const positionFields = [
      "shopNamePosition",
      "logoPosition",
      "taglinePosition",
      "addressPosition",
      "phonePosition",
      "emailPosition",
      "gstinPosition",
      "licensePosition",
      "footerPosition",
      "termsPosition",
    ];
    for (const field of positionFields) {
      if (data[field] && !["TOP", "BOTTOM"].includes(data[field])) {
        throw new BadRequestException(`${field} must be TOP or BOTTOM`);
      }
    }

    return this.prisma.invoiceSettings.upsert({
      where: { shopId },
      update: data,
      create: {
        shopId,
        ...data,
      },
    });
  }
}
