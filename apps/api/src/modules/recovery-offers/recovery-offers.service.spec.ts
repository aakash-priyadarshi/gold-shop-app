import {
  RecoveryOfferStatus,
  SubscriptionStatus,
  UserRole,
} from "@prisma/client";
import { createHash } from "crypto";
import { RecoveryOffersService } from "./recovery-offers.service";

describe("RecoveryOffersService", () => {
  const prisma: any = {
    crashReport: { findMany: jest.fn() },
    user: { findMany: jest.fn() },
    subscriptionPlan: { findMany: jest.fn(), findFirst: jest.fn() },
    sellerSubscription: {
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      create: jest.fn(),
    },
    shop: { findFirst: jest.fn() },
    recoveryOffer: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      create: jest.fn(),
    },
    emailLog: { create: jest.fn() },
    $transaction: jest.fn(),
  };
  const mail: any = { send: jest.fn() };
  const config: any = {
    get: jest.fn((_key: string, fallback: string) => fallback),
  };
  const queue: any = { add: jest.fn() };
  const service = new RecoveryOffersService(prisma, mail, config, queue);

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation((input: any) =>
      typeof input === "function" ? input(prisma) : Promise.all(input),
    );
  });

  it("previews one eligible shopkeeper once for duplicate reports", async () => {
    prisma.crashReport.findMany.mockResolvedValue([
      { id: "report-1", userId: "user-1" },
      { id: "report-2", userId: "user-1" },
    ]);
    prisma.user.findMany.mockResolvedValue([
      {
        id: "user-1",
        email: "owner@example.com",
        firstName: "Owner",
        role: UserRole.SHOPKEEPER,
        emailVerified: true,
        activeShopId: "shop-1",
        recoveryOffers: [],
        shops: [
          {
            id: "shop-1",
            shopName: "Owner Gold",
            country: "IN",
            subscriptions: [],
          },
        ],
      },
    ]);
    prisma.subscriptionPlan.findMany.mockResolvedValue([{ country: "IN" }]);

    const result = await service.preview(["report-1", "report-2"]);

    expect(result.eligible).toEqual([
      expect.objectContaining({
        userId: "user-1",
        shopId: "shop-1",
        reportCount: 2,
      }),
    ]);
    expect(result.excluded).toEqual([]);
  });

  it("does not offer recovery PRO to an active paid subscriber", async () => {
    prisma.crashReport.findMany.mockResolvedValue([
      { id: "report-1", userId: "user-1" },
    ]);
    prisma.user.findMany.mockResolvedValue([
      {
        id: "user-1",
        email: "paid@example.com",
        firstName: "Paid",
        role: UserRole.SHOPKEEPER,
        emailVerified: true,
        activeShopId: "shop-1",
        recoveryOffers: [],
        shops: [
          {
            id: "shop-1",
            shopName: "Paid Gold",
            country: "IN",
            subscriptions: [
              {
                status: SubscriptionStatus.ACTIVE,
                plan: { name: "FREE" },
              },
              {
                status: SubscriptionStatus.ACTIVE,
                plan: { name: "PRO" },
              },
            ],
          },
        ],
      },
    ]);
    prisma.subscriptionPlan.findMany.mockResolvedValue([{ country: "IN" }]);

    const result = await service.preview(["report-1"]);

    expect(result.eligible).toEqual([]);
    expect(result.excluded).toEqual([
      expect.objectContaining({
        reason: "Account already has an active paid plan",
      }),
    ]);
  });

  it("queues delivery without sending email in the admin request", async () => {
    prisma.crashReport.findMany.mockResolvedValue([
      { id: "report-1", userId: "user-1" },
    ]);
    prisma.user.findMany.mockResolvedValue([
      {
        id: "user-1",
        email: "owner@example.com",
        firstName: "Owner",
        role: UserRole.SHOPKEEPER,
        emailVerified: true,
        activeShopId: "shop-1",
        recoveryOffers: [],
        shops: [
          {
            id: "shop-1",
            shopName: "Owner Gold",
            country: "IN",
            subscriptions: [],
          },
        ],
      },
    ]);
    prisma.subscriptionPlan.findMany.mockResolvedValue([{ country: "IN" }]);
    prisma.recoveryOffer.findUnique.mockResolvedValue(null);
    prisma.recoveryOffer.create.mockResolvedValue({ id: "offer-1" });
    queue.add.mockResolvedValue({ id: "job-1" });

    const result = await service.send({
      reportIds: ["report-1"],
      confirmed: true,
      adminId: "admin-1",
    });

    expect(result.queued).toBe(1);
    expect(queue.add).toHaveBeenCalledWith(
      "deliver",
      expect.objectContaining({ offerId: "offer-1" }),
      expect.objectContaining({ attempts: 3 }),
    );
    expect(mail.send).not.toHaveBeenCalled();
  });

  it("never reopens an offer that is already prepared", async () => {
    prisma.crashReport.findMany.mockResolvedValue([
      { id: "report-1", userId: "user-1" },
    ]);
    prisma.user.findMany.mockResolvedValue([
      {
        id: "user-1",
        email: "owner@example.com",
        firstName: "Owner",
        role: UserRole.SHOPKEEPER,
        emailVerified: true,
        activeShopId: "shop-1",
        recoveryOffers: [
          { shopId: "shop-1", status: RecoveryOfferStatus.PREPARED },
        ],
        shops: [
          {
            id: "shop-1",
            shopName: "Owner Gold",
            country: "IN",
            subscriptions: [],
          },
        ],
      },
    ]);
    prisma.subscriptionPlan.findMany.mockResolvedValue([{ country: "IN" }]);

    const result = await service.preview(["report-1"]);

    expect(result.eligible).toEqual([]);
    expect(result.excluded).toEqual([
      expect.objectContaining({
        reason: "Recovery offer is already being processed",
      }),
    ]);
    expect(prisma.recoveryOffer.updateMany).not.toHaveBeenCalled();
  });

  it("delivers a queued offer idempotently before marking it sent", async () => {
    const rawToken = "delivery-token";
    const tokenHash = createHash("sha256").update(rawToken).digest("hex");
    prisma.recoveryOffer.findUnique.mockResolvedValueOnce({
      id: "offer-1",
      userId: "user-1",
      email: "owner@example.com",
      tokenHash,
      days: 40,
      status: RecoveryOfferStatus.PREPARED,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      createdBy: "admin-1",
      user: { firstName: "Owner" },
      shop: { shopName: "Owner Gold" },
    });
    mail.send.mockResolvedValue({ success: true, messageId: "message-1" });
    prisma.recoveryOffer.updateMany.mockResolvedValue({ count: 1 });
    prisma.emailLog.create.mockResolvedValue({ id: "log-1" });

    const result = await service.deliverQueuedOffer({
      offerId: "offer-1",
      rawToken,
    });

    expect(result).toEqual({ skipped: false });
    expect(mail.send).toHaveBeenCalledWith(
      expect.objectContaining({
        idempotencyKey: `recovery-offer/offer-1/${tokenHash}`,
      }),
    );
    expect(prisma.recoveryOffer.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: RecoveryOfferStatus.PREPARED,
          tokenHash,
        }),
      }),
    );
    expect(prisma.emailLog.create).toHaveBeenCalled();
  });

  it("extends an existing trial by exactly the offered days", async () => {
    const now = Date.now();
    const currentPeriodEnd = new Date(now + 5 * 24 * 60 * 60 * 1000);
    const offer = {
      id: "offer-1",
      userId: "user-1",
      shopId: "shop-1",
      days: 40,
      status: RecoveryOfferStatus.SENT,
      expiresAt: new Date(now + 10 * 24 * 60 * 60 * 1000),
      claimedAt: null,
      grantedSubscriptionId: null,
    };
    prisma.recoveryOffer.findUnique.mockResolvedValue(offer);
    prisma.recoveryOffer.updateMany.mockResolvedValue({ count: 1 });
    prisma.shop.findFirst.mockResolvedValue({
      id: "shop-1",
      userId: "user-1",
      country: "IN",
    });
    prisma.sellerSubscription.findMany.mockResolvedValue([
      {
        id: "subscription-1",
        status: SubscriptionStatus.TRIALING,
        currentPeriodEnd,
        plan: { name: "PRO" },
      },
    ]);
    prisma.sellerSubscription.update.mockImplementation(({ data }: any) =>
      Promise.resolve({
        id: "subscription-1",
        currentPeriodEnd: data.currentPeriodEnd,
        plan: { name: "PRO" },
      }),
    );
    prisma.recoveryOffer.update.mockResolvedValue({});

    const result = await service.claim("a".repeat(32), "user-1");

    expect(result.claimed).toBe(true);
    const update = prisma.sellerSubscription.update.mock.calls[0][0];
    expect(update.data.currentPeriodEnd.getTime()).toBe(
      currentPeriodEnd.getTime() + 40 * 24 * 60 * 60 * 1000,
    );
    expect(prisma.sellerSubscription.create).not.toHaveBeenCalled();
  });

  it("refuses to replace a paid plan that became active after the offer was sent", async () => {
    prisma.recoveryOffer.findUnique.mockResolvedValue({
      id: "offer-1",
      userId: "user-1",
      shopId: "shop-1",
      days: 40,
      status: RecoveryOfferStatus.SENT,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      claimedAt: null,
    });
    prisma.recoveryOffer.updateMany.mockResolvedValue({ count: 1 });
    prisma.shop.findFirst.mockResolvedValue({
      id: "shop-1",
      userId: "user-1",
      country: "IN",
    });
    prisma.sellerSubscription.findMany.mockResolvedValue([
      {
        id: "paid-subscription",
        status: SubscriptionStatus.ACTIVE,
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        plan: { name: "PRO" },
      },
    ]);

    await expect(service.claim("c".repeat(32), "user-1")).rejects.toThrow(
      "Your account already has a paid plan",
    );
    expect(prisma.sellerSubscription.update).not.toHaveBeenCalled();
    expect(prisma.sellerSubscription.create).not.toHaveBeenCalled();
  });

  it("never reveals the full recipient email during token lookup", async () => {
    prisma.recoveryOffer.findUnique.mockResolvedValue({
      id: "offer-1",
      email: "owner@example.com",
      days: 40,
      status: RecoveryOfferStatus.SENT,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      claimedAt: null,
    });

    const result = await service.lookup("b".repeat(32));

    expect(result.recipient).toBe("ow***@example.com");
    expect(result.recipient).not.toContain("owner@");
    expect(result.claimable).toBe(true);
  });
});
