import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Reflector } from "@nestjs/core";
import { RedisService } from "../../common/redis";
import { PlanLimitsService } from "./plan-limits.service";
import { REQUIRED_FEATURE_KEY } from "./require-feature.decorator";

/**
 * Guard that enforces plan-feature gating.
 *
 * Reads the feature key(s) set by @RequireFeature() and checks
 * the shop's active subscription plan. If any required feature is
 * not enabled, the request is rejected with 403 FEATURE_NOT_ENABLED.
 *
 * Admins bypass all feature checks.
 * Customers are rate-limited (daily cap via Redis) instead of plan-checked.
 *
 * Usage:
 *   @UseGuards(JwtAuthGuard, FeatureGateGuard)
 *   @RequireFeature('advancedAnalytics')
 */
@Injectable()
export class FeatureGateGuard implements CanActivate {
  private readonly logger = new Logger(FeatureGateGuard.name);
  private readonly CUSTOMER_DAILY_LIMIT: number;
  private readonly CUSTOMER_RATE_PREFIX = "feature-gate:customer:";
  private readonly DAY_TTL = 86400; // 24 hours

  constructor(
    private readonly reflector: Reflector,
    private readonly planLimitsService: PlanLimitsService,
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
  ) {
    this.CUSTOMER_DAILY_LIMIT = parseInt(
      this.configService.get<string>("CUSTOMER_AI_DAILY_LIMIT") || "3",
      10,
    );
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 1. Read required features from decorator metadata
    const requiredFeatures = this.reflector.getAllAndOverride<string[]>(
      REQUIRED_FEATURE_KEY,
      [context.getHandler(), context.getClass()],
    );

    // No @RequireFeature decorator → allow
    if (!requiredFeatures || requiredFeatures.length === 0) {
      return true;
    }

    // 2. Get user from request
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException("Authentication required");
    }

    // Admin bypasses all feature gates
    if (user.role === "ADMIN") {
      return true;
    }

    // Customers (non-shopkeepers) are rate-limited instead of plan-checked.
    // They don't have a shopId, but features like AI design preview
    // should still be accessible with a daily generation cap.
    if (user.role === "CUSTOMER") {
      await this.enforceCustomerRateLimit(user.id, requiredFeatures);
      return true;
    }

    // 3. Need a shopId (shopkeeper flow)
    const shopId = user.shopId;
    if (!shopId) {
      throw new ForbiddenException(
        "No active shop found. Please create or select a shop first.",
      );
    }

    // 4. Check each required feature
    for (const featureKey of requiredFeatures) {
      await this.planLimitsService.checkFeature(shopId, featureKey);
    }

    return true;
  }

  /**
   * Enforce a daily rate limit for CUSTOMER users via Redis.
   * Key: "feature-gate:customer:{userId}:{featureKey}" with 24h TTL.
   * Fails open if Redis is unavailable (allows the request).
   */
  private async enforceCustomerRateLimit(
    userId: string,
    features: string[],
  ): Promise<void> {
    for (const featureKey of features) {
      const key = `${this.CUSTOMER_RATE_PREFIX}${userId}:${featureKey}`;
      try {
        const current = await this.redisService.get(key);
        const count = current ? parseInt(current as string) : 0;

        if (count >= this.CUSTOMER_DAILY_LIMIT) {
          this.logger.warn(
            `Customer ${userId} hit daily limit (${this.CUSTOMER_DAILY_LIMIT}) for ${featureKey}`,
          );
          throw new ForbiddenException(
            `Daily limit reached (${this.CUSTOMER_DAILY_LIMIT} per day). Try again tomorrow or create a shop for higher limits.`,
          );
        }

        // Increment counter with 24h TTL
        await this.redisService.set(key, String(count + 1), this.DAY_TTL);
        this.logger.log(
          `Customer ${userId} used ${count + 1}/${this.CUSTOMER_DAILY_LIMIT} for ${featureKey}`,
        );
      } catch (error) {
        // Re-throw ForbiddenException (our own rate limit error)
        if (error instanceof ForbiddenException) throw error;
        // Redis failure → fail open (allow the request)
        this.logger.error(
          `Redis rate-limit check failed for customer ${userId}: ${error.message}`,
        );
      }
    }
  }
}
