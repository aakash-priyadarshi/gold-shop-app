import { ForbiddenException, Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { SubscriptionPlansService } from "./subscription-plans.service";

/**
 * Thrown when a shop has exceeded (or would exceed) a plan limit.
 * Contains metadata for the frontend to display upgrade prompts.
 */
export class PlanLimitExceededException extends ForbiddenException {
  constructor(
    public readonly resource: string,
    public readonly currentCount: number,
    public readonly limit: number,
    public readonly planName: string,
  ) {
    super({
      statusCode: 403,
      error: "PLAN_LIMIT_EXCEEDED",
      message: `Your ${planName} plan allows a maximum of ${limit} ${resource}. You currently have ${currentCount}. Please upgrade your plan.`,
      resource,
      currentCount,
      limit,
      planName,
    });
  }
}

@Injectable()
export class PlanLimitsService {
  private readonly logger = new Logger(PlanLimitsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly plansService: SubscriptionPlansService,
  ) {}

  /**
   * Check if the shop can create another inventory item (product).
   * Throws PlanLimitExceededException if at or over the limit.
   */
  async checkProductLimit(shopId: string): Promise<void> {
    const plan = await this.plansService.getActiveShopPlan(shopId);
    if (!plan || plan.maxProducts === null || plan.maxProducts === undefined) {
      return; // unlimited
    }

    const currentCount = await this.prisma.inventoryItem.count({
      where: { shopId },
    });

    if (currentCount >= plan.maxProducts) {
      throw new PlanLimitExceededException(
        "products",
        currentCount,
        plan.maxProducts,
        plan.displayName,
      );
    }
  }

  /**
   * Check if the shop can create another invoice this month.
   * Uses calendar month (1st to last day).
   */
  async checkInvoiceLimit(shopId: string): Promise<void> {
    const plan = await this.plansService.getActiveShopPlan(shopId);
    if (
      !plan ||
      plan.maxInvoicesPerMonth === null ||
      plan.maxInvoicesPerMonth === undefined
    ) {
      return; // unlimited
    }

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const currentCount = await this.prisma.invoice.count({
      where: {
        shopId,
        createdAt: { gte: monthStart, lt: monthEnd },
      },
    });

    if (currentCount >= plan.maxInvoicesPerMonth) {
      throw new PlanLimitExceededException(
        "invoices this month",
        currentCount,
        plan.maxInvoicesPerMonth,
        plan.displayName,
      );
    }
  }

  /**
   * Check if the shop can create another catalogue.
   */
  async checkCatalogueLimit(shopId: string): Promise<void> {
    const plan = await this.plansService.getActiveShopPlan(shopId);
    if (
      !plan ||
      plan.maxCatalogues === null ||
      plan.maxCatalogues === undefined
    ) {
      return; // unlimited
    }

    const currentCount = await this.prisma.catalogue.count({
      where: { shopId },
    });

    if (currentCount >= plan.maxCatalogues) {
      throw new PlanLimitExceededException(
        "catalogues",
        currentCount,
        plan.maxCatalogues,
        plan.displayName,
      );
    }
  }

  /**
   * Check if a catalogue can accept another item.
   * Uses the catalogueLimit field (max items per single catalogue).
   */
  async checkCatalogueItemLimit(
    shopId: string,
    catalogueId: string,
  ): Promise<void> {
    const plan = await this.plansService.getActiveShopPlan(shopId);
    if (
      !plan ||
      plan.catalogueLimit === null ||
      plan.catalogueLimit === undefined
    ) {
      return; // unlimited
    }

    const currentCount = await this.prisma.catalogueItem.count({
      where: { catalogueId },
    });

    if (currentCount >= plan.catalogueLimit) {
      throw new PlanLimitExceededException(
        "items in this catalogue",
        currentCount,
        plan.catalogueLimit,
        plan.displayName,
      );
    }
  }

  /**
   * Check if the shop can receive another order this month.
   */
  async checkOrderLimit(shopId: string): Promise<void> {
    const plan = await this.plansService.getActiveShopPlan(shopId);
    if (
      !plan ||
      plan.maxOrdersPerMonth === null ||
      plan.maxOrdersPerMonth === undefined
    ) {
      return; // unlimited
    }

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const currentCount = await this.prisma.order.count({
      where: {
        shopId,
        createdAt: { gte: monthStart, lt: monthEnd },
      },
    });

    if (currentCount >= plan.maxOrdersPerMonth) {
      throw new PlanLimitExceededException(
        "orders this month",
        currentCount,
        plan.maxOrdersPerMonth,
        plan.displayName,
      );
    }
  }

  /**
   * Get a summary of the shop's current usage vs plan limits.
   * Useful for the frontend "My Plan" tab.
   */
  async getUsageSummary(shopId: string) {
    const plan = await this.plansService.getActiveShopPlan(shopId);

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const [productCount, invoiceCount, catalogueCount, orderCount] =
      await Promise.all([
        this.prisma.inventoryItem.count({ where: { shopId } }),
        this.prisma.invoice.count({
          where: {
            shopId,
            createdAt: { gte: monthStart, lt: monthEnd },
          },
        }),
        this.prisma.catalogue.count({ where: { shopId } }),
        this.prisma.order.count({
          where: {
            shopId,
            createdAt: { gte: monthStart, lt: monthEnd },
          },
        }),
      ]);

    return {
      planName: plan?.displayName ?? "Free Plan",
      planId: plan?.id ?? null,
      limits: {
        products: {
          used: productCount,
          limit: plan?.maxProducts ?? null,
          unlimited:
            plan?.maxProducts === null || plan?.maxProducts === undefined,
        },
        invoicesPerMonth: {
          used: invoiceCount,
          limit: plan?.maxInvoicesPerMonth ?? null,
          unlimited:
            plan?.maxInvoicesPerMonth === null ||
            plan?.maxInvoicesPerMonth === undefined,
        },
        catalogues: {
          used: catalogueCount,
          limit: plan?.maxCatalogues ?? null,
          unlimited:
            plan?.maxCatalogues === null || plan?.maxCatalogues === undefined,
        },
        ordersPerMonth: {
          used: orderCount,
          limit: plan?.maxOrdersPerMonth ?? null,
          unlimited:
            plan?.maxOrdersPerMonth === null ||
            plan?.maxOrdersPerMonth === undefined,
        },
      },
      features: (plan?.features as Record<string, unknown>) ?? {},
    };
  }
}
