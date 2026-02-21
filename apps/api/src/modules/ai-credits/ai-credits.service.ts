import {
  Injectable,
  Logger,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../common/redis";

const RATE_LIMIT_HOURLY = 20; // max generations per hour per user
const RATE_LIMIT_DAILY = 100; // max generations per day per user
const RATE_LIMIT_HOUR_TTL = 3600;
const RATE_LIMIT_DAY_TTL = 86400;

@Injectable()
export class AiCreditsService {
  private readonly logger = new Logger(AiCreditsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
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
        this.logger.log(
          `Idempotent debit skipped: ${opts.idempotencyKey}`,
        );
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
            owner: { select: { id: true, aiCreditsBalance: true } },
          },
        },
      },
    });

    let granted = 0;
    let expired = 0;

    for (const sub of activeSubscriptions) {
      const user = sub.shop.owner;
      const plan = sub.plan;

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
}
