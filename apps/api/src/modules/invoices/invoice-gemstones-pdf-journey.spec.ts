import { CurrencyCode } from "@prisma/client";
import { InvoicesService } from "./invoices.service";
import { SaleBuilderService } from "./sale-builder.service";
import { InvoicePdfService } from "./invoice-pdf.service";
import { formatGemstonePdfSpec } from "./pdf/templates/themed.template";

describe("Product -> Invoice -> PDF Gemstones User Journey", () => {
  let invoicesService: InvoicesService;
  let saleBuilderService: SaleBuilderService;
  let invoicePdfService: InvoicePdfService;

  let persistedInvoice: any = null;

  const mockPrisma: any = {
    shop: {
      findUnique: jest.fn().mockResolvedValue({
        id: "shop-1",
        shopName: "Diamond Palace",
        country: "NP",
        currency: CurrencyCode.NPR,
        contactPhone: "+9779800000000",
        contactEmail: "shop@example.com",
        address: "New Road",
        city: "Kathmandu",
        state: "Bagmati",
        vatNumber: "123456789",
        vatRegistrationStatus: "VERIFIED",
        invoiceSettings: {
          shopNameOnBill: "Diamond Palace",
          billTemplateId: "classic",
        },
      }),
    },
    inventoryItem: {
      findMany: jest.fn().mockResolvedValue([
        {
          id: "prod-1",
          nameEn: "Gold 18K Lab Diamond Solitaire Ring",
          stockQuantity: 10,
          status: "AVAILABLE",
        },
      ]),
    },
    invoiceSequence: {
      upsert: jest.fn().mockResolvedValue({ lastNumber: 1 }),
    },
    invoice: {
      create: jest.fn().mockImplementation(async ({ data }) => {
        persistedInvoice = {
          id: "inv-1",
          ...data,
          issuedAt: new Date(),
          shop: await mockPrisma.shop.findUnique({ where: { id: data.shopId } }),
          payments: [],
        };
        return persistedInvoice;
      }),
      findFirst: jest.fn().mockImplementation(async () => persistedInvoice),
    },
    taxRuleConfig: { findMany: jest.fn().mockResolvedValue([]) },
    posSession: { findFirst: jest.fn() },
    posRegister: { findFirst: jest.fn() },
    posShift: { findFirst: jest.fn() },
    $transaction: jest.fn(async (cb: (tx: any) => any) => cb(mockPrisma)),
  };

  const mockPlanLimits = {
    checkInvoiceLimit: jest.fn().mockResolvedValue(true),
  };

  const mockTaxEngine = {
    calculateTax: jest.fn().mockResolvedValue({
      taxTotal: 750,
      components: { subtotalBeforeTax: 150000 },
      taxes: [{ name: "Skill Promotion Fee", rate: 0.005, amount: 750 }],
      meta: { source: "NEPAL_STATUTORY" },
    }),
  };

  const mockAccounting = {
    prepareMonetaryContext: jest.fn().mockResolvedValue({}),
    postInvoiceIssuance: jest.fn().mockResolvedValue({}),
  };

  const mockStockCommit = {
    commit: jest.fn().mockResolvedValue({}),
    restoreForVoid: jest.fn().mockResolvedValue({}),
  };

  const mockMail = { sendHtml: jest.fn(), send: jest.fn() };
  const mockSms = { send: jest.fn(), isConfigured: jest.fn().mockReturnValue(false) };

  beforeEach(() => {
    persistedInvoice = null;
    saleBuilderService = new SaleBuilderService();
    invoicePdfService = new InvoicePdfService(mockPrisma as any);
    invoicesService = new InvoicesService(
      mockPrisma as any,
      mockPlanLimits as any,
      mockTaxEngine as any,
      mockAccounting as any,
      mockStockCommit as any,
      saleBuilderService,
      mockMail as any,
      mockSms as any,
      invoicePdfService,
    );
  });

  it("completes full flow with breakdown expansion: Product -> Save -> Reload -> Add to Invoice -> Save Invoice -> Generate PDF", async () => {
    // 1. Product Saved & Reloaded from Catalog
    const product = {
      id: "prod-1",
      nameEn: "Gold 18K Lab Diamond Solitaire Ring",
      sku: "SOL-18K-001",
      jewelleryType: "RING" as any,
      totalWeightGrams: 4.5,
      metalValueNpr: 60000,
      makingChargeNpr: 10000,
      gemstoneValueNpr: 80000,
      taxNpr: 0,
      totalPriceNpr: 150000,
      hallmarkNumber: "HM-7788",
      assayOffice: "KATHMANDU",
      composition: { metalType: "GOLD_18K" },
      gemstones: [
        {
          type: "DIAMOND",
          origin: "LAB",
          shape: "Oval",
          cut: "Oval",
          caratWeight: 1.5,
          color: "D",
          clarity: "VVS1",
          qualityTier: "PREMIUM",
          cutGrade: "Excellent",
          gradingLab: "IGI",
          certNumber: "IGI-123",
          cost: 80000,
          count: 1,
        },
      ],
    };

    // 2. Add to Invoice via SaleBuilderService
    const saleLines = saleBuilderService.fromInventoryItem(product);
    expect(saleLines).toHaveLength(1);
    const saleLine = saleLines[0];

    // Assert details contains only SKU/Hallmark, no English gemstone prose
    expect(saleLine.details).toBe("SOL-18K-001 · Hallmark: HM-7788 · Assay: KATHMANDU");
    expect(saleLine.details).not.toContain("Lab-grown");
    expect(saleLine.details).not.toContain("Color D");

    // 3. Save Invoice via InvoicesService.create
    const created = await invoicesService.create("shop-1", {
      customerName: "Sita Sharma",
      customerPhone: "+9779812345678",
      currency: CurrencyCode.NPR,
      invoiceCountry: "NP",
      lineItems: [
        {
          label: saleLine.label,
          category: saleLine.category,
          quantity: saleLine.quantity,
          unitPrice: saleLine.unitPrice,
          amount: saleLine.amount,
          details: saleLine.details,
          inventoryItemId: saleLine.inventoryItemId,
          metalCost: saleLine.metalCost,
          makingCost: saleLine.makingCost,
          gemstoneCost: saleLine.gemstoneCost,
          gemstones: saleLine.gemstones,
        },
      ],
    });

    expect(created).toBeDefined();
    expect(persistedInvoice).toBeDefined();

    // 4. Assert persisted invoice JSON contains structured gemstone snapshot on GEMSTONE line
    const savedLines = persistedInvoice.lineItems as any[];
    expect(savedLines).toHaveLength(3); // Expanded to METAL, MAKING, GEMSTONE
    const gemstoneLine = savedLines.find((l) => l.category === "GEMSTONE");
    expect(gemstoneLine).toBeDefined();

    expect(gemstoneLine.gemstones).toBeDefined();
    expect(gemstoneLine.gemstones).toEqual([
      expect.objectContaining({
        type: "DIAMOND",
        origin: "LAB",
        shape: "Oval",
        color: "D",
        clarity: "VVS1",
        caratWeight: 1.5,
        cutGrade: "Excellent",
        gradingLab: "IGI",
        certNumber: "IGI-123",
      }),
    ]);
    expect(gemstoneLine.details).toBe("SOL-18K-001 · Hallmark: HM-7788 · Assay: KATHMANDU");

    // 5. Generate PDF Context via InvoicePdfService
    const pdfContext = await (invoicePdfService as any).buildContext(persistedInvoice);

    expect(pdfContext.lineItems).toHaveLength(3);
    const pdfGemLine = pdfContext.lineItems.find((l: any) => l.gemstones?.length);
    expect(pdfGemLine).toBeDefined();

    expect(pdfGemLine.gemstones).toEqual([
      {
        type: "DIAMOND",
        origin: "LAB",
        shape: "Oval",
        cut: "Oval",
        caratWeight: 1.5,
        sizeMm: undefined,
        color: "D",
        clarity: "VVS1",
        qualityTier: "PREMIUM",
        cutGrade: "Excellent",
        gradingLab: "IGI",
        certNumber: "IGI-123",
        count: 1,
      },
    ]);

    // 6. Assert rendered structured output matches requirement
    const renderedSpec = formatGemstonePdfSpec(pdfGemLine.gemstones[0]);
    expect(renderedSpec).toContain("DIAMOND");
    expect(renderedSpec).toContain("LAB");
    expect(renderedSpec).toContain("Oval");
    expect(renderedSpec).toContain("D");
    expect(renderedSpec).toContain("VVS1");
    expect(renderedSpec).toContain("1.5 ct");
    expect(renderedSpec).toContain("IGI");
    expect(renderedSpec).toContain("IGI-123");

    // Exact string
    expect(renderedSpec).toBe(
      "DIAMOND · LAB · Oval · Excellent · D · VVS1 · 1.5 ct · IGI · IGI-123",
    );

    // 7. Verify PDF generation buffer completes without error
    const { buffer, filename } = await invoicePdfService.generatePdfBuffer("inv-1", "shop-1");
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(100);
    expect(filename).toMatch(/Invoice-.*\.pdf/);
  });

  it("completes full flow for a collapsed line item (e.g. PRODUCT line)", async () => {
    // 1. Direct line item with structured gemstone snapshot
    const created = await invoicesService.create("shop-1", {
      customerName: "Aakash Priyadarshi",
      customerPhone: "+9779812345678",
      currency: CurrencyCode.NPR,
      invoiceCountry: "NP",
      lineItems: [
        {
          label: "Gold 18K Lab Diamond Solitaire Ring",
          category: "RING",
          quantity: 1,
          unitPrice: 150000,
          amount: 150000,
          details: "SKU-SOL-1 · Hallmark: HM-2026",
          gemstones: [
            {
              type: "DIAMOND",
              origin: "LAB",
              shape: "Oval",
              cutGrade: "Excellent",
              caratWeight: 1.5,
              color: "D",
              clarity: "VVS1",
              gradingLab: "IGI",
              certNumber: "IGI-123",
            },
          ],
        },
      ],
    });

    expect(created).toBeDefined();
    expect(persistedInvoice).toBeDefined();

    // 2. Persisted line items has structured gemstones
    const savedLines = persistedInvoice.lineItems as any[];
    expect(savedLines).toHaveLength(1);
    expect(savedLines[0].gemstones).toEqual([
      expect.objectContaining({
        type: "DIAMOND",
        origin: "LAB",
        shape: "Oval",
        color: "D",
        clarity: "VVS1",
        caratWeight: 1.5,
        cutGrade: "Excellent",
        gradingLab: "IGI",
        certNumber: "IGI-123",
      }),
    ]);

    // 3. PDF Context
    const pdfContext = await (invoicePdfService as any).buildContext(persistedInvoice);
    expect(pdfContext.lineItems[0].gemstones).toHaveLength(1);
    const spec = formatGemstonePdfSpec(pdfContext.lineItems[0].gemstones[0]);
    expect(spec).toBe("DIAMOND · LAB · Oval · Excellent · D · VVS1 · 1.5 ct · IGI · IGI-123");
  });
});
