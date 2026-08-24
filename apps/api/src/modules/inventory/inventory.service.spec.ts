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
});
