import { NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { PrismaService } from "../../prisma/prisma.service";
import { PlatformConfigService } from "../platform-config/platform-config.service";
import { SubscriptionPlansService } from "../subscriptions/subscription-plans.service";
import { CommissionService } from "./commission.service";

const mockPrisma = {
  order: { findUnique: jest.fn() },
  commissionLedger: { upsert: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
};
const mockPlatformConfig = { getPlatformCommissionRate: jest.fn() };
const mockPlans = { getActiveShopPlan: jest.fn() };

describe("CommissionService.createCommissionForOrder (race-safety)", () => {
  let service: CommissionService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        CommissionService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: PlatformConfigService, useValue: mockPlatformConfig },
        { provide: SubscriptionPlansService, useValue: mockPlans },
      ],
    }).compile();
    service = moduleRef.get<CommissionService>(CommissionService);
  });

  it("throws when the order does not exist", async () => {
    mockPrisma.order.findUnique.mockResolvedValue(null);
    await expect(service.createCommissionForOrder("nope")).rejects.toThrow(NotFoundException);
  });

  it("uses an atomic upsert (no findUnique-then-create race)", async () => {
    mockPrisma.order.findUnique.mockResolvedValue({
      id: "order-1",
      shopId: "shop-1",
      totalNpr: 1000,
      displayCurrency: "NPR",
      shop: {},
    });
    mockPlans.getActiveShopPlan.mockResolvedValue({ commissionPercent: 5 });
    mockPrisma.commissionLedger.upsert.mockResolvedValue({ id: "led-1" });

    await service.createCommissionForOrder("order-1");

    expect(mockPrisma.commissionLedger.upsert).toHaveBeenCalledTimes(1);
    expect(mockPrisma.commissionLedger.create).not.toHaveBeenCalled();
    const arg = mockPrisma.commissionLedger.upsert.mock.calls[0][0];
    expect(arg.where).toEqual({ orderId: "order-1" });
    // 5% of 1000 = 50
    expect(arg.create.amount).toBe(50);
    expect(arg.update.amount).toBe(50);
  });

  it("falls back to the platform rate when plan lookup fails", async () => {
    mockPrisma.order.findUnique.mockResolvedValue({
      id: "order-2",
      shopId: "shop-2",
      totalNpr: 2000,
      displayCurrency: "NPR",
      shop: {},
    });
    mockPlans.getActiveShopPlan.mockRejectedValue(new Error("boom"));
    mockPlatformConfig.getPlatformCommissionRate.mockResolvedValue(10);
    mockPrisma.commissionLedger.upsert.mockResolvedValue({ id: "led-2" });

    await service.createCommissionForOrder("order-2");

    const arg = mockPrisma.commissionLedger.upsert.mock.calls[0][0];
    // 10% of 2000 = 200
    expect(arg.create.amount).toBe(200);
  });
});
