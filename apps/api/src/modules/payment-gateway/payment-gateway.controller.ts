import {
  Body,
  Controller,
  Get,
  Headers,
  Inject,
  Logger,
  Param,
  Patch,
  Post,
  RawBodyRequest,
  Req,
  UseGuards,
  forwardRef,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { Request } from "express";
import { AiCreditsService } from "../ai-credits/ai-credits.service";
import { AuditService } from "../audit/audit.service";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { OrdersService } from "../orders/orders.service";
import { PaymentGatewayService } from "./payment-gateway.service";

@ApiTags("payment-gateway")
@Controller("payment-gateway")
export class PaymentGatewayController {
  private readonly logger = new Logger(PaymentGatewayController.name);

  constructor(
    private readonly gatewayService: PaymentGatewayService,
    private readonly auditService: AuditService,
    @Inject(forwardRef(() => OrdersService))
    private readonly ordersService: OrdersService,
    @Inject(forwardRef(() => AiCreditsService))
    private readonly aiCreditsService: AiCreditsService,
  ) {}

  // ─── Admin: Gateway Configuration ─────────────────

  @Get("configs")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "List all gateway configs (admin)" })
  async listConfigs() {
    return this.gatewayService.getGatewayConfigs();
  }

  @Get("configs/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get gateway config by ID (admin)" })
  async getConfig(@Param("id") id: string) {
    return this.gatewayService.getGatewayConfig(id);
  }

  @Post("configs")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Create/update gateway config (admin)" })
  async upsertConfig(
    @Body()
    body: {
      gatewayName: string;
      displayName: string;
      isEnabled: boolean;
      isDefault?: boolean;
      supportedCountries: string[];
      supportedMethods: string[];
      priority: number;
      envKeyLabel: string;
      envKeysRequired?: string[];
      commissionInfo?: string;
      webhookEndpoint?: string;
    },
    @CurrentUser("id") adminId: string,
  ) {
    const result = await this.gatewayService.upsertGatewayConfig({
      ...body,
      updatedBy: adminId,
    });

    await this.auditService.log({
      userId: adminId,
      actorType: "ADMIN",
      action: result.isNew
        ? "CREATE_PAYMENT_GATEWAY_CONFIG"
        : "UPDATE_PAYMENT_GATEWAY_CONFIG",
      resourceType: "PaymentGatewayConfig",
      resourceId: result.config.id,
      previousValue: result.previousValues,
      newValue: result.config,
    });

    return result.config;
  }

  @Patch("configs/:id/toggle")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Enable/disable a gateway (admin)" })
  async toggleConfig(
    @Param("id") id: string,
    @Body("isEnabled") isEnabled: boolean,
    @CurrentUser("id") adminId: string,
  ) {
    const config = await this.gatewayService.toggleGateway(
      id,
      isEnabled,
      adminId,
    );

    await this.auditService.log({
      userId: adminId,
      actorType: "ADMIN",
      action: isEnabled ? "ENABLE_PAYMENT_GATEWAY" : "DISABLE_PAYMENT_GATEWAY",
      resourceType: "PaymentGatewayConfig",
      resourceId: id,
      newValue: { isEnabled, gatewayName: config.gatewayName },
    });

    return config;
  }

  @Patch("configs/:id/set-default")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Set a gateway as the default fallback (admin)" })
  async setDefault(
    @Param("id") id: string,
    @CurrentUser("id") adminId: string,
  ) {
    const config = await this.gatewayService.setDefaultGateway(id, adminId);

    await this.auditService.log({
      userId: adminId,
      actorType: "ADMIN",
      action: "SET_DEFAULT_PAYMENT_GATEWAY",
      resourceType: "PaymentGatewayConfig",
      resourceId: id,
      newValue: { gatewayName: config.gatewayName, isDefault: true },
    });

    return config;
  }

  // ─── Health Check ─────────────────────────────────

  @Get("health")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Check health of all enabled gateways (admin)" })
  async checkAllHealth() {
    return this.gatewayService.checkAllGatewaysHealth();
  }

  @Get("health/:gatewayName")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Check health of a specific gateway (admin)" })
  async checkHealth(@Param("gatewayName") gatewayName: string) {
    return this.gatewayService.checkGatewayHealth(gatewayName);
  }

  // ─── Webhook Status ───────────────────────────────

  @Get("webhooks/status")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get webhook endpoint configuration status (admin)" })
  async getWebhookStatus() {
    return this.gatewayService.getWebhookStatus();
  }

  // ─── Stripe Sandbox Testing ───────────────────────

  @Post("test/stripe-payment")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Test Stripe one-time payment in sandbox mode (admin)" })
  async testStripePayment(
    @Body() body: { amount?: number; currency?: string },
  ) {
    return this.gatewayService.testStripePayment(
      body.amount || 1.00,
      body.currency || "USD",
    );
  }

  @Post("test/stripe-subscription")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Test Stripe subscription in sandbox mode (admin)" })
  async testStripeSubscription(
    @Body() body: { amount?: number; currency?: string; interval?: "month" | "year" },
  ) {
    return this.gatewayService.testStripeSubscription(
      body.amount || 9.99,
      body.currency || "USD",
      body.interval || "month",
    );
  }

  @Get("test/stripe-mode")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Check if Stripe is in sandbox/test mode (admin)" })
  async getStripeMode() {
    const isSandbox = this.gatewayService.isStripeSandbox();
    return {
      isSandbox,
      testKeyConfigured: isSandbox,
      message: isSandbox
        ? "STRIPE_TEST_SECRET_KEY is configured — safe to run sandbox tests"
        : "STRIPE_TEST_SECRET_KEY is not configured — add a sk_test_ key to enable sandbox tests",
    };
  }

  // ─── Unified Payment Initiation ───────────────────

  @Get("available")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "List available (configured) gateways for a country",
  })
  async getAvailableGateways(
    @Req() req: Request & { query: { country?: string } },
  ) {
    return this.gatewayService.getAvailableGateways(req.query.country);
  }

  @Post("initiate")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Initiate a payment (auto-routes to gateway)" })
  async initiatePayment(
    @Body()
    body: {
      type: "subscription" | "order" | "rfq_booking" | "ai_credits";
      resourceId: string;
      amount: number;
      currency: string;
      country: string;
      metadata?: Record<string, string>;
      preferredGateway?: string;
    },
    @CurrentUser("id") userId: string,
  ) {
    return this.gatewayService.initiatePayment({
      ...body,
      customerId: userId,
    });
  }

  // ─── Webhooks (no auth — verified by signature) ───

  @Post("webhooks/stripe")
  @ApiOperation({ summary: "Stripe webhook handler" })
  async stripeWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers("stripe-signature") signature: string,
  ) {
    const rawBody = req.rawBody;
    if (!rawBody) {
      return { received: false, error: "Missing raw body" };
    }

    const event = await this.gatewayService.verifyStripeWebhook(
      rawBody,
      signature,
    );

    // Process event based on type
    switch (event.type) {
      case "payment_intent.succeeded":
        await this.handlePaymentSuccess(
          "stripe",
          event.data.object.id,
          event.data.object.metadata,
        );
        break;
      case "payment_intent.payment_failed":
        await this.handlePaymentFailure(
          "stripe",
          event.data.object.id,
          event.data.object.last_payment_error?.message,
          event.data.object.metadata,
        );
        break;
      default:
        break;
    }

    return { received: true };
  }

  @Post("webhooks/phonepe")
  @ApiOperation({ summary: "PhonePe webhook handler" })
  async phonePeWebhook(@Body() body: any) {
    const result = await this.gatewayService.verifyPhonePeWebhook(body);

    if (result.status === "succeeded") {
      await this.handlePaymentSuccess(
        "phonepe",
        result.transactionId,
        result.metadata || {},
      );
    } else {
      await this.handlePaymentFailure(
        "phonepe",
        result.transactionId,
        result.status,
        result.metadata || {},
      );
    }

    return { received: true };
  }

  // ─── Internal Handlers ────────────────────────────

  private async handlePaymentSuccess(
    gateway: string,
    paymentId: string,
    metadata: Record<string, string>,
  ) {
    this.logger.log(
      `[${gateway}] Payment succeeded: ${paymentId}, type=${metadata.type}, resourceId=${metadata.resourceId}`,
    );

    try {
      switch (metadata.type) {
        case "order":
        case "rfq_booking":
          await this.ordersService.handleOrderPaymentSuccess(
            paymentId,
            gateway,
            metadata,
          );
          break;

        case "ai_credits":
          await this.aiCreditsService.handleCreditPurchaseSuccess({
            userId: metadata.userId,
            shopId: metadata.shopId,
            creditAmount: parseInt(metadata.creditAmount || "0", 10),
            gatewayPaymentId: paymentId,
            gateway,
            paidAmount: parseFloat(metadata.paidAmount || "0"),
            currency: metadata.currency || "USD",
          });
          break;

        default:
          this.logger.warn(
            `Unhandled payment type: ${metadata.type} for ${paymentId}`,
          );
      }
    } catch (err: any) {
      this.logger.error(
        `Failed to process payment success for ${paymentId}: ${err.message}`,
      );
    }
  }

  private async handlePaymentFailure(
    gateway: string,
    paymentId: string,
    reason?: string,
    metadata?: Record<string, string>,
  ) {
    this.logger.warn(
      `[${gateway}] Payment failed: ${paymentId}, reason: ${reason}`,
    );

    try {
      const meta = metadata || {};
      switch (meta.type) {
        case "order":
        case "rfq_booking":
          await this.ordersService.handleOrderPaymentFailure(
            paymentId,
            gateway,
            reason,
            meta,
          );
          break;

        case "ai_credits":
          await this.aiCreditsService.handleCreditPurchaseFailure({
            userId: meta.userId,
            gatewayPaymentId: paymentId,
            reason,
          });
          break;

        default:
          this.logger.warn(
            `Unhandled failed payment type: ${meta.type} for ${paymentId}`,
          );
      }
    } catch (err: any) {
      this.logger.error(
        `Failed to process payment failure for ${paymentId}: ${err.message}`,
      );
    }
  }
}
