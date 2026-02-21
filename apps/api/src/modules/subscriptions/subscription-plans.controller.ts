import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { AuditService } from "../audit/audit.service";
import { SubscriptionPlansService } from "./subscription-plans.service";
import { CreatePlanDto, UpdatePlanDto } from "./dto";

@ApiTags("subscription-plans")
@Controller("subscription-plans")
export class SubscriptionPlansController {
  constructor(
    private readonly plansService: SubscriptionPlansService,
    private readonly auditService: AuditService,
  ) {}

  // ─── Public ──────────────────────────────────────────

  @Get("available")
  @ApiOperation({ summary: "List active plans for a country (public)" })
  async getAvailable(@Query("country") country: string) {
    return this.plansService.getAvailablePlans(country);
  }

  // ─── Admin CRUD ──────────────────────────────────────

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Create subscription plan (admin)" })
  async create(
    @Body() dto: CreatePlanDto,
    @CurrentUser("id") adminId: string,
  ) {
    const plan = await this.plansService.createPlan(dto);

    await this.auditService.log({
      userId: adminId,
      actorType: "ADMIN",
      action: "CREATE_SUBSCRIPTION_PLAN",
      resourceType: "SubscriptionPlan",
      resourceId: plan.id,
      newValue: plan,
    });

    return plan;
  }

  @Patch(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update subscription plan (admin)" })
  async update(
    @Param("id") planId: string,
    @Body() dto: UpdatePlanDto,
    @CurrentUser("id") adminId: string,
  ) {
    const { plan, previousValues, newValues } =
      await this.plansService.updatePlan(planId, dto);

    if (Object.keys(newValues).length > 0) {
      await this.auditService.log({
        userId: adminId,
        actorType: "ADMIN",
        action: "UPDATE_SUBSCRIPTION_PLAN",
        resourceType: "SubscriptionPlan",
        resourceId: plan.id,
        previousValue: previousValues,
        newValue: newValues,
      });
    }

    return plan;
  }

  @Patch(":id/toggle")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Enable/disable a plan (admin)" })
  async toggle(
    @Param("id") planId: string,
    @Body("isActive") isActive: boolean,
    @CurrentUser("id") adminId: string,
  ) {
    const plan = await this.plansService.togglePlanActive(planId, isActive);

    await this.auditService.log({
      userId: adminId,
      actorType: "ADMIN",
      action: isActive
        ? "ENABLE_SUBSCRIPTION_PLAN"
        : "DISABLE_SUBSCRIPTION_PLAN",
      resourceType: "SubscriptionPlan",
      resourceId: plan.id,
      previousValue: { isActive: !isActive },
      newValue: { isActive },
    });

    return plan;
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "List all plans with filters (admin)" })
  async list(
    @Query("country") country?: string,
    @Query("isActive") isActive?: string,
  ) {
    return this.plansService.listPlans({
      country,
      isActive: isActive === undefined ? undefined : isActive === "true",
    });
  }

  @Get(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get plan by ID (admin)" })
  async getById(@Param("id") planId: string) {
    return this.plansService.getPlanById(planId);
  }
}
