import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../../prisma/prisma.service";
import { ChatGateway } from "../chat/chat.gateway";
import {
  SupportAccessService,
  supportTokenHash,
} from "./support-access.service";
import { SupportAccessGuard } from "./support-access.guard";
import { supportOperation } from "./support-access.policy";
import { redactSupportResponse } from "./support-access.interceptor";
import { supportAccessContext } from "../../common/support-access-context";
import { ShopPriceRebaseService } from "../shops/shop-price-rebase.service";

describe("Seller-approved support access", () => {
  let service: SupportAccessService;
  let guard: SupportAccessGuard;
  let db: any;
  const admin = { id: "admin", role: "ADMIN", status: "ACTIVE" };
  const seller = { id: "seller", role: "SHOPKEEPER", status: "ACTIVE" };
  const makeSession = () => ({
    id: "session",
    expiresAt: new Date(Date.now() + 3600000),
    lastUsedAt: new Date(),
    endedAt: null,
    grant: {
      id: "grant",
      adminId: "admin",
      sellerId: "seller",
      shopId: "shop",
      conversationId: "chat",
      status: "APPROVED",
      revokedAt: null,
      expiresAt: new Date(Date.now() + 86400000),
      permissions: [],
      admin,
      seller,
      shop: { userId: "seller", isActive: true },
    },
  });

  beforeEach(async () => {
    db = {
      supportAccessSession: {
        findUnique: jest.fn().mockResolvedValue(makeSession()),
        update: jest.fn(),
        updateMany: jest.fn(),
        create: jest.fn(),
      },
      supportAccessGrant: {
        findUnique: jest.fn().mockResolvedValue(makeSession().grant),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        create: jest.fn(),
      },
      supportAccessAuditEvent: {
        create: jest.fn().mockResolvedValue({ id: "event" }),
        update: jest.fn(),
      },
      conversation: {
        findUnique: jest
          .fn()
          .mockResolvedValue({
            status: "ACTIVE",
            buyer: admin,
            shop: { user: seller },
          }),
        update: jest.fn(),
      },
      shop: {
        findMany: jest.fn().mockResolvedValue([{ id: "shop" }]),
        findUnique: jest.fn().mockResolvedValue({ userId: "seller" }),
      },
      message: { create: jest.fn(), findFirst: jest.fn() },
      inventoryItem: { findUnique: jest.fn() },
    };
    db.$transaction = jest.fn((fn: any) => fn(db));
    const module = await Test.createTestingModule({
      providers: [
        SupportAccessService,
        SupportAccessGuard,
        { provide: PrismaService, useValue: db },
        { provide: ConfigService, useValue: { get: () => "true" } },
        { provide: ChatGateway, useValue: { emitToUser: jest.fn() } },
      ],
    }).compile();
    service = module.get(SupportAccessService);
    guard = module.get(SupportAccessGuard);
  });

  it.each([
    "/auth/refresh",
    "/auth/api-tokens",
    "/support-access/grants/grant/approve",
    "/invoices/id/payment",
    "/chat/conversations/id/messages",
    "/shops/my-shop/manager-pin",
    "/seller-subscriptions/billing-portal",
  ])("blocks unapproved route %s", (path) => {
    for (const method of ["GET", "POST", "PATCH", "DELETE"])
      expect(() => supportOperation(method, path)).toThrow(ForbiddenException);
  });
  it("requires explicit PDF permission", () =>
    expect(supportOperation("GET", "/invoices/123/pdf").permission).toBe(
      "invoices.download",
    ));
  it("removes credentials from nested dashboard responses", () => {
    expect(
      redactSupportResponse({
        shop: {
          id: "shop",
          managerPinHash: "secret",
          bankAccountDetails: { account: "private" },
        },
        customers: [{ passwordHash: "secret", firstName: "Name" }],
      }),
    ).toEqual({ shop: { id: "shop" }, customers: [{ firstName: "Name" }] });
  });
  it("does not run automatic price conversions during browsing", async () => {
    const rebase = new ShopPriceRebaseService({} as any, {} as any);
    await expect(
      supportAccessContext.run({ readOnly: true, actorId: "admin" }, () =>
        rebase.ensureShopPricesMatchCurrency("shop"),
      ),
    ).resolves.toBeNull();
    expect(supportAccessContext.getStore()).toBeUndefined();
  });
  it("issues only a hashed, hour-limited support credential", async () => {
    db.$queryRaw = jest.fn();
    db.supportAccessGrant.findUniqueOrThrow = jest
      .fn()
      .mockResolvedValue(makeSession().grant);
    db.supportAccessSession.create.mockImplementation(
      async ({ data }: any) => ({ id: "new-session", ...data }),
    );
    const result = await service.start(admin, "grant");
    expect(result.token).toMatch(/^osa_[a-f0-9]{64}$/);
    expect(db.supportAccessSession.create.mock.calls[0][0].data.tokenHash).toBe(
      supportTokenHash(result.token),
    );
    expect(result.expiresAt.getTime()).toBeLessThanOrEqual(
      Date.now() + 3600000,
    );
    expect(result).not.toHaveProperty("refreshToken");
  });
  it("cannot start a session for a different admin", async () => {
    await expect(
      service.start({ ...admin, id: "other-admin" }, "grant"),
    ).rejects.toThrow(ForbiddenException);
    expect(db.supportAccessSession.create).not.toHaveBeenCalled();
  });
  it("does not grant new endpoints by prefix", () =>
    expect(() =>
      supportOperation("GET", "/shops/my-shop/new-secret"),
    ).toThrow());
  it.each([
    "revoked",
    "expired",
    "idle",
    "adminRemoved",
    "ownerChanged",
    "ended",
  ])("rejects %s sessions", async (kind) => {
    const session = makeSession();
    if (kind === "revoked") session.grant.status = "REVOKED";
    if (kind === "expired") session.grant.expiresAt = new Date(0);
    if (kind === "idle") session.lastUsedAt = new Date(0);
    if (kind === "adminRemoved")
      session.grant.admin = { ...admin, role: "CUSTOMER" };
    if (kind === "ownerChanged") session.grant.shop.userId = "other";
    if (kind === "ended") (session as any).endedAt = new Date();
    db.supportAccessSession.findUnique.mockResolvedValue(session);
    await expect(service.authenticate("osa_secret")).rejects.toThrow(
      UnauthorizedException,
    );
  });
  it("looks up only a hash of the session credential", async () => {
    await service.authenticate("osa_secret", false);
    expect(
      db.supportAccessSession.findUnique.mock.calls[0][0].where.tokenHash,
    ).toBe(supportTokenHash("osa_secret"));
    expect(db.supportAccessSession.update).not.toHaveBeenCalled();
  });
  it("prevents impersonated consent management", async () => {
    await expect(
      service.get({ ...seller, supportAccess: true }, "grant"),
    ).rejects.toThrow(ForbiddenException);
    await expect(
      service.get({ ...seller, tokenType: "seller-smoke" }, "grant"),
    ).rejects.toThrow(ForbiddenException);
  });
  it("requires the actual seller to approve", async () => {
    await expect(
      service.decide(admin, "grant", "APPROVED", {
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
        permissions: [],
      }),
    ).rejects.toThrow(ForbiddenException);
  });
  it("rejects arbitrary permissions and overlong durations", async () => {
    for (const dto of [
      {
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
        permissions: ["admin:*"],
      },
      { expiresAt: "2099-01-01T00:00:00Z", permissions: [] },
    ]) {
      await expect(
        service.decide(seller, "grant", "APPROVED", dto),
      ).rejects.toThrow();
    }
    expect(db.supportAccessGrant.updateMany).not.toHaveBeenCalled();
  });
  it("revokes every session for the grant", async () => {
    await service.decide(seller, "grant", "REVOKED");
    expect(db.supportAccessSession.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { grantId: "grant", endedAt: null },
        data: expect.objectContaining({ endReason: "REVOKED" }),
      }),
    );
  });
  it("rejects reused approval without extending the grant", async () => {
    db.supportAccessGrant.updateMany.mockResolvedValue({ count: 0 });
    await expect(
      service.decide(seller, "grant", "APPROVED", {
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
        permissions: [],
      }),
    ).rejects.toThrow("already changed");
  });
  function http(path: string, method = "GET", body = {}) {
    const req = {
      path: `/api${path}`,
      method,
      body,
      query: {},
      headers: { authorization: "Bearer osa_secret" },
    };
    const response = { setHeader: jest.fn(), once: jest.fn() };
    const context = {
      getType: () => "http",
      switchToHttp: () => ({
        getRequest: () => req,
        getResponse: () => response,
      }),
    } as any;
    return { req, context };
  }
  it("binds seller identity to the grant without admin privileges", async () => {
    const { req, context } = http("/auth/me");
    await guard.canActivate(context);
    expect((req as any).user).toMatchObject({
      id: "seller",
      actorUserId: "admin",
      role: "SHOPKEEPER",
      shopId: "shop",
    });
  });
  it("blocks writes without the selected permission", async () => {
    await expect(
      guard.canActivate(http("/invoices", "POST").context),
    ).rejects.toThrow("not allowed");
  });
  it("allows explicitly selected invoice creation", async () => {
    const session = makeSession();
    (session.grant.permissions as string[]) = ["invoices.create"];
    db.supportAccessSession.findUnique.mockResolvedValue(session);
    await expect(
      guard.canActivate(http("/invoices", "POST").context),
    ).resolves.toBe(true);
  });
  it("blocks another shop in the URL or body", async () => {
    await expect(
      guard.canActivate(http("/inventory/shop/other/items").context),
    ).rejects.toThrow("approved shop");
    await expect(
      guard.canActivate(http("/auth/me", "GET", { shopId: "other" }).context),
    ).rejects.toThrow("cannot be changed");
  });
  it("blocks product access outside the granted shop even for the same owner", async () => {
    db.inventoryItem.findUnique.mockResolvedValue({ shopId: "other" });
    await expect(
      guard.canActivate(http("/inventory/product").context),
    ).rejects.toThrow("outside");
  });
  it("leaves ordinary authentication alone", async () => {
    const { req, context } = http("/auth/me");
    req.headers.authorization = "Bearer normal-jwt";
    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(db.supportAccessSession.findUnique).not.toHaveBeenCalled();
  });
});
