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
import { AuditService } from "../audit/audit.service";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { CreatePlanDto, DisablePlanWithSuccessorDto, UpdatePlanDto } from "./dto";
import { SubscriptionPlansService } from "./subscription-plans.service";

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
  async create(@Body() dto: CreatePlanDto, @CurrentUser("id") adminId: string) {
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

  // ─── Plan Lifecycle ──────────────────────────────────

  @Delete(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Safe-delete a plan (admin). Fails if active subscribers exist.",
  })
  async deletePlan(
    @Param("id") planId: string,
    @CurrentUser("id") adminId: string,
  ) {
    const result = await this.plansService.safeDeletPlan(planId);

    await this.auditService.log({
      userId: adminId,
      actorType: "ADMIN",
      action: "DELETE_SUBSCRIPTION_PLAN",
      resourceType: "SubscriptionPlan",
      resourceId: planId,
      previousValue: { planName: result.planName },
      newValue: { deleted: true },
    });

    return result;
  }

  @Patch(":id/disable-with-successor")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      "Disable a plan, set successor, and notify all active subscribers (admin)",
  })
  async disableWithSuccessor(
    @Param("id") planId: string,
    @Body() dto: DisablePlanWithSuccessorDto,
    @CurrentUser("id") adminId: string,
  ) {
    const result = await this.plansService.disablePlanWithSuccessor(
      planId,
      dto.successorPlanId,
    );

    await this.auditService.log({
      userId: adminId,
      actorType: "ADMIN",
      action: "DISABLE_PLAN_WITH_SUCCESSOR",
      resourceType: "SubscriptionPlan",
      resourceId: planId,
      previousValue: { isActive: true },
      newValue: {
        isActive: false,
        successorPlanId: dto.successorPlanId,
        affectedSubscriptions: result.affectedSubscriptions,
      },
    });

    return result;
  }

  @Get(":id/subscriber-count")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get active subscriber count for a plan (admin)" })
  async getSubscriberCount(@Param("id") planId: string) {
    const count = await this.plansService.getActiveSubscriberCount(planId);
    return { planId, activeSubscribers: count };
  }

  @Post("migration-reminders")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Trigger migration reminder emails (admin/cron)" })
  async triggerMigrationReminders(@CurrentUser("id") adminId: string) {
    const result = await this.plansService.sendMigrationReminders();

    await this.auditService.log({
      userId: adminId,
      actorType: "ADMIN",
      action: "TRIGGER_MIGRATION_REMINDERS",
      resourceType: "SubscriptionPlan",
      resourceId: "system",
      newValue: result,
    });

    return result;
  }

  @Post("process-renewal-migrations")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Process pending migrations at renewal time (admin/cron)",
  })
  async processRenewalMigrations(@CurrentUser("id") adminId: string) {
    const result = await this.plansService.processRenewalMigrations();

    await this.auditService.log({
      userId: adminId,
      actorType: "ADMIN",
      action: "PROCESS_RENEWAL_MIGRATIONS",
      resourceType: "SubscriptionPlan",
      resourceId: "system",
      newValue: result,
    });

    return result;
  }
}
