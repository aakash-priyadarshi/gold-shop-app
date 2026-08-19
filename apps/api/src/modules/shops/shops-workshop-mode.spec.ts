import { ForbiddenException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { RedisService } from "../../common";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { PlanLimitsService } from "../core/subscriptions/plan-limits.service";
import { SellerSubscriptionsService } from "../core/subscriptions/seller-subscriptions.service";
import { PlatformConfigService } from "../platform-config/platform-config.service";
import { ContentModerationService } from "./content-moderation.service";
import { ShopPriceRebaseService } from "./shop-price-rebase.service";
import { SellerEngagementService } from "../core/seller-performance/seller-engagement.service";
import { ShopsService } from "./shops.service";

describe("ShopsService workshop mode gating", () => {
  let service: ShopsService;
  const prisma = {
    user: { findUnique: jest.fn() },
    shop: {
      findFirst: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
    },
  };
  const planLimits = { checkFeature: jest.fn() };
  const priceRebase = {
    ensureShopPricesMatchCurrency: jest.fn().mockResolvedValue(null),
    rebaseShopPrices: jest.fn(),
  };
  const audit = { log: jest.fn() };

  const shop = (workshopMode: boolean) => ({
    id: "shop-1",
    userId: "user-1",
    country: "AE",
    currency: "AED",
    sellerTier: "STANDARD",
    vatNumber: null,
    workshopMode,
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    prisma.user.findUnique.mockResolvedValue({ activeShopId: "shop-1" });
    prisma.shop.update.mockImplementation(({ data }) =>
      Promise.resolve({ ...shop(Boolean(data.workshopMode)), ...data }),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShopsService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: audit },
        { provide: RedisService, useValue: {} },
        { provide: PlatformConfigService, useValue: {} },
        { provide: ContentModerationService, useValue: {} },
        { provide: SellerSubscriptionsService, useValue: {} },
        { provide: PlanLimitsService, useValue: planLimits },
        { provide: ShopPriceRebaseService, useValue: priceRebase },
        {
          provide: SellerEngagementService,
          useValue: { processReferralSignup: jest.fn() },
        },
      ],
    }).compile();
    service = module.get(ShopsService);
  });

  it("checks the live plan before enabling workshop mode", async () => {
    prisma.shop.findFirst.mockResolvedValue(shop(false));
    planLimits.checkFeature.mockResolvedValue(undefined);

    await service.updateShopSettings("user-1", { workshopMode: true });

    expect(planLimits.checkFeature).toHaveBeenCalledWith(
      "shop-1",
      "workshopManufacturing",
    );
    expect(prisma.shop.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ workshopMode: true }),
      }),
    );
  });

  it("does not persist workshop mode when the plan denies it", async () => {
    prisma.shop.findFirst.mockResolvedValue(shop(false));
    planLimits.checkFeature.mockRejectedValue(
      new ForbiddenException("Workshop manufacturing is not enabled"),
    );

    await expect(
      service.updateShopSettings("user-1", { workshopMode: true }),
    ).rejects.toThrow(ForbiddenException);
    expect(prisma.shop.update).not.toHaveBeenCalled();
  });

  it("allows workshop mode to be disabled after a plan downgrade", async () => {
    prisma.shop.findFirst.mockResolvedValue(shop(true));

    await service.updateShopSettings("user-1", { workshopMode: false });

    expect(planLimits.checkFeature).not.toHaveBeenCalled();
    expect(prisma.shop.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ workshopMode: false }),
      }),
    );
  });
});
