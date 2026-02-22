import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";
import { CreatePlanDto, UpdatePlanDto } from "./dto";

@Injectable()
export class SubscriptionPlansService {
  private readonly logger = new Logger(SubscriptionPlansService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

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

  // ═══════════════════════════════════════════
  // PLAN LIFECYCLE: DELETE, DISABLE-WITH-SUCCESSOR
  // ═══════════════════════════════════════════

  /**
   * Safe-delete a plan. Only allowed if there are ZERO active/trialing subscriptions.
   * Returns { deleted: true } or throws if blocked.
   */
  async safeDeletPlan(planId: string) {
    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { id: planId },
    });
    if (!plan) throw new NotFoundException("Plan not found");

    // Check for active subscribers
    const activeCount = await this.prisma.sellerSubscription.count({
      where: {
        planId,
        status: { in: ["ACTIVE", "TRIALING", "PAST_DUE"] },
      },
    });

    if (activeCount > 0) {
      throw new BadRequestException(
        `Cannot delete plan "${plan.displayName}" — ${activeCount} active subscription(s) exist. ` +
          `Disable with a successor plan instead, or wait until all subscriptions expire/cancel.`,
      );
    }

    // Also check if any other plan references this as successor
    const successorRefs = await this.prisma.subscriptionPlan.count({
      where: { successorPlanId: planId },
    });

    if (successorRefs > 0) {
      throw new BadRequestException(
        `Cannot delete — ${successorRefs} other plan(s) reference this as their successor. ` +
          `Remove those successor references first.`,
      );
    }

    await this.prisma.subscriptionPlan.delete({ where: { id: planId } });

    this.logger.log(`Plan "${plan.displayName}" (${planId}) permanently deleted`);
    return { deleted: true, planName: plan.displayName };
  }

  /**
   * Disable a plan and set a successor.
   * Marks all active subscriptions as PENDING migration and sends notifications.
   */
  async disablePlanWithSuccessor(planId: string, successorPlanId: string) {
    const [plan, successor] = await Promise.all([
      this.prisma.subscriptionPlan.findUnique({ where: { id: planId } }),
      this.prisma.subscriptionPlan.findUnique({ where: { id: successorPlanId } }),
    ]);

    if (!plan) throw new NotFoundException("Plan not found");
    if (!successor) throw new NotFoundException("Successor plan not found");
    if (!successor.isActive) {
      throw new BadRequestException("Successor plan must be active");
    }
    if (planId === successorPlanId) {
      throw new BadRequestException("A plan cannot be its own successor");
    }

    // Disable plan + set successor in one transaction
    const [updatedPlan, affectedSubs] = await this.prisma.$transaction(
      async (tx) => {
        const updated = await tx.subscriptionPlan.update({
          where: { id: planId },
          data: {
            isActive: false,
            successorPlanId,
          },
        });

        // Find all active subscriptions on this plan
        const subs = await tx.sellerSubscription.findMany({
          where: {
            planId,
            status: { in: ["ACTIVE", "TRIALING", "PAST_DUE"] },
          },
          include: {
            shop: {
              select: {
                id: true,
                userId: true,
                shopName: true,
              },
            },
          },
        });

        // Mark them as PENDING migration
        if (subs.length > 0) {
          await tx.sellerSubscription.updateMany({
            where: {
              id: { in: subs.map((s) => s.id) },
            },
            data: {
              migrationStatus: "PENDING",
              migrationNotifiedAt: new Date(),
              migrationNotifyCount: 1,
            },
          });
        }

        return [updated, subs] as const;
      },
    );

    // Send notifications to affected users (outside transaction for resilience)
    const notificationResults = { sent: 0, failed: 0 };
    for (const sub of affectedSubs) {
      try {
        await this.notificationsService.create({
          userId: sub.shop.userId,
          type: "PLAN_MIGRATION",
          titleKey: "notification.plan_migration.title",
          titleParams: {
            oldPlan: plan.displayName,
            newPlan: successor.displayName,
          },
          bodyKey: "notification.plan_migration.body",
          bodyParams: {
            oldPlan: plan.displayName,
            newPlan: successor.displayName,
            shopName: sub.shop.shopName,
            price: successor.monthlyPrice,
            currency: successor.currency,
            periodEnd: sub.currentPeriodEnd.toISOString(),
          },
          referenceType: "SellerSubscription",
          referenceId: sub.id,
          channels: ["IN_APP", "EMAIL"],
        });
        notificationResults.sent++;
      } catch (err) {
        this.logger.error(
          `Failed to notify user ${sub.shop.userId} about plan migration: ${err.message}`,
        );
        notificationResults.failed++;
      }
    }

    this.logger.log(
      `Plan "${plan.displayName}" disabled → successor "${successor.displayName}". ` +
        `${affectedSubs.length} subscriptions marked PENDING. ` +
        `Notifications: ${notificationResults.sent} sent, ${notificationResults.failed} failed.`,
    );

    return {
      plan: updatedPlan,
      successor,
      affectedSubscriptions: affectedSubs.length,
      notifications: notificationResults,
    };
  }

  /**
   * Send follow-up migration reminders to users who haven't responded.
   * Called by a scheduled cron job. Only reminds users notified > 3 days ago.
   */
  async sendMigrationReminders() {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const pendingSubs = await this.prisma.sellerSubscription.findMany({
      where: {
        migrationStatus: "PENDING",
        migrationNotifiedAt: { lt: threeDaysAgo },
        migrationNotifyCount: { lt: 3 }, // max 3 reminders
        status: { in: ["ACTIVE", "TRIALING", "PAST_DUE"] },
      },
      include: {
        plan: {
          include: {
            successorPlan: true,
          },
        },
        shop: {
          select: { id: true, userId: true, shopName: true },
        },
      },
    });

    let sent = 0;
    for (const sub of pendingSubs) {
      if (!sub.plan.successorPlan) continue;

      try {
        await this.notificationsService.create({
          userId: sub.shop.userId,
          type: "PLAN_MIGRATION_REMINDER",
          titleKey: "notification.plan_migration_reminder.title",
          titleParams: {
            oldPlan: sub.plan.displayName,
            newPlan: sub.plan.successorPlan.displayName,
            reminderNumber: sub.migrationNotifyCount + 1,
          },
          bodyKey: "notification.plan_migration_reminder.body",
          bodyParams: {
            oldPlan: sub.plan.displayName,
            newPlan: sub.plan.successorPlan.displayName,
            shopName: sub.shop.shopName,
            periodEnd: sub.currentPeriodEnd.toISOString(),
          },
          referenceType: "SellerSubscription",
          referenceId: sub.id,
          channels: ["IN_APP", "EMAIL"],
        });

        await this.prisma.sellerSubscription.update({
          where: { id: sub.id },
          data: {
            migrationNotifiedAt: new Date(),
            migrationNotifyCount: { increment: 1 },
          },
        });

        sent++;
      } catch (err) {
        this.logger.error(
          `Failed to send migration reminder for sub ${sub.id}: ${err.message}`,
        );
      }
    }

    this.logger.log(`Sent ${sent} migration reminders out of ${pendingSubs.length} pending`);
    return { sent, total: pendingSubs.length };
  }

  /**
   * Process plan migrations at renewal time.
   * - ACCEPTED → switch to successor plan, notify "migrated"
   * - DECLINED → downgrade to FREE plan for same country, notify "downgraded"
   * - PENDING (past period end) → auto-decline → downgrade to FREE
   */
  async processRenewalMigrations() {
    const now = new Date();

    // 1. Process ACCEPTED migrations where period has ended
    const acceptedSubs = await this.prisma.sellerSubscription.findMany({
      where: {
        migrationStatus: "ACCEPTED",
        currentPeriodEnd: { lte: now },
        status: { in: ["ACTIVE", "PAST_DUE"] },
      },
      include: {
        plan: { include: { successorPlan: true } },
        shop: { select: { id: true, userId: true, shopName: true, country: true } },
      },
    });

    let migrated = 0;
    for (const sub of acceptedSubs) {
      if (!sub.plan.successorPlan) continue;

      const newPeriodEnd = new Date(now);
      newPeriodEnd.setMonth(newPeriodEnd.getMonth() + 1);

      await this.prisma.sellerSubscription.update({
        where: { id: sub.id },
        data: {
          planId: sub.plan.successorPlanId!,
          currentPeriodStart: now,
          currentPeriodEnd: newPeriodEnd,
          migrationStatus: "NONE",
          migrationNotifiedAt: null,
          migrationNotifyCount: 0,
        },
      });

      try {
        await this.notificationsService.create({
          userId: sub.shop.userId,
          type: "PLAN_MIGRATED",
          titleKey: "notification.plan_migrated.title",
          titleParams: {
            planName: sub.plan.successorPlan.displayName,
          },
          bodyKey: "notification.plan_migrated.body",
          bodyParams: {
            oldPlan: sub.plan.displayName,
            newPlan: sub.plan.successorPlan.displayName,
            shopName: sub.shop.shopName,
          },
          referenceType: "SellerSubscription",
          referenceId: sub.id,
          channels: ["IN_APP", "EMAIL"],
        });
      } catch (err) {
        this.logger.error(`Failed to notify migration for sub ${sub.id}: ${err.message}`);
      }

      migrated++;
    }

    // 2. Process DECLINED + PENDING (past period end) → downgrade to FREE
    const downgradeTargets = await this.prisma.sellerSubscription.findMany({
      where: {
        migrationStatus: { in: ["DECLINED", "PENDING"] },
        currentPeriodEnd: { lte: now },
        status: { in: ["ACTIVE", "PAST_DUE"] },
      },
      include: {
        plan: true,
        shop: { select: { id: true, userId: true, shopName: true, country: true } },
      },
    });

    let downgraded = 0;
    for (const sub of downgradeTargets) {
      // Find the FREE plan for this country
      const freePlan = await this.prisma.subscriptionPlan.findFirst({
        where: {
          name: "FREE",
          country: sub.shop.country as any,
          isActive: true,
        },
      });

      if (!freePlan) {
        this.logger.warn(
          `No FREE plan found for country ${sub.shop.country}. Expiring sub ${sub.id} instead.`,
        );
        await this.prisma.sellerSubscription.update({
          where: { id: sub.id },
          data: { status: "EXPIRED", cancelledAt: now },
        });
        continue;
      }

      const newPeriodEnd = new Date(now);
      newPeriodEnd.setFullYear(newPeriodEnd.getFullYear() + 100);

      await this.prisma.sellerSubscription.update({
        where: { id: sub.id },
        data: {
          planId: freePlan.id,
          currentPeriodStart: now,
          currentPeriodEnd: newPeriodEnd,
          migrationStatus: "NONE",
          migrationNotifiedAt: null,
          migrationNotifyCount: 0,
          autoRenew: true,
        },
      });

      try {
        await this.notificationsService.create({
          userId: sub.shop.userId,
          type: "PLAN_DOWNGRADED",
          titleKey: "notification.plan_downgraded.title",
          titleParams: { planName: freePlan.displayName },
          bodyKey: "notification.plan_downgraded.body",
          bodyParams: {
            oldPlan: sub.plan.displayName,
            newPlan: freePlan.displayName,
            shopName: sub.shop.shopName,
          },
          referenceType: "SellerSubscription",
          referenceId: sub.id,
          channels: ["IN_APP", "EMAIL"],
        });
      } catch (err) {
        this.logger.error(`Failed to notify downgrade for sub ${sub.id}: ${err.message}`);
      }

      downgraded++;
    }

    this.logger.log(
      `Renewal migrations: ${migrated} migrated, ${downgraded} downgraded to FREE`,
    );
    return { migrated, downgraded };
  }

  /**
   * Count active subscribers on a plan (used for admin UI).
   */
  async getActiveSubscriberCount(planId: string): Promise<number> {
    return this.prisma.sellerSubscription.count({
      where: {
        planId,
        status: { in: ["ACTIVE", "TRIALING", "PAST_DUE"] },
      },
    });
  }
}
