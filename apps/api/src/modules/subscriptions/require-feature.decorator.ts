import { SetMetadata } from "@nestjs/common";

/**
 * Metadata key used by FeatureGateGuard to read required features.
 */
export const REQUIRED_FEATURE_KEY = "REQUIRED_FEATURE";

/**
 * Decorator: marks an endpoint as requiring a specific plan feature.
 *
 * Usage:
 *   @UseGuards(JwtAuthGuard, FeatureGateGuard)
 *   @RequireFeature('advancedAnalytics')
 *   @Get('advanced-analytics')
 *   async getAdvancedAnalytics() { ... }
 *
 * Multiple features (ALL must be enabled):
 *   @RequireFeature('crm', 'customerManagement')
 */
export const RequireFeature = (...features: string[]) =>
  SetMetadata(REQUIRED_FEATURE_KEY, features);
