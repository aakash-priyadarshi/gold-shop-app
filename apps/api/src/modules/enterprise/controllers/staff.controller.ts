import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { AuditService } from "../../audit/audit.service";
import { CurrentUser } from "../../auth/decorators/current-user.decorator";
import { Roles } from "../../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../auth/guards/roles.guard";
import { EnterpriseGuard } from "../guards/enterprise.guard";
import { StaffService } from "../services/staff.service";

@ApiTags("enterprise/staff")
@Controller("enterprise/staff")
@UseGuards(JwtAuthGuard, RolesGuard, EnterpriseGuard)
@ApiBearerAuth()
export class StaffController {
  constructor(
    private readonly staffService: StaffService,
    private readonly auditService: AuditService,
  ) {}

  @Post("invite")
  @Roles(UserRole.SHOPKEEPER)
  @ApiOperation({ summary: "Invite a staff member" })
  async invite(
    @CurrentUser("activeShopId") shopId: string,
    @CurrentUser("id") invitedByUserId: string,
    @Body()
    body: {
      userId: string;
      staffRole: "MANAGER" | "INVENTORY" | "CASHIER" | "VIEWER" | "AUDITOR";
      permissions: Record<string, boolean>;
      branchIds?: string[];
    },
  ) {
    const staff = await this.staffService.inviteStaff(shopId, invitedByUserId, body);

    await this.auditService.log({
      userId: invitedByUserId,
      actorType: "SHOPKEEPER",
      action: "INVITE_STAFF",
      resourceType: "StaffAccount",
      resourceId: staff.id,
      newValue: { userId: body.userId, staffRole: body.staffRole },
    });

    return staff;
  }

  @Get()
  @Roles(UserRole.SHOPKEEPER)
  @ApiOperation({ summary: "List staff members" })
  async list(
    @CurrentUser("activeShopId") shopId: string,
    @Query("includeInactive") includeInactive?: string,
  ) {
    return this.staffService.listStaff(shopId, includeInactive === "true");
  }

  @Get(":id")
  @Roles(UserRole.SHOPKEEPER)
  @ApiOperation({ summary: "Get staff member details" })
  async get(
    @CurrentUser("activeShopId") shopId: string,
    @Param("id") id: string,
  ) {
    return this.staffService.getStaffMember(shopId, id);
  }

  @Patch(":id")
  @Roles(UserRole.SHOPKEEPER)
  @ApiOperation({ summary: "Update staff role/permissions" })
  async update(
    @CurrentUser("activeShopId") shopId: string,
    @CurrentUser("id") userId: string,
    @Param("id") id: string,
    @Body() body: Partial<{ staffRole: string; permissions: Record<string, boolean>; branchIds: string[]; isActive: boolean }>,
  ) {
    const result = await this.staffService.updateStaff(shopId, id, body);

    await this.auditService.log({
      userId,
      actorType: "SHOPKEEPER",
      action: "UPDATE_STAFF",
      resourceType: "StaffAccount",
      resourceId: id,
      newValue: body,
    });

    return result;
  }

  @Delete(":id")
  @Roles(UserRole.SHOPKEEPER)
  @ApiOperation({ summary: "Remove staff member" })
  async remove(
    @CurrentUser("activeShopId") shopId: string,
    @CurrentUser("id") userId: string,
    @Param("id") id: string,
  ) {
    const result = await this.staffService.removeStaff(shopId, id);

    await this.auditService.log({
      userId,
      actorType: "SHOPKEEPER",
      action: "REMOVE_STAFF",
      resourceType: "StaffAccount",
      resourceId: id,
    });

    return result;
  }

  @Post("accept/:id")
  @ApiOperation({ summary: "Accept a staff invitation" })
  async acceptInvite(
    @CurrentUser("id") userId: string,
    @Param("id") staffId: string,
  ) {
    return this.staffService.acceptInvite(userId, staffId);
  }
}
