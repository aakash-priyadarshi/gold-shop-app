import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../../prisma/prisma.service";

/**
 * Unified interface for any payment gateway adapter.
 */
export interface PaymentGatewayAdapter {
  name: string;
  createPaymentIntent(opts: {
    amount: number;
    currency: string;
    metadata: Record<string, string>;
    customerId?: string;
  }): Promise<{ id: string; clientSecret?: string; redirectUrl?: string }>;
  verifyWebhook(payload: Buffer, signature: string): Promise<any>;
  refund(gatewayPaymentId: string, amount?: number): Promise<{ id: string }>;
}

@Injectable()
export class PaymentGatewayService {
  private readonly logger = new Logger(PaymentGatewayService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  // ─── Gateway Routing ──────────────────────────────

  /**
   * Select the best gateway for a given country.
   * Reads from PaymentGatewayConfig table, picks highest priority enabled gateway.
   */
  async selectGateway(country: string): Promise<string> {
    const configs = await this.prisma.paymentGatewayConfig.findMany({
      where: {
        isEnabled: true,
        supportedCountries: { has: country as any },
      },
      orderBy: { priority: "desc" },
    });

    if (!configs.length) {
      this.logger.warn(
        `No enabled payment gateway for country: ${country}. Falling back to manual/COD.`,
      );
      return "manual";
    }

    return configs[0].gatewayName;
  }

  /**
   * Create a payment intent via the selected gateway.
   */
  async createPaymentIntent(opts: {
    gateway: string;
    amount: number;
    currency: string;
    metadata: Record<string, string>;
    customerId?: string;
  }) {
    switch (opts.gateway) {
      case "stripe":
        return this.createStripeIntent(opts);
      case "razorpay":
        return this.createRazorpayOrder(opts);
      default:
        // For manual/COD/esewa/khalti — return a pending reference
        return {
          id: `manual_${Date.now()}`,
          gateway: opts.gateway,
          status: "pending_manual",
        };
    }
  }

  // ─── Stripe Adapter ───────────────────────────────

  private async createStripeIntent(opts: {
    amount: number;
    currency: string;
    metadata: Record<string, string>;
    customerId?: string;
  }) {
    const stripeKey = this.configService.get<string>("STRIPE_SECRET_KEY");
    if (!stripeKey || stripeKey === "sk_test_placeholder") {
      this.logger.warn("Stripe not configured — returning mock intent");
      return {
        id: `pi_mock_${Date.now()}`,
        clientSecret: `pi_mock_${Date.now()}_secret_mock`,
        gateway: "stripe",
        status: "requires_payment_method",
      };
    }

    const stripe = require("stripe")(stripeKey);
    const intent = await stripe.paymentIntents.create({
      amount: Math.round(opts.amount * 100),
      currency: opts.currency.toLowerCase(),
      customer: opts.customerId,
      metadata: opts.metadata,
      automatic_payment_methods: { enabled: true },
    });

    return {
      id: intent.id,
      clientSecret: intent.client_secret,
      gateway: "stripe",
      status: intent.status,
    };
  }

  // ─── Razorpay Adapter ─────────────────────────────

  private async createRazorpayOrder(opts: {
    amount: number;
    currency: string;
    metadata: Record<string, string>;
  }) {
    const keyId = this.configService.get<string>("RAZORPAY_KEY_ID");
    const keySecret = this.configService.get<string>("RAZORPAY_KEY_SECRET");

    if (!keyId || !keySecret) {
      this.logger.warn("Razorpay not configured — returning mock order");
      return {
        id: `rzp_mock_${Date.now()}`,
        gateway: "razorpay",
        status: "created",
      };
    }

    const Razorpay = require("razorpay");
    const rzp = new Razorpay({ key_id: keyId, key_secret: keySecret });

    const order = await rzp.orders.create({
      amount: Math.round(opts.amount * 100), // paise
      currency: opts.currency,
      notes: opts.metadata,
    });

    return {
      id: order.id,
      gateway: "razorpay",
      status: order.status,
    };
  }

  // ─── Refund ───────────────────────────────────────

  async refund(gateway: string, gatewayPaymentId: string, amount?: number) {
    switch (gateway) {
      case "stripe":
        return this.stripeRefund(gatewayPaymentId, amount);
      case "razorpay":
        return this.razorpayRefund(gatewayPaymentId, amount);
      default:
        return { id: `refund_manual_${Date.now()}`, gateway, status: "manual" };
    }
  }

  private async stripeRefund(paymentIntentId: string, amount?: number) {
    const stripeKey = this.configService.get<string>("STRIPE_SECRET_KEY");
    if (!stripeKey || stripeKey === "sk_test_placeholder") {
      return {
        id: `re_mock_${Date.now()}`,
        gateway: "stripe",
        status: "succeeded",
      };
    }

    const stripe = require("stripe")(stripeKey);
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      ...(amount ? { amount: Math.round(amount * 100) } : {}),
    });

    return { id: refund.id, gateway: "stripe", status: refund.status };
  }

  private async razorpayRefund(paymentId: string, amount?: number) {
    const keyId = this.configService.get<string>("RAZORPAY_KEY_ID");
    const keySecret = this.configService.get<string>("RAZORPAY_KEY_SECRET");

    if (!keyId || !keySecret) {
      return {
        id: `rrf_mock_${Date.now()}`,
        gateway: "razorpay",
        status: "processed",
      };
    }

    const Razorpay = require("razorpay");
    const rzp = new Razorpay({ key_id: keyId, key_secret: keySecret });

    const refund = await rzp.payments.refund(paymentId, {
      ...(amount ? { amount: Math.round(amount * 100) } : {}),
    });

    return { id: refund.id, gateway: "razorpay", status: refund.status };
  }

  // ─── Admin: Gateway Config CRUD ───────────────────

  async getGatewayConfigs() {
    return this.prisma.paymentGatewayConfig.findMany({
      orderBy: { priority: "desc" },
    });
  }

  async getGatewayConfig(id: string) {
    const config = await this.prisma.paymentGatewayConfig.findUnique({
      where: { id },
    });
    if (!config) throw new NotFoundException("Gateway config not found");
    return config;
  }

  async upsertGatewayConfig(data: {
    gatewayName: string;
    displayName: string;
    isEnabled: boolean;
    supportedCountries: string[];
    supportedMethods: string[];
    priority: number;
    envKeyLabel: string;
    webhookEndpoint?: string;
    updatedBy: string;
  }) {
    const existing = await this.prisma.paymentGatewayConfig.findFirst({
      where: { gatewayName: data.gatewayName },
    });

    if (existing) {
      const previous = { ...existing };
      const updated = await this.prisma.paymentGatewayConfig.update({
        where: { id: existing.id },
        data: {
          displayName: data.displayName,
          isEnabled: data.isEnabled,
          supportedCountries: data.supportedCountries as any,
          supportedMethods: data.supportedMethods as any,
          priority: data.priority,
          envKeyLabel: data.envKeyLabel,
          webhookEndpoint: data.webhookEndpoint,
          updatedBy: data.updatedBy,
        },
      });
      return { config: updated, previousValues: previous, isNew: false };
    }

    const config = await this.prisma.paymentGatewayConfig.create({
      data: {
        gatewayName: data.gatewayName,
        displayName: data.displayName,
        isEnabled: data.isEnabled,
        supportedCountries: data.supportedCountries as any,
        supportedMethods: data.supportedMethods as any,
        priority: data.priority,
        envKeyLabel: data.envKeyLabel,
        webhookEndpoint: data.webhookEndpoint,
        updatedBy: data.updatedBy,
      },
    });

    return { config, previousValues: null, isNew: true };
  }

  async toggleGateway(id: string, isEnabled: boolean, updatedBy: string) {
    const existing = await this.prisma.paymentGatewayConfig.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException("Gateway config not found");

    return this.prisma.paymentGatewayConfig.update({
      where: { id },
      data: { isEnabled, updatedBy },
    });
  }
}
