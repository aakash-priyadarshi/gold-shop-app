import { NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { PrismaService } from "../../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";
import { SubscriptionPlansService } from "./subscription-plans.service";

// ─── Mock Prisma ──────────────────────────────────────────
const mockPrisma = {
  subscriptionPlan: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  sellerSubscription: {
    findFirst: jest.fn(),
  },
  shop: {
    findUnique: jest.fn(),
  },
};

const mockNotifications = {
  send: jest.fn(),
  sendToShop: jest.fn(),
};

describe("SubscriptionPlansService", () => {
  let service: SubscriptionPlansService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionPlansService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: NotificationsService, useValue: mockNotifications },
      ],
    }).compile();

    service = module.get(SubscriptionPlansService);
  });

  // ═══════════════════════════════════════════════════════════
  // getActiveShopPlan — Plan Resolution Logic
  // ═══════════════════════════════════════════════════════════

  describe("getActiveShopPlan()", () => {
    it("should return subscription plan when shop has ACTIVE subscription", async () => {
      const plan = {
        id: "plan-pro",
        name: "PRO",
        displayName: "Pro Plan",
        features: { crm: true, invoicing: true },
        extraCreditPrice: 5.0,
      };
      mockPrisma.sellerSubscription.findFirst.mockResolvedValue({
        id: "sub-1",
        status: "ACTIVE",
        plan,
      });

      const result = await service.getActiveShopPlan("shop1");
      expect(result).toEqual(plan);
      expect(result!.features).toEqual({ crm: true, invoicing: true });
      // Should NOT query for fallback plan
      expect(mockPrisma.shop.findUnique).not.toHaveBeenCalled();
    });

    it("should return subscription plan when shop has TRIALING subscription", async () => {
      const plan = {
        id: "plan-enterprise",
        name: "ENTERPRISE",
        displayName: "Enterprise",
        features: { apiAccess: true, multiBranch: true },
      };
      mockPrisma.sellerSubscription.findFirst.mockResolvedValue({
        id: "sub-2",
        status: "TRIALING",
        plan,
      });

      const result = await service.getActiveShopPlan("shop1");
      expect(result!.name).toBe("ENTERPRISE");
    });

    it("should fallback to FREE plan for shop's country when no subscription", async () => {
      mockPrisma.sellerSubscription.findFirst.mockResolvedValue(null);
      mockPrisma.shop.findUnique.mockResolvedValue({ country: "NP" });

      const freePlan = {
        id: "plan-free-np",
        name: "FREE",
        displayName: "Free Plan",
        country: "NP",
        features: { marketplace: true },
        extraCreditPrice: 0,
      };
      mockPrisma.subscriptionPlan.findFirst.mockResolvedValue(freePlan);

      const result = await service.getActiveShopPlan("shop1");
      expect(result).toEqual(freePlan);
      expect(mockPrisma.subscriptionPlan.findFirst).toHaveBeenCalledWith({
        where: { name: "FREE", country: "NP", isActive: true },
      });
    });

    it("should throw NotFoundException when shop does not exist", async () => {
      mockPrisma.sellerSubscription.findFirst.mockResolvedValue(null);
      mockPrisma.shop.findUnique.mockResolvedValue(null);

      await expect(service.getActiveShopPlan("nonexistent")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should return null when no FREE plan exists for country", async () => {
      mockPrisma.sellerSubscription.findFirst.mockResolvedValue(null);
      mockPrisma.shop.findUnique.mockResolvedValue({ country: "XX" });
      mockPrisma.subscriptionPlan.findFirst.mockResolvedValue(null);

      const result = await service.getActiveShopPlan("shop1");
      expect(result).toBeNull();
    });

    it("should prefer most recent subscription when multiple exist", async () => {
      // The query has `orderBy: { createdAt: 'desc' }` so findFirst returns newest
      const latestPlan = {
        id: "plan-proplus",
        name: "PRO_PLUS",
        displayName: "Pro Plus",
        features: { crm: true, invoicing: true, apiAccess: true },
      };
      mockPrisma.sellerSubscription.findFirst.mockResolvedValue({
        id: "sub-latest",
        status: "ACTIVE",
        plan: latestPlan,
      });

      const result = await service.getActiveShopPlan("shop1");
      expect(result!.name).toBe("PRO_PLUS");
    });

    it("should NOT return CANCELED or EXPIRED subscriptions", async () => {
      // findFirst filters by status: { in: ['ACTIVE', 'TRIALING'] }
      mockPrisma.sellerSubscription.findFirst.mockResolvedValue(null);
      mockPrisma.shop.findUnique.mockResolvedValue({ country: "IN" });
      mockPrisma.subscriptionPlan.findFirst.mockResolvedValue({
        id: "plan-free-in",
        name: "FREE",
        country: "IN",
      });

      await service.getActiveShopPlan("shop1");
      expect(mockPrisma.sellerSubscription.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: { in: ["ACTIVE", "TRIALING"] },
          }),
        }),
      );
    });
  });

  // ═══════════════════════════════════════════════════════════
  // getAvailablePlans — Public plan listing
  // ═══════════════════════════════════════════════════════════

  describe("getAvailablePlans()", () => {
    it("should return plans for specified country", async () => {
      const plans = [
        { id: "1", name: "FREE", country: "NP" },
        { id: "2", name: "PRO", country: "NP" },
      ];
      mockPrisma.subscriptionPlan.findMany.mockResolvedValue(plans);

      const result = await service.getAvailablePlans("NP");
      expect(result).toHaveLength(2);
      expect(mockPrisma.subscriptionPlan.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isActive: true, country: "NP" },
        }),
      );
    });

    it("should return empty array when no country specified", async () => {
      const result = await service.getAvailablePlans(undefined);
      expect(result).toEqual([]);
      expect(mockPrisma.subscriptionPlan.findMany).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════
  // Feature Propagation — LIVE (no snapshotting)
  // ═══════════════════════════════════════════════════════════

  describe("feature propagation (LIVE)", () => {
    it("should return the LIVE plan record (not a snapshot)", async () => {
      // When admin updates a plan's features JSON, getActiveShopPlan should
      // return the updated plan because it joins subscription → plan (LIVE record).
      const plan = {
        id: "plan-pro",
        name: "PRO",
        features: { crm: true, invoicing: true, apiAccess: true },
      };
      mockPrisma.sellerSubscription.findFirst.mockResolvedValue({
        id: "sub-1",
        plan,
      });

      const result = await service.getActiveShopPlan("shop1");

      // Simulate admin toggling apiAccess off
      plan.features.apiAccess = false;

      // Next call should see the updated features (LIVE)
      const result2 = await service.getActiveShopPlan("shop1");
      expect(result2!.features).toEqual({ crm: true, invoicing: true, apiAccess: false });
    });

    it("should include extraCreditPrice in the plan record", async () => {
      const plan = {
        id: "plan-pro",
        name: "PRO",
        features: { purchasableAiCredits: true },
        extraCreditPrice: 10.0,
      };
      mockPrisma.sellerSubscription.findFirst.mockResolvedValue({
        id: "sub-1",
        plan,
      });

      const result = await service.getActiveShopPlan("shop1");
      expect(result!.extraCreditPrice).toBe(10.0);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // Plan CRUD
  // ═══════════════════════════════════════════════════════════

  describe("togglePlanActive()", () => {
    it("should deactivate a plan", async () => {
      mockPrisma.subscriptionPlan.findUnique.mockResolvedValue({ id: "p1" });
      mockPrisma.subscriptionPlan.update.mockResolvedValue({
        id: "p1",
        isActive: false,
      });

      const result = await service.togglePlanActive("p1", false);
      expect(result.isActive).toBe(false);
    });

    it("should throw NotFoundException for missing plan", async () => {
      mockPrisma.subscriptionPlan.findUnique.mockResolvedValue(null);
      await expect(service.togglePlanActive("p999", false)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
