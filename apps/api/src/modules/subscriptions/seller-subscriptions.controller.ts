import {
  Body,
  Controller,
  Get,
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
import { AdminOverrideDto, CancelSubscriptionDto, SubscribeDto } from "./dto";
import { PlanLimitsService } from "./plan-limits.service";
import { SellerSubscriptionsService } from "./seller-subscriptions.service";

@ApiTags("seller-subscriptions")
@Controller("seller-subscriptions")
export class SellerSubscriptionsController {
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
      throw new Error("You can only subscribe your own shop");
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
      resourceId: result.subscription.id,
      newValue: {
        planId: dto.planId,
        planName: result.subscription.plan.name,
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

  // ─── Stripe Webhook ───────────────────────────────

  @Post("webhooks/stripe")
  @ApiOperation({ summary: "Stripe webhook handler for subscriptions" })
  async stripeWebhook(@Req() req: RawBodyRequest<Request>) {
    const sig = req.headers["stripe-signature"];
    const endpointSecret = this.configService.get<string>(
      "STRIPE_WEBHOOK_SECRET",
    );

    if (!sig || !endpointSecret) {
      return { received: true, processed: false };
    }

    try {
      const stripeKey = this.configService.get<string>("STRIPE_SECRET_KEY");
      const stripe = require("stripe")(stripeKey);
      const event = stripe.webhooks.constructEvent(
        req.rawBody,
        sig,
        endpointSecret,
      );

      await this.subscriptionService.handleStripeWebhook(event);
      return { received: true, processed: true };
    } catch (err) {
      return { received: true, processed: false, error: err.message };
    }
  }
}
