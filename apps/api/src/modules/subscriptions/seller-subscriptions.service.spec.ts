import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";
import { PrismaService } from "../../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";
import { SellerSubscriptionsService } from "./seller-subscriptions.service";
import { SubscriptionPlansService } from "./subscription-plans.service";

// ─── Mocks ─────────────────────────────────────────────────

const mockPrisma = {
  sellerSubscription: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  subscriptionPayment: {
    create: jest.fn(),
  },
};

const mockPlansService = {
  getPlanById: jest.fn(),
};

const mockNotifications = {
  send: jest.fn(),
  sendToShop: jest.fn(),
};

const mockConfig: Partial<ConfigService> = {
  // Default: no Stripe key → service runs without Stripe
  get: jest.fn().mockReturnValue(undefined),
};

describe("SellerSubscriptionsService", () => {
  let service: SellerSubscriptionsService;

  async function buildService(configOverride?: Partial<ConfigService>) {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SellerSubscriptionsService,
        { provide: PrismaService, useValue: mockPrisma },
        {
          provide: ConfigService,
          useValue: configOverride || mockConfig,
        },
        { provide: SubscriptionPlansService, useValue: mockPlansService },
        { provide: NotificationsService, useValue: mockNotifications },
      ],
    }).compile();
    service = module.get(SellerSubscriptionsService);
  }

  beforeEach(async () => {
    await buildService();
  });

  // ═══════════════════════════════════════════════════════════
  // subscribeToPlan — Free plan path
  // ═══════════════════════════════════════════════════════════

  describe("subscribeToPlan() - FREE plan", () => {
    it("activates free plan immediately without payment", async () => {
      mockPlansService.getPlanById.mockResolvedValue({
        id: "plan-free",
        name: "FREE",
        monthlyPrice: 0,
        country: "US",
        isActive: true,
      });
      mockPrisma.sellerSubscription.findFirst.mockResolvedValue(null);
      mockPrisma.sellerSubscription.create.mockResolvedValue({
        id: "sub-1",
        plan: { name: "FREE" },
      });

      const result = await service.subscribeToPlan({
        shopId: "shop-1",
        planId: "plan-free",
        country: "US",
        userId: "user-1",
      });

      expect(result.requiresPayment).toBe(false);
      expect(result.subscription).toBeTruthy();
      expect(mockPrisma.sellerSubscription.create).toHaveBeenCalled();
    });

    it("rejects when plan country does not match request country", async () => {
      mockPlansService.getPlanById.mockResolvedValue({
        id: "plan-free",
        name: "FREE",
        monthlyPrice: 0,
        country: "IN",
        isActive: true,
      });

      await expect(
        service.subscribeToPlan({
          shopId: "shop-1",
          planId: "plan-free",
          country: "US",
          userId: "user-1",
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("rejects inactive plans", async () => {
      mockPlansService.getPlanById.mockResolvedValue({
        id: "plan-free",
        name: "FREE",
        monthlyPrice: 0,
        country: "US",
        isActive: false,
      });

      await expect(
        service.subscribeToPlan({
          shopId: "shop-1",
          planId: "plan-free",
          country: "US",
          userId: "user-1",
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("rejects when shop already subscribed to same plan", async () => {
      mockPlansService.getPlanById.mockResolvedValue({
        id: "plan-free",
        name: "FREE",
        monthlyPrice: 0,
        country: "US",
        isActive: true,
      });
      mockPrisma.sellerSubscription.findFirst.mockResolvedValue({
        id: "existing",
        planId: "plan-free",
        status: "ACTIVE",
      });

      await expect(
        service.subscribeToPlan({
          shopId: "shop-1",
          planId: "plan-free",
          country: "US",
          userId: "user-1",
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // subscribeToPlan — Paid plan without Stripe configured
  // ═══════════════════════════════════════════════════════════

  describe("subscribeToPlan() - PAID plan without Stripe", () => {
    it("throws BadRequestException when Stripe is not configured", async () => {
      mockPlansService.getPlanById.mockResolvedValue({
        id: "plan-pro",
        name: "PRO",
        monthlyPrice: 29,
        country: "US",
        isActive: true,
      });
      mockPrisma.sellerSubscription.findFirst.mockResolvedValue(null);

      await expect(
        service.subscribeToPlan({
          shopId: "shop-1",
          planId: "plan-pro",
          country: "US",
          userId: "user-1",
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // cancelSubscription — Stripe failure must NOT silently flip local state
  // ═══════════════════════════════════════════════════════════

  describe("cancelSubscription()", () => {
    it("throws NotFoundException when subscription is missing", async () => {
      mockPrisma.sellerSubscription.findUnique.mockResolvedValue(null);

      await expect(
        service.cancelSubscription("missing", { shopId: "shop-1" }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it("throws ForbiddenException when shop does not own subscription", async () => {
      mockPrisma.sellerSubscription.findUnique.mockResolvedValue({
        id: "sub-1",
        shopId: "other-shop",
        status: "ACTIVE",
        plan: { name: "PRO" },
      });

      await expect(
        service.cancelSubscription("sub-1", { shopId: "shop-1" }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it("rejects already-cancelled subscriptions", async () => {
      mockPrisma.sellerSubscription.findUnique.mockResolvedValue({
        id: "sub-1",
        shopId: "shop-1",
        status: "CANCELLED",
        plan: { name: "PRO" },
      });

      await expect(
        service.cancelSubscription("sub-1", { shopId: "shop-1" }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("cancels at period end (no Stripe sub) without flipping status to CANCELLED", async () => {
      mockPrisma.sellerSubscription.findUnique.mockResolvedValue({
        id: "sub-1",
        shopId: "shop-1",
        status: "ACTIVE",
        stripeSubscriptionId: null,
        plan: { name: "FREE" },
      });
      mockPrisma.sellerSubscription.update.mockResolvedValue({
        id: "sub-1",
        status: "ACTIVE",
        autoRenew: false,
      });

      const result = await service.cancelSubscription("sub-1", {
        shopId: "shop-1",
        immediate: false,
      });

      expect(result.status).toBe("ACTIVE");
      expect(mockPrisma.sellerSubscription.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ autoRenew: false }),
        }),
      );
    });

    it("does NOT update local DB when Stripe cancel fails (prevents drift)", async () => {
      mockPrisma.sellerSubscription.findUnique.mockResolvedValue({
        id: "sub-1",
        shopId: "shop-1",
        status: "ACTIVE",
        stripeSubscriptionId: "sub_stripe_123",
        plan: { name: "PRO" },
      });

      // Inject a fake stripe client that fails
      (service as any).stripe = {
        subscriptions: {
          cancel: jest.fn().mockRejectedValue(
            Object.assign(new Error("network"), { code: "api_error" }),
          ),
          update: jest.fn(),
        },
      };

      await expect(
        service.cancelSubscription("sub-1", {
          shopId: "shop-1",
          immediate: true,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(mockPrisma.sellerSubscription.update).not.toHaveBeenCalled();
    });

    it("proceeds with local cancel when Stripe sub is already gone (resource_missing)", async () => {
      mockPrisma.sellerSubscription.findUnique.mockResolvedValue({
        id: "sub-1",
        shopId: "shop-1",
        status: "ACTIVE",
        stripeSubscriptionId: "sub_stripe_404",
        plan: { name: "PRO" },
      });
      mockPrisma.sellerSubscription.update.mockResolvedValue({
        id: "sub-1",
        status: "CANCELLED",
      });

      (service as any).stripe = {
        subscriptions: {
          cancel: jest.fn().mockRejectedValue(
            Object.assign(new Error("not found"), {
              code: "resource_missing",
            }),
          ),
          update: jest.fn(),
        },
      };

      const result = await service.cancelSubscription("sub-1", {
        shopId: "shop-1",
        immediate: true,
      });

      expect(result.status).toBe("CANCELLED");
      expect(mockPrisma.sellerSubscription.update).toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════
  // Webhook helpers
  // ═══════════════════════════════════════════════════════════

  describe("isStripeConfigured() / constructWebhookEvent()", () => {
    it("reports stripe as not configured when no key is set", () => {
      expect(service.isStripeConfigured()).toBe(false);
    });

    it("constructWebhookEvent throws when stripe is not configured", () => {
      expect(() =>
        service.constructWebhookEvent(
          Buffer.from("{}"),
          "sig",
          "whsec_test",
        ),
      ).toThrow(BadRequestException);
    });

    it("delegates verification to the underlying Stripe client", () => {
      const constructEvent = jest.fn().mockReturnValue({
        id: "evt_1",
        type: "invoice.paid",
      });
      (service as any).stripe = { webhooks: { constructEvent } };

      const event = service.constructWebhookEvent(
        Buffer.from("raw"),
        "sig",
        "whsec_test",
      );

      expect(constructEvent).toHaveBeenCalledWith(
        Buffer.from("raw"),
        "sig",
        "whsec_test",
      );
      expect(event).toEqual({ id: "evt_1", type: "invoice.paid" });
    });
  });

  // ═══════════════════════════════════════════════════════════
  // handleStripeWebhook — invoice.payment_failed → PAST_DUE
  // ═══════════════════════════════════════════════════════════

  describe("handleStripeWebhook()", () => {
    it("ignores unrelated event types", async () => {
      await expect(
        service.handleStripeWebhook({ type: "ping", data: { object: {} } }),
      ).resolves.toBeUndefined();
    });

    it("marks subscription PAST_DUE on invoice.payment_failed", async () => {
      mockPrisma.sellerSubscription.findFirst.mockResolvedValue({
        id: "sub-1",
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(),
        plan: { currency: "USD" },
      });

      await service.handleStripeWebhook({
        type: "invoice.payment_failed",
        data: {
          object: {
            subscription: "sub_stripe_123",
            amount_due: 2900,
            payment_intent: "pi_1",
          },
        },
      });

      expect(mockPrisma.sellerSubscription.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: "PAST_DUE" }),
        }),
      );
      expect(mockPrisma.subscriptionPayment.create).toHaveBeenCalled();
    });
  });
});
