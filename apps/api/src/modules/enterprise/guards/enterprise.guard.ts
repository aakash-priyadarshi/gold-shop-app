import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service";

/**
 * Guard that checks if the requesting user's shop has an active ENTERPRISE subscription.
 * Apply via @UseGuards(EnterpriseGuard) on enterprise-only endpoints.
 */
@Injectable()
export class EnterpriseGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException("Authentication required");
    }

    // Admin bypasses enterprise check
    if (user.role === "ADMIN") {
      return true;
    }

    // Find the user's active shop
    const shopId = user.activeShopId;
    if (!shopId) {
      throw new ForbiddenException(
        "Enterprise features require an active shop",
      );
    }

    // Check for active ENTERPRISE subscription
    const subscription = await this.prisma.sellerSubscription.findFirst({
      where: {
        shopId,
        status: "ACTIVE",
        plan: { name: "ENTERPRISE" },
      },
      include: { plan: true },
    });

    if (!subscription) {
      throw new ForbiddenException(
        "This feature requires an Enterprise subscription. Please upgrade your plan.",
      );
    }

    // Attach subscription info to request for downstream use
    request.enterpriseSubscription = subscription;
    return true;
  }
}
