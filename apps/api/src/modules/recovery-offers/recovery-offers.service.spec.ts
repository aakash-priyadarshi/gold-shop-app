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
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      create: jest.fn(),
    },
    recoveryOfferEmailEvent: {
      findUnique: jest.fn(),
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
    config.get.mockImplementation((_key: string, fallback: string) => fallback);
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

  it("previews the broad win-back audience with 50 days and local timing", async () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-09-01T00:00:00.000Z"));
    prisma.user.findMany.mockResolvedValue([
      {
        id: "user-1",
        email: "owner@example.com",
        firstName: "Owner",
        role: UserRole.SHOPKEEPER,
        status: "ACTIVE",
        emailVerified: true,
        activeShopId: "shop-1",
        lastLoginAt: new Date("2026-08-01T00:00:00.000Z"),
        webSessions: [],
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
    prisma.crashReport.findMany.mockResolvedValue([]);
    prisma.subscriptionPlan.findMany.mockResolvedValue([{ country: "IN" }]);

    const result = await service.previewAudience();

    expect(result.days).toBe(50);
    expect(result.campaignKey).toBe("customer-winback-2026-09");
    expect(result.eligible).toEqual([
      expect.objectContaining({
        userId: "user-1",
        country: "IN",
        activitySegment: "dormant",
        incidentAffected: false,
        timeZone: "Asia/Kolkata",
        recommendedSendAt: new Date("2026-09-01T04:30:00.000Z"),
      }),
    ]);
    jest.useRealTimers();
  });

  it("queues only the selected broad-audience account with a 50-day offer", async () => {
    prisma.user.findMany.mockResolvedValue([
      {
        id: "user-1",
        email: "owner@example.com",
        firstName: "Owner",
        role: UserRole.SHOPKEEPER,
        status: "ACTIVE",
        emailVerified: true,
        activeShopId: "shop-1",
        lastLoginAt: null,
        webSessions: [],
        recoveryOffers: [],
        shops: [
          {
            id: "shop-1",
            shopName: "Owner Gold",
            country: "NP",
            subscriptions: [],
          },
        ],
      },
    ]);
    prisma.crashReport.findMany.mockResolvedValue([]);
    prisma.subscriptionPlan.findMany.mockResolvedValue([{ country: "NP" }]);
    prisma.recoveryOffer.findUnique.mockResolvedValue(null);
    prisma.recoveryOffer.create.mockResolvedValue({ id: "offer-1" });
    queue.add.mockResolvedValue({ id: "job-1" });

    const result = await service.sendAudience({
      userIds: ["user-1"],
      confirmed: true,
      adminId: "admin-1",
    });

    expect(result.queued).toBe(1);
    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: { in: ["user-1"] } } }),
    );
    expect(prisma.recoveryOffer.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          campaignKey: "customer-winback-2026-09",
          days: 50,
          sourceReportIds: [],
        }),
      }),
    );
  });

  afterEach(() => {
    jest.useRealTimers();
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

  it("schedules an Indian recipient for their next local 10 AM", async () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-09-01T00:00:00.000Z"));
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
      deliveryTiming: "NEXT_LOCAL_10AM",
    });

    expect(result.scheduled).toBe(1);
    expect(prisma.recoveryOffer.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          scheduledFor: new Date("2026-09-01T04:30:00.000Z"),
          expiresAt: new Date("2026-10-01T04:30:00.000Z"),
        }),
      }),
    );
    expect(queue.add).toHaveBeenCalledWith(
      "deliver",
      expect.anything(),
      expect.objectContaining({ delay: 4.5 * 60 * 60 * 1000 }),
    );
    jest.useRealTimers();
  });

  it("schedules a US recipient using the campaign reference timezone", async () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-09-01T00:00:00.000Z"));
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
            country: "US",
            subscriptions: [],
          },
        ],
      },
    ]);
    prisma.subscriptionPlan.findMany.mockResolvedValue([{ country: "US" }]);
    prisma.recoveryOffer.findUnique.mockResolvedValue(null);
    prisma.recoveryOffer.create.mockResolvedValue({ id: "offer-1" });
    queue.add.mockResolvedValue({ id: "job-1" });

    const result = await service.send({
      reportIds: ["report-1"],
      confirmed: true,
      adminId: "admin-1",
      deliveryTiming: "NEXT_LOCAL_10AM",
    });

    expect(result.queued).toBe(0);
    expect(result.scheduled).toBe(1);
    expect(result.excluded).toEqual([]);
    expect(prisma.recoveryOffer.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          scheduledFor: new Date("2026-09-01T14:00:00.000Z"),
        }),
      }),
    );
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

  it("reports an expired offer accurately without reissuing the campaign", async () => {
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
          { shopId: "shop-1", status: RecoveryOfferStatus.EXPIRED },
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
        reason: "Recovery offer expired unclaimed",
      }),
    ]);
    expect(prisma.recoveryOffer.updateMany).not.toHaveBeenCalled();
  });

  it("delivers a queued offer idempotently before marking it sent", async () => {
    const rawToken = "delivery-token";
    const tokenHash = createHash("sha256").update(rawToken).digest("hex");
    prisma.recoveryOffer.findUnique.mockResolvedValueOnce({
      id: "offer-1",
      campaignKey: "customer-winback-2026-09",
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
        subject:
          "We’re sorry about the invoice issue — 40 days of Orivraa Pro on us",
        idempotencyKey: `recovery-offer/offer-1/${tokenHash}`,
        tags: [
          { name: "category", value: "recovery_offer" },
          { name: "offer_id", value: "offer-1" },
          { name: "campaign", value: "customer-winback-2026-09" },
        ],
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

  it("records Resend clicks once without storing the secure destination", async () => {
    prisma.recoveryOfferEmailEvent.findUnique.mockResolvedValue(null);
    prisma.recoveryOffer.findFirst.mockResolvedValue({
      id: "offer-1",
      email: "owner@example.com",
      deliveryMessageId: "resend-email-1",
      deliveredAt: null,
      firstOpenedAt: null,
      lastOpenedAt: null,
      firstClickedAt: null,
      lastClickedAt: null,
      bouncedAt: null,
      complainedAt: null,
      failedAt: null,
      suppressedAt: null,
    });
    prisma.recoveryOfferEmailEvent.create.mockResolvedValue({ id: "event-1" });
    prisma.recoveryOffer.update.mockResolvedValue({});

    const result = await service.recordResendEvent("svix-event-1", {
      type: "email.clicked",
      created_at: "2026-09-02T10:00:00.000Z",
      data: {
        created_at: "2026-09-02T09:00:00.000Z",
        email_id: "resend-email-1",
        from: "Aakash from Orivraa <support@orivraa.com>",
        to: ["owner@example.com"],
        subject: "Recovery",
        tags: { offer_id: "offer-1" },
        click: {
          ipAddress: "203.0.113.10",
          link: "https://www.orivraa.com/recovery/pro#token=secret-token",
          timestamp: "2026-09-02T10:00:01.000Z",
          userAgent: "Browser",
        },
      },
    });

    expect(result).toEqual({
      processed: true,
      offerId: "offer-1",
      type: "email.clicked",
    });
    expect(prisma.recoveryOffer.update).toHaveBeenCalledWith({
      where: { id: "offer-1" },
      data: expect.objectContaining({
        clickCount: { increment: 1 },
        firstClickedAt: new Date("2026-09-02T10:00:01.000Z"),
      }),
    });
    expect(prisma.recoveryOfferEmailEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        webhookId: "svix-event-1",
        linkKind: "claim",
      }),
    });
    expect(
      JSON.stringify(prisma.recoveryOfferEmailEvent.create.mock.calls[0][0]),
    ).not.toContain("secret-token");
  });

  it("deduplicates retried Resend webhook deliveries", async () => {
    prisma.recoveryOfferEmailEvent.findUnique.mockResolvedValue({
      id: "event-1",
    });

    const result = await service.recordResendEvent("svix-event-1", {
      type: "email.opened",
      created_at: "2026-09-02T10:00:00.000Z",
      data: {
        created_at: "2026-09-02T09:00:00.000Z",
        email_id: "resend-email-1",
        from: "support@orivraa.com",
        to: ["owner@example.com"],
        subject: "Recovery",
      },
    });

    expect(result).toEqual({ processed: false, duplicate: true });
    expect(prisma.recoveryOffer.update).not.toHaveBeenCalled();
  });

  it("reports campaign delivery, engagement, claim, and rejoin metrics", async () => {
    config.get.mockImplementation((key: string, fallback: string) =>
      key === "RESEND_WEBHOOK_SECRET"
        ? "whsec_test"
        : key === "RESEND_API_KEY"
          ? "re_test"
          : fallback,
    );
    prisma.recoveryOffer.findMany.mockResolvedValue([
      {
        id: "offer-1",
        status: RecoveryOfferStatus.CLAIMED,
        scheduledFor: null,
        sentAt: new Date("2026-09-01T04:30:00.000Z"),
        deliveredAt: new Date("2026-09-01T04:31:00.000Z"),
        firstOpenedAt: new Date("2026-09-01T05:00:00.000Z"),
        openCount: 2,
        firstClickedAt: new Date("2026-09-01T05:05:00.000Z"),
        clickCount: 1,
        claimedAt: new Date("2026-09-01T05:10:00.000Z"),
        bouncedAt: null,
        complainedAt: null,
        failedAt: null,
        suppressedAt: null,
        user: {
          lastLoginAt: new Date("2026-09-01T05:08:00.000Z"),
          webSessions: [],
          desktopSessions: [],
        },
        shop: { country: "IN" },
      },
      {
        id: "offer-2",
        status: RecoveryOfferStatus.SENT,
        scheduledFor: null,
        sentAt: new Date("2026-09-01T04:30:00.000Z"),
        deliveredAt: new Date("2026-09-01T04:31:00.000Z"),
        firstOpenedAt: null,
        openCount: 0,
        firstClickedAt: null,
        clickCount: 0,
        claimedAt: null,
        bouncedAt: null,
        complainedAt: null,
        failedAt: null,
        suppressedAt: null,
        user: {
          lastLoginAt: new Date("2026-08-01T00:00:00.000Z"),
          webSessions: [
            { startedAt: new Date("2026-09-01T04:00:00.000Z") },
          ],
          desktopSessions: [],
        },
        shop: { country: "NP" },
      },
    ]);

    const result = await service.getCampaignMetrics();

    expect(result.totals).toEqual(
      expect.objectContaining({
        targeted: 2,
        sent: 2,
        delivered: 2,
        opened: 1,
        totalOpens: 2,
        clicked: 1,
        claimed: 1,
        rejoined: 1,
      }),
    );
    expect(result.rates).toEqual(
      expect.objectContaining({
        delivery: 100,
        open: 50,
        click: 50,
        claim: 50,
        rejoin: 50,
      }),
    );
    expect(result.byCountry).toEqual([
      expect.objectContaining({ country: "IN", rejoined: 1 }),
      expect.objectContaining({ country: "NP", rejoined: 0 }),
    ]);
    expect(result.webhookConfigured).toBe(true);
    expect(result.resendApiConfigured).toBe(true);
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
