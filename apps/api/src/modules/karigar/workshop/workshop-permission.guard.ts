import { CanActivate, ExecutionContext, ForbiddenException, Injectable, SetMetadata } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PrismaService } from "../../../prisma/prisma.service";

export type WorkshopAbility =
  | "workshopCapture"
  | "workshopApprove"
  | "workshopManualOverride"
  | "workshopCorrect"
  | "workshopConfigure";

const ABILITY_KEY = "workshopAbility";
export const RequireWorkshopAbility = (ability: WorkshopAbility) => SetMetadata(ABILITY_KEY, ability);

@Injectable()
export class WorkshopPermissionGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user as { id?: string; role?: string; shopId?: string } | undefined;
    if (!user?.id) throw new ForbiddenException("Authentication required");
    const ability = this.reflector.getAllAndOverride<WorkshopAbility>(ABILITY_KEY, [
      context.getHandler(),
      context.getClass(),
    ]) ?? "workshopCapture";
    const requestedShopId = request.headers["x-workshop-shop-id"] || user.shopId;
    if (user.role === "ADMIN") {
      if (typeof requestedShopId !== "string" || !requestedShopId) {
        throw new ForbiddenException("Select a workshop shop first");
      }
      const shop = await this.prisma.shop.findUnique({ where: { id: requestedShopId }, select: { id: true } });
      if (!shop) throw new ForbiddenException("Workshop shop not found");
      user.shopId = shop.id;
      return true;
    }
    if (typeof requestedShopId === "string" && requestedShopId) {
      const shop = await this.prisma.shop.findFirst({
        where: { id: requestedShopId, userId: user.id },
        select: { id: true },
      });
      if (shop) {
        user.shopId = shop.id;
        return true;
      }
    }
    if (ability === "workshopManualOverride" || ability === "workshopCorrect" || ability === "workshopConfigure") {
      throw new ForbiddenException("Workshop owner or admin authorization is required");
    }
    const staff = await this.prisma.staffAccount.findFirst({
      where: {
        userId: user.id,
        isActive: true,
        acceptedAt: { not: null },
        ...(typeof requestedShopId === "string" && requestedShopId ? { shopId: requestedShopId } : {}),
      },
      select: { shopId: true, permissions: true },
      orderBy: { createdAt: "asc" },
    });
    const permissions = staff?.permissions;
    if (!staff || typeof permissions !== "object" || permissions === null || Array.isArray(permissions) ||
        (permissions as Record<string, unknown>)[ability] !== true) {
      throw new ForbiddenException(`Workshop permission ${ability} is required`);
    }
    user.shopId = staff.shopId;
    return true;
  }
}
