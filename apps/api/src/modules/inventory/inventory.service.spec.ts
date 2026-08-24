import { Test, TestingModule } from "@nestjs/testing";
import { InventoryService } from "./inventory.service";
import { PrismaService } from "../../prisma/prisma.service";
import { PlanLimitsService } from "../core/subscriptions/plan-limits.service";
import { MarketRatesService } from "../core/market-rates/market-rates.service";
import { ShopPriceRebaseService } from "../shops/shop-price-rebase.service";

describe("InventoryService - SET price update regression tests", () => {
  let service: InventoryService;
  const mockPrisma: any = {
    inventoryItem: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    shop: {
      findFirst: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: PlanLimitsService, useValue: { checkProductLimit: jest.fn() } },
        { provide: MarketRatesService, useValue: { getMarketRates: jest.fn() } },
        { provide: ShopPriceRebaseService, useValue: { ensureShopPricesMatchCurrency: jest.fn() } },
      ],
    }).compile();

    service = module.get<InventoryService>(InventoryService);
  });

  it("preserves and reapplies PERCENT setDiscountType + setDiscountValue when updating SET price components", async () => {
    mockPrisma.inventoryItem.findUnique.mockResolvedValue({
      id: "item-set-1",
      shopId: "shop-1",
      jewelleryType: "SET",
      metalValueNpr: 100000,
      makingChargeNpr: 20000,
      gemstoneValueNpr: 30000,
      taxNpr: 0,
      totalPriceNpr: 135000,
      setDiscountType: "PERCENT",
      setDiscountValue: 10,
    });
    mockPrisma.shop.findFirst.mockResolvedValue({ id: "shop-1", userId: "user-1" });
    mockPrisma.inventoryItem.update.mockImplementation(({ data }: any) =>
      Promise.resolve({ id: "item-set-1", ...data }),
    );

    // Update makingChargeNpr from 20000 to 30000 (base sum: 100000 + 30000 + 30000 = 160000)
    // 10% discount = 16000 => totalPriceNpr = 144000
    const result = await service.update("item-set-1", "user-1", {
      makingChargeNpr: 30000,
    } as any);

    expect(mockPrisma.inventoryItem.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          makingChargeNpr: 30000,
          totalPriceNpr: 144000,
        }),
      }),
    );
    expect(result.totalPriceNpr).toBe(144000);
  });

  it("preserves and reapplies FIXED setDiscountType + setDiscountValue when updating SET price components", async () => {
    mockPrisma.inventoryItem.findUnique.mockResolvedValue({
      id: "item-set-2",
      shopId: "shop-1",
      jewelleryType: "SET",
      metalValueNpr: 100000,
      makingChargeNpr: 20000,
      gemstoneValueNpr: 30000,
      taxNpr: 0,
      totalPriceNpr: 140000,
      setDiscountType: "FIXED",
      setDiscountValue: 10000,
    });
    mockPrisma.shop.findFirst.mockResolvedValue({ id: "shop-1", userId: "user-1" });
    mockPrisma.inventoryItem.update.mockImplementation(({ data }: any) =>
      Promise.resolve({ id: "item-set-2", ...data }),
    );

    // Update metalValueNpr from 100000 to 120000 (base sum: 120000 + 20000 + 30000 = 170000)
    // Fixed discount = 10000 => totalPriceNpr = 160000
    const result = await service.update("item-set-2", "user-1", {
      metalValueNpr: 120000,
    } as any);

    expect(mockPrisma.inventoryItem.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          metalValueNpr: 120000,
          totalPriceNpr: 160000,
        }),
      }),
    );
    expect(result.totalPriceNpr).toBe(160000);
  });

  it("updates totalPriceNpr on discountValue-only update for SET", async () => {
    mockPrisma.inventoryItem.findUnique.mockResolvedValue({
      id: "item-set-3",
      shopId: "shop-1",
      jewelleryType: "SET",
      metalValueNpr: 100000,
      makingChargeNpr: 20000,
      gemstoneValueNpr: 30000,
      taxNpr: 0,
      totalPriceNpr: 135000,
      setDiscountType: "PERCENT",
      setDiscountValue: 10,
    });
    mockPrisma.shop.findFirst.mockResolvedValue({ id: "shop-1", userId: "user-1" });
    mockPrisma.inventoryItem.update.mockImplementation(({ data }: any) =>
      Promise.resolve({ id: "item-set-3", ...data }),
    );

    // Update discount from 10% to 20% on 150000 => totalPriceNpr = 120000
    const result = await service.update("item-set-3", "user-1", {
      setDiscountValue: 20,
    } as any);

    expect(mockPrisma.inventoryItem.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          setDiscountValue: 20,
          totalPriceNpr: 120000,
        }),
      }),
    );
    expect(result.totalPriceNpr).toBe(120000);
  });

  it("updates totalPriceNpr on discountType-only update for SET", async () => {
    mockPrisma.inventoryItem.findUnique.mockResolvedValue({
      id: "item-set-4",
      shopId: "shop-1",
      jewelleryType: "SET",
      metalValueNpr: 100000,
      makingChargeNpr: 20000,
      gemstoneValueNpr: 30000,
      taxNpr: 0,
      totalPriceNpr: 135000,
      setDiscountType: "PERCENT",
      setDiscountValue: 10,
    });
    mockPrisma.shop.findFirst.mockResolvedValue({ id: "shop-1", userId: "user-1" });
    mockPrisma.inventoryItem.update.mockImplementation(({ data }: any) =>
      Promise.resolve({ id: "item-set-4", ...data }),
    );

    // Switch discountType to FIXED (value 10 becomes 10 fixed discount on 150000 => 149990)
    const result = await service.update("item-set-4", "user-1", {
      setDiscountType: "FIXED",
    } as any);

    expect(mockPrisma.inventoryItem.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          setDiscountType: "FIXED",
          totalPriceNpr: 149990,
        }),
      }),
    );
    expect(result.totalPriceNpr).toBe(149990);
  });

  it("honors explicit clear of discount (setting to null or 0)", async () => {
    mockPrisma.inventoryItem.findUnique.mockResolvedValue({
      id: "item-set-5",
      shopId: "shop-1",
      jewelleryType: "SET",
      metalValueNpr: 100000,
      makingChargeNpr: 20000,
      gemstoneValueNpr: 30000,
      taxNpr: 0,
      totalPriceNpr: 135000,
      setDiscountType: "PERCENT",
      setDiscountValue: 10,
    });
    mockPrisma.shop.findFirst.mockResolvedValue({ id: "shop-1", userId: "user-1" });
    mockPrisma.inventoryItem.update.mockImplementation(({ data }: any) =>
      Promise.resolve({ id: "item-set-5", ...data }),
    );

    // Explicitly clear discount
    const result = await service.update("item-set-5", "user-1", {
      setDiscountType: null,
      setDiscountValue: null,
    } as any);

    expect(mockPrisma.inventoryItem.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          setDiscountType: null,
          setDiscountValue: null,
          totalPriceNpr: 150000,
        }),
      }),
    );
    expect(result.totalPriceNpr).toBe(150000);
  });

  it("updates price components and discount simultaneously", async () => {
    mockPrisma.inventoryItem.findUnique.mockResolvedValue({
      id: "item-set-6",
      shopId: "shop-1",
      jewelleryType: "SET",
      metalValueNpr: 100000,
      makingChargeNpr: 20000,
      gemstoneValueNpr: 30000,
      taxNpr: 0,
      totalPriceNpr: 135000,
      setDiscountType: "PERCENT",
      setDiscountValue: 10,
    });
    mockPrisma.shop.findFirst.mockResolvedValue({ id: "shop-1", userId: "user-1" });
    mockPrisma.inventoryItem.update.mockImplementation(({ data }: any) =>
      Promise.resolve({ id: "item-set-6", ...data }),
    );

    // Update metal to 150000 (base sum: 150000 + 20000 + 30000 = 200000) and discount to 15%
    // 15% of 200000 = 30000 => totalPriceNpr = 170000
    const result = await service.update("item-set-6", "user-1", {
      metalValueNpr: 150000,
      setDiscountValue: 15,
    } as any);

    expect(mockPrisma.inventoryItem.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          metalValueNpr: 150000,
          setDiscountValue: 15,
          totalPriceNpr: 170000,
        }),
      }),
    );
    expect(result.totalPriceNpr).toBe(170000);
  });
});
