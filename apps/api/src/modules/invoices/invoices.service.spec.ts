import { BadRequestException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { BackendTaxEngineService } from "../core/pricing/services/backend-tax-engine.service";
import { PlanLimitsService } from "../core/subscriptions/plan-limits.service";
import { InvoicesService } from "./invoices.service";
import { SaleBuilderService } from "./sale-builder.service";

const invoiceCreate = jest.fn();
const invoiceSequenceUpsert = jest.fn();
const mockPrisma: any = {
  shop: { findUnique: jest.fn() },
  invoice: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: invoiceCreate,
    update: jest.fn(),
  },
  invoicePayment: { findUnique: jest.fn(), create: jest.fn() },
  order: { findFirst: jest.fn() },
  journalEntry: { findMany: jest.fn() },
  invoiceSequence: { upsert: invoiceSequenceUpsert },
  taxRuleConfig: { findMany: jest.fn() },
  $transaction: jest.fn(async (callback: (tx: any) => unknown) =>
    callback(mockPrisma),
  ),
};
const mockPlanLimits = { checkInvoiceLimit: jest.fn() };
const mockTaxEngine = { calculateTax: jest.fn() };
const mockAccounting = {
  prepareMonetaryContext: jest.fn(),
  postInvoiceIssuance: jest.fn(),
  postInvoicePayment: jest.fn(),
  postOrderAdvanceApplied: jest.fn(),
};
const mockStockCommit = {
  commit: jest.fn(),
  restoreForVoid: jest.fn(),
};
const mockMailService = {
  sendHtml: jest.fn(),
  send: jest.fn(),
};
const mockSmsService = {
  send: jest.fn(),
  isConfigured: jest.fn().mockReturnValue(true),
};
const saleBuilder = new SaleBuilderService();

describe("InvoicesService Sri Lanka invoice compliance", () => {
  let service: InvoicesService;

  const lineItems = [
    {
      label: "Gold ring",
      category: "GOLD_METAL",
      quantity: 1,
      unitPrice: 100,
      amount: 100,
      taxTreatment: "TAXABLE" as const,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    service = new InvoicesService(
      mockPrisma as any,
      mockPlanLimits as unknown as PlanLimitsService,
      mockTaxEngine as unknown as BackendTaxEngineService,
      mockAccounting as any,
      mockStockCommit as any,
      saleBuilder,
      mockMailService as any,
      mockSmsService as any,
      { generatePdfBuffer: jest.fn().mockResolvedValue({ buffer: Buffer.from("%PDF"), filename: "Invoice-test.pdf" }) } as any,
    );
    mockPlanLimits.checkInvoiceLimit.mockResolvedValue(undefined);
    mockAccounting.prepareMonetaryContext.mockResolvedValue({
      transactionCurrency: "LKR",
      transactionAmount: new Prisma.Decimal(118),
      canonicalAmountNpr: new Prisma.Decimal(47.2),
      fxRate: new Prisma.Decimal(0.4),
      fxSource: "test",
      fxQuotedAt: new Date("2026-08-08T00:00:00Z"),
    });
    mockAccounting.postInvoiceIssuance.mockResolvedValue({});
    mockPrisma.invoice.findFirst.mockResolvedValue(null);
    mockPrisma.invoicePayment.findUnique.mockResolvedValue(null);
    mockPrisma.order.findFirst.mockResolvedValue(null);
    mockPrisma.journalEntry.findMany.mockResolvedValue([]);
    mockPrisma.invoice.update.mockImplementation(({ data }: any) =>
      Promise.resolve({ id: "invoice-1", totalAmount: 118, ...data }),
    );
    mockPrisma.invoicePayment.create.mockImplementation(({ data }: any) =>
      Promise.resolve({ id: "advance-payment-1", ...data }),
    );
    mockPrisma.shop.findUnique.mockResolvedValue({
      id: "shop-123456789",
      shopName: "Colombo Gold",
      country: "LK",
      currency: "LKR",
      address: "1 Main Street",
      city: "Colombo",
      state: null,
      contactPhone: "+94110000000",
      vatNumber: "123456789",
      vatRegistrationStatus: "VERIFIED",
      panNumber: null,
      invoiceSettings: { gstin: "999999999" },
    });
    mockPrisma.taxRuleConfig.findMany.mockResolvedValue([
      {
        category: "ALL",
        rate: 0.18,
        taxType: "VAT",
        taxName: "VAT",
      },
    ]);
    invoiceSequenceUpsert.mockResolvedValue({ lastNumber: 7 });
    invoiceCreate.mockImplementation(({ data }: any) =>
      Promise.resolve({ id: "invoice-1", ...data }),
    );
  });

  it("issues a requested LK TAX INVOICE with the verified shop TIN snapshot and server VAT", async () => {
    const supplyDate = new Date().toISOString();

    const result = await service.create("shop-123456789", {
      customerName: "Registered Buyer",
      customerAddress: "2 Buyer Road, Colombo",
      customerType: "B2B",
      customerTaxId: "987654321",
      purchaserVatRegistered: true,
      taxInvoiceRequested: true,
      supplyDate,
      invoiceCountry: "LK",
      currency: "LKR",
      taxRate: 0,
      lineItems,
    } as any);

    expect(result.invoiceTitle).toBe("TAX INVOICE");
    expect(result.supplierTaxId).toBe("123456789");
    expect(result.supplierTaxId).not.toBe("999999999");
    expect(result.taxAmount).toBe(18);
    expect(result.taxRate).toBe(0.18);
    expect(result.supplyDate!.toISOString()).toBe(supplyDate);
    expect(result.invoiceNumber).toMatch(/^\d{2}[A-Z]{3}_[A-Z0-9]+_7$/);
  });

  it("does not turn B2B status alone into an LK TAX INVOICE", async () => {
    const result = await service.create("shop-123456789", {
      customerName: "Business Buyer",
      customerType: "B2B",
      invoiceCountry: "LK",
      currency: "LKR",
      lineItems,
    } as any);

    expect(result.invoiceTitle).toBe("INVOICE / RECEIPT");
    expect(invoiceSequenceUpsert).toHaveBeenCalled();
    expect(result.invoiceNumber).toMatch(/^INV-\d{8}-SHOP12-\d{4}$/);
  });

  it("accepts the current UI requestTaxInvoice alias deliberately", async () => {
    const result = await service.create("shop-123456789", {
      customerName: "Registered Buyer",
      customerAddress: "2 Buyer Road, Colombo",
      customerTaxId: "987654321",
      purchaserVatRegistered: true,
      requestTaxInvoice: true,
      supplyDate: new Date().toISOString(),
      invoiceCountry: "LK",
      currency: "LKR",
      lineItems,
    } as any);

    expect(result.invoiceTitle).toBe("TAX INVOICE");
  });

  it("rejects a requested LK TAX INVOICE without an explicit supply date", async () => {
    await expect(
      service.create("shop-123456789", {
        customerName: "Registered Buyer",
        customerAddress: "2 Buyer Road, Colombo",
        customerTaxId: "987654321",
        purchaserVatRegistered: true,
        taxInvoiceRequested: true,
        invoiceCountry: "LK",
        currency: "LKR",
        lineItems,
      } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("applies net available order advance to an immutable payment and invoice balance without a second cash receipt", async () => {
    mockPrisma.order.findFirst.mockResolvedValue({
      id: "order-1",
      orderNumber: "ORD-1",
    });
    mockPrisma.journalEntry.findMany.mockResolvedValue([
      {
        referenceType: "ORDER_PAYMENT",
        canonicalAmountNpr: new Prisma.Decimal(70),
      },
      {
        referenceType: "ORDER_ADVANCE_APPLIED",
        canonicalAmountNpr: new Prisma.Decimal(10),
      },
      {
        referenceType: "ORDER_REFUND",
        canonicalAmountNpr: new Prisma.Decimal(12.8),
      },
    ]);

    const result = await service.create("shop-123456789", {
      customerName: "Advance Buyer",
      invoiceCountry: "LK",
      currency: "LKR",
      orderId: "order-1",
      lineItems,
    } as any);

    expect(mockPrisma.invoicePayment.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        invoiceId: "invoice-1",
        method: "ORDER_ADVANCE",
        reference: "order-1",
        idempotencyKey: "order-advance:invoice-1",
        canonicalAmountNpr: new Prisma.Decimal(47.2),
      }),
    });
    expect(mockPrisma.invoice.update).toHaveBeenCalledWith({
      where: { id: "invoice-1" },
      data: expect.objectContaining({
        paidAmount: 118,
        balanceDue: 0,
        status: "PAID",
        paymentStatus: "PAID",
      }),
    });
    expect(mockAccounting.postOrderAdvanceApplied).toHaveBeenCalledWith(
      mockPrisma,
      expect.objectContaining({
        orderId: "order-1",
        invoiceId: "invoice-1",
        canonicalAmountNpr: new Prisma.Decimal(47.2),
      }),
    );
    expect(mockAccounting.postInvoicePayment).not.toHaveBeenCalled();
    expect(result.status).toBe("PAID");
  });

  it("returns an idempotent payment replay before requesting a fresh FX quote", async () => {
    mockPrisma.invoicePayment.findUnique.mockResolvedValue({
      id: "payment-existing",
      invoiceId: "invoice-1",
      idempotencyKey: "payment-retry-key",
    });
    mockPrisma.invoice.findFirst.mockResolvedValue({
      id: "invoice-1",
      shopId: "shop-123456789",
      currency: "LKR",
    });

    const result = await service.recordPayment("invoice-1", "shop-123456789", {
      amount: 20,
      paymentMethod: "CARD",
      idempotencyKey: "payment-retry-key",
    } as any);

    expect((result as any).idempotentReplay).toBe(true);
    expect(mockAccounting.prepareMonetaryContext).not.toHaveBeenCalled();
  });
});
