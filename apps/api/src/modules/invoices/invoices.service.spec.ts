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
    findUniqueOrThrow: jest.fn(),
    create: invoiceCreate,
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  invoicePayment: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  order: { findFirst: jest.fn() },
  journalEntry: { findMany: jest.fn() },
  invoiceSequence: { upsert: invoiceSequenceUpsert },
  taxRuleConfig: { findMany: jest.fn() },
  inventoryItem: { findMany: jest.fn() },
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
    mockPrisma.inventoryItem.findMany.mockResolvedValue([]);
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
    mockTaxEngine.calculateTax.mockResolvedValue({
      taxTotal: 0,
      effectiveRate: 0,
      taxes: [],
      components: { subtotalBeforeTax: 100 },
      meta: { source: "test" },
    });
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

  it("matches GOLD_METAL / GOLD_MAKING lines to seeded PRECIOUS_METAL / MAKING_CHARGE rules", async () => {
    mockPrisma.shop.findUnique.mockResolvedValue({
      id: "shop-np",
      shopName: "Kathmandu Gold",
      country: "NP",
      currency: "NPR",
      address: "New Road",
      city: "Kathmandu",
      state: null,
      contactPhone: "+9779800000000",
      vatNumber: null,
      vatRegistrationStatus: "NOT_REGISTERED",
      panNumber: null,
      invoiceSettings: null,
    });
    mockPrisma.taxRuleConfig.findMany.mockResolvedValue([
      {
        category: "PRECIOUS_METAL",
        rate: 0.005,
        taxType: "SKILL_PROMOTION_FEE",
        taxName: "Skill Promotion Fee",
      },
      {
        category: "MAKING_CHARGE",
        rate: 0.005,
        taxType: "SKILL_PROMOTION_FEE",
        taxName: "Skill Promotion Fee",
      },
    ]);

    const result = await service.create("shop-np", {
      customerName: "Walk-in",
      invoiceCountry: "NP",
      currency: "NPR",
      lineItems: [
        {
          label: "Gold ring metal",
          category: "GOLD_METAL",
          quantity: 1,
          unitPrice: 10000,
          amount: 10000,
        },
        {
          label: "Making",
          category: "GOLD_MAKING",
          quantity: 1,
          unitPrice: 2000,
          amount: 2000,
        },
      ],
    } as any);

    expect(result.taxAmount).toBe(60);
    expect(result.taxLabel).toContain("Skill Promotion Fee");
  });

  it("allows the same catalog item twice when variant ids differ", async () => {
    mockPrisma.inventoryItem.findMany.mockResolvedValue([
      {
        id: "item-1",
        nameEn: "Gold ring",
        stockQuantity: 10,
        status: "AVAILABLE",
      },
    ]);

    await expect(
      service.create("shop-123456789", {
        customerName: "Walk-in",
        invoiceCountry: "LK",
        currency: "LKR",
        lineItems: [
          {
            label: "Ring 18k",
            category: "GOLD_METAL",
            quantity: 1,
            unitPrice: 100,
            amount: 100,
            inventoryItemId: "item-1",
            variantId: "var-a",
          },
          {
            label: "Ring 22k",
            category: "GOLD_METAL",
            quantity: 1,
            unitPrice: 100,
            amount: 100,
            inventoryItemId: "item-1",
            variantId: "var-b",
          },
        ],
      } as any),
    ).resolves.toBeDefined();
  });

  it("preserves line/SET discount when expanding breakdown components so persisted taxable subtotal is discounted", async () => {
    mockPrisma.shop.findUnique.mockResolvedValue({
      id: "shop-np",
      shopName: "Kathmandu Gold",
      country: "NP",
      currency: "NPR",
      address: "New Road",
      city: "Kathmandu",
      vatNumber: null,
      vatRegistrationStatus: "NOT_REGISTERED",
      panNumber: null,
      invoiceSettings: {},
    });
    mockPrisma.taxRuleConfig.findMany.mockResolvedValue([
      {
        category: "PRECIOUS_METAL",
        rate: 0.005,
        taxType: "SKILL_PROMOTION_FEE",
        taxName: "Skill Promotion Fee",
      },
      {
        category: "MAKING_CHARGE",
        rate: 0.005,
        taxType: "SKILL_PROMOTION_FEE",
        taxName: "Skill Promotion Fee",
      },
      {
        category: "GEMSTONE",
        rate: 0.13,
        taxType: "VAT",
        taxName: "VAT",
      },
    ]);

    // Raw components = 100000 (metal) + 20000 (making) + 30000 (gemstone) = 150000.
    // 10% SET discount -> line amount is 135000 (unitPrice = 135000).
    const result = await service.create("shop-np", {
      customerName: "Walk-in Customer",
      invoiceCountry: "NP",
      currency: "NPR",
      lineItems: [
        {
          label: "Bridal Set",
          category: "SET",
          quantity: 1,
          unitPrice: 135000,
          amount: 135000,
          metalCost: 100000,
          makingCost: 20000,
          gemstoneCost: 30000,
          setDiscountAmount: 15000,
        },
      ],
    } as any);

    // Subtotal should be the discounted 135000, NOT the raw 150000.
    expect(result.subtotal).toBe(135000);
    expect(result.taxableAmount).toBe(135000);

    // Expanded lines sum exactly to 135000
    const lineItems = result.lineItems as Array<{ amount: number }>;
    const lineTotal = lineItems.reduce(
      (s: number, li: any) => s + li.amount,
      0,
    );
    expect(lineTotal).toBe(135000);
  });

  it("allocates SET discount proportionally to metal, making, and gemstones while keeping wastage unscaled and calculating category taxes accurately", async () => {
    mockPrisma.shop.findUnique.mockResolvedValue({
      id: "shop-in",
      country: "IN",
      currency: "INR",
      vatNumber: null,
      vatRegistrationStatus: "NOT_REGISTERED",
      panNumber: null,
      invoiceSettings: {},
    });
    mockPrisma.taxRuleConfig.findMany.mockResolvedValue([
      {
        category: "PRECIOUS_METAL",
        rate: 0.03, // 3% on metal and wastage
        taxType: "GST",
        taxName: "GST",
      },
      {
        category: "MAKING_CHARGE",
        rate: 0.05, // 5% on making
        taxType: "GST",
        taxName: "GST",
      },
      {
        category: "GEMSTONE",
        rate: 0.03, // 3% on gemstones
        taxType: "GST",
        taxName: "GST",
      },
    ]);

    // Raw components: metal 100k, making 20k, gem 30k, wastage 10k.
    // Eligible base: 150k. 10% SET discount = 15k discount => discounted line total = 135k + 10k wastage = 145k.
    const result = await service.create("shop-in", {
      customerName: "Walk-in Customer",
      invoiceCountry: "IN",
      currency: "INR",
      lineItems: [
        {
          label: "Bridal Set",
          category: "SET",
          quantity: 1,
          unitPrice: 145000,
          amount: 145000,
          metalCost: 100000,
          makingCost: 20000,
          gemstoneCost: 30000,
          wastageCost: 10000,
          setDiscountAmount: 15000,
        },
      ],
    } as any);

    expect(result.subtotal).toBe(145000);
    expect(result.taxableAmount).toBe(145000);

    // Metal scaled base: 90,000 => 3% tax = 2,700
    // Making scaled base: 18,000 => 5% tax = 900
    // Gemstone scaled base: 27,000 => 3% tax = 810
    // Wastage unscaled base: 10,000 => 3% tax = 300
    // Expected tax = 2,700 + 900 + 810 + 300 = 4,710
    expect(result.taxAmount).toBe(4710);
    expect(result.totalAmount).toBe(145000 + 4710);
  });

  it("satisfies quantity > 1 monetary invariant (rounded amount === rounded unitPrice × quantity) and preserves discountAmount / setDiscountAmount", async () => {
    mockPrisma.shop.findUnique.mockResolvedValue({
      id: "shop-np",
      country: "NP",
      currency: "NPR",
      vatNumber: null,
      vatRegistrationStatus: "NOT_REGISTERED",
      panNumber: null,
      invoiceSettings: {},
    });
    mockPrisma.taxRuleConfig.findMany.mockResolvedValue([]);

    // Raw components per unit: metal 100000, making 20000, gemstone 30000, wastage 5000 (raw sum = 155000)
    // 10% SET discount on eligible (150000) = 15000 discount => per unit price = 140000.
    // Quantity = 2 => amount = 280000.
    const resultQty2 = await service.create("shop-np", {
      customerName: "Customer 2",
      invoiceCountry: "NP",
      currency: "NPR",
      lineItems: [
        {
          label: "Gold Set Double",
          category: "SET",
          quantity: 2,
          unitPrice: 140000,
          amount: 280000,
          metalCost: 100000,
          makingCost: 20000,
          gemstoneCost: 30000,
          wastageCost: 5000,
          setDiscountAmount: 15000,
          discountAmount: 15000,
        },
      ],
    } as any);

    expect(resultQty2.subtotal).toBe(280000);
    const linesQty2 = resultQty2.lineItems as Array<any>;
    expect(linesQty2.length).toBe(4); // Metal, Wastage, Making, Gemstone
    let sumQty2 = 0;
    for (const li of linesQty2) {
      expect(li.quantity).toBe(2);
      expect(li.amount).toBe(Math.round(li.unitPrice * li.quantity * 100) / 100);
      expect(li.setDiscountAmount).toBe(15000);
      expect(li.discountAmount).toBe(15000);
      sumQty2 += li.amount;
    }
    expect(sumQty2).toBe(280000);

    // Quantity = 3 with fractional numbers
    // Raw components per unit: metal 33333.33, making 11111.11, gem 5555.56 (eligible = 50000)
    // 10% discount => per unit price = 45000.
    // Quantity = 3 => amount = 135000.
    const resultQty3 = await service.create("shop-np", {
      customerName: "Customer 3",
      invoiceCountry: "NP",
      currency: "NPR",
      lineItems: [
        {
          label: "Gold Set Triple",
          category: "SET",
          quantity: 3,
          unitPrice: 45000,
          amount: 135000,
          metalCost: 33333.33,
          makingCost: 11111.11,
          gemstoneCost: 5555.56,
          setDiscountAmount: 5000,
        },
      ],
    } as any);

    expect(resultQty3.subtotal).toBe(135000);
    const linesQty3 = resultQty3.lineItems as Array<any>;
    let sumQty3 = 0;
    for (const li of linesQty3) {
      expect(li.quantity).toBe(3);
      expect(li.amount).toBe(Math.round(li.unitPrice * li.quantity * 100) / 100);
      expect(li.setDiscountAmount).toBe(5000);
      sumQty3 += li.amount;
    }
    expect(sumQty3).toBe(135000);
  });

  it.each([100, 0.01, 100.01])(
    "persists an indivisible %.2f residual for quantity 3 using a high-precision unit price",
    async (targetResidual) => {
      mockPrisma.shop.findUnique.mockResolvedValue({
        id: "shop-np",
        country: "NP",
        currency: "NPR",
        vatNumber: null,
        vatRegistrationStatus: "NOT_REGISTERED",
        panNumber: null,
        invoiceSettings: {},
      });
      mockPrisma.taxRuleConfig.findMany.mockResolvedValue([]);

      const result = await service.create("shop-np", {
        customerName: "Fractional allocation customer",
        invoiceCountry: "NP",
        currency: "NPR",
        lineItems: [
          {
            label: "Discounted metal allocation",
            category: "SET",
            quantity: 3,
            unitPrice: targetResidual / 3,
            amount: targetResidual,
            metalCost: 100,
          },
        ],
      } as any);

      // Invoice.lineItems is the persisted JSON financial representation.
      const [persistedLine] = result.lineItems as Array<{
        quantity: number;
        unitPrice: number;
        amount: number;
      }>;
      expect(persistedLine.quantity).toBe(3);
      expect(persistedLine.amount).toBe(targetResidual);
      expect(persistedLine.unitPrice).toBeCloseTo(targetResidual / 3, 10);
      expect(
        Math.round(persistedLine.unitPrice * persistedLine.quantity * 100) /
          100,
      ).toBe(persistedLine.amount);
    },
  );

  describe("Payment State and Confirmation", () => {
    it("should keep invoice UNPAID and record payment as PENDING when non-cash CARD is unconfirmed", async () => {
      mockPrisma.invoicePayment.findUnique.mockResolvedValue(null);
      mockPrisma.invoice.findFirst.mockResolvedValue({
        id: "inv-card-test",
        shopId: "shop-np",
        currency: "NPR",
        totalAmount: 1000,
        paidAmount: 0,
        balanceDue: 1000,
        status: "UNPAID",
        paymentStatus: "UNPAID",
      });

      mockPrisma.invoicePayment.create.mockResolvedValueOnce({
        id: "pay-1",
        invoiceId: "inv-card-test",
        amount: new Prisma.Decimal(1000),
        method: "CARD",
        status: "PENDING",
        verificationMode: "UNVERIFIED",
        verifiedAt: null,
      });

      const result = await service.recordPayment("inv-card-test", "shop-np", {
        amount: 1000,
        paymentMethod: "CARD",
      });

      expect(result.status).toBe("UNPAID");
      expect(result.recordedPayment.status).toBe("PENDING");
      expect(mockAccounting.postInvoicePayment).not.toHaveBeenCalled();
    });

    it("should mark invoice PAID and record payment as RECEIVED when CASH is received", async () => {
      mockPrisma.invoicePayment.findUnique.mockResolvedValue(null);
      mockPrisma.invoice.findFirst.mockResolvedValue({
        id: "inv-cash-test",
        shopId: "shop-np",
        currency: "NPR",
        totalAmount: 1000,
        paidAmount: 0,
        balanceDue: 1000,
        status: "UNPAID",
        paymentStatus: "UNPAID",
      });
      mockPrisma.invoice.updateMany.mockResolvedValueOnce({ count: 1 });
      mockPrisma.invoicePayment.create.mockResolvedValueOnce({
        id: "pay-cash-1",
        invoiceId: "inv-cash-test",
        amount: new Prisma.Decimal(1000),
        method: "CASH",
        status: "RECEIVED",
        verificationMode: "CASH_AUTO",
        verifiedAt: new Date(),
      });
      mockPrisma.invoicePayment.findMany.mockResolvedValueOnce([{ method: "CASH" }]);
      mockPrisma.invoice.findUniqueOrThrow.mockResolvedValueOnce({
        id: "inv-cash-test",
        balanceDue: 0,
      });
      mockPrisma.invoice.update.mockResolvedValueOnce({
        id: "inv-cash-test",
        status: "PAID",
        paymentStatus: "PAID",
        paidAmount: 1000,
        balanceDue: 0,
      });

      const result = await service.recordPayment("inv-cash-test", "shop-np", {
        amount: 1000,
        paymentMethod: "CASH",
      });

      expect(result.status).toBe("PAID");
      expect(result.recordedPayment.status).toBe("RECEIVED");
      expect(mockAccounting.postInvoicePayment).toHaveBeenCalled();
    });

    it("should allow confirming a pending payment and transition invoice to PAID", async () => {
      mockPrisma.invoicePayment.findFirst.mockResolvedValueOnce({
        id: "pay-pending-1",
        invoiceId: "inv-conf-test",
        amount: new Prisma.Decimal(1000),
        status: "PENDING",
        invoice: { id: "inv-conf-test", shopId: "shop-np", currency: "NPR" },
      });
      mockPrisma.invoicePayment.findUnique.mockResolvedValueOnce({
        id: "pay-pending-1",
        status: "PENDING",
      });
      mockPrisma.invoice.findFirst.mockResolvedValue({
        id: "inv-conf-test",
        shopId: "shop-np",
        currency: "NPR",
        totalAmount: 1000,
        paidAmount: 0,
        balanceDue: 1000,
        status: "UNPAID",
      });
      mockPrisma.invoice.updateMany.mockResolvedValueOnce({ count: 1 });
      mockPrisma.invoicePayment.update.mockResolvedValueOnce({
        id: "pay-pending-1",
        status: "RECEIVED",
        confirmedByUserId: "staff-1",
        verificationMode: "MANUAL",
        terminalReference: "POS-TERM-8899",
      });
      mockPrisma.invoicePayment.findMany.mockResolvedValueOnce([{ method: "CARD" }]);
      mockPrisma.invoice.findUniqueOrThrow.mockResolvedValueOnce({
        id: "inv-conf-test",
        balanceDue: 0,
      });
      mockPrisma.invoice.update.mockResolvedValueOnce({
        id: "inv-conf-test",
        status: "PAID",
        paymentStatus: "PAID",
        paidAmount: 1000,
        balanceDue: 0,
      });

      const result = await service.confirmPayment(
        "inv-conf-test",
        "pay-pending-1",
        "shop-np",
        "staff-1",
        { terminalReference: "POS-TERM-8899" },
      );

      expect(result.status).toBe("PAID");
      expect(result.confirmedPayment.status).toBe("RECEIVED");
      expect(result.confirmedPayment.terminalReference).toBe("POS-TERM-8899");
      expect(mockAccounting.postInvoicePayment).toHaveBeenCalled();
    });
  });
});
