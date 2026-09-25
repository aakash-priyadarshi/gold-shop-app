import { BadRequestException, Body, Controller, Get, NotFoundException, Param, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { IsBoolean, IsEmail, IsOptional } from "class-validator";
import { CurrentUser } from "../../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { FeatureGateGuard } from "../../core/subscriptions/feature-gate.guard";
import { RequireFeature } from "../../core/subscriptions/require-feature.decorator";
import { PrismaService } from "../../../prisma/prisma.service";
import { RequireWorkshopAbility, WorkshopPermissionGuard } from "./workshop-permission.guard";

class InviteWorkshopStaffDto {
  @IsEmail() email: string;
  @IsBoolean() canCapture: boolean;
  @IsOptional() @IsBoolean() canApprove?: boolean;
}

@ApiTags("karigar-workshop-assignments")
@ApiBearerAuth()
@Controller("karigar/workshop")
@UseGuards(JwtAuthGuard)
export class WorkshopAssignmentsController {
  constructor(private readonly prisma: PrismaService) {}

  @Post("staff/invite")
  @UseGuards(WorkshopPermissionGuard, FeatureGateGuard)
  @RequireWorkshopAbility("workshopConfigure")
  @RequireFeature("workshopManufacturing")
  async invite(@CurrentUser("shopId") shopId: string, @CurrentUser("id") actorUserId: string, @Body() dto: InviteWorkshopStaffDto) {
    if (!shopId || (!dto.canCapture && !dto.canApprove)) throw new BadRequestException("Select a shop and at least one Workshop permission");
    const email = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (!user || user.id === actorUserId) throw new BadRequestException("Ask the staff member to register an account before inviting them");
    const permissions = { workshopCapture: dto.canCapture || dto.canApprove === true, workshopApprove: dto.canApprove === true };
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.staffAccount.findUnique({ where: { shopId_userId: { shopId, userId: user.id } } });
      const merged = existing?.isActive && existing.permissions && typeof existing.permissions === "object" && !Array.isArray(existing.permissions)
        ? { ...(existing.permissions as Record<string, unknown>), ...permissions } : permissions;
      const membership = await tx.staffAccount.upsert({
        where: { shopId_userId: { shopId, userId: user.id } },
        update: { permissions: merged, isActive: true, ...(!existing?.isActive ? { acceptedAt: null, invitedByUserId: actorUserId, staffRole: permissions.workshopApprove ? "MANAGER" : "INVENTORY" } : {}) },
        create: { shopId, userId: user.id, invitedByUserId: actorUserId, staffRole: permissions.workshopApprove ? "MANAGER" : "INVENTORY", permissions: merged },
      });
      await tx.auditLog.create({ data: { userId: actorUserId, actorType: "SHOPKEEPER", action: "WORKSHOP_STAFF_INVITE", resourceType: "StaffAccount", resourceId: membership.id, newValue: { shopId, invitedUserId: user.id, permissions } } });
      return { id: membership.id, accepted: !!membership.acceptedAt, permissions };
    });
  }

  @Get("my-invitations")
  async invitations(@CurrentUser("id") userId: string) {
    const pending = await this.prisma.staffAccount.findMany({
      where: { userId, isActive: true, acceptedAt: null },
      select: { id: true, permissions: true, shop: { select: { shopName: true } } },
      orderBy: { createdAt: "asc" },
    });
    return pending.filter((member) => member.permissions && typeof member.permissions === "object" && !Array.isArray(member.permissions) &&
      ((member.permissions as Record<string, unknown>).workshopCapture === true || (member.permissions as Record<string, unknown>).workshopApprove === true))
      .map((member) => ({ id: member.id, shopName: member.shop.shopName }));
  }

  @Post("my-invitations/:id/accept")
  async accept(@CurrentUser("id") userId: string, @Param("id") id: string) {
    const changed = await this.prisma.staffAccount.updateMany({ where: { id, userId, isActive: true, acceptedAt: null }, data: { acceptedAt: new Date() } });
    if (changed.count !== 1) throw new NotFoundException("Pending Workshop invitation not found");
    return { accepted: true };
  }

  @Get("my-assignments")
  async mine(@CurrentUser("id") userId: string) {
    const memberships = await this.prisma.staffAccount.findMany({
      where: { userId, isActive: true, acceptedAt: { not: null } },
      select: { shopId: true, staffRole: true, permissions: true, shop: { select: { shopName: true, workshopMode: true, workshopLedgerVersion: true } } },
      orderBy: { createdAt: "asc" },
    });
    return memberships.filter((member) => {
      const permissions = member.permissions;
      return permissions && typeof permissions === "object" && !Array.isArray(permissions) &&
        ((permissions as Record<string, unknown>).workshopCapture === true || (permissions as Record<string, unknown>).workshopApprove === true);
    }).map((member) => ({ shopId: member.shopId, shopName: member.shop.shopName, staffRole: member.staffRole,
      permissions: member.permissions, workshopMode: member.shop.workshopMode, workshopLedgerVersion: member.shop.workshopLedgerVersion }));
  }
}
