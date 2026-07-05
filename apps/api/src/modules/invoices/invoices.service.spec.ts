import { Test, TestingModule } from "@nestjs/testing";
import { PrismaService } from "../../prisma/prisma.service";
import { PlanLimitsService } from "../core/subscriptions/plan-limits.service";
import { InvoicesService } from "./invoices.service";

const mockPrisma = {
  invoice: {
    findFirst: jest.fn(),
    create: jest.fn(),
  },
  shop: {
    findUnique: jest.fn(),
  },
};
const mockPlanLimits = { checkInvoiceLimit: jest.fn() };

describe("InvoicesService.create (money precision)", () => {
  let service: InvoicesService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPlanLimits.checkInvoiceLimit.mockResolvedValue(undefined);
    mockPrisma.invoice.findFirst.mockResolvedValue(null);
    mockPrisma.shop.findUnique.mockResolvedValue({ country: "NP" });
    mockPrisma.invoice.create.mockImplementation(({ data }: any) => Promise.resolve({ id: "inv-1", ...data }));

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        InvoicesService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: PlanLimitsService, useValue: mockPlanLimits },
      ],
    }).compile();
    service = moduleRef.get<InvoicesService>(InvoicesService);
  });

  it("rounds subtotal, tax and total to 2 decimals", async () => {
    await service.create("shop-1", {
      customerName: "Test",
      lineItems: [{ amount: 0.1 }, { amount: 0.2 }] as any,
      taxRate: 0.13,
    } as any);

    const data = mockPrisma.invoice.create.mock.calls[0][0].data;
    expect(data.subtotal).toBe(0.3); // 0.1 + 0.2, not 0.30000000000000004
    expect(data.taxAmount).toBe(0.04); // 0.3 * 0.13 = 0.039 -> 0.04
    expect(data.totalAmount).toBe(0.34);
    expect(data.balanceDue).toBe(0.34);
  });

  it("forces tax to zero for tax-exempt invoices regardless of rate", async () => {
    await service.create("shop-1", {
      customerName: "Test",
      lineItems: [{ amount: 100 }] as any,
      taxRate: 0.13,
      isTaxExempt: true,
    } as any);

    const data = mockPrisma.invoice.create.mock.calls[0][0].data;
    expect(data.taxAmount).toBe(0);
    expect(data.totalAmount).toBe(100);
  });

  it("applies discount after tax with rounding", async () => {
    await service.create("shop-1", {
      customerName: "Test",
      lineItems: [{ amount: 1234.5 }] as any,
      taxRate: 0.13,
      discountAmount: 0.005,
    } as any);

    const data = mockPrisma.invoice.create.mock.calls[0][0].data;
    expect(data.subtotal).toBe(1234.5);
    expect(data.taxAmount).toBe(160.49); // 1234.5 * 0.13 = 160.485 -> 160.49
    expect(data.discountAmount).toBe(0.01); // 0.005 -> 0.01
    expect(data.totalAmount).toBe(1394.98); // 1234.5 + 160.49 - 0.01
  });

  it("derives currency from the shop's country when none is supplied", async () => {
    mockPrisma.shop.findUnique.mockResolvedValue({ country: "IN" });
    await service.create("shop-1", {
      customerName: "Test",
      lineItems: [{ amount: 100 }] as any,
    } as any);

    const data = mockPrisma.invoice.create.mock.calls[0][0].data;
    expect(data.currency).toBe("INR");
  });

  it("falls back to NPR when the shop country is unknown", async () => {
    mockPrisma.shop.findUnique.mockResolvedValue({ country: "ZZ" });
    await service.create("shop-1", {
      customerName: "Test",
      lineItems: [{ amount: 100 }] as any,
    } as any);

    const data = mockPrisma.invoice.create.mock.calls[0][0].data;
    expect(data.currency).toBe("NPR");
  });

  it("respects an explicit currency from the DTO without a shop lookup", async () => {
    await service.create("shop-1", {
      customerName: "Test",
      lineItems: [{ amount: 100 }] as any,
      currency: "AED",
    } as any);

    const data = mockPrisma.invoice.create.mock.calls[0][0].data;
    expect(data.currency).toBe("AED");
    expect(mockPrisma.shop.findUnique).not.toHaveBeenCalled();
  });
});
