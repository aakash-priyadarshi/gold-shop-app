import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";
import { PlanQuotesService } from "./plan-quotes.service";

describe("PlanQuotesService", () => {
  const prisma: any = {
    planInquiry: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    planQuote: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    subscriptionPlan: { findUnique: jest.fn() },
    shop: { findFirst: jest.fn(), findUnique: jest.fn() },
    $transaction: jest.fn((input: any) =>
      typeof input === "function" ? input(prisma) : Promise.all(input),
    ),
  };
  const mail: any = {
    send: jest.fn().mockResolvedValue({ success: true }),
    sendAdminAlert: jest.fn().mockResolvedValue({ success: true }),
  };
  const config: any = {
    get: jest.fn((key: string) =>
      key === "FRONTEND_URL" ? "https://www.orivraa.com" : undefined,
    ),
  };

  let service: PlanQuotesService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mail.send.mockResolvedValue({ success: true });
    mail.sendAdminAlert.mockResolvedValue({ success: true });
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlanQuotesService,
        { provide: (await import("../../prisma/prisma.service")).PrismaService, useValue: prisma },
        { provide: ConfigService, useValue: config },
        { provide: (await import("../mail/mail.service")).MailService, useValue: mail },
      ],
    }).compile();
    service = module.get(PlanQuotesService);
  });

  it("records a plan inquiry and notifies the admin inbox", async () => {
    prisma.shop.findFirst.mockResolvedValue({
      id: "shop-1",
      shopName: "Owner Gold",
      country: "IN",
    });
    prisma.planInquiry.create.mockResolvedValue({ id: "inq-1" });

    await service.createInquiry(
      { planName: "PRO_PLUS", message: "We need 3 branches" },
      "user-1",
      "shop-1",
    );

    expect(prisma.planInquiry.create).toHaveBeenCalledWith({
      data: {
        shopId: "shop-1",
        userId: "user-1",
        planName: "PRO_PLUS",
        message: "We need 3 branches",
      },
    });
    expect(mail.sendAdminAlert).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        alertType: "PLAN_INQUIRY",
        details: expect.objectContaining({ Plan: "PRO_PLUS" }),
      }),
    );
  });

  it("creates a quote for a paid plan and emails the owner an accept link", async () => {
    prisma.subscriptionPlan.findUnique.mockResolvedValue({
      id: "plan-plus",
      name: "PRO_PLUS",
      displayName: "Pro+",
      currency: "INR",
      monthlyPrice: 4999,
      isActive: true,
    });
    prisma.shop.findUnique.mockResolvedValue({
      id: "shop-1",
      user: { email: "owner@example.com", firstName: "Owner" },
    });
    prisma.planInquiry.findFirst.mockResolvedValue({
      id: "inq-1",
      shopId: "shop-1",
    });
    prisma.planQuote.create.mockResolvedValue({ id: "quote-1", token: "tok" });
    prisma.planInquiry.update.mockResolvedValue({});

    await service.createQuote(
      {
        shopId: "shop-1",
        planId: "plan-plus",
        inquiryId: "inq-1",
        monthlyPrice: 3999,
        validityDays: 30,
        notes: "Founding-member pricing",
      },
      "admin-1",
    );

    expect(prisma.planQuote.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        shopId: "shop-1",
        planId: "plan-plus",
        monthlyPrice: 3999,
        createdBy: "admin-1",
      }),
    });
    expect(prisma.planInquiry.update).toHaveBeenCalledWith({
      where: { id: "inq-1" },
      data: { status: "QUOTED" },
    });
    expect(prisma.planInquiry.findFirst).toHaveBeenCalledWith({
      where: { id: "inq-1", shopId: "shop-1" },
    });
    expect(mail.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "owner@example.com",
        template: "plan-quote",
        context: expect.objectContaining({
          monthlyPrice: 3999,
          quoteUrl: expect.stringContaining("/dashboard/shop/billing?tab=upgrade&quote="),
        }),
      }),
    );
  });

  it("rejects attaching an inquiry from a different shop", async () => {
    prisma.subscriptionPlan.findUnique.mockResolvedValue({
      id: "plan-plus",
      name: "PRO_PLUS",
      displayName: "Pro+",
      currency: "INR",
      monthlyPrice: 4999,
      isActive: true,
    });
    prisma.shop.findUnique.mockResolvedValue({
      id: "shop-1",
      user: { email: "owner@example.com", firstName: "Owner" },
    });
    prisma.planInquiry.findFirst.mockResolvedValue(null);

    await expect(
      service.createQuote(
        {
          shopId: "shop-1",
          planId: "plan-plus",
          inquiryId: "inq-other-shop",
          monthlyPrice: 3999,
          validityDays: 30,
        },
        "admin-1",
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.planQuote.create).not.toHaveBeenCalled();
  });

  it("rejects quotes for free plans and quotes without any price", async () => {
    prisma.subscriptionPlan.findUnique.mockResolvedValue({
      id: "plan-free",
      displayName: "Free",
      monthlyPrice: 0,
      isActive: true,
    });
    await expect(
      service.createQuote(
        { shopId: "shop-1", planId: "plan-free", monthlyPrice: 10, validityDays: 30 },
        "admin-1",
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    prisma.subscriptionPlan.findUnique.mockResolvedValue({
      id: "plan-plus",
      displayName: "Pro+",
      monthlyPrice: 4999,
      isActive: true,
    });
    await expect(
      service.createQuote(
        { shopId: "shop-1", planId: "plan-plus", validityDays: 30 },
        "admin-1",
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("resolves a quote only for the issued shop and flags expired ones", async () => {
    const validUntil = new Date(Date.now() + 7 * 86_400_000);
    prisma.planQuote.findUnique.mockResolvedValue({
      id: "quote-1",
      token: "tok",
      shopId: "shop-1",
      status: "SENT",
      validUntil,
      monthlyPrice: 3999,
      annualPrice: null,
      notes: null,
      shop: { userId: "user-1" },
      plan: {
        id: "plan-plus",
        name: "PRO_PLUS",
        displayName: "Pro+",
        isActive: true,
      },
    });

    const quote = await service.getQuoteForShop("tok", "user-1", "shop-1");
    expect(quote.expired).toBe(false);
    expect(quote.plan.displayName).toBe("Pro+");

    await expect(
      service.getQuoteForShop("tok", "user-other", "shop-1"),
    ).rejects.toBeInstanceOf(ForbiddenException);

    prisma.planQuote.findUnique.mockResolvedValue({
      id: "quote-1",
      token: "tok",
      shopId: "shop-1",
      status: "SENT",
      validUntil: new Date(Date.now() - 86_400_000),
      monthlyPrice: 3999,
      annualPrice: null,
      notes: null,
      shop: { userId: "user-1" },
      plan: { id: "plan-plus", name: "PRO_PLUS", isActive: true },
    });
    const expired = await service.getQuoteForShop("tok", "user-1", "shop-1");
    expect(expired.expired).toBe(true);
  });

  it("refuses to revoke a redeemed quote", async () => {
    prisma.planQuote.findUnique.mockResolvedValue({
      id: "quote-1",
      status: "REDEEMED",
    });
    await expect(service.revokeQuote("quote-1")).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it("throws when the quote does not exist", async () => {
    prisma.planQuote.findUnique.mockResolvedValue(null);
    await expect(
      service.getQuoteForShop("missing", "user-1", "shop-1"),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
