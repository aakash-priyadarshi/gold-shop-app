import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PlanInquiryStatus, PlanQuoteStatus } from "@prisma/client";
import { randomBytes } from "crypto";
import { PrismaService } from "../../prisma/prisma.service";
import { EMAIL_SENDERS, MailService } from "../mail/mail.service";
import {
  CreatePlanInquiryDto,
  CreatePlanQuoteDto,
} from "./dto/plan-quote.dto";

const QUOTE_TOKEN_BYTES = 24;

@Injectable()
export class PlanQuotesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Shop owner asks sales about a plan (Pro+ / Enterprise). The inquiry is
   * recorded and the admin inbox is notified.
   */
  async createInquiry(
    dto: CreatePlanInquiryDto,
    userId: string,
    shopId: string,
  ) {
    const shop = await this.prisma.shop.findFirst({
      where: { id: shopId, userId },
      select: { id: true, shopName: true, country: true },
    });
    if (!shop) {
      throw new ForbiddenException("You can only inquire for your own shop");
    }

    const inquiry = await this.prisma.planInquiry.create({
      data: {
        shopId: shop.id,
        userId,
        planName: dto.planName,
        message: dto.message?.trim() || null,
      },
    });

    const adminEmail =
      this.config.get<string>("ADMIN_EMAIL") || EMAIL_SENDERS.ADMIN;
    await this.mail
      .sendAdminAlert(adminEmail, {
        alertType: "PLAN_INQUIRY",
        title: `Plan inquiry: ${dto.planName} — ${shop.shopName}`,
        message:
          dto.message?.trim() ||
          `A shopkeeper asked about the ${dto.planName} plan.`,
        details: {
          Shop: shop.shopName,
          Country: shop.country,
          Plan: dto.planName,
        },
        actionUrl: `${this.frontendBaseUrl()}/dashboard/admin/billing?tab=quotes`,
        actionText: "Open plan requests",
      })
      .catch(() => null);

    return inquiry;
  }

  /** Admin: list inquiries with shop and requester info. */
  listInquiries() {
    return this.prisma.planInquiry.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        shop: { select: { id: true, shopName: true, country: true } },
        user: { select: { email: true, firstName: true } },
        quote: { select: { id: true, token: true, status: true } },
      },
    });
  }

  /** Admin: update inquiry status. */
  async updateInquiryStatus(id: string, status: PlanInquiryStatus) {
    const inquiry = await this.prisma.planInquiry.findUnique({
      where: { id },
    });
    if (!inquiry) throw new NotFoundException("Plan inquiry not found");
    return this.prisma.planInquiry.update({
      where: { id },
      data: { status },
    });
  }

  /**
   * Admin: prepare a custom-priced quote and email it to the shop owner.
   * The Stripe price itself is created lazily when the shop accepts.
   */
  async createQuote(dto: CreatePlanQuoteDto, adminId: string) {
    if (!dto.monthlyPrice && !dto.annualPrice) {
      throw new BadRequestException(
        "Quote at least one of monthlyPrice or annualPrice",
      );
    }
    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { id: dto.planId },
    });
    if (!plan || !plan.isActive) {
      throw new NotFoundException("Plan not found");
    }
    if (plan.monthlyPrice === 0) {
      throw new BadRequestException("Free plans cannot be quoted");
    }
    const shop = await this.prisma.shop.findUnique({
      where: { id: dto.shopId },
      include: { user: { select: { email: true, firstName: true } } },
    });
    if (!shop) throw new NotFoundException("Shop not found");
    if (!shop.user.email) {
      throw new BadRequestException(
        "The shop owner has no verified email address",
      );
    }

    if (dto.inquiryId) {
      // The inquiry must belong to the same shop the quote is issued to.
      const inquiry = await this.prisma.planInquiry.findFirst({
        where: { id: dto.inquiryId, shopId: shop.id },
      });
      if (!inquiry) {
        throw new NotFoundException("Plan inquiry not found for this shop");
      }
    }

    const token = randomBytes(QUOTE_TOKEN_BYTES).toString("hex");
    const validUntil = new Date(
      Date.now() + dto.validityDays * 24 * 60 * 60 * 1000,
    );

    const [quote] = await this.prisma.$transaction([
      this.prisma.planQuote.create({
        data: {
          token,
          shopId: shop.id,
          planId: plan.id,
          ...(dto.inquiryId ? { inquiryId: dto.inquiryId } : {}),
          monthlyPrice: dto.monthlyPrice ?? null,
          annualPrice: dto.annualPrice ?? null,
          validUntil,
          notes: dto.notes?.trim() || null,
          createdBy: adminId,
        },
      }),
      ...(dto.inquiryId
        ? [
            this.prisma.planInquiry.update({
              where: { id: dto.inquiryId },
              data: { status: PlanInquiryStatus.QUOTED },
            }),
          ]
        : []),
    ]);

    const quoteUrl = `${this.frontendBaseUrl()}/dashboard/shop/billing?tab=upgrade&quote=${token}`;
    await this.mail
      .send({
        to: shop.user.email,
        subject: `Your custom ${plan.displayName} quote from Orivraa`,
        template: "plan-quote",
        from: `Orivraa Sales <${EMAIL_SENDERS.ADMIN}>`,
        context: {
          shopName: shop.shopName,
          firstName: shop.user.firstName || "there",
          planName: plan.displayName,
          currency: plan.currency,
          monthlyPrice: dto.monthlyPrice,
          annualPrice: dto.annualPrice,
          validUntil,
          notes: dto.notes?.trim() || null,
          quoteUrl,
        },
      })
      .catch(() => null);

    return quote;
  }

  /** Admin: list quotes. */
  listQuotes() {
    return this.prisma.planQuote.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        shop: { select: { id: true, shopName: true, country: true } },
        plan: { select: { displayName: true, currency: true, name: true } },
      },
    });
  }

  /** Admin: revoke an unredeemed quote. */
  async revokeQuote(id: string) {
    const quote = await this.prisma.planQuote.findUnique({ where: { id } });
    if (!quote) throw new NotFoundException("Plan quote not found");
    if (quote.status === PlanQuoteStatus.REDEEMED) {
      throw new BadRequestException("This quote has already been redeemed");
    }
    return this.prisma.planQuote.update({
      where: { id },
      data: { status: PlanQuoteStatus.REVOKED },
    });
  }

  /**
   * Shop owner resolves a quote link: returns the quoted plan details for
   * the billing page. Accepting happens via the normal subscribe endpoint.
   */
  async getQuoteForShop(token: string, userId: string, shopId: string) {
    const quote = await this.prisma.planQuote.findUnique({
      where: { token },
      include: {
        shop: { select: { userId: true } },
        plan: {
          select: {
            id: true,
            name: true,
            displayName: true,
            description: true,
            country: true,
            currency: true,
            monthlyPrice: true,
            annualPrice: true,
            isActive: true,
          },
        },
      },
    });
    if (!quote) throw new NotFoundException("Plan quote not found");
    if (quote.shopId !== shopId || quote.shop.userId !== userId) {
      throw new ForbiddenException(
        "Sign in with the account this quote was issued to",
      );
    }
    const expired = quote.validUntil.getTime() <= Date.now();
    return {
      token: quote.token,
      status: quote.status,
      expired: expired || quote.status !== PlanQuoteStatus.SENT,
      validUntil: quote.validUntil,
      monthlyPrice: quote.monthlyPrice,
      annualPrice: quote.annualPrice,
      notes: quote.notes,
      plan: quote.plan,
    };
  }

  private frontendBaseUrl() {
    return (
      this.config.get<string>("FRONTEND_URL") || "https://www.orivraa.com"
    );
  }
}
