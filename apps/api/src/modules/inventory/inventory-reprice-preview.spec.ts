import { Test, TestingModule } from "@nestjs/testing";
import { PrismaService } from "../../prisma/prisma.service";
import { MarketRatesService } from "../core/market-rates/market-rates.service";
import { PlanLimitsService } from "../core/subscriptions/plan-limits.service";
import { ShopPriceRebaseService } from "../shops/shop-price-rebase.service";
import { InventoryService } from "./inventory.service";

describe("InventoryService.repricePreview market-rate normalization", () => {
  const prisma = {
    shop: { findFirst: jest.fn() },
    inventoryItem: { findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    shopPriceOverride: { findMany: jest.fn() },
  } as any;
  const marketRates = { getMarketRates: jest.fn() } as any;
  let service: InventoryService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryService,
        { provide: PrismaService, useValue: prisma },
        { provide: PlanLimitsService, useValue: {} },
        { provide: MarketRatesService, useValue: marketRates },
        { provide: ShopPriceRebaseService, useValue: {} },
      ],
    }).compile();
    service = module.get(InventoryService);
  });

  it("uses production market keys for both SET components and regular inventory items", async () => {
    const component = (id: string, metal: string, purity: string) => ({
      id,
      nameEn: id,
      sku: id,
      composition: { baseAlloy: { metal, purity } },
      totalWeightGrams: 1,
      metalValueNpr: 0,
      makingChargeNpr: 0,
      gemstoneValueNpr: 0,
      taxNpr: 0,
      totalPriceNpr: 0,
    });
    const pairs = [
      ["PLATINUM", "950"],
      ["PLATINUM", "900"],
      ["PALLADIUM", "950"],
      ["PALLADIUM", "500"],
    ];

    prisma.shop.findFirst.mockResolvedValue({
      id: "shop-1",
      userId: "user-1",
      country: "NP",
      currency: "NPR",
      makingChargePercent: 10,
    });
    prisma.shopPriceOverride.findMany.mockResolvedValue([]);
    prisma.inventoryItem.findMany.mockResolvedValue([
      {
        id: "set-1",
        nameEn: "Mixed precious-metal set",
        sku: "SET-1",
        jewelleryType: "SET",
        totalWeightGrams: 4,
        composition: { kind: "SET" },
        metalValueNpr: 0,
        makingChargeNpr: 0,
        gemstoneValueNpr: 0,
        taxNpr: 0,
        totalPriceNpr: 0,
        setDiscountType: null,
        setDiscountValue: null,
        setComponents: pairs.map(([metal, purity], index) => ({
          componentItem: component(`set-component-${index}`, metal, purity),
        })),
      },
      ...pairs.map(([metal, purity], index) => ({
        ...component(`regular-${index}`, metal, purity),
        jewelleryType: "RING",
        setDiscountType: null,
        setDiscountValue: null,
        setComponents: [],
      })),
    ]);
    marketRates.getMarketRates.mockResolvedValue({
      metals: {
        PLATINUM_PT950: 8000,
        PLATINUM_PT900: 7500,
        PALLADIUM_PD950: 6000,
        PALLADIUM_PD500: 3000,
      },
    });

    const result = await service.repricePreview("shop-1", "user-1", {
      mode: "FROM_MARKET_RATES",
    });

    expect(result.skipped).toEqual([]);
    expect(result.items[0].new.metalValueNpr).toBe(24500);
    expect(
      result.items.slice(1).map((item) => ({
        metalType: item.metalType,
        ratePerGram: item.ratePerGram,
        metalValueNpr: item.new.metalValueNpr,
      })),
    ).toEqual([
      { metalType: "PLATINUM_950", ratePerGram: 8000, metalValueNpr: 8000 },
      { metalType: "PLATINUM_900", ratePerGram: 7500, metalValueNpr: 7500 },
      { metalType: "PALLADIUM_950", ratePerGram: 6000, metalValueNpr: 6000 },
      { metalType: "PALLADIUM_500", ratePerGram: 3000, metalValueNpr: 3000 },
    ]);
  });

  it("keeps SET preview and saved totals at two-decimal currency precision", async () => {
    prisma.shop.findFirst.mockResolvedValue({
      id: "shop-1",
      userId: "user-1",
      country: "NP",
      currency: "NPR",
      makingChargePercent: 0,
    });
    prisma.shopPriceOverride.findMany.mockResolvedValue([]);
    prisma.inventoryItem.findMany.mockResolvedValue([
      {
        id: "set-1",
        nameEn: "Decimal set",
        sku: "SET-DECIMAL",
        jewelleryType: "SET",
        totalWeightGrams: 1,
        composition: { kind: "SET" },
        metalValueNpr: 0,
        makingChargeNpr: 0,
        gemstoneValueNpr: 0,
        taxNpr: 0,
        totalPriceNpr: 0,
        setDiscountType: "FIXED",
        setDiscountValue: 0.5,
        setComponents: [
          {
            componentItem: {
              id: "component-1",
              nameEn: "Platinum component",
              sku: "COMPONENT-1",
              composition: { baseAlloy: { metal: "PLATINUM", purity: "950" } },
              totalWeightGrams: 1,
              metalValueNpr: 0,
              makingChargeNpr: 0,
              gemstoneValueNpr: 0,
              taxNpr: 0,
              totalPriceNpr: 0,
            },
          },
        ],
      },
    ]);
    marketRates.getMarketRates.mockResolvedValue({
      metals: { PLATINUM_PT950: 101 },
    });

    const preview = await service.repricePreview("shop-1", "user-1", {
      mode: "FROM_MARKET_RATES",
    });

    expect(preview.items[0].new.totalPriceNpr).toBe(100.5);

    prisma.inventoryItem.findUnique.mockResolvedValue({
      id: "set-1",
      shopId: "shop-1",
      jewelleryType: "SET",
      metalValueNpr: 101,
      makingChargeNpr: 0,
      gemstoneValueNpr: 0,
      taxNpr: 0,
      setDiscountType: "FIXED",
      setDiscountValue: 0.5,
    });
    prisma.inventoryItem.update.mockImplementation(async ({ data }: any) => ({
      id: "set-1",
      ...data,
    }));

    const updated = await service.update("set-1", "user-1", {
      setDiscountValue: 0.5,
    });

    expect(updated.totalPriceNpr).toBe(preview.items[0].new.totalPriceNpr);
  });

  it("retains cents for SET components and regular items when repricing from fractional rates", async () => {
    const pricedItem = (id: string) => ({
      id,
      nameEn: id,
      sku: id,
      composition: { baseAlloy: { metal: "PLATINUM", purity: "950" } },
      totalWeightGrams: 1,
      metalValueNpr: 0,
      makingChargeNpr: 0,
      gemstoneValueNpr: 0.1,
      taxNpr: 0.2,
      totalPriceNpr: 0,
    });
    prisma.shop.findFirst.mockResolvedValue({
      id: "shop-1",
      userId: "user-1",
      country: "NP",
      currency: "NPR",
      makingChargePercent: 12.5,
    });
    prisma.shopPriceOverride.findMany.mockResolvedValue([]);
    prisma.inventoryItem.findMany.mockResolvedValue([
      {
        ...pricedItem("set-1"),
        jewelleryType: "SET",
        composition: { kind: "SET" },
        setDiscountType: null,
        setDiscountValue: null,
        setComponents: [{ componentItem: pricedItem("set-component-1") }],
      },
      {
        ...pricedItem("regular-1"),
        jewelleryType: "RING",
        setDiscountType: null,
        setDiscountValue: null,
        setComponents: [],
      },
    ]);
    marketRates.getMarketRates.mockResolvedValue({
      metals: { PLATINUM_PT950: 101.25 },
    });

    const preview = await service.repricePreview("shop-1", "user-1", {
      mode: "FROM_MARKET_RATES",
      makingChargeMode: "RECALC_PERCENT",
      makingChargePercent: 12.5,
    });

    expect(preview.items.map((item) => item.new)).toEqual([
      {
        metalValueNpr: 101.25,
        makingChargeNpr: 12.66,
        gemstoneValueNpr: 0.1,
        taxNpr: 0.2,
        totalPriceNpr: 114.21,
      },
      {
        metalValueNpr: 101.25,
        makingChargeNpr: 12.66,
        gemstoneValueNpr: 0.1,
        taxNpr: 0.2,
        totalPriceNpr: 114.21,
      },
    ]);
  });
});
