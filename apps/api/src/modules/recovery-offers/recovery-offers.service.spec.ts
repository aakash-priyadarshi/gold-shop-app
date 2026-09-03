import {
  OfferCampaignKind,
  RecoveryOfferStatus,
  SubscriptionStatus,
  UserRole,
  UserStatus,
} from "@prisma/client";
import { createHash } from "crypto";
import { RecoveryOffersService } from "./recovery-offers.service";

describe("RecoveryOffersService", () => {
  const prisma: any = {
    crashReport: { findMany: jest.fn() },
    user: { findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    subscriptionPlan: { findMany: jest.fn(), findFirst: jest.fn() },
    sellerSubscription: {
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      create: jest.fn(),
    },
    shop: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
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
    offerCampaign: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
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
    config.get.mockImplementation((key: string, fallback?: string) => {
      if (key === "JWT_SECRET") return "test-jwt-secret-for-jest";
      if (key === "API_URL") return "https://api.orivraa.com";
      if (key === "FRONTEND_URL") return "https://www.orivraa.com";
      return fallback;
    });
    prisma.offerCampaign.findUnique.mockResolvedValue(null);
    prisma.offerCampaign.findMany.mockResolvedValue([]);
    prisma.recoveryOffer.count = jest.fn().mockResolvedValue(0);
    prisma.$transaction.mockImplementation((input: any) =>
      typeof input === "function" ? input(prisma) : Promise.all(input),
    );
  });

  it("creates a festival campaign with a validated sale window", async () => {
    prisma.offerCampaign.create.mockResolvedValue({
      id: "campaign-1",
      key: "festival-dashain-2026",
    });

    await service.createCampaign(
      {
        key: "festival-dashain-2026",
        name: "Dashain 2026",
        kind: "FESTIVAL",
        complimentaryDays: 14,
        discountPercent: 10,
        startsAt: "2026-09-20T00:00:00.000Z",
        endsAt: "2026-10-05T00:00:00.000Z",
        emailSubject: "Celebrate with Orivraa",
        emailHeading: "A festival offer for your shop",
        emailBody: "Claim complimentary Pro and save on a paid plan.",
      },
      "admin-1",
    );

    expect(prisma.offerCampaign.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        key: "festival-dashain-2026",
        kind: OfferCampaignKind.FESTIVAL,
        complimentaryDays: 14,
        discountPercent: 10,
        createdBy: "admin-1",
      }),
    });
  });

  it("updates only supplied festival campaign fields", async () => {
    prisma.offerCampaign.findUnique.mockResolvedValue({
      key: "festival-dashain-2026",
      name: "Dashain 2026",
      kind: OfferCampaignKind.FESTIVAL,
      complimentaryDays: 14,
      discountPercent: 10,
      startsAt: new Date("2026-09-20T00:00:00.000Z"),
      endsAt: new Date("2026-10-05T00:00:00.000Z"),
      emailSubject: "Celebrate with Orivraa",
      emailHeading: "A festival offer for your shop",
      emailBody: "Claim complimentary Pro and save on a paid plan.",
      isActive: true,
    });
    prisma.offerCampaign.update.mockResolvedValue({
      key: "festival-dashain-2026",
      isActive: false,
    });

    await service.updateCampaign("festival-dashain-2026", { isActive: false });

    expect(prisma.offerCampaign.update).toHaveBeenCalledWith({
      where: { key: "festival-dashain-2026" },
      data: { isActive: false },
    });
  });

  it("adds festival days after an existing Pro end date", async () => {
    const existingEnd = new Date("2026-10-01T00:00:00.000Z");
    prisma.shop.findFirst.mockResolvedValue({
      id: "shop-1",
      userId: "user-1",
      country: "IN",
      isActive: true,
    });
    prisma.sellerSubscription.findMany.mockResolvedValue([
      {
        id: "sub-1",
        currentPeriodEnd: existingEnd,
        plan: { name: "PRO" },
      },
    ]);
    prisma.sellerSubscription.update.mockImplementation(({ data }: any) =>
      Promise.resolve({
        id: "sub-1",
        currentPeriodEnd: data.currentPeriodEnd,
        plan: { name: "PRO" },
      }),
    );

    const result = await (service as any).grantEntitlement(
      prisma,
      { userId: "user-1", shopId: "shop-1", days: 14 },
      OfferCampaignKind.FESTIVAL,
    );

    expect(result.outcome).toBe("extended");
    expect(result.subscription.currentPeriodEnd).toEqual(
      new Date("2026-10-15T00:00:00.000Z"),
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
        emailVerified: true,
        hasPaidPlan: false,
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

  it("offers recovery PRO to an active paid subscriber", async () => {
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

    expect(result.eligible).toEqual([
      expect.objectContaining({
        userId: "user-1",
        email: "paid@example.com",
        hasPaidPlan: true,
        emailVerified: true,
      }),
    ]);
    expect(result.excluded).toEqual([]);
  });

  it("offers recovery PRO to an unverified shopkeeper", async () => {
    prisma.crashReport.findMany.mockResolvedValue([
      { id: "report-1", userId: "user-1" },
    ]);
    prisma.user.findMany.mockResolvedValue([
      {
        id: "user-1",
        email: "pending@example.com",
        firstName: "Pending",
        role: UserRole.SHOPKEEPER,
        emailVerified: false,
        activeShopId: "shop-1",
        recoveryOffers: [],
        shops: [
          {
            id: "shop-1",
            shopName: "Pending Gold",
            country: "IN",
            subscriptions: [],
          },
        ],
      },
    ]);
    prisma.subscriptionPlan.findMany.mockResolvedValue([{ country: "IN" }]);

    const result = await service.preview(["report-1"]);

    expect(result.eligible).toEqual([
      expect.objectContaining({
        userId: "user-1",
        email: "pending@example.com",
        emailVerified: false,
        hasPaidPlan: false,
      }),
    ]);
    expect(result.excluded).toEqual([]);
  });

  it("includes pending-verification shopkeepers and accounts with no shop", async () => {
    prisma.user.findMany.mockResolvedValue([
      {
        id: "user-pending",
        email: "pending-status@example.com",
        firstName: "Pending",
        role: UserRole.SHOPKEEPER,
        status: UserStatus.PENDING_VERIFICATION,
        emailVerified: true,
        preferredCountry: "IN",
        preferredCurrency: "INR",
        phone: "9999999999",
        activeShopId: "shop-1",
        recoveryOffers: [],
        shops: [
          {
            id: "shop-1",
            shopName: "Pending Gold",
            country: "IN",
            isActive: false,
            subscriptions: [],
          },
        ],
      },
      {
        id: "user-noshop",
        email: "noshop@example.com",
        firstName: "NoShop",
        role: UserRole.SHOPKEEPER,
        status: UserStatus.PENDING_VERIFICATION,
        emailVerified: false,
        preferredCountry: "IN",
        preferredCurrency: "INR",
        phone: null,
        activeShopId: null,
        recoveryOffers: [],
        shops: [],
      },
    ]);
    prisma.crashReport.findMany.mockResolvedValue([]);
    prisma.subscriptionPlan.findMany.mockResolvedValue([{ country: "IN" }]);

    const result = await service.previewAudience();

    expect(result.eligible).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          email: "pending-status@example.com",
          hasShop: true,
          accountStatus: UserStatus.PENDING_VERIFICATION,
        }),
        expect.objectContaining({
          email: "noshop@example.com",
          hasShop: false,
          shopName: "No shop yet",
        }),
      ]),
    );
    expect(result.excluded).toEqual([]);
  });

  it("creates a shop and uses a custom send time for a no-shop recipient", async () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-09-02T00:00:00.000Z"));
    prisma.user.findMany.mockResolvedValue([
      {
        id: "user-noshop",
        email: "noshop@example.com",
        firstName: "NoShop",
        role: UserRole.SHOPKEEPER,
        status: UserStatus.PENDING_VERIFICATION,
        emailVerified: false,
        preferredCountry: "IN",
        preferredCurrency: "INR",
        phone: "8888888888",
        activeShopId: null,
        lastLoginAt: null,
        webSessions: [],
        recoveryOffers: [],
        shops: [],
      },
    ]);
    prisma.crashReport.findMany.mockResolvedValue([]);
    prisma.subscriptionPlan.findMany.mockResolvedValue([{ country: "IN" }]);
    prisma.shop.create.mockResolvedValue({
      id: "shop-created",
      shopName: "NoShop's shop",
    });
    prisma.user.update.mockResolvedValue({});
    prisma.recoveryOffer.findUnique.mockResolvedValue(null);
    prisma.recoveryOffer.create.mockResolvedValue({ id: "offer-new" });
    queue.add.mockResolvedValue({ id: "job-1" });
    const sendAt = new Date("2026-09-05T10:00:00.000Z");

    const result = await service.sendAudience({
      userIds: ["user-noshop"],
      confirmed: true,
      adminId: "admin-1",
      deliveryTiming: "CUSTOM",
      scheduledFor: sendAt.toISOString(),
    });

    expect(prisma.shop.create).toHaveBeenCalled();
    expect(result.scheduled).toBe(1);
    expect(result.results[0].scheduledFor).toEqual(sendAt);
    expect(queue.add).toHaveBeenCalledWith(
      "deliver",
      expect.objectContaining({ offerId: "offer-new" }),
      expect.objectContaining({ delay: expect.any(Number) }),
    );
  });

  it("does not requeue an already prepared or sent offer", async () => {
    prisma.user.findMany.mockResolvedValue([
      {
        id: "user-1",
        email: "owner@example.com",
        firstName: "Owner",
        role: UserRole.SHOPKEEPER,
        status: UserStatus.ACTIVE,
        emailVerified: true,
        activeShopId: "shop-1",
        lastLoginAt: null,
        webSessions: [],
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
    prisma.crashReport.findMany.mockResolvedValue([]);
    prisma.subscriptionPlan.findMany.mockResolvedValue([{ country: "IN" }]);
    prisma.recoveryOffer.findUnique.mockResolvedValue({
      id: "offer-existing",
      status: RecoveryOfferStatus.PREPARED,
    });
    prisma.recoveryOffer.update.mockResolvedValue({ id: "offer-existing" });
    queue.add.mockResolvedValue({ id: "job-1" });

    const result = await service.sendAudience({
      userIds: ["user-1"],
      confirmed: true,
      adminId: "admin-1",
    });

    expect(result.queued).toBe(0);
    expect(result.excluded).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          email: "owner@example.com",
          reason: "Offer email is already queued or scheduled",
        }),
      ]),
    );
    expect(prisma.recoveryOffer.update).not.toHaveBeenCalled();
    expect(queue.add).not.toHaveBeenCalled();
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

  it("keeps a prepared offer visible but not sendable", async () => {
    prisma.crashReport.findMany.mockResolvedValue([
      { id: "report-1", userId: "user-1" },
    ]);
    prisma.user.findMany.mockResolvedValue([
      {
        id: "user-1",
        email: "owner@example.com",
        firstName: "Owner",
        role: UserRole.SHOPKEEPER,
        status: UserStatus.ACTIVE,
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

    expect(result.eligible).toEqual([
      expect.objectContaining({
        email: "owner@example.com",
        offerStatus: RecoveryOfferStatus.PREPARED,
        canSend: false,
      }),
    ]);
    expect(result.excluded).toEqual([]);
  });

  it("includes expired unclaimed offers so they can be reissued", async () => {
    prisma.crashReport.findMany.mockResolvedValue([
      { id: "report-1", userId: "user-1" },
    ]);
    prisma.user.findMany.mockResolvedValue([
      {
        id: "user-1",
        email: "owner@example.com",
        firstName: "Owner",
        role: UserRole.SHOPKEEPER,
        status: UserStatus.ACTIVE,
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

    expect(result.eligible).toEqual([
      expect.objectContaining({
        email: "owner@example.com",
        offerStatus: RecoveryOfferStatus.EXPIRED,
        canSend: true,
      }),
    ]);
    expect(result.excluded).toEqual([]);
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
      user: { firstName: "Owner", marketingUnsubscribedAt: null },
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
        headers: {
          "List-Unsubscribe": expect.stringMatching(
            /^<https:\/\/api\.orivraa\.com\/api\/recovery-offers\/unsubscribe\?token=/,
          ),
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
        context: expect.objectContaining({
          unsubscribeUrl: expect.stringContaining("/offers/unsubscribe?token="),
        }),
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

  it("classifies festival landing clicks as claim events", async () => {
    prisma.recoveryOfferEmailEvent.findUnique.mockResolvedValue(null);
    prisma.recoveryOffer.findFirst.mockResolvedValue({
      id: "offer-festival",
      email: "owner@example.com",
      deliveryMessageId: "resend-email-2",
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
    prisma.recoveryOfferEmailEvent.create.mockResolvedValue({ id: "event-2" });
    prisma.recoveryOffer.update.mockResolvedValue({});

    await service.recordResendEvent("svix-event-2", {
      type: "email.clicked",
      created_at: "2026-09-02T10:00:00.000Z",
      data: {
        created_at: "2026-09-02T09:00:00.000Z",
        email_id: "resend-email-2",
        from: "Orivraa <support@orivraa.com>",
        to: ["owner@example.com"],
        subject: "Festival",
        tags: { offer_id: "offer-festival" },
        click: {
          ipAddress: "203.0.113.10",
          link: "https://www.orivraa.com/offers/festival-dashain-2026#token=secret-token",
          timestamp: "2026-09-02T10:00:01.000Z",
          userAgent: "Browser",
        },
      },
    });

    expect(prisma.recoveryOfferEmailEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        webhookId: "svix-event-2",
        linkKind: "claim",
      }),
    });
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
    prisma.offerCampaign.findMany.mockResolvedValue([
      {
        key: "festival-janmashtami-2026",
        name: "Janmashtami 2026",
        kind: OfferCampaignKind.FESTIVAL,
      },
      {
        key: "customer-winback-2026-09",
        name: "Customer win-back",
        kind: OfferCampaignKind.RECOVERY,
      },
    ]);
    prisma.recoveryOffer.findMany.mockResolvedValue([
      {
        id: "offer-1",
        campaignKey: "festival-janmashtami-2026",
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
        campaignKey: "customer-winback-2026-09",
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
    expect(result).toEqual(
      expect.objectContaining({ scope: "ALL", campaignKey: null }),
    );
    expect(result.byCampaign).toEqual([
      expect.objectContaining({
        campaignKey: "festival-janmashtami-2026",
        name: "Janmashtami 2026",
        totals: expect.objectContaining({ sent: 1, clicked: 1, claimed: 1 }),
      }),
      expect.objectContaining({
        campaignKey: "customer-winback-2026-09",
        totals: expect.objectContaining({ sent: 1, clicked: 0, claimed: 0 }),
      }),
    ]);
    expect(result.webhookConfigured).toBe(true);
    expect(result.resendApiConfigured).toBe(true);
  });

  it("uses distinct fallback names for the audience and incident campaigns in metrics", async () => {
    const baseOffer = {
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
      user: { lastLoginAt: null, webSessions: [], desktopSessions: [] },
      shop: { country: "NP" },
    };
    prisma.offerCampaign.findMany.mockResolvedValue([]);
    prisma.recoveryOffer.findMany.mockResolvedValue([
      { id: "offer-1", campaignKey: "incident-recovery-2026-08", ...baseOffer },
      { id: "offer-2", campaignKey: null, ...baseOffer },
    ]);

    const result = await service.getCampaignMetrics();

    const nameByKey = new Map(
      result.byCampaign.map((campaign) => [campaign.campaignKey, campaign.name]),
    );
    expect(nameByKey.get("incident-recovery-2026-08")).toBe(
      "Incident recovery",
    );
    expect(nameByKey.get("customer-winback-2026-09")).toBe(
      "Customer win-back",
    );
  });

  it("scopes offer-wise metrics to the selected campaign", async () => {
    const result = await service.getCampaignMetrics(
      "festival-janmashtami-2026",
    );

    expect(prisma.recoveryOffer.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { campaignKey: "festival-janmashtami-2026" },
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        scope: "CAMPAIGN",
        campaignKey: "festival-janmashtami-2026",
      }),
    );
  });

  it("extends an existing trial to the offered window from claim time", async () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-09-01T00:00:00.000Z"));
    const now = Date.now();
    const currentPeriodEnd = new Date(now + 5 * 24 * 60 * 60 * 1000);
    const offer = {
      id: "offer-1",
      userId: "user-1",
      shopId: "shop-1",
      days: 50,
      status: RecoveryOfferStatus.SENT,
      expiresAt: new Date(now + 10 * 24 * 60 * 60 * 1000),
      claimedAt: null,
      grantedSubscriptionId: null,
    };
    prisma.recoveryOffer.findUnique.mockResolvedValue(offer);
    prisma.user.findUnique.mockResolvedValue({
      emailVerified: true,
      status: "ACTIVE",
    });
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
    expect(result.outcome).toBe("extended");
    const update = prisma.sellerSubscription.update.mock.calls[0][0];
    expect(update.data.currentPeriodEnd.getTime()).toBe(
      now + 50 * 24 * 60 * 60 * 1000,
    );
    expect(prisma.sellerSubscription.create).not.toHaveBeenCalled();
  });

  it("extends a paid Pro plan to 50 days from claim when fewer than 50 days remain", async () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-09-01T00:00:00.000Z"));
    const now = Date.now();
    prisma.recoveryOffer.findUnique.mockResolvedValue({
      id: "offer-1",
      userId: "user-1",
      shopId: "shop-1",
      days: 50,
      status: RecoveryOfferStatus.SENT,
      expiresAt: new Date(now + 24 * 60 * 60 * 1000),
      claimedAt: null,
    });
    prisma.user.findUnique.mockResolvedValue({
      emailVerified: true,
      status: "ACTIVE",
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
        currentPeriodEnd: new Date(now + 30 * 24 * 60 * 60 * 1000),
        plan: { name: "PRO" },
      },
    ]);
    prisma.sellerSubscription.update.mockImplementation(({ data }: any) =>
      Promise.resolve({
        id: "paid-subscription",
        currentPeriodEnd: data.currentPeriodEnd,
        plan: { name: "PRO" },
      }),
    );
    prisma.recoveryOffer.update.mockResolvedValue({});

    const result = await service.claim("c".repeat(32), "user-1");

    expect(result.claimed).toBe(true);
    expect(result.outcome).toBe("extended");
    const update = prisma.sellerSubscription.update.mock.calls[0][0];
    expect(update.data.currentPeriodEnd.getTime()).toBe(
      now + 50 * 24 * 60 * 60 * 1000,
    );
    expect(prisma.sellerSubscription.create).not.toHaveBeenCalled();
  });

  it("leaves a paid Pro plan unchanged when more than 50 days already remain", async () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-09-01T00:00:00.000Z"));
    const now = Date.now();
    const currentPeriodEnd = new Date(now + 80 * 24 * 60 * 60 * 1000);
    prisma.recoveryOffer.findUnique.mockResolvedValue({
      id: "offer-1",
      userId: "user-1",
      shopId: "shop-1",
      days: 50,
      status: RecoveryOfferStatus.SENT,
      expiresAt: new Date(now + 24 * 60 * 60 * 1000),
      claimedAt: null,
    });
    prisma.user.findUnique.mockResolvedValue({
      emailVerified: true,
      status: "ACTIVE",
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
        currentPeriodEnd,
        plan: { name: "PRO" },
      },
    ]);
    prisma.recoveryOffer.update.mockResolvedValue({});

    const result = await service.claim("d".repeat(32), "user-1");

    expect(result.claimed).toBe(true);
    expect(result.outcome).toBe("already_covered");
    expect(result.subscriptionId).toBe("paid-subscription");
    expect(prisma.sellerSubscription.update).not.toHaveBeenCalled();
    expect(prisma.sellerSubscription.create).not.toHaveBeenCalled();
    expect(prisma.recoveryOffer.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: RecoveryOfferStatus.CLAIMED,
          grantedSubscriptionId: "paid-subscription",
        }),
      }),
    );
  });

  it("activates a pending-verification account after email is verified", async () => {
    const now = Date.now();
    prisma.recoveryOffer.findUnique.mockResolvedValue({
      id: "offer-1",
      userId: "user-1",
      shopId: "shop-1",
      days: 50,
      status: RecoveryOfferStatus.SENT,
      expiresAt: new Date(now + 24 * 60 * 60 * 1000),
      claimedAt: null,
    });
    prisma.user.findUnique.mockResolvedValue({
      emailVerified: true,
      status: UserStatus.PENDING_VERIFICATION,
    });
    prisma.user.update.mockResolvedValue({});
    prisma.recoveryOffer.updateMany.mockResolvedValue({ count: 1 });
    prisma.shop.findFirst.mockResolvedValue({
      id: "shop-1",
      userId: "user-1",
      country: "IN",
      isActive: false,
    });
    prisma.shop.update.mockResolvedValue({});
    prisma.sellerSubscription.findMany.mockResolvedValue([]);
    prisma.subscriptionPlan.findFirst.mockResolvedValue({
      id: "plan-pro",
      country: "IN",
      name: "PRO",
    });
    prisma.sellerSubscription.create.mockResolvedValue({
      id: "sub-1",
      currentPeriodEnd: new Date(now + 50 * 24 * 60 * 60 * 1000),
      plan: { name: "PRO" },
    });
    prisma.recoveryOffer.update.mockResolvedValue({});

    const result = await service.claim("f".repeat(32), "user-1");

    expect(result.claimed).toBe(true);
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: UserStatus.ACTIVE },
      }),
    );
    expect(prisma.shop.update).toHaveBeenCalled();
  });

  it("refuses to grant the offer before the recipient verifies email", async () => {
    prisma.recoveryOffer.findUnique.mockResolvedValue({
      id: "offer-1",
      userId: "user-1",
      shopId: "shop-1",
      days: 50,
      status: RecoveryOfferStatus.SENT,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      claimedAt: null,
    });
    prisma.user.findUnique.mockResolvedValue({
      emailVerified: false,
      status: "ACTIVE",
    });

    await expect(service.claim("e".repeat(32), "user-1")).rejects.toThrow(
      "Verify your email before activating this offer",
    );
    expect(prisma.recoveryOffer.updateMany).not.toHaveBeenCalled();
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
      user: { emailVerified: true },
    });

    const result = await service.lookup("b".repeat(32));

    expect(result.recipient).toBe("ow***@example.com");
    expect(result.recipient).not.toContain("owner@");
    expect(result.claimable).toBe(true);
    expect(result.requiresEmailVerification).toBe(false);
  });

  it("keeps claimed and unsubscribed recipients visible without allowing another send", async () => {
    prisma.crashReport.findMany.mockResolvedValue([
      { id: "report-1", userId: "user-claimed" },
      { id: "report-2", userId: "user-unsub" },
    ]);
    prisma.user.findMany.mockResolvedValue([
      {
        id: "user-claimed",
        email: "claimed@example.com",
        firstName: "Claimed",
        role: UserRole.SHOPKEEPER,
        status: UserStatus.ACTIVE,
        emailVerified: true,
        activeShopId: "shop-1",
        marketingUnsubscribedAt: null,
        recoveryOffers: [
          {
            shopId: "shop-1",
            status: RecoveryOfferStatus.CLAIMED,
            sentAt: new Date("2026-08-20T00:00:00.000Z"),
            claimedAt: new Date("2026-08-21T00:00:00.000Z"),
            firstOpenedAt: new Date("2026-08-20T08:00:00.000Z"),
            openCount: 2,
            clickCount: 1,
          },
        ],
        shops: [
          {
            id: "shop-1",
            shopName: "Claimed Gold",
            country: "IN",
            subscriptions: [],
          },
        ],
      },
      {
        id: "user-unsub",
        email: "unsub@example.com",
        firstName: "Unsub",
        role: UserRole.SHOPKEEPER,
        status: UserStatus.ACTIVE,
        emailVerified: true,
        activeShopId: "shop-2",
        marketingUnsubscribedAt: new Date("2026-08-15T00:00:00.000Z"),
        recoveryOffers: [],
        shops: [
          {
            id: "shop-2",
            shopName: "Unsub Gold",
            country: "IN",
            subscriptions: [],
          },
        ],
      },
    ]);
    prisma.subscriptionPlan.findMany.mockResolvedValue([{ country: "IN" }]);

    const result = await service.preview(["report-1", "report-2"]);

    expect(result.eligible).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          email: "claimed@example.com",
          offerStatus: RecoveryOfferStatus.CLAIMED,
          canSend: false,
          claimedAt: new Date("2026-08-21T00:00:00.000Z"),
        }),
        expect.objectContaining({
          email: "unsub@example.com",
          unsubscribed: true,
          canSend: false,
        }),
      ]),
    );
    expect(result.excluded).toEqual([]);
  });

  it("records an unsubscribe and cancels queued emails", async () => {
    const token = service.createUnsubscribeToken("user-1");
    prisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      marketingUnsubscribedAt: null,
    });
    prisma.user.update.mockResolvedValue({});
    prisma.recoveryOffer.updateMany.mockResolvedValue({ count: 1 });

    const result = await service.unsubscribe(token);

    expect(result).toEqual({
      unsubscribed: true,
      alreadyUnsubscribed: false,
    });
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "user-1" },
        data: expect.objectContaining({
          marketingUnsubscribedAt: expect.any(Date),
        }),
      }),
    );
    expect(prisma.recoveryOffer.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user-1", status: RecoveryOfferStatus.PREPARED },
      }),
    );
  });

  it("rejects a tampered unsubscribe token", async () => {
    await expect(service.unsubscribe("user-1.not-a-real-signature")).rejects.toThrow(
      "This unsubscribe link is invalid",
    );
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it("rejects a repeated unsubscribe query token instead of throwing", async () => {
    await expect(
      service.unsubscribe(["user-1.abc", "user-1.def"] as unknown as string),
    ).rejects.toThrow("This unsubscribe link is invalid");
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it("skips delivery when the recipient has unsubscribed", async () => {
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
      user: {
        firstName: "Owner",
        marketingUnsubscribedAt: new Date("2026-08-01T00:00:00.000Z"),
      },
      shop: { shopName: "Owner Gold" },
    });
    prisma.recoveryOffer.updateMany.mockResolvedValue({ count: 1 });

    const result = await service.deliverQueuedOffer({
      offerId: "offer-1",
      rawToken,
    });

    expect(result).toEqual({ skipped: true, reason: "unsubscribed" });
    expect(mail.send).not.toHaveBeenCalled();
    expect(prisma.recoveryOffer.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: RecoveryOfferStatus.CANCELLED,
        }),
      }),
    );
  });

  it("does not queue a festival send after the campaign end time", async () => {
    prisma.offerCampaign.findUnique.mockResolvedValue({
      key: "festival-dashain-2026",
      name: "Dashain 2026",
      kind: OfferCampaignKind.FESTIVAL,
      complimentaryDays: 14,
      discountPercent: 10,
      startsAt: new Date("2026-09-01T00:00:00.000Z"),
      endsAt: new Date("2026-09-10T00:00:00.000Z"),
      emailSubject: "Festival",
      emailHeading: "Hello",
      emailBody: "Body",
      isActive: true,
    });
    prisma.user.findMany.mockResolvedValue([
      {
        id: "user-1",
        email: "owner@example.com",
        firstName: "Owner",
        role: UserRole.SHOPKEEPER,
        status: UserStatus.ACTIVE,
        emailVerified: true,
        activeShopId: "shop-1",
        lastLoginAt: null,
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
    prisma.recoveryOffer.findUnique.mockResolvedValue(null);

    const result = await service.sendAudience({
      userIds: ["user-1"],
      campaignKey: "festival-dashain-2026",
      confirmed: true,
      adminId: "admin-1",
      deliveryTiming: "CUSTOM",
      scheduledFor: "2026-09-10T00:00:00.000Z",
    });

    expect(result.queued).toBe(0);
    expect(result.scheduled).toBe(0);
    expect(result.excluded).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          email: "owner@example.com",
          reason: "The send time is after the campaign end time",
        }),
      ]),
    );
    expect(queue.add).not.toHaveBeenCalled();
  });

  it("delivers a queued offer after the campaign is deactivated", async () => {
    const rawToken = "delivery-token";
    const tokenHash = createHash("sha256").update(rawToken).digest("hex");
    prisma.recoveryOffer.findUnique.mockResolvedValueOnce({
      id: "offer-1",
      campaignKey: "festival-dashain-2026",
      userId: "user-1",
      email: "owner@example.com",
      tokenHash,
      days: 14,
      status: RecoveryOfferStatus.PREPARED,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      createdBy: "admin-1",
      user: { firstName: "Owner", marketingUnsubscribedAt: null },
      shop: { shopName: "Owner Gold" },
    });
    prisma.offerCampaign.findUnique.mockResolvedValue({
      key: "festival-dashain-2026",
      name: "Dashain 2026",
      kind: OfferCampaignKind.FESTIVAL,
      complimentaryDays: 14,
      discountPercent: 10,
      startsAt: new Date("2026-09-20T00:00:00.000Z"),
      endsAt: new Date("2026-10-05T00:00:00.000Z"),
      emailSubject: "Celebrate with Orivraa",
      emailHeading: "A festival offer for your shop",
      emailBody: "Claim complimentary Pro and save on a paid plan.",
      isActive: false,
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
        template: "festival-offer",
        subject: "Celebrate with Orivraa",
      }),
    );
  });
});
