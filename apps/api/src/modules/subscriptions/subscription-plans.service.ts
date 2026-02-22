import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CreatePlanDto, UpdatePlanDto } from "./dto";

@Injectable()
export class SubscriptionPlansService {
  private readonly logger = new Logger(SubscriptionPlansService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new subscription plan.
   * Admin-only, audit-logged in controller layer.
   */
  async createPlan(dto: CreatePlanDto) {
    // Check uniqueness (name + country)
    const existing = await this.prisma.subscriptionPlan.findUnique({
      where: {
        name_country: { name: dto.name, country: dto.country as any },
      },
    });
    if (existing) {
      throw new ConflictException(
        `Plan "${dto.name}" already exists for country ${dto.country}`,
      );
    }

    return this.prisma.subscriptionPlan.create({
      data: {
        name: dto.name,
        displayName: dto.displayName,
        description: dto.description,
        country: dto.country as any,
        currency: dto.currency as any,
        monthlyPrice: dto.monthlyPrice,
        annualPrice: dto.annualPrice,
        maxProducts: dto.maxProducts,
        maxInvoicesPerMonth: dto.maxInvoicesPerMonth,
        maxCatalogues: dto.maxCatalogues,
        catalogueLimit: dto.catalogueLimit,
        maxOrdersPerMonth: dto.maxOrdersPerMonth,
        commissionPercent: dto.commissionPercent,
        includesAi: dto.includesAi,
        monthlyAiCredits: dto.monthlyAiCredits,
        rolloverCap: dto.rolloverCap,
        extraCreditPrice: dto.extraCreditPrice,
        overageBehavior: (dto.overageBehavior as any) || "BLOCK",
        features: (dto.features ?? {}) as any,
        isActive: dto.isActive ?? true,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  /**
   * Update existing plan fields. Returns previous + new values for audit.
   */
  async updatePlan(planId: string, dto: UpdatePlanDto) {
    const existing = await this.prisma.subscriptionPlan.findUnique({
      where: { id: planId },
    });
    if (!existing) {
      throw new NotFoundException("Plan not found");
    }

    // Capture previous values for fields being changed
    const previousValues: Record<string, unknown> = {};
    const newValues: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(dto)) {
      if (value !== undefined && (existing as any)[key] !== value) {
        previousValues[key] = (existing as any)[key];
        newValues[key] = value;
      }
    }

    const updated = await this.prisma.subscriptionPlan.update({
      where: { id: planId },
      data: dto as any,
    });

    return { plan: updated, previousValues, newValues };
  }

  /**
   * Soft-disable a plan. Does not delete — existing subscriptions continue.
   */
  async togglePlanActive(planId: string, isActive: boolean) {
    const existing = await this.prisma.subscriptionPlan.findUnique({
      where: { id: planId },
    });
    if (!existing) {
      throw new NotFoundException("Plan not found");
    }

    return this.prisma.subscriptionPlan.update({
      where: { id: planId },
      data: { isActive },
    });
  }

  /**
   * List plans, optionally filtered by country and/or active status.
   */
  async listPlans(filters?: { country?: string; isActive?: boolean }) {
    const where: any = {};
    if (filters?.country) where.country = filters.country;
    if (filters?.isActive !== undefined) where.isActive = filters.isActive;

    return this.prisma.subscriptionPlan.findMany({
      where,
      orderBy: [{ country: "asc" }, { sortOrder: "asc" }],
    });
  }

  /**
   * Get a single plan by ID.
   */
  async getPlanById(planId: string) {
    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { id: planId },
    });
    if (!plan) throw new NotFoundException("Plan not found");
    return plan;
  }

  /**
   * Get the active plan for a shop's country (used by commission + credit system).
   * Returns the shop's SellerSubscription → SubscriptionPlan, or the FREE fallback.
   */
  async getActiveShopPlan(shopId: string) {
    // 1. Check for active seller subscription
    const subscription = await this.prisma.sellerSubscription.findFirst({
      where: {
        shopId,
        status: { in: ["ACTIVE", "TRIALING"] },
      },
      include: { plan: true },
      orderBy: { createdAt: "desc" },
    });

    if (subscription) return subscription.plan;

    // 2. Fallback: get the FREE plan for the shop's country
    const shop = await this.prisma.shop.findUnique({
      where: { id: shopId },
      select: { country: true },
    });

    if (!shop) throw new NotFoundException("Shop not found");

    const freePlan = await this.prisma.subscriptionPlan.findFirst({
      where: {
        name: "FREE",
        country: shop.country as any,
        isActive: true,
      },
    });

    return freePlan;
  }

  /**
   * Get plans available for a country (public endpoint for sellers).
   */
  async getAvailablePlans(country?: string) {
    const where: any = { isActive: true };
    if (country) where.country = country;

    return this.prisma.subscriptionPlan.findMany({
      where,
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        name: true,
        displayName: true,
        description: true,
        country: true,
        currency: true,
        monthlyPrice: true,
        annualPrice: true,
        maxProducts: true,
        maxInvoicesPerMonth: true,
        maxCatalogues: true,
        catalogueLimit: true,
        maxOrdersPerMonth: true,
        commissionPercent: true,
        includesAi: true,
        monthlyAiCredits: true,
        rolloverCap: true,
        extraCreditPrice: true,
        overageBehavior: true,
        features: true,
        sortOrder: true,
      },
    });
  }
}
