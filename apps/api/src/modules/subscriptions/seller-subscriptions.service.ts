import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";
import { SubscriptionPlansService } from "./subscription-plans.service";

@Injectable()
export class SellerSubscriptionsService {
  private readonly logger = new Logger(SellerSubscriptionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly plansService: SubscriptionPlansService,
    private readonly notificationsService: NotificationsService,
  ) {}

  // ─── Subscribe / Change Plan ───────────────────────

  /**
   * Subscribe a shop to a plan.
   * For paid plans → initiate Stripe checkout (or return clientSecret).
   * For FREE plans → activate immediately.
   */
  async subscribeToPlan(opts: {
    shopId: string;
    planId: string;
    country: string;
    billingCycle?: "monthly" | "annual";
    stripePaymentMethodId?: string;
    userId: string;
  }) {
    const plan = await this.plansService.getPlanById(opts.planId);

    // Verify plan matches requested country
    if (plan.country !== opts.country) {
      throw new BadRequestException(
        "Plan is not available for the specified country",
      );
    }

    if (!plan.isActive) {
      throw new BadRequestException("This plan is no longer available");
    }

    // Check for existing active subscription
    const existing = await this.prisma.sellerSubscription.findFirst({
      where: {
        shopId: opts.shopId,
        status: { in: ["ACTIVE", "TRIALING"] },
      },
    });

    if (existing && existing.planId === opts.planId) {
      throw new ConflictException("Shop is already subscribed to this plan");
    }

    // Calculate period dates
    const now = new Date();
    const periodEnd = new Date(now);
    if (opts.billingCycle === "annual") {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }

    // ---- FREE PLAN: activate immediately ----
    if (plan.monthlyPrice === 0) {
      // Cancel existing paid subscription if any
      if (existing) {
        await this.prisma.sellerSubscription.update({
          where: { id: existing.id },
          data: {
            status: "CANCELLED",
            cancelledAt: now,
            cancelReason: `Downgraded to ${plan.name}`,
          },
        });
      }

      const subscription = await this.prisma.sellerSubscription.create({
        data: {
          shopId: opts.shopId,
          planId: opts.planId,
          status: "ACTIVE",
          country: opts.country as any,
          startedAt: now,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          autoRenew: true,
        },
        include: { plan: true },
      });

      return { subscription, requiresPayment: false };
    }

    // ---- PAID PLAN: create pending subscription + Stripe intent ----
    const price =
      opts.billingCycle === "annual" && plan.annualPrice
        ? plan.annualPrice
        : plan.monthlyPrice;

    // If there's an existing subscription on a different plan, cancel it
    if (existing) {
      await this.prisma.sellerSubscription.update({
        where: { id: existing.id },
        data: {
          status: "CANCELLED",
          cancelledAt: now,
          cancelReason: `Switching to ${plan.name}`,
        },
      });
    }

    // Create subscription in TRIALING state (pending payment)
    const subscription = await this.prisma.sellerSubscription.create({
      data: {
        shopId: opts.shopId,
        planId: opts.planId,
        status: "TRIALING",
        country: opts.country as any,
        startedAt: now,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        autoRenew: true,
      },
      include: { plan: true },
    });

    // Create pending payment record
    const payment = await this.prisma.subscriptionPayment.create({
      data: {
        subscriptionId: subscription.id,
        amount: price,
        currency: plan.currency,
        gateway: "stripe",
        status: "PENDING",
        periodStart: now,
        periodEnd,
      },
    });

    // Attempt to create Stripe payment intent
    let clientSecret: string | null = null;
    try {
      const stripeKey = this.configService.get<string>("STRIPE_SECRET_KEY");
      if (
        stripeKey &&
        stripeKey !== "" &&
        stripeKey !== "sk_test_placeholder"
      ) {
        const stripe = require("stripe")(stripeKey);

        // Find or create Stripe customer
        let stripeCustomerId = await this.getOrCreateStripeCustomer(
          opts.shopId,
        );

        const paymentIntent = await stripe.paymentIntents.create({
          amount: Math.round(price * 100), // cents
          currency: plan.currency.toLowerCase(),
          customer: stripeCustomerId,
          metadata: {
            subscriptionId: subscription.id,
            paymentId: payment.id,
            shopId: opts.shopId,
            planId: opts.planId,
          },
        });

        clientSecret = paymentIntent.client_secret;

        // Save Stripe IDs
        await this.prisma.sellerSubscription.update({
          where: { id: subscription.id },
          data: { stripeCustomerId },
        });

        await this.prisma.subscriptionPayment.update({
          where: { id: payment.id },
          data: { gatewayPaymentId: paymentIntent.id },
        });
      } else {
        this.logger.warn(
          "Stripe not configured. Subscription created in TRIALING state pending manual activation.",
        );
      }
    } catch (err) {
      this.logger.error(
        `Stripe payment intent creation failed: ${err.message}`,
      );
      // Subscription stays in TRIALING — admin can manually activate
    }

    return {
      subscription,
      payment,
      clientSecret,
      requiresPayment: true,
    };
  }

  // ─── Stripe Customer ──────────────────────────────

  private async getOrCreateStripeCustomer(shopId: string): Promise<string> {
    const shop = await this.prisma.shop.findUnique({
      where: { id: shopId },
      include: {
        user: { select: { email: true, firstName: true, lastName: true } },
      },
    });

    if (!shop) throw new NotFoundException("Shop not found");

    // Check if there's already a stripe customer from a previous subscription
    const existingSub = await this.prisma.sellerSubscription.findFirst({
      where: { shopId, stripeCustomerId: { not: null } },
      select: { stripeCustomerId: true },
    });

    if (existingSub?.stripeCustomerId) return existingSub.stripeCustomerId;

    // Create new Stripe customer
    const stripeKey = this.configService.get<string>("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new BadRequestException("Stripe not configured");

    const stripe = require("stripe")(stripeKey);
    const customer = await stripe.customers.create({
      email: shop.user.email,
      name: `${shop.user.firstName} ${shop.user.lastName}`,
      metadata: { shopId, shopName: shop.shopName },
    });

    return customer.id;
  }

  // ─── Activating a subscription (after payment) ────

  /**
   * Called from webhook or manual admin action to activate a subscription.
   */
  async activateSubscription(subscriptionId: string) {
    const sub = await this.prisma.sellerSubscription.findUnique({
      where: { id: subscriptionId },
      include: { plan: true },
    });

    if (!sub) throw new NotFoundException("Subscription not found");

    return this.prisma.sellerSubscription.update({
      where: { id: subscriptionId },
      data: { status: "ACTIVE" },
      include: { plan: true },
    });
  }

  // ─── Cancel Subscription ──────────────────────────

  /**
   * Cancel at period end (default) or immediately.
   */
  async cancelSubscription(
    subscriptionId: string,
    opts: { reason?: string; immediate?: boolean; shopId?: string },
  ) {
    const sub = await this.prisma.sellerSubscription.findUnique({
      where: { id: subscriptionId },
      include: { plan: true },
    });

    if (!sub) throw new NotFoundException("Subscription not found");

    // Verify shop ownership if shopId is provided
    if (opts.shopId && sub.shopId !== opts.shopId) {
      throw new BadRequestException(
        "You can only cancel subscriptions for your own shop",
      );
    }

    if (sub.status === "CANCELLED" || sub.status === "EXPIRED") {
      throw new BadRequestException(
        "Subscription is already cancelled/expired",
      );
    }

    if (opts.immediate) {
      return this.prisma.sellerSubscription.update({
        where: { id: subscriptionId },
        data: {
          status: "CANCELLED",
          cancelledAt: new Date(),
          cancelReason: opts.reason || "Cancelled by user",
          autoRenew: false,
        },
        include: { plan: true },
      });
    }

    // Cancel at period end — keep ACTIVE but disable auto-renew
    return this.prisma.sellerSubscription.update({
      where: { id: subscriptionId },
      data: {
        autoRenew: false,
        cancelReason: opts.reason || "Scheduled cancellation at period end",
      },
      include: { plan: true },
    });
  }

  // ─── Expired subscription cleanup (cron) ──────────

  /**
   * Process subscriptions past their period end with autoRenew=false.
   * Called by a scheduled Bull job.
   */
  async processExpiredSubscriptions() {
    const now = new Date();

    const expired = await this.prisma.sellerSubscription.findMany({
      where: {
        status: "ACTIVE",
        autoRenew: false,
        currentPeriodEnd: { lt: now },
      },
    });

    let processed = 0;
    for (const sub of expired) {
      await this.prisma.sellerSubscription.update({
        where: { id: sub.id },
        data: {
          status: "EXPIRED",
          cancelledAt: now,
        },
      });
      processed++;
    }

    this.logger.log(`Processed ${processed} expired subscriptions`);
    return { processed };
  }

  // ─── Stripe Webhook ───────────────────────────────

  /**
   * Handle Stripe webhook events for subscription payments.
   */
  async handleStripeWebhook(event: any) {
    switch (event.type) {
      case "payment_intent.succeeded": {
        const pi = event.data.object;
        const { subscriptionId, paymentId } = pi.metadata || {};

        if (subscriptionId) {
          // Activate subscription
          await this.activateSubscription(subscriptionId);

          // Update payment record
          if (paymentId) {
            await this.prisma.subscriptionPayment.update({
              where: { id: paymentId },
              data: {
                status: "COMPLETED",
                gatewayPaymentId: pi.id,
              },
            });
          }

          this.logger.log(
            `Subscription ${subscriptionId} activated via Stripe webhook`,
          );
        }
        break;
      }

      case "payment_intent.payment_failed": {
        const pi = event.data.object;
        const { subscriptionId, paymentId } = pi.metadata || {};

        if (subscriptionId) {
          await this.prisma.sellerSubscription.update({
            where: { id: subscriptionId },
            data: { status: "PAST_DUE" },
          });

          if (paymentId) {
            await this.prisma.subscriptionPayment.update({
              where: { id: paymentId },
              data: {
                status: "FAILED",
                failureReason:
                  pi.last_payment_error?.message || "Payment failed",
              },
            });
          }

          this.logger.warn(`Payment failed for subscription ${subscriptionId}`);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const stripeSub = event.data.object;
        const sub = await this.prisma.sellerSubscription.findFirst({
          where: { stripeSubscriptionId: stripeSub.id },
        });

        if (sub) {
          await this.prisma.sellerSubscription.update({
            where: { id: sub.id },
            data: {
              status: "CANCELLED",
              cancelledAt: new Date(),
              cancelReason: "Cancelled via Stripe",
            },
          });
        }
        break;
      }
    }
  }

  // ─── Queries ──────────────────────────────────────

  /**
   * Get shop's current active subscription with plan details.
   */
  async getShopSubscription(shopId: string) {
    const sub = await this.prisma.sellerSubscription.findFirst({
      where: {
        shopId,
        status: { in: ["ACTIVE", "TRIALING", "PAST_DUE"] },
      },
      include: {
        plan: true,
        payments: {
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return sub;
  }

  /**
   * Get subscription history for a shop (all statuses).
   */
  async getShopSubscriptionHistory(shopId: string) {
    return this.prisma.sellerSubscription.findMany({
      where: { shopId },
      include: {
        plan: true,
        payments: { orderBy: { createdAt: "desc" } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Admin: list all subscriptions (paginated, filterable).
   */
  async listAllSubscriptions(filters: {
    status?: string;
    country?: string;
    page?: number;
    limit?: number;
  }) {
    const { status, country, page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) where.status = status;
    if (country) where.country = country;

    const [data, total] = await Promise.all([
      this.prisma.sellerSubscription.findMany({
        where,
        include: {
          plan: true,
          shop: {
            select: {
              id: true,
              shopName: true,
              slug: true,
              user: {
                select: { email: true, firstName: true, lastName: true },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.sellerSubscription.count({ where }),
    ]);

    return { data, total, page, limit, pages: Math.ceil(total / limit) };
  }

  /**
   * Admin override: force-assign a plan to a shop.
   */
  async adminOverridePlan(opts: {
    shopId: string;
    planId: string;
    periodEnd?: string;
    reason?: string;
    adminId: string;
  }) {
    const plan = await this.plansService.getPlanById(opts.planId);

    // Cancel any existing active subscription
    const existing = await this.prisma.sellerSubscription.findFirst({
      where: {
        shopId: opts.shopId,
        status: { in: ["ACTIVE", "TRIALING"] },
      },
    });

    if (existing) {
      await this.prisma.sellerSubscription.update({
        where: { id: existing.id },
        data: {
          status: "CANCELLED",
          cancelledAt: new Date(),
          cancelReason: `Admin override: ${opts.reason || "Plan changed by admin"}`,
        },
      });
    }

    const now = new Date();
    const periodEnd = opts.periodEnd
      ? new Date(opts.periodEnd)
      : new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());

    return this.prisma.sellerSubscription.create({
      data: {
        shopId: opts.shopId,
        planId: opts.planId,
        status: "ACTIVE",
        country: plan.country,
        startedAt: now,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        autoRenew: false,
      },
      include: { plan: true },
    });
  }

  // ─── Stats (admin) ────────────────────────────────

  async getSubscriptionStats() {
    const [byStatus, byPlan, mrr] = await Promise.all([
      this.prisma.sellerSubscription.groupBy({
        by: ["status"],
        _count: true,
      }),
      this.prisma.sellerSubscription.groupBy({
        by: ["planId"],
        where: { status: "ACTIVE" },
        _count: true,
      }),
      this.prisma.$queryRaw`
        SELECT COALESCE(SUM(sp."monthlyPrice"), 0) as mrr
        FROM "SellerSubscription" ss
        JOIN "SubscriptionPlan" sp ON ss."planId" = sp.id
        WHERE ss.status = 'ACTIVE'
      ` as Promise<{ mrr: number }[]>,
    ]);

    return {
      byStatus: byStatus.map((s) => ({
        status: s.status,
        count: s._count,
      })),
      byPlan,
      mrr: Number(mrr[0]?.mrr || 0),
    };
  }

  // ─── Auto-activate FREE plan ──────────────────────

  /**
   * Auto-activate the FREE plan for a newly created shop.
   * Called automatically when a shop is created.
   * Silently fails if no FREE plan exists for the country.
   */
  async autoActivateFreePlan(shopId: string, country: string): Promise<void> {
    try {
      const freePlan = await this.prisma.subscriptionPlan.findFirst({
        where: {
          name: "FREE",
          country: country as any,
          isActive: true,
        },
      });

      if (!freePlan) {
        this.logger.warn(
          `No active FREE plan found for country ${country}. Shop ${shopId} has no auto-subscription.`,
        );
        return;
      }

      // Skip if already subscribed
      const existing = await this.prisma.sellerSubscription.findFirst({
        where: {
          shopId,
          status: { in: ["ACTIVE", "TRIALING"] },
        },
      });

      if (existing) {
        this.logger.debug(
          `Shop ${shopId} already has an active subscription. Skipping auto-activation.`,
        );
        return;
      }

      const now = new Date();
      const periodEnd = new Date(now);
      periodEnd.setFullYear(periodEnd.getFullYear() + 100); // Free plan never expires

      await this.prisma.sellerSubscription.create({
        data: {
          shopId,
          planId: freePlan.id,
          status: "ACTIVE",
          country: country as any,
          startedAt: now,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          autoRenew: true,
        },
      });

      this.logger.log(
        `Auto-activated FREE plan for shop ${shopId} (country: ${country})`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to auto-activate FREE plan for shop ${shopId}: ${error.message}`,
      );
      // Don't throw — shop creation should still succeed
    }
  }

  // ─── Plan Migration Response ──────────────────────

  /**
   * Seller responds to a plan migration: accept or decline.
   */
  async respondToMigration(
    subscriptionId: string,
    shopId: string,
    accept: boolean,
  ) {
    const sub = await this.prisma.sellerSubscription.findUnique({
      where: { id: subscriptionId },
      include: {
        plan: { include: { successorPlan: true } },
        shop: { select: { id: true, userId: true, shopName: true } },
      },
    });

    if (!sub) throw new NotFoundException("Subscription not found");

    // Verify shop ownership
    if (sub.shopId !== shopId) {
      throw new BadRequestException(
        "You can only respond for your own shop's subscription",
      );
    }

    if (sub.migrationStatus !== "PENDING") {
      throw new BadRequestException(
        `Migration is not pending (current status: ${sub.migrationStatus})`,
      );
    }

    if (!sub.plan.successorPlan) {
      throw new BadRequestException(
        "No successor plan configured for this plan",
      );
    }

    const newStatus = accept ? "ACCEPTED" : "DECLINED";

    const updated = await this.prisma.sellerSubscription.update({
      where: { id: subscriptionId },
      data: { migrationStatus: newStatus as any },
      include: { plan: { include: { successorPlan: true } } },
    });

    // Send confirmation notification
    const notificationType = accept ? "PLAN_MIGRATED" : "PLAN_DOWNGRADED";
    const titleKey = accept
      ? "notification.migration_accepted.title"
      : "notification.migration_declined.title";
    const bodyKey = accept
      ? "notification.migration_accepted.body"
      : "notification.migration_declined.body";

    try {
      await this.notificationsService.create({
        userId: sub.shop.userId,
        type: notificationType,
        titleKey,
        titleParams: {
          planName: accept ? sub.plan.successorPlan.displayName : "Free Plan",
        },
        bodyKey,
        bodyParams: {
          oldPlan: sub.plan.displayName,
          newPlan: accept ? sub.plan.successorPlan.displayName : "Free Plan",
          shopName: sub.shop.shopName,
          periodEnd: sub.currentPeriodEnd.toISOString(),
        },
        referenceType: "SellerSubscription",
        referenceId: sub.id,
        channels: ["IN_APP"],
      });
    } catch (err) {
      this.logger.error(
        `Failed to send migration response notification: ${err.message}`,
      );
    }

    this.logger.log(
      `Subscription ${subscriptionId}: migration ${newStatus} by shop ${shopId}`,
    );

    return {
      subscription: updated,
      migrationStatus: newStatus,
      message: accept
        ? `You will be migrated to "${sub.plan.successorPlan.displayName}" at the end of your current period.`
        : `You will be downgraded to the Free plan at the end of your current period.`,
    };
  }

  /**
   * Get migration status for the current shop's subscription.
   */
  async getMigrationStatus(shopId: string) {
    const sub = await this.prisma.sellerSubscription.findFirst({
      where: {
        shopId,
        migrationStatus: { not: "NONE" },
        status: { in: ["ACTIVE", "TRIALING", "PAST_DUE"] },
      },
      include: {
        plan: {
          include: {
            successorPlan: {
              select: {
                id: true,
                name: true,
                displayName: true,
                monthlyPrice: true,
                annualPrice: true,
                currency: true,
                features: true,
              },
            },
          },
        },
      },
    });

    if (!sub) return null;

    return {
      subscriptionId: sub.id,
      currentPlan: sub.plan.displayName,
      successorPlan: sub.plan.successorPlan,
      migrationStatus: sub.migrationStatus,
      periodEnd: sub.currentPeriodEnd,
      notifiedAt: sub.migrationNotifiedAt,
    };
  }
}
