import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  forwardRef,
} from "@nestjs/common";
import { RedisService } from "../../common/redis";
import { PrismaService } from "../../prisma/prisma.service";
import { PaymentGatewayService } from "../payment-gateway/payment-gateway.service";

const RATE_LIMIT_HOURLY = 20; // max generations per hour per user
const RATE_LIMIT_DAILY = 100; // max generations per day per user
const RATE_LIMIT_HOUR_TTL = 3600;
const RATE_LIMIT_DAY_TTL = 86400;
const AUTO_RECHARGE_LOCK_TTL = 300; // 5 min lock to prevent concurrent recharges

@Injectable()
export class AiCreditsService {
  private readonly logger = new Logger(AiCreditsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    @Inject(forwardRef(() => PaymentGatewayService))
    private readonly paymentGatewayService: PaymentGatewayService,
  ) {}

  // ─── Core: Atomic Debit ───────────────────────────

  /**
   * Attempt to debit credits for an AI generation.
   * Uses SELECT … FOR UPDATE (Prisma interactive tx) for atomicity.
   * Returns the ledger entry if successful.
   *
   * @throws BadRequestException if insufficient credits
   * @throws ForbiddenException  if rate-limited
   */
  async debitCredits(opts: {
    userId: string;
    shopId?: string;
    amount: number;
    reason: string;
    referenceId?: string;
    idempotencyKey: string;
  }) {
    // 1. Idempotency check via Redis
    if (opts.idempotencyKey) {
      const existing = await this.redis.get(
        `ai_credit_idem:${opts.idempotencyKey}`,
      );
      if (existing) {
        this.logger.log(`Idempotent debit skipped: ${opts.idempotencyKey}`);
        return JSON.parse(existing);
      }
    }

    // 2. Rate limiting
    await this.enforceRateLimit(opts.userId);

    // 3. Atomic debit in a serializable transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Lock the user row for update
      const user = await tx.$queryRaw<
        { id: string; aiCreditsBalance: number }[]
      >`SELECT id, "aiCreditsBalance" FROM "User" WHERE id = ${opts.userId} FOR UPDATE`;

      if (!user.length) {
        throw new BadRequestException("User not found");
      }

      const balanceBefore = user[0].aiCreditsBalance;

      if (balanceBefore < opts.amount) {
        throw new BadRequestException(
          `Insufficient AI credits. Balance: ${balanceBefore}, required: ${opts.amount}`,
        );
      }

      const balanceAfter = balanceBefore - opts.amount;

      // Update balance
      await tx.user.update({
        where: { id: opts.userId },
        data: { aiCreditsBalance: balanceAfter },
      });

      // Create immutable ledger entry
      const ledgerEntry = await tx.aiCreditLedger.create({
        data: {
          userId: opts.userId,
          shopId: opts.shopId,
          action: "DEBIT",
          amount: opts.amount,
          balanceBefore,
          balanceAfter,
          reason: opts.reason,
          referenceId: opts.referenceId,
          idempotencyKey: opts.idempotencyKey,
        },
      });

      return { ledgerEntry, balanceAfter };
    });

    // 4. Cache idempotency result (24h)
    if (opts.idempotencyKey) {
      await this.redis.set(
        `ai_credit_idem:${opts.idempotencyKey}`,
        JSON.stringify(result),
        86400,
      );
    }

    // 5. Trigger auto-recharge if balance fell below threshold (fire-and-forget)
    if (opts.shopId) {
      this.maybeAutoRecharge(
        opts.userId,
        opts.shopId,
        result.balanceAfter,
      ).catch((err) =>
        this.logger.error(`Auto-recharge check failed: ${err.message}`),
      );
    }

    return result;
  }

  // ─── Refund on failure ────────────────────────────

  /**
   * Refund credits when a generation fails.
   */
  async refundCredits(opts: {
    userId: string;
    shopId?: string;
    amount: number;
    reason: string;
    referenceId?: string;
    idempotencyKey: string;
  }) {
    // Idempotency check
    if (opts.idempotencyKey) {
      const existing = await this.redis.get(
        `ai_credit_idem:${opts.idempotencyKey}`,
      );
      if (existing) return JSON.parse(existing);
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.$queryRaw<
        { id: string; aiCreditsBalance: number }[]
      >`SELECT id, "aiCreditsBalance" FROM "User" WHERE id = ${opts.userId} FOR UPDATE`;

      if (!user.length) throw new BadRequestException("User not found");

      const balanceBefore = user[0].aiCreditsBalance;
      const balanceAfter = balanceBefore + opts.amount;

      await tx.user.update({
        where: { id: opts.userId },
        data: { aiCreditsBalance: balanceAfter },
      });

      const ledgerEntry = await tx.aiCreditLedger.create({
        data: {
          userId: opts.userId,
          shopId: opts.shopId,
          action: "REFUND",
          amount: opts.amount,
          balanceBefore,
          balanceAfter,
          reason: opts.reason,
          referenceId: opts.referenceId,
          idempotencyKey: opts.idempotencyKey,
        },
      });

      return { ledgerEntry, balanceAfter };
    });

    if (opts.idempotencyKey) {
      await this.redis.set(
        `ai_credit_idem:${opts.idempotencyKey}`,
        JSON.stringify(result),
        86400,
      );
    }

    return result;
  }

  // ─── Monthly Grant (cron job) ─────────────────────

  /**
   * Grant monthly AI credits to all active subscribers.
   * Should be called by a Bull cron job at month start.
   * Handles rollover cap logic.
   */
  async processMonthlyGrants() {
    const activeSubscriptions = await this.prisma.sellerSubscription.findMany({
      where: {
        status: { in: ["ACTIVE", "TRIALING"] },
        plan: { includesAi: true },
      },
      include: {
        plan: true,
        shop: {
          include: {
            user: { select: { id: true, aiCreditsBalance: true } },
          },
        },
      },
    });

    let granted = 0;
    let expired = 0;

    for (const sub of activeSubscriptions) {
      const user = (sub as any).shop.user;
      const plan = (sub as any).plan;

      if (!user || plan.monthlyAiCredits <= 0) continue;

      await this.prisma.$transaction(async (tx) => {
        // Re-read balance inside tx
        const freshUser = await tx.$queryRaw<
          { id: string; aiCreditsBalance: number }[]
        >`SELECT id, "aiCreditsBalance" FROM "User" WHERE id = ${user.id} FOR UPDATE`;

        if (!freshUser.length) return;

        const currentBalance = freshUser[0].aiCreditsBalance;

        // Expire credits beyond rollover cap
        let expiredAmount = 0;
        if (plan.rolloverCap > 0 && currentBalance > plan.rolloverCap) {
          expiredAmount = currentBalance - plan.rolloverCap;

          await tx.aiCreditLedger.create({
            data: {
              userId: user.id,
              shopId: sub.shopId,
              action: "EXPIRE",
              amount: expiredAmount,
              balanceBefore: currentBalance,
              balanceAfter: plan.rolloverCap,
              reason: `Monthly expiry beyond rollover cap of ${plan.rolloverCap}`,
              idempotencyKey: `expire:${user.id}:${new Date().toISOString().slice(0, 7)}`,
            },
          });

          expired += expiredAmount;
        }

        const balanceAfterExpiry =
          expiredAmount > 0 ? plan.rolloverCap : currentBalance;

        // Grant new credits
        const newBalance = balanceAfterExpiry + plan.monthlyAiCredits;

        await tx.user.update({
          where: { id: user.id },
          data: {
            aiCreditsBalance: newBalance,
            aiCreditsGrantedAt: new Date(),
          },
        });

        await tx.aiCreditLedger.create({
          data: {
            userId: user.id,
            shopId: sub.shopId,
            action: "GRANT",
            amount: plan.monthlyAiCredits,
            balanceBefore: balanceAfterExpiry,
            balanceAfter: newBalance,
            reason: `Monthly grant for ${plan.displayName}`,
            idempotencyKey: `grant:${user.id}:${new Date().toISOString().slice(0, 7)}`,
          },
        });

        granted++;
      });
    }

    this.logger.log(
      `Monthly grant processed: ${granted} users granted, ${expired} credits expired`,
    );
    return { granted, expired };
  }

  // ─── Admin Adjust ─────────────────────────────────

  /**
   * Admin manually adjusts credits (bonus, correction, etc.)
   */
  async adminAdjust(opts: {
    userId: string;
    amount: number; // positive to add, negative to remove
    reason: string;
    adminId: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.$queryRaw<
        { id: string; aiCreditsBalance: number }[]
      >`SELECT id, "aiCreditsBalance" FROM "User" WHERE id = ${opts.userId} FOR UPDATE`;

      if (!user.length) throw new BadRequestException("User not found");

      const balanceBefore = user[0].aiCreditsBalance;
      const balanceAfter = Math.max(0, balanceBefore + opts.amount);

      await tx.user.update({
        where: { id: opts.userId },
        data: { aiCreditsBalance: balanceAfter },
      });

      const ledgerEntry = await tx.aiCreditLedger.create({
        data: {
          userId: opts.userId,
          action: "ADMIN_ADJUST",
          amount: Math.abs(opts.amount),
          balanceBefore,
          balanceAfter,
          reason: `Admin (${opts.adminId}): ${opts.reason}`,
          idempotencyKey: `admin:${opts.adminId}:${opts.userId}:${Date.now()}`,
        },
      });

      return { ledgerEntry, balanceAfter };
    });
  }

  // ─── Rate Limiting ────────────────────────────────

  private async enforceRateLimit(userId: string) {
    const hourKey = `ai_rl_h:${userId}:${Math.floor(Date.now() / 3600000)}`;
    const dayKey = `ai_rl_d:${userId}:${new Date().toISOString().slice(0, 10)}`;

    // Read current counts
    const [hourCountStr, dayCountStr] = await Promise.all([
      this.redis.get(hourKey),
      this.redis.get(dayKey),
    ]);

    const hourCount = parseInt(hourCountStr || "0", 10);
    const dayCount = parseInt(dayCountStr || "0", 10);

    if (hourCount >= RATE_LIMIT_HOURLY) {
      throw new ForbiddenException(
        `Hourly AI generation limit reached (${RATE_LIMIT_HOURLY}/hr). Try again later.`,
      );
    }

    if (dayCount >= RATE_LIMIT_DAILY) {
      throw new ForbiddenException(
        `Daily AI generation limit reached (${RATE_LIMIT_DAILY}/day). Try again tomorrow.`,
      );
    }

    // Increment counters
    await Promise.all([
      this.redis.set(hourKey, String(hourCount + 1), RATE_LIMIT_HOUR_TTL),
      this.redis.set(dayKey, String(dayCount + 1), RATE_LIMIT_DAY_TTL),
    ]);
  }

  // ─── Queries ──────────────────────────────────────

  /**
   * Get user's current balance + recent ledger.
   */
  async getUserCredits(userId: string) {
    const [user, recentLedger] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          aiCreditsBalance: true,
          aiCreditsGrantedAt: true,
        },
      }),
      this.prisma.aiCreditLedger.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
    ]);

    return {
      balance: user?.aiCreditsBalance ?? 0,
      lastGrantedAt: user?.aiCreditsGrantedAt,
      recentTransactions: recentLedger,
    };
  }

  /**
   * Get full ledger for a user (admin or self).
   */
  async getUserLedger(
    userId: string,
    opts: { page?: number; limit?: number; action?: string } = {},
  ) {
    const { page = 1, limit = 50, action } = opts;
    const skip = (page - 1) * limit;

    const where: any = { userId };
    if (action) where.action = action;

    const [data, total] = await Promise.all([
      this.prisma.aiCreditLedger.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.aiCreditLedger.count({ where }),
    ]);

    return { data, total, page, limit, pages: Math.ceil(total / limit) };
  }

  // ─── Purchase Extra Credits (Pay-per-use) ─────────

  /**
   * Called after a successful AI credit purchase payment.
   * Credits the user's balance and records the transaction.
   */
  async handleCreditPurchaseSuccess(opts: {
    userId: string;
    shopId?: string;
    creditAmount: number;
    gatewayPaymentId: string;
    gateway: string;
    paidAmount: number;
    currency: string;
  }) {
    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.$queryRaw<
        { id: string; aiCreditsBalance: number }[]
      >`SELECT id, "aiCreditsBalance" FROM "User" WHERE id = ${opts.userId} FOR UPDATE`;

      if (!user.length) throw new BadRequestException("User not found");

      const balanceBefore = user[0].aiCreditsBalance;
      const balanceAfter = balanceBefore + opts.creditAmount;

      await tx.user.update({
        where: { id: opts.userId },
        data: { aiCreditsBalance: balanceAfter },
      });

      const ledgerEntry = await tx.aiCreditLedger.create({
        data: {
          userId: opts.userId,
          shopId: opts.shopId,
          action: "PURCHASE",
          amount: opts.creditAmount,
          balanceBefore,
          balanceAfter,
          reason: `Purchased ${opts.creditAmount} credits (${opts.currency} ${opts.paidAmount}) via ${opts.gateway}`,
          referenceId: opts.gatewayPaymentId,
          idempotencyKey: `purchase:${opts.gatewayPaymentId}`,
        },
      });

      return { ledgerEntry, balanceAfter };
    });

    this.logger.log(
      `Credits purchased: +${opts.creditAmount} for user ${opts.userId} via ${opts.gateway} (${opts.gatewayPaymentId})`,
    );

    return result;
  }

  /**
   * Called when AI credit purchase payment fails.
   */
  async handleCreditPurchaseFailure(opts: {
    userId: string;
    gatewayPaymentId: string;
    reason?: string;
  }) {
    this.logger.warn(
      `AI credit purchase failed for user ${opts.userId}: ${opts.reason || "unknown"} (${opts.gatewayPaymentId})`,
    );
    // No balance changes needed — credits were not granted yet
  }

  /**
   * Get aggregate credit stats (admin).
   */
  async getCreditStats() {
    const [totalGranted, totalDebited, totalRefunded, totalExpired] =
      await Promise.all([
        this.prisma.aiCreditLedger.aggregate({
          where: { action: "GRANT" },
          _sum: { amount: true },
        }),
        this.prisma.aiCreditLedger.aggregate({
          where: { action: "DEBIT" },
          _sum: { amount: true },
        }),
        this.prisma.aiCreditLedger.aggregate({
          where: { action: "REFUND" },
          _sum: { amount: true },
        }),
        this.prisma.aiCreditLedger.aggregate({
          where: { action: "EXPIRE" },
          _sum: { amount: true },
        }),
      ]);

    return {
      totalGranted: totalGranted._sum.amount || 0,
      totalDebited: totalDebited._sum.amount || 0,
      totalRefunded: totalRefunded._sum.amount || 0,
      totalExpired: totalExpired._sum.amount || 0,
      netCreditsInCirculation:
        (totalGranted._sum.amount || 0) -
        (totalDebited._sum.amount || 0) +
        (totalRefunded._sum.amount || 0) -
        (totalExpired._sum.amount || 0),
    };
  }

  // ─── Auto-Recharge Settings ───────────────────────

  /**
   * Get auto-recharge settings for a shop.
   */
  async getAutoRechargeSettings(shopId: string) {
    const shop = await this.prisma.shop.findUnique({
      where: { id: shopId },
      select: {
        autoRechargeEnabled: true,
        autoRechargeThreshold: true,
        autoRechargePack: true,
      },
    });
    return (
      shop || {
        autoRechargeEnabled: false,
        autoRechargeThreshold: 5,
        autoRechargePack: 50,
      }
    );
  }

  /**
   * Update auto-recharge settings for a shop.
   */
  async updateAutoRechargeSettings(
    shopId: string,
    opts: {
      autoRechargeEnabled?: boolean;
      autoRechargeThreshold?: number;
      autoRechargePack?: number;
    },
  ) {
    return this.prisma.shop.update({
      where: { id: shopId },
      data: {
        ...(opts.autoRechargeEnabled !== undefined && {
          autoRechargeEnabled: opts.autoRechargeEnabled,
        }),
        ...(opts.autoRechargeThreshold !== undefined && {
          autoRechargeThreshold: Math.max(1, opts.autoRechargeThreshold),
        }),
        ...(opts.autoRechargePack !== undefined && {
          autoRechargePack: Math.max(10, opts.autoRechargePack),
        }),
      },
      select: {
        autoRechargeEnabled: true,
        autoRechargeThreshold: true,
        autoRechargePack: true,
      },
    });
  }

  // ─── Auto-Recharge Logic ──────────────────────────

  /**
   * Check if auto-recharge should trigger and execute it.
   * Called fire-and-forget after every debit.
   */
  private async maybeAutoRecharge(
    userId: string,
    shopId: string,
    currentBalance: number,
  ) {
    // Load shop settings
    const shop = await this.prisma.shop.findUnique({
      where: { id: shopId },
      select: {
        autoRechargeEnabled: true,
        autoRechargeThreshold: true,
        autoRechargePack: true,
        subscriptions: {
          where: { status: "ACTIVE" },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            stripeCustomerId: true,
            plan: {
              select: {
                extraCreditPrice: true,
                currency: true,
                overageBehavior: true,
              },
            },
          },
        },
      },
    });

    if (!shop?.autoRechargeEnabled) return;
    if (currentBalance >= shop.autoRechargeThreshold) return;

    const activeSub = shop.subscriptions[0];
    if (!activeSub?.stripeCustomerId) {
      this.logger.warn(
        `Auto-recharge skipped for shop ${shopId}: no Stripe customer ID`,
      );
      return;
    }

    const plan = activeSub.plan;
    if (plan.overageBehavior !== "AUTO_CHARGE" || plan.extraCreditPrice <= 0) {
      return;
    }

    // Acquire Redis lock to prevent concurrent auto-recharges
    const lockKey = `auto_recharge_lock:${shopId}`;
    const locked = await this.redis.get(lockKey);
    if (locked) return; // already in progress
    await this.redis.set(lockKey, "1", AUTO_RECHARGE_LOCK_TTL);

    try {
      const creditsToBuy = shop.autoRechargePack;
      const totalAmount = creditsToBuy * plan.extraCreditPrice;

      this.logger.log(
        `Auto-recharging ${creditsToBuy} credits for shop ${shopId} (balance: ${currentBalance} < threshold: ${shop.autoRechargeThreshold})`,
      );

      const chargeResult =
        await this.paymentGatewayService.chargeStripeOffSession({
          stripeCustomerId: activeSub.stripeCustomerId,
          amount: totalAmount,
          currency: plan.currency,
          metadata: {
            type: "ai_credits",
            userId,
            shopId,
            creditAmount: String(creditsToBuy),
            paidAmount: String(totalAmount),
            currency: plan.currency,
            autoRecharge: "true",
          },
        });

      if (chargeResult.success) {
        // Credit the balance
        await this.handleCreditPurchaseSuccess({
          userId,
          shopId,
          creditAmount: creditsToBuy,
          gatewayPaymentId: chargeResult.paymentIntentId!,
          gateway: "stripe",
          paidAmount: totalAmount,
          currency: plan.currency,
        });

        this.logger.log(
          `Auto-recharge successful: +${creditsToBuy} credits for shop ${shopId}`,
        );
      } else {
        this.logger.warn(
          `Auto-recharge payment failed for shop ${shopId}: ${chargeResult.error}`,
        );
      }
    } finally {
      // Release lock after a short delay (keep 60s to prevent rapid retries)
      await this.redis.set(lockKey, "1", 60);
    }
  }

  // ─── Admin: List sellers with balances ────────────

  /**
   * Get all sellers with their credit balances (for admin credit management).
   */
  async listSellersWithBalances(opts: {
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const { search, page = 1, limit = 20 } = opts;
    const skip = (page - 1) * limit;

    const where: any = { role: "SHOPKEEPER" };
    if (search) {
      where.OR = [
        { email: { contains: search, mode: "insensitive" } },
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        {
          shops: {
            some: { shopName: { contains: search, mode: "insensitive" } },
          },
        },
      ];
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          aiCreditsBalance: true,
          shops: {
            take: 1,
            select: {
              id: true,
              shopName: true,
              autoRechargeEnabled: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: users.map((u) => ({
        ...u,
        shop: u.shops[0] || null,
        shops: undefined,
      })),
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  }
}
