import { Test, TestingModule } from "@nestjs/testing";
import { PrismaService } from "../../prisma/prisma.service";
import {
  FeatureNotEnabledException,
  PlanLimitExceededException,
  PlanLimitsService,
} from "./plan-limits.service";
import { SubscriptionPlansService } from "./subscription-plans.service";

// ─── Mock Plan Factory ────────────────────────────────────
function makePlan(overrides: Record<string, unknown> = {}) {
  return {
    id: "plan-1",
    displayName: "Test Plan",
    name: "PRO",
    maxProducts: null,
    maxInvoicesPerMonth: null,
    maxCatalogues: null,
    catalogueLimit: null,
    maxOrdersPerMonth: null,
    features: {},
    ...overrides,
  };
}

describe("PlanLimitsService", () => {
  let service: PlanLimitsService;
  let plansService: { getActiveShopPlan: jest.Mock };
  let prisma: Record<string, Record<string, jest.Mock>>;

  beforeEach(async () => {
    plansService = { getActiveShopPlan: jest.fn() };

    prisma = {
      inventoryItem: { count: jest.fn() },
      invoice: { count: jest.fn() },
      catalogue: { count: jest.fn() },
      catalogueItem: { count: jest.fn() },
      order: { count: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlanLimitsService,
        { provide: PrismaService, useValue: prisma },
        { provide: SubscriptionPlansService, useValue: plansService },
      ],
    }).compile();

    service = module.get(PlanLimitsService);
  });

  afterEach(() => jest.clearAllMocks());

  // ═══════════════════════════════════════════════════════
  // FEATURE GATING — checkFeature / hasFeature
  // ═══════════════════════════════════════════════════════

  describe("checkFeature()", () => {
    it("should pass when feature is enabled (true)", async () => {
      plansService.getActiveShopPlan.mockResolvedValue(
        makePlan({ features: { invoicing: true, crm: true } }),
      );
      await expect(service.checkFeature("shop1", "invoicing")).resolves.toBeUndefined();
    });

    it("should throw FeatureNotEnabledException when feature is false", async () => {
      plansService.getActiveShopPlan.mockResolvedValue(
        makePlan({ features: { invoicing: false } }),
      );
      await expect(service.checkFeature("shop1", "invoicing")).rejects.toThrow(
        FeatureNotEnabledException,
      );
    });

    it("should throw FeatureNotEnabledException when feature is missing from JSON", async () => {
      plansService.getActiveShopPlan.mockResolvedValue(
        makePlan({ features: {} }),
      );
      await expect(service.checkFeature("shop1", "apiAccess")).rejects.toThrow(
        FeatureNotEnabledException,
      );
    });

    it("should throw when features is null/undefined (no plan)", async () => {
      plansService.getActiveShopPlan.mockResolvedValue(
        makePlan({ features: null }),
      );
      await expect(service.checkFeature("shop1", "crm")).rejects.toThrow(
        FeatureNotEnabledException,
      );
    });

    it("should include correct metadata in exception", async () => {
      plansService.getActiveShopPlan.mockResolvedValue(
        makePlan({ displayName: "Free Plan", features: {} }),
      );
      try {
        await service.checkFeature("shop1", "multiBranch");
        fail("Should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(FeatureNotEnabledException);
        const resp = (err as FeatureNotEnabledException).getResponse() as Record<string, unknown>;
        expect(resp.error).toBe("FEATURE_NOT_ENABLED");
        expect(resp.featureKey).toBe("multiBranch");
        expect(resp.featureLabel).toBe("Multi-branch support");
        expect(resp.planName).toBe("Free Plan");
      }
    });

    it("should use feature key as label for unknown features", async () => {
      plansService.getActiveShopPlan.mockResolvedValue(
        makePlan({ features: {} }),
      );
      try {
        await service.checkFeature("shop1", "unknownFeature");
        fail("Should have thrown");
      } catch (err) {
        const resp = (err as FeatureNotEnabledException).getResponse() as Record<string, unknown>;
        expect(resp.featureLabel).toBe("unknownFeature");
      }
    });

    // Test all 28 known features can be checked
    const allFeatureKeys = Object.keys(PlanLimitsService.FEATURE_LABELS);

    it(`should have labels for all ${allFeatureKeys.length} features`, () => {
      expect(allFeatureKeys.length).toBeGreaterThanOrEqual(27);
      // Verify some known keys exist
      expect(allFeatureKeys).toContain("crm");
      expect(allFeatureKeys).toContain("invoicing");
      expect(allFeatureKeys).toContain("multiBranch");
      expect(allFeatureKeys).toContain("purchasableAiCredits");
      expect(allFeatureKeys).toContain("apiAccess");
    });

    it.each(allFeatureKeys)(
      "should resolve feature '%s' when enabled",
      async (key) => {
        plansService.getActiveShopPlan.mockResolvedValue(
          makePlan({ features: { [key]: true } }),
        );
        await expect(service.checkFeature("shop1", key)).resolves.toBeUndefined();
      },
    );

    it.each(allFeatureKeys)(
      "should reject feature '%s' when disabled",
      async (key) => {
        plansService.getActiveShopPlan.mockResolvedValue(
          makePlan({ features: { [key]: false } }),
        );
        await expect(service.checkFeature("shop1", key)).rejects.toThrow(
          FeatureNotEnabledException,
        );
      },
    );
  });

  describe("hasFeature()", () => {
    it("should return true when feature is enabled", async () => {
      plansService.getActiveShopPlan.mockResolvedValue(
        makePlan({ features: { crm: true } }),
      );
      expect(await service.hasFeature("shop1", "crm")).toBe(true);
    });

    it("should return false when feature is disabled", async () => {
      plansService.getActiveShopPlan.mockResolvedValue(
        makePlan({ features: { crm: false } }),
      );
      expect(await service.hasFeature("shop1", "crm")).toBe(false);
    });

    it("should return false when feature is missing", async () => {
      plansService.getActiveShopPlan.mockResolvedValue(
        makePlan({ features: {} }),
      );
      expect(await service.hasFeature("shop1", "crm")).toBe(false);
    });

    it("should return false when plan has no features", async () => {
      plansService.getActiveShopPlan.mockResolvedValue(
        makePlan({ features: null }),
      );
      expect(await service.hasFeature("shop1", "crm")).toBe(false);
    });
  });

  describe("getActiveFeatures()", () => {
    it("should return all features with enabled/disabled state", async () => {
      plansService.getActiveShopPlan.mockResolvedValue(
        makePlan({
          displayName: "Pro Plan",
          features: { crm: true, invoicing: true, apiAccess: false },
        }),
      );

      const result = await service.getActiveFeatures("shop1");
      expect(result.planName).toBe("Pro Plan");
      expect(result.features.length).toBeGreaterThanOrEqual(27);

      // Find specific features and check state
      const crm = result.features.find((f) => f.key === "crm");
      expect(crm?.enabled).toBe(true);
      expect(crm?.label).toBe("CRM suite");
      expect(crm?.category).toBe("CRM & Business");

      const api = result.features.find((f) => f.key === "apiAccess");
      expect(api?.enabled).toBe(false);

      const multi = result.features.find((f) => f.key === "multiBranch");
      expect(multi?.enabled).toBe(false); // not in features JSON
    });

    it("should default to 'Free Plan' when no plan", async () => {
      plansService.getActiveShopPlan.mockResolvedValue(null);
      const result = await service.getActiveFeatures("shop1");
      expect(result.planName).toBe("Free Plan");
      expect(result.planId).toBeNull();
      // All features should be disabled
      for (const f of result.features) {
        expect(f.enabled).toBe(false);
      }
    });
  });

  // ═══════════════════════════════════════════════════════
  // PLAN LIMITS — Product, Invoice, Catalogue, Order
  // ═══════════════════════════════════════════════════════

  describe("checkProductLimit()", () => {
    it("should pass when no limit (unlimited plan)", async () => {
      plansService.getActiveShopPlan.mockResolvedValue(
        makePlan({ maxProducts: null }),
      );
      await expect(service.checkProductLimit("shop1")).resolves.toBeUndefined();
      expect(prisma.inventoryItem.count).not.toHaveBeenCalled();
    });

    it("should pass when under the limit", async () => {
      plansService.getActiveShopPlan.mockResolvedValue(
        makePlan({ maxProducts: 100 }),
      );
      prisma.inventoryItem.count.mockResolvedValue(50);
      await expect(service.checkProductLimit("shop1")).resolves.toBeUndefined();
    });

    it("should throw when at the limit", async () => {
      plansService.getActiveShopPlan.mockResolvedValue(
        makePlan({ maxProducts: 10 }),
      );
      prisma.inventoryItem.count.mockResolvedValue(10);
      await expect(service.checkProductLimit("shop1")).rejects.toThrow(
        PlanLimitExceededException,
      );
    });

    it("should throw when over the limit", async () => {
      plansService.getActiveShopPlan.mockResolvedValue(
        makePlan({ maxProducts: 10 }),
      );
      prisma.inventoryItem.count.mockResolvedValue(15);
      await expect(service.checkProductLimit("shop1")).rejects.toThrow(
        PlanLimitExceededException,
      );
    });

    it("should include correct metadata in limit exception", async () => {
      plansService.getActiveShopPlan.mockResolvedValue(
        makePlan({ maxProducts: 50, displayName: "Pro Plan" }),
      );
      prisma.inventoryItem.count.mockResolvedValue(50);
      try {
        await service.checkProductLimit("shop1");
        fail("Should have thrown");
      } catch (err) {
        const resp = (err as PlanLimitExceededException).getResponse() as Record<string, unknown>;
        expect(resp.error).toBe("PLAN_LIMIT_EXCEEDED");
        expect(resp.resource).toBe("products");
        expect(resp.currentCount).toBe(50);
        expect(resp.limit).toBe(50);
        expect(resp.planName).toBe("Pro Plan");
      }
    });
  });

  describe("checkInvoiceLimit()", () => {
    it("should pass when no limit", async () => {
      plansService.getActiveShopPlan.mockResolvedValue(
        makePlan({ maxInvoicesPerMonth: null }),
      );
      await expect(service.checkInvoiceLimit("shop1")).resolves.toBeUndefined();
    });

    it("should pass when under the monthly limit", async () => {
      plansService.getActiveShopPlan.mockResolvedValue(
        makePlan({ maxInvoicesPerMonth: 100 }),
      );
      prisma.invoice.count.mockResolvedValue(20);
      await expect(service.checkInvoiceLimit("shop1")).resolves.toBeUndefined();
    });

    it("should throw when at the monthly limit", async () => {
      plansService.getActiveShopPlan.mockResolvedValue(
        makePlan({ maxInvoicesPerMonth: 50 }),
      );
      prisma.invoice.count.mockResolvedValue(50);
      await expect(service.checkInvoiceLimit("shop1")).rejects.toThrow(
        PlanLimitExceededException,
      );
    });

    it("should use calendar month for counting", async () => {
      plansService.getActiveShopPlan.mockResolvedValue(
        makePlan({ maxInvoicesPerMonth: 10 }),
      );
      prisma.invoice.count.mockResolvedValue(5);
      await service.checkInvoiceLimit("shop1");

      // Verify date range used in the Prisma query
      const callArgs = prisma.invoice.count.mock.calls[0][0];
      const gte = callArgs.where.createdAt.gte as Date;
      const lt = callArgs.where.createdAt.lt as Date;
      expect(gte.getDate()).toBe(1); // starts on 1st
      expect(lt.getDate()).toBe(1);  // ends on 1st of next month
    });
  });

  describe("checkCatalogueLimit()", () => {
    it("should pass when unlimited", async () => {
      plansService.getActiveShopPlan.mockResolvedValue(
        makePlan({ maxCatalogues: null }),
      );
      await expect(service.checkCatalogueLimit("shop1")).resolves.toBeUndefined();
    });

    it("should throw when at limit", async () => {
      plansService.getActiveShopPlan.mockResolvedValue(
        makePlan({ maxCatalogues: 5 }),
      );
      prisma.catalogue.count.mockResolvedValue(5);
      await expect(service.checkCatalogueLimit("shop1")).rejects.toThrow(
        PlanLimitExceededException,
      );
    });
  });

  describe("checkCatalogueItemLimit()", () => {
    it("should pass when unlimited", async () => {
      plansService.getActiveShopPlan.mockResolvedValue(
        makePlan({ catalogueLimit: null }),
      );
      await expect(
        service.checkCatalogueItemLimit("shop1", "cat1"),
      ).resolves.toBeUndefined();
    });

    it("should throw when catalogue is full", async () => {
      plansService.getActiveShopPlan.mockResolvedValue(
        makePlan({ catalogueLimit: 100 }),
      );
      prisma.catalogueItem.count.mockResolvedValue(100);
      await expect(
        service.checkCatalogueItemLimit("shop1", "cat1"),
      ).rejects.toThrow(PlanLimitExceededException);
    });
  });

  describe("checkOrderLimit()", () => {
    it("should pass when unlimited", async () => {
      plansService.getActiveShopPlan.mockResolvedValue(
        makePlan({ maxOrdersPerMonth: null }),
      );
      await expect(service.checkOrderLimit("shop1")).resolves.toBeUndefined();
    });

    it("should throw when at monthly limit", async () => {
      plansService.getActiveShopPlan.mockResolvedValue(
        makePlan({ maxOrdersPerMonth: 200 }),
      );
      prisma.order.count.mockResolvedValue(200);
      await expect(service.checkOrderLimit("shop1")).rejects.toThrow(
        PlanLimitExceededException,
      );
    });
  });

  // ═══════════════════════════════════════════════════════
  // USAGE SUMMARY
  // ═══════════════════════════════════════════════════════

  describe("getUsageSummary()", () => {
    it("should return correct usage vs limits", async () => {
      plansService.getActiveShopPlan.mockResolvedValue(
        makePlan({
          displayName: "Pro Plus",
          maxProducts: 500,
          maxInvoicesPerMonth: 200,
          maxCatalogues: 20,
          maxOrdersPerMonth: 1000,
          features: { crm: true, invoicing: true },
        }),
      );
      prisma.inventoryItem.count.mockResolvedValue(123);
      prisma.invoice.count.mockResolvedValue(45);
      prisma.catalogue.count.mockResolvedValue(8);
      prisma.order.count.mockResolvedValue(67);

      const summary = await service.getUsageSummary("shop1");
      expect(summary.planName).toBe("Pro Plus");
      expect(summary.limits.products.used).toBe(123);
      expect(summary.limits.products.limit).toBe(500);
      expect(summary.limits.products.unlimited).toBe(false);
      expect(summary.limits.invoicesPerMonth.used).toBe(45);
      expect(summary.limits.ordersPerMonth.used).toBe(67);
      expect(summary.features).toEqual({ crm: true, invoicing: true });
    });

    it("should mark unlimited when limits are null", async () => {
      plansService.getActiveShopPlan.mockResolvedValue(
        makePlan({ maxProducts: null, maxInvoicesPerMonth: null }),
      );
      prisma.inventoryItem.count.mockResolvedValue(0);
      prisma.invoice.count.mockResolvedValue(0);
      prisma.catalogue.count.mockResolvedValue(0);
      prisma.order.count.mockResolvedValue(0);

      const summary = await service.getUsageSummary("shop1");
      expect(summary.limits.products.unlimited).toBe(true);
      expect(summary.limits.invoicesPerMonth.unlimited).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════
  // EDGE CASES & REGRESSION
  // ═══════════════════════════════════════════════════════

  describe("edge cases", () => {
    it("checkFeature should only treat boolean true as enabled", async () => {
      // "truthy" values like 1, "true", {} should NOT pass
      for (const val of [1, "true", {}, [], "yes"]) {
        plansService.getActiveShopPlan.mockResolvedValue(
          makePlan({ features: { crm: val } }),
        );
        await expect(service.checkFeature("shop1", "crm")).rejects.toThrow(
          FeatureNotEnabledException,
        );
      }
    });

    it("hasFeature should only treat boolean true as enabled", async () => {
      plansService.getActiveShopPlan.mockResolvedValue(
        makePlan({ features: { crm: "true" } }),
      );
      expect(await service.hasFeature("shop1", "crm")).toBe(false);
    });

    it("checkProductLimit should pass when plan returns null (no plan)", async () => {
      plansService.getActiveShopPlan.mockResolvedValue(null);
      // null plan means no limit → should pass
      await expect(service.checkProductLimit("shop1")).resolves.toBeUndefined();
    });
  });
});
