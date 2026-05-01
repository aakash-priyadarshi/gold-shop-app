import {
    BadRequestException,
    Body,
    Controller,
    ForbiddenException,
    Get,
    HttpCode,
    HttpStatus,
    InternalServerErrorException,
    Logger,
    Param,
    Post,
    Query,
    RawBodyRequest,
    Req,
    UseGuards,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { Request } from "express";
import { AuditService } from "../audit/audit.service";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import {
    AdminOverrideDto,
    CancelSubscriptionDto,
    MigrationResponseDto,
    SubscribeDto,
} from "./dto";
import { PlanLimitsService } from "./plan-limits.service";
import { SellerSubscriptionsService } from "./seller-subscriptions.service";

@ApiTags("seller-subscriptions")
@Controller("seller-subscriptions")
export class SellerSubscriptionsController {
  private readonly logger = new Logger(SellerSubscriptionsController.name);

  constructor(
    private readonly subscriptionService: SellerSubscriptionsService,
    private readonly planLimitsService: PlanLimitsService,
    private readonly auditService: AuditService,
    private readonly configService: ConfigService,
  ) {}

  // ─── Seller endpoints ─────────────────────────────

  @Post("subscribe")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SHOPKEEPER)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Subscribe shop to a plan" })
  async subscribe(
    @Body() dto: SubscribeDto,
    @CurrentUser("id") userId: string,
    @CurrentUser("shopId") shopId: string,
  ) {
    // Use JWT shopId if not provided in body
    const resolvedShopId = dto.shopId || shopId;

    // Ensure seller can only subscribe their own shop
    if (resolvedShopId !== shopId) {
      throw new ForbiddenException("You can only subscribe your own shop");
    }

    const result = await this.subscriptionService.subscribeToPlan({
      shopId: resolvedShopId,
      planId: dto.planId,
      country: dto.country,
      billingCycle: dto.billingCycle as any,
      stripePaymentMethodId: dto.stripePaymentMethodId,
      userId,
    });

    await this.auditService.log({
      userId,
      actorType: "SHOPKEEPER",
      action: "SUBSCRIBE_TO_PLAN",
      resourceType: "SellerSubscription",
      resourceId: result.subscription?.id || "pending-checkout",
      newValue: {
        planId: dto.planId,
        planName: result.subscription?.plan?.name || dto.planId,
        requiresPayment: result.requiresPayment,
      },
    });

    return result;
  }

  @Post(":id/cancel")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SHOPKEEPER)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Cancel subscription" })
  async cancel(
    @Param("id") subscriptionId: string,
    @Body() dto: CancelSubscriptionDto,
    @CurrentUser("id") userId: string,
    @CurrentUser("shopId") shopId: string,
  ) {
    // Verify the subscription belongs to the user's shop
    const result = await this.subscriptionService.cancelSubscription(
      subscriptionId,
      { reason: dto.reason, immediate: dto.immediate, shopId },
    );

    await this.auditService.log({
      userId,
      actorType: "SHOPKEEPER",
      action: "CANCEL_SUBSCRIPTION",
      resourceType: "SellerSubscription",
      resourceId: subscriptionId,
      newValue: {
        reason: dto.reason,
        immediate: dto.immediate,
        newStatus: result.status,
      },
    });

    return result;
  }

  @Get("my-subscription")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SHOPKEEPER)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get current shop subscription" })
  async getMySubscription(@CurrentUser("shopId") shopId: string) {
    return this.subscriptionService.getShopSubscription(shopId);
  }

  @Get("my-history")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SHOPKEEPER)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get subscription history" })
  async getMyHistory(@CurrentUser("shopId") shopId: string) {
    return this.subscriptionService.getShopSubscriptionHistory(shopId);
  }

  @Get("my-usage")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SHOPKEEPER)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get plan usage vs limits" })
  async getMyUsage(@CurrentUser("shopId") shopId: string) {
    return this.planLimitsService.getUsageSummary(shopId);
  }

  @Get("my-features")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SHOPKEEPER)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Get all plan features with enabled/disabled status",
  })
  async getMyFeatures(@CurrentUser("shopId") shopId: string) {
    return this.planLimitsService.getActiveFeatures(shopId);
  }

  @Get("my-migration")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SHOPKEEPER)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get pending migration status (if any)" })
  async getMyMigration(@CurrentUser("shopId") shopId: string) {
    return this.subscriptionService.getMigrationStatus(shopId);
  }

  @Get("billing-portal")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SHOPKEEPER)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get Stripe Customer Portal URL" })
  async getBillingPortal(@CurrentUser("shopId") shopId: string) {
    return this.subscriptionService.createBillingPortalSession(shopId);
  }

  @Post(":id/migration-response")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SHOPKEEPER)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Accept or decline plan migration" })
  async respondToMigration(
    @Param("id") subscriptionId: string,
    @Body() dto: MigrationResponseDto,
    @CurrentUser("id") userId: string,
    @CurrentUser("shopId") shopId: string,
  ) {
    const result = await this.subscriptionService.respondToMigration(
      subscriptionId,
      shopId,
      dto.accept,
    );

    await this.auditService.log({
      userId,
      actorType: "SHOPKEEPER",
      action: dto.accept ? "ACCEPT_PLAN_MIGRATION" : "DECLINE_PLAN_MIGRATION",
      resourceType: "SellerSubscription",
      resourceId: subscriptionId,
      newValue: {
        migrationStatus: result.migrationStatus,
        accept: dto.accept,
      },
    });

    return result;
  }

  // ─── Admin endpoints ──────────────────────────────

  @Get("admin/all")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "List all subscriptions (admin)" })
  async listAll(
    @Query("status") status?: string,
    @Query("country") country?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    return this.subscriptionService.listAllSubscriptions({
      status,
      country,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Post("admin/override")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Force-assign plan to shop (admin)" })
  async adminOverride(
    @Body() dto: AdminOverrideDto,
    @CurrentUser("id") adminId: string,
  ) {
    const result = await this.subscriptionService.adminOverridePlan({
      shopId: dto.shopId,
      planId: dto.planId,
      periodEnd: dto.periodEnd,
      reason: dto.reason,
      adminId,
    });

    await this.auditService.log({
      userId: adminId,
      actorType: "ADMIN",
      action: "ADMIN_OVERRIDE_SUBSCRIPTION",
      resourceType: "SellerSubscription",
      resourceId: result.id,
      newValue: {
        shopId: dto.shopId,
        planId: dto.planId,
        planName: result.plan.name,
        reason: dto.reason,
      },
    });

    return result;
  }

  @Post("admin/:id/activate")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Manually activate a subscription (admin)" })
  async adminActivate(
    @Param("id") subscriptionId: string,
    @CurrentUser("id") adminId: string,
  ) {
    const result =
      await this.subscriptionService.activateSubscription(subscriptionId);

    await this.auditService.log({
      userId: adminId,
      actorType: "ADMIN",
      action: "ADMIN_ACTIVATE_SUBSCRIPTION",
      resourceType: "SellerSubscription",
      resourceId: subscriptionId,
      newValue: { status: result.status },
    });

    return result;
  }

  @Get("admin/stats")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get subscription statistics (admin)" })
  async getStats() {
    return this.subscriptionService.getSubscriptionStats();
  }

  @Post("admin/sync-stripe")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Sync all paid plans to Stripe Products & Prices (admin)",
  })
  async syncStripe(@CurrentUser("id") adminId: string) {
    const result = await this.subscriptionService.syncAllPlansToStripe();

    await this.auditService.log({
      userId: adminId,
      actorType: "ADMIN",
      action: "SYNC_PLANS_TO_STRIPE",
      resourceType: "SubscriptionPlan",
      resourceId: "all",
      newValue: result,
    });

    return result;
  }

  // ─── Stripe Webhook ───────────────────────────────

  @Post("webhooks/stripe")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Stripe webhook handler for subscriptions" })
  async stripeWebhook(@Req() req: RawBodyRequest<Request>) {
    const sig = req.headers["stripe-signature"] as string | undefined;
    // Use dedicated subscription webhook secret, fallback to shared secret
    const endpointSecret =
      this.configService.get<string>("STRIPE_SUBSCRIPTION_WEBHOOK_SECRET") ||
      this.configService.get<string>("STRIPE_WEBHOOK_SECRET");

    // 1. Missing signature header from caller → bad request (Stripe will retry).
    if (!sig) {
      this.logger.warn("Stripe webhook called without stripe-signature header");
      throw new BadRequestException("Missing stripe-signature header");
    }

    // 2. Server misconfiguration → return 500 so Stripe retries while we fix it.
    if (!endpointSecret) {
      this.logger.error(
        "STRIPE_WEBHOOK_SECRET / STRIPE_SUBSCRIPTION_WEBHOOK_SECRET is not configured",
      );
      throw new InternalServerErrorException(
        "Webhook endpoint secret not configured",
      );
    }

    if (!this.subscriptionService.isStripeConfigured()) {
      this.logger.error("Stripe is not configured but webhook was received");
      throw new InternalServerErrorException("Stripe is not configured");
    }

    if (!req.rawBody) {
      // Should never happen if main.ts enables rawBody:true
      this.logger.error(
        "Raw body is missing — ensure NestFactory.create({ rawBody: true })",
      );
      throw new InternalServerErrorException("Raw body unavailable");
    }

    // 3. Verify signature. Invalid signatures → 400 (do NOT 200, otherwise
    // Stripe stops retrying and an attacker would learn we silently accept).
    let event;
    try {
      event = this.subscriptionService.constructWebhookEvent(
        req.rawBody,
        sig,
        endpointSecret,
      );
    } catch (err: any) {
      this.logger.warn(
        `Stripe webhook signature verification failed: ${err?.message}`,
      );
      throw new BadRequestException(
        `Webhook signature verification failed: ${err?.message}`,
      );
    }

    // 4. Process. If handler throws, propagate as 500 so Stripe retries
    // (idempotency must be enforced inside handleStripeWebhook).
    try {
      await this.subscriptionService.handleStripeWebhook(event);
    } catch (err: any) {
      this.logger.error(
        `Stripe webhook handler failed for event ${event?.id} (${event?.type}): ${err?.message}`,
        err?.stack,
      );
      throw new InternalServerErrorException(
        "Webhook handler failed — Stripe will retry",
      );
    }

    return { received: true, processed: true, eventId: event.id };
  }
}
