import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
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
 *
 * Usage:
 *   @UseGuards(JwtAuthGuard, FeatureGateGuard)
 *   @RequireFeature('advancedAnalytics')
 */
@Injectable()
export class FeatureGateGuard implements CanActivate {
  private readonly logger = new Logger(FeatureGateGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly planLimitsService: PlanLimitsService,
  ) {}

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

    // 3. Need a shopId
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
}
