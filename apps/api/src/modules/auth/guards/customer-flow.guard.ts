import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { PlatformConfigService } from "../../platform-config/platform-config.service";

/**
 * Seals off the B2C consumer surface while the platform runs in B2B-only mode.
 *
 * Attach AFTER JwtAuthGuard on consumer-facing endpoints (catalogue reads, RFQ
 * submissions, quote requests, etc.). When the global `customer_flow_enabled`
 * toggle is off, every non-admin request is rejected with 403.
 *
 * Behaviour:
 *  - ADMIN (when authenticated) always passes — needed for support/QA.
 *  - Public/unauthenticated consumer routes have no `req.user`, so they are
 *    blocked outright while the flow is off (intended).
 *  - Fails closed: the underlying flag defaults to disabled.
 */
@Injectable()
export class CustomerFlowGuard implements CanActivate {
  constructor(private readonly platformConfig: PlatformConfigService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // Admins keep access even while the consumer flow is disabled.
    if (request.user?.role === UserRole.ADMIN) {
      return true;
    }

    if (await this.platformConfig.isCustomerFlowEnabled()) {
      return true;
    }

    throw new ForbiddenException({
      code: "CUSTOMER_FLOW_DISABLED",
      message: "The consumer marketplace is not currently available.",
    });
  }
}
