import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Stripe from "stripe";
import { PrismaService } from "../../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";
import { SubscriptionPlansService } from "./subscription-plans.service";

@Injectable()
export class SellerSubscriptionsService {
  private readonly logger = new Logger(SellerSubscriptionsService.name);
  private stripe: Stripe | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly plansService: SubscriptionPlansService,
    private readonly notificationsService: NotificationsService,
  ) {
    const stripeKey = this.configService.get<string>("STRIPE_SECRET_KEY");
    if (stripeKey && stripeKey !== "" && stripeKey !== "sk_test_placeholder") {
      this.stripe = new Stripe(stripeKey);
    }
  }

  private get stripeOrThrow(): Stripe {
    if (!this.stripe) {
      throw new BadRequestException(
        "Stripe is not configured. Add STRIPE_SECRET_KEY to enable paid subscriptions.",
      );
    }
    return this.stripe;
  }

  // ─── Subscribe / Change Plan ───────────────────────

  /**
   * Subscribe a shop to a plan.
   * For paid plans → Create Stripe Checkout Session (redirect URL).
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
        // If existing has a Stripe subscription, cancel it in Stripe too
        if (existing.stripeSubscriptionId && this.stripe) {
          try {
            await this.stripe.subscriptions.cancel(
              existing.stripeSubscriptionId,
            );
          } catch (e) {
            this.logger.warn(`Failed to cancel Stripe sub: ${e.message}`);
          }
        }

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

    // ---- PAID PLAN: Create Stripe Checkout Session ----
    const stripe = this.stripeOrThrow;

    // Ensure the plan has a Stripe Price synced
    const syncedPlan = await this.ensurePlanSyncedToStripe(opts.planId);
    const priceId =
      opts.billingCycle === "annual" && syncedPlan.stripeAnnualPriceId
        ? syncedPlan.stripeAnnualPriceId
        : syncedPlan.stripePriceId;

    if (!priceId) {
      throw new BadRequestException(
        "Plan is not synced to Stripe. Admin must sync plans first.",
      );
    }

    // Get or create Stripe customer
    const stripeCustomerId = await this.getOrCreateStripeCustomer(opts.shopId);

    // Build the Checkout Session
    const frontendUrl =
      this.configService.get<string>("FRONTEND_URL") || "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: stripeCustomerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${frontendUrl}/dashboard/shop/billing?session_id={CHECKOUT_SESSION_ID}&success=true`,
      cancel_url: `${frontendUrl}/dashboard/shop/billing?cancelled=true`,
      subscription_data: {
        metadata: {
          shopId: opts.shopId,
          planId: opts.planId,
          country: opts.country,
          billingCycle: opts.billingCycle || "monthly",
        },
      },
      metadata: {
        shopId: opts.shopId,
        planId: opts.planId,
        userId: opts.userId,
      },
    });

    this.logger.log(
      `Stripe Checkout Session created: ${session.id} for shop ${opts.shopId} plan ${plan.name}`,
    );

    return {
      subscription: null,
      requiresPayment: true,
      checkoutUrl: session.url,
      sessionId: session.id,
    };
  }

  // ─── Sync Plan to Stripe ──────────────────────────

  /**
   * Ensure a SubscriptionPlan has corresponding Stripe Product + Price objects.
   * Creates them if missing, returns the plan with Stripe IDs.
   */
  async ensurePlanSyncedToStripe(planId: string) {
    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { id: planId },
    });
    if (!plan) throw new NotFoundException("Plan not found");

    // Skip free plans
    if (plan.monthlyPrice === 0) return plan;

    const stripe = this.stripeOrThrow;

    let stripeProductId = plan.stripeProductId;
    let stripePriceId = plan.stripePriceId;
    let stripeAnnualPriceId = plan.stripeAnnualPriceId;

    // Create or update Product
    if (!stripeProductId) {
      const product = await stripe.products.create({
        name: `${plan.displayName} (${plan.country})`,
        description: plan.description || `${plan.displayName} subscription`,
        metadata: {
          planId: plan.id,
          planName: plan.name,
          country: plan.country,
        },
      });
      stripeProductId = product.id;
      this.logger.log(
        `Created Stripe Product: ${stripeProductId} for plan ${plan.name}`,
      );
    }

    // Create monthly Price if missing
    if (!stripePriceId && plan.monthlyPrice > 0) {
      const price = await stripe.prices.create({
        product: stripeProductId,
        unit_amount: Math.round(plan.monthlyPrice * 100),
        currency: plan.currency.toLowerCase(),
        recurring: { interval: "month" },
        metadata: { planId: plan.id, cycle: "monthly" },
      });
      stripePriceId = price.id;
      this.logger.log(`Created Stripe Monthly Price: ${stripePriceId}`);
    }

    // Create annual Price if missing and annualPrice is set
    if (!stripeAnnualPriceId && plan.annualPrice && plan.annualPrice > 0) {
      const price = await stripe.prices.create({
        product: stripeProductId,
        unit_amount: Math.round(plan.annualPrice * 100),
        currency: plan.currency.toLowerCase(),
        recurring: { interval: "year" },
        metadata: { planId: plan.id, cycle: "annual" },
      });
      stripeAnnualPriceId = price.id;
      this.logger.log(`Created Stripe Annual Price: ${stripeAnnualPriceId}`);
    }

    // Persist Stripe IDs
    const updated = await this.prisma.subscriptionPlan.update({
      where: { id: planId },
      data: { stripeProductId, stripePriceId, stripeAnnualPriceId },
    });

    return updated;
  }

  /**
   * Admin: Sync all active paid plans to Stripe Products & Prices.
   */
  async syncAllPlansToStripe() {
    const plans = await this.prisma.subscriptionPlan.findMany({
      where: { isActive: true, monthlyPrice: { gt: 0 } },
    });

    const results: Array<{
      planId: string;
      name: string;
      synced: boolean;
      error?: string;
    }> = [];

    for (const plan of plans) {
      try {
        await this.ensurePlanSyncedToStripe(plan.id);
        results.push({ planId: plan.id, name: plan.name, synced: true });
      } catch (err) {
        results.push({
          planId: plan.id,
          name: plan.name,
          synced: false,
          error: err.message,
        });
      }
    }

    return { total: plans.length, results };
  }

  // ─── Stripe Customer Portal ────────────────────────

  /**
   * Create a Stripe Customer Portal session for a shop to manage billing.
   */
  async createBillingPortalSession(shopId: string) {
    const stripe = this.stripeOrThrow;

    const sub = await this.prisma.sellerSubscription.findFirst({
      where: { shopId, stripeCustomerId: { not: null } },
      select: { stripeCustomerId: true },
    });

    if (!sub?.stripeCustomerId) {
      throw new BadRequestException(
        "No Stripe customer found. Subscribe to a paid plan first.",
      );
    }

    const frontendUrl =
      this.configService.get<string>("FRONTEND_URL") || "http://localhost:3000";

    const session = await stripe.billingPortal.sessions.create({
      customer: sub.stripeCustomerId,
      return_url: `${frontendUrl}/dashboard/shop/billing`,
    });

    return { url: session.url };
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
    const stripe = this.stripeOrThrow;
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

    // Cancel in Stripe if there's a Stripe subscription
    if (sub.stripeSubscriptionId && this.stripe) {
      try {
        if (opts.immediate) {
          await this.stripe.subscriptions.cancel(sub.stripeSubscriptionId);
        } else {
          await this.stripe.subscriptions.update(sub.stripeSubscriptionId, {
            cancel_at_period_end: true,
          });
        }
      } catch (err) {
        this.logger.error(`Stripe cancel failed: ${err.message}`);
        // Still proceed with local cancellation
      }
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
   * Handle Stripe webhook events for subscription lifecycle.
   */
  async handleStripeWebhook(event: any) {
    switch (event.type) {
      // ── Checkout completed → create local subscription ──
      case "checkout.session.completed": {
        const session = event.data.object as any;
        if (session.mode !== "subscription") break;

        const { shopId, planId, country, billingCycle } =
          (session.subscription_details as any)?.metadata ||
          (session.metadata as any) ||
          {};

        const stripeSubscriptionId = session.subscription as string;
        const stripeCustomerId = session.customer as string;

        if (!shopId || !planId || !stripeSubscriptionId) {
          this.logger.warn(
            `checkout.session.completed missing metadata: shopId=${shopId}, planId=${planId}, stripeSub=${stripeSubscriptionId}`,
          );
          break;
        }

        // Cancel any existing active subscription for this shop
        const existing = await this.prisma.sellerSubscription.findFirst({
          where: { shopId, status: { in: ["ACTIVE", "TRIALING"] } },
        });
        if (existing) {
          // Cancel old Stripe subscription if different
          if (
            existing.stripeSubscriptionId &&
            existing.stripeSubscriptionId !== stripeSubscriptionId &&
            this.stripe
          ) {
            try {
              await this.stripe.subscriptions.cancel(
                existing.stripeSubscriptionId,
              );
            } catch (e) {
              this.logger.warn(`Failed to cancel old Stripe sub: ${e.message}`);
            }
          }
          await this.prisma.sellerSubscription.update({
            where: { id: existing.id },
            data: {
              status: "CANCELLED",
              cancelledAt: new Date(),
              cancelReason: "Replaced by new subscription",
            },
          });
        }

        // Retrieve the Stripe Subscription to get period dates
        let periodStart = new Date();
        let periodEnd = new Date();
        if (this.stripe) {
          try {
            const stripeSub = (await this.stripe.subscriptions.retrieve(
              stripeSubscriptionId,
            )) as any;
            periodStart = new Date(stripeSub.current_period_start * 1000);
            periodEnd = new Date(stripeSub.current_period_end * 1000);
          } catch (e) {
            this.logger.warn(`Could not retrieve Stripe period: ${e.message}`);
            periodEnd.setMonth(
              periodEnd.getMonth() + (billingCycle === "annual" ? 12 : 1),
            );
          }
        }

        await this.prisma.sellerSubscription.create({
          data: {
            shopId,
            planId,
            status: "ACTIVE",
            country: (country || "US") as any,
            startedAt: new Date(),
            currentPeriodStart: periodStart,
            currentPeriodEnd: periodEnd,
            stripeSubscriptionId,
            stripeCustomerId,
            autoRenew: true,
          },
        });

        this.logger.log(
          `Subscription created for shop ${shopId} via Stripe Checkout (${stripeSubscriptionId})`,
        );
        break;
      }

      // ── Invoice paid → record payment + keep subscription ACTIVE ──
      case "invoice.paid": {
        const invoice = event.data.object as any;
        const stripeSubId = invoice.subscription as string;
        if (!stripeSubId) break;

        const sub = await this.prisma.sellerSubscription.findFirst({
          where: { stripeSubscriptionId: stripeSubId },
          include: { plan: true },
        });
        if (!sub) {
          this.logger.warn(
            `invoice.paid: no local sub for Stripe sub ${stripeSubId}`,
          );
          break;
        }

        // Update period dates
        if (invoice.lines?.data?.[0]) {
          const line = invoice.lines.data[0];
          const pStart = new Date((line.period?.start || 0) * 1000);
          const pEnd = new Date((line.period?.end || 0) * 1000);
          await this.prisma.sellerSubscription.update({
            where: { id: sub.id },
            data: {
              status: "ACTIVE",
              currentPeriodStart: pStart,
              currentPeriodEnd: pEnd,
            },
          });
        } else {
          await this.prisma.sellerSubscription.update({
            where: { id: sub.id },
            data: { status: "ACTIVE" },
          });
        }

        // Record the payment
        await this.prisma.subscriptionPayment.create({
          data: {
            subscriptionId: sub.id,
            amount: (invoice.amount_paid || 0) / 100,
            currency: (sub.plan.currency || "USD") as any,
            gateway: "stripe",
            gatewayPaymentId: invoice.payment_intent as string,
            status: "COMPLETED",
            periodStart: sub.currentPeriodStart,
            periodEnd: sub.currentPeriodEnd,
            invoiceUrl: invoice.hosted_invoice_url || undefined,
          },
        });

        this.logger.log(
          `Invoice paid for subscription ${sub.id} (${invoice.id})`,
        );
        break;
      }

      // ── Invoice failed → mark PAST_DUE ──
      case "invoice.payment_failed": {
        const invoice = event.data.object as any;
        const stripeSubId = invoice.subscription as string;
        if (!stripeSubId) break;

        const sub = await this.prisma.sellerSubscription.findFirst({
          where: { stripeSubscriptionId: stripeSubId },
          include: { plan: true },
        });
        if (!sub) break;

        await this.prisma.sellerSubscription.update({
          where: { id: sub.id },
          data: { status: "PAST_DUE" },
        });

        // Record failed payment
        await this.prisma.subscriptionPayment.create({
          data: {
            subscriptionId: sub.id,
            amount: (invoice.amount_due || 0) / 100,
            currency: (sub.plan.currency || "USD") as any,
            gateway: "stripe",
            gatewayPaymentId: invoice.payment_intent as string,
            status: "FAILED",
            periodStart: sub.currentPeriodStart,
            periodEnd: sub.currentPeriodEnd,
            failureReason:
              (invoice as any).last_payment_error?.message || "Payment failed",
          },
        });

        this.logger.warn(
          `Payment failed → subscription ${sub.id} marked PAST_DUE`,
        );
        break;
      }

      // ── Subscription updated (plan change, cancel-at-period-end, etc.) ──
      case "customer.subscription.updated": {
        const stripeSub = event.data.object as any;
        const sub = await this.prisma.sellerSubscription.findFirst({
          where: { stripeSubscriptionId: stripeSub.id },
        });
        if (!sub) break;

        const statusMap: Record<string, string> = {
          active: "ACTIVE",
          past_due: "PAST_DUE",
          canceled: "CANCELLED",
          unpaid: "PAST_DUE",
          trialing: "TRIALING",
        };

        const newStatus = statusMap[stripeSub.status] || sub.status;
        const cancelAtPeriodEnd = stripeSub.cancel_at_period_end;

        await this.prisma.sellerSubscription.update({
          where: { id: sub.id },
          data: {
            status: newStatus as any,
            autoRenew: !cancelAtPeriodEnd,
            currentPeriodStart: new Date(stripeSub.current_period_start * 1000),
            currentPeriodEnd: new Date(stripeSub.current_period_end * 1000),
          },
        });

        this.logger.log(
          `Subscription ${sub.id} updated: status=${newStatus}, autoRenew=${!cancelAtPeriodEnd}`,
        );
        break;
      }

      // ── Subscription deleted → cancel locally ──
      case "customer.subscription.deleted": {
        const stripeSub = event.data.object as any;
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
          this.logger.log(
            `Subscription ${sub.id} cancelled via Stripe (${stripeSub.id})`,
          );
        }
        break;
      }

      default:
        this.logger.debug(`Unhandled webhook event: ${event.type}`);
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
