import { UserRole } from "@prisma/client";
import {
  encodePendingReferral,
  pendingReferralKey,
  PENDING_REFERRAL_TTL_SECONDS,
} from "../../common/utils/referral-code";
import { ShopsService } from "./shops.service";

const flushBackgroundWork = () => new Promise((resolve) => setImmediate(resolve));

describe("ShopsService pending referral recovery", () => {
  let prisma: any;
  let redis: any;
  let sellerEngagement: any;
  let service: ShopsService;

  beforeEach(() => {
    prisma = {
      user: { findUnique: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
      shop: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
      },
      $transaction: jest.fn(),
    };
    redis = {
      get: jest.fn(),
      set: jest.fn(),
      setKeepTtl: jest.fn(),
      del: jest.fn(),
    };
    sellerEngagement = { processReferralSignup: jest.fn() };
    service = new ShopsService(
      prisma,
      { log: jest.fn() } as any,
      redis,
      {} as any,
      {} as any,
      { autoActivateFreePlan: jest.fn() } as any,
      sellerEngagement,
      {} as any,
      {} as any,
    );
  });

  const prepareFindByUser = (pendingValue: string | undefined) => {
    prisma.user.findUnique.mockImplementation(({ select }: any) =>
      select?.email
        ? { email: "referee@example.com" }
        : { activeShopId: "active-shop" },
    );
    prisma.shop.findUnique.mockResolvedValue({
      id: "active-shop",
      userId: "user-1",
      metalRates: [],
      finishPricing: [],
    });
    redis.get.mockResolvedValue(pendingValue);
  };

  it("recovers a structured pending referral for its exact originating shop, not the active shop", async () => {
    prepareFindByUser(
      encodePendingReferral({ code: "invite-123", shopId: "origin-shop" }),
    );
    prisma.shop.findFirst.mockResolvedValue({ id: "origin-shop" });
    sellerEngagement.processReferralSignup.mockResolvedValue({ id: "ref-1" });

    await service.findByUserId("user-1");
    await flushBackgroundWork();
    await flushBackgroundWork();

    expect(sellerEngagement.processReferralSignup).toHaveBeenCalledWith(
      "referee@example.com",
      "origin-shop",
      "INVITE123",
    );
    expect(redis.del).toHaveBeenCalledWith(pendingReferralKey("user-1"));
  });

  it("does not substitute the active shop when the structured origin is no longer owned", async () => {
    prepareFindByUser(
      encodePendingReferral({ code: "invite-123", shopId: "former-shop" }),
    );
    prisma.shop.findFirst.mockResolvedValue(null);

    await service.findByUserId("user-1");
    await flushBackgroundWork();
    await flushBackgroundWork();

    expect(sellerEngagement.processReferralSignup).not.toHaveBeenCalled();
    expect(redis.del).not.toHaveBeenCalled();
  });

  it("continues to recover legacy plain-code entries using the selected shop", async () => {
    prepareFindByUser("invite-123");
    sellerEngagement.processReferralSignup.mockResolvedValue({ id: "ref-1" });

    await service.findByUserId("user-1");
    await flushBackgroundWork();
    await flushBackgroundWork();

    expect(sellerEngagement.processReferralSignup).toHaveBeenCalledWith(
      "referee@example.com",
      "active-shop",
      "INVITE123",
    );
    expect(redis.del).toHaveBeenCalledWith(pendingReferralKey("user-1"));
  });

  it("keeps the pending key and its TTL on a failed recovery retry", async () => {
    prepareFindByUser(
      encodePendingReferral({ code: "invite-123", shopId: "origin-shop" }),
    );
    prisma.shop.findFirst.mockResolvedValue({ id: "origin-shop" });
    sellerEngagement.processReferralSignup.mockRejectedValue(new Error("retry"));

    await service.findByUserId("user-1");
    await flushBackgroundWork();
    await flushBackgroundWork();

    expect(redis.del).not.toHaveBeenCalled();
    expect(redis.set).not.toHaveBeenCalled();
    expect(redis.setKeepTtl).not.toHaveBeenCalled();
  });

  it("updates a legacy OAuth referral without changing its existing TTL", async () => {
    const pendingKey = pendingReferralKey("user-1");
    prisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      email: "referee@example.com",
      role: UserRole.SHOPKEEPER,
      shops: [],
    });
    prisma.shop.create.mockResolvedValue({ id: "origin-shop", shopName: "Origin" });
    prisma.user.update.mockResolvedValue({});
    prisma.$transaction.mockImplementation((operations: Promise<unknown>[]) =>
      Promise.all(operations),
    );
    redis.get.mockImplementation((key: string) =>
      key === pendingKey ? "invite-123" : undefined,
    );
    redis.setKeepTtl.mockResolvedValue(true);
    sellerEngagement.processReferralSignup.mockResolvedValue(null);

    await service.setupShopForOAuthUser("user-1", {
      shopName: "Origin",
      userPhone: "+9779812345678",
      country: "NP",
      city: "Kathmandu",
    });

    expect(redis.setKeepTtl).toHaveBeenCalledWith(
      pendingKey,
      encodePendingReferral({ code: "invite-123", shopId: "origin-shop" }),
    );
    expect(redis.set).not.toHaveBeenCalledWith(
      pendingKey,
      encodePendingReferral({ code: "invite-123", shopId: "origin-shop" }),
      PENDING_REFERRAL_TTL_SECONDS,
    );
    expect(redis.del).not.toHaveBeenCalledWith(pendingKey);
  });

  it("recreates an expired structured OAuth referral with the standard TTL", async () => {
    const pendingKey = pendingReferralKey("user-1");
    const pending = encodePendingReferral({
      code: "invite-123",
      shopId: "origin-shop",
    });
    prisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      email: "referee@example.com",
      role: UserRole.SHOPKEEPER,
      shops: [],
    });
    prisma.shop.create.mockResolvedValue({ id: "origin-shop", shopName: "Origin" });
    prisma.user.update.mockResolvedValue({});
    prisma.$transaction.mockImplementation((operations: Promise<unknown>[]) =>
      Promise.all(operations),
    );
    redis.get.mockImplementation((key: string) =>
      key === pendingKey ? pending : undefined,
    );
    redis.setKeepTtl.mockResolvedValue(false);
    sellerEngagement.processReferralSignup.mockRejectedValue(new Error("retry"));

    await service.setupShopForOAuthUser("user-1", {
      shopName: "Origin",
      userPhone: "+9779812345678",
      country: "NP",
      city: "Kathmandu",
    });

    expect(redis.setKeepTtl).toHaveBeenCalledWith(pendingKey, pending);
    expect(redis.set).toHaveBeenCalledWith(
      pendingKey,
      pending,
      PENDING_REFERRAL_TTL_SECONDS,
    );
    expect(redis.del).not.toHaveBeenCalledWith(pendingKey);
  });
});
