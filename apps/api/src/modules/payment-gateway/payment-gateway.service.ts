import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../../prisma/prisma.service";
import * as crypto from "crypto";

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

export interface GatewayHealthResult {
  gateway: string;
  status: "online" | "offline" | "not_configured" | "error";
  latencyMs?: number;
  message?: string;
}

export interface InitiatePaymentOpts {
  type: "subscription" | "order" | "rfq_booking" | "ai_credits";
  resourceId: string;
  amount: number;
  currency: string;
  country: string;
  metadata?: Record<string, string>;
  customerId?: string;
  preferredGateway?: string;
}

export interface PaymentResult {
  paymentId: string;
  gateway: string;
  clientSecret?: string;
  redirectUrl?: string;
  status: string;
  requiresAction: boolean;
}

@Injectable()
export class PaymentGatewayService {
  private readonly logger = new Logger(PaymentGatewayService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  // ═══════════════════════════════════════════════════
  // GATEWAY ROUTING
  // ═══════════════════════════════════════════════════

  /**
   * Select the best gateway for a given country.
   * Falls back to default gateway, then to "manual".
   */
  async selectGateway(country: string): Promise<string> {
    const configs = await this.prisma.paymentGatewayConfig.findMany({
      where: {
        isEnabled: true,
        supportedCountries: { has: country as any },
      },
      orderBy: { priority: "desc" },
    });

    if (configs.length) {
      return configs[0].gatewayName;
    }

    // Fallback: default gateway
    const defaultGw = await this.prisma.paymentGatewayConfig.findFirst({
      where: { isEnabled: true, isDefault: true },
      orderBy: { priority: "desc" },
    });

    if (defaultGw) {
      this.logger.warn(
        `No gateway for ${country}, using default: ${defaultGw.gatewayName}`,
      );
      return defaultGw.gatewayName;
    }

    this.logger.warn(
      `No enabled payment gateway for country: ${country}. Falling back to manual/COD.`,
    );
    return "manual";
  }

  // ═══════════════════════════════════════════════════
  // UNIFIED PAYMENT INITIATION
  // ═══════════════════════════════════════════════════

  async initiatePayment(opts: InitiatePaymentOpts): Promise<PaymentResult> {
    const gateway =
      opts.preferredGateway || (await this.selectGateway(opts.country));

    const metadata: Record<string, string> = {
      type: opts.type,
      resourceId: opts.resourceId,
      country: opts.country,
      ...(opts.metadata || {}),
    };

    const result = await this.createPaymentIntent({
      gateway,
      amount: opts.amount,
      currency: opts.currency,
      metadata,
      customerId: opts.customerId,
    });

    return {
      paymentId: result.id,
      gateway: result.gateway,
      clientSecret: result.clientSecret,
      redirectUrl: result.redirectUrl,
      status: result.status,
      requiresAction:
        result.status === "requires_payment_method" || !!result.redirectUrl,
    };
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
  }): Promise<{
    id: string;
    gateway: string;
    status: string;
    clientSecret?: string;
    redirectUrl?: string;
  }> {
    switch (opts.gateway) {
      case "stripe":
        return this.createStripeIntent(opts);
      case "phonepe":
        return this.createPhonePeIntent(opts);
      case "razorpay":
        return this.createRazorpayOrder(opts);
      case "esewa":
        return this.createEsewaIntent(opts);
      case "khalti":
        return this.createKhaltiIntent(opts);
      default:
        return {
          id: `manual_${Date.now()}`,
          gateway: opts.gateway,
          status: "pending_manual",
        };
    }
  }

  // ═══════════════════════════════════════════════════
  // STRIPE ADAPTER
  // ═══════════════════════════════════════════════════

  private async createStripeIntent(opts: {
    amount: number;
    currency: string;
    metadata: Record<string, string>;
    customerId?: string;
  }) {
    const stripeKey = this.configService.get<string>("STRIPE_SECRET_KEY");
    if (!stripeKey || stripeKey === "" || stripeKey === "sk_test_placeholder") {
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

  async verifyStripeWebhook(payload: Buffer, signature: string) {
    const stripeKey = this.configService.get<string>("STRIPE_SECRET_KEY");
    const webhookSecret = this.configService.get<string>(
      "STRIPE_WEBHOOK_SECRET",
    );

    if (!stripeKey || !webhookSecret) {
      throw new BadRequestException("Stripe webhook not configured");
    }

    const stripe = require("stripe")(stripeKey);
    try {
      return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (err: any) {
      this.logger.error(`Stripe webhook verification failed: ${err.message}`);
      throw new BadRequestException("Invalid Stripe webhook signature");
    }
  }

  // ═══════════════════════════════════════════════════
  // PHONEPE ADAPTER (India)
  // ═══════════════════════════════════════════════════

  private async createPhonePeIntent(opts: {
    amount: number;
    currency: string;
    metadata: Record<string, string>;
  }) {
    const merchantId = this.configService.get<string>("PHONEPE_MERCHANT_ID");
    const saltKey = this.configService.get<string>("PHONEPE_SALT_KEY");
    const saltIndex =
      this.configService.get<string>("PHONEPE_SALT_INDEX") || "1";
    const env = this.configService.get<string>("PHONEPE_ENV") || "UAT";

    if (!merchantId || !saltKey || merchantId === "" || saltKey === "") {
      this.logger.warn("PhonePe not configured — returning mock intent");
      return {
        id: `phonepe_mock_${Date.now()}`,
        redirectUrl: `https://phonepe.com/mock?txn=mock_${Date.now()}`,
        gateway: "phonepe",
        status: "redirect_pending",
      };
    }

    const transactionId = `ORIV_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const amountPaise = Math.round(opts.amount * 100);

    const payload = {
      merchantId,
      merchantTransactionId: transactionId,
      merchantUserId: opts.metadata?.customerId || "guest",
      amount: amountPaise,
      redirectUrl: `${this.configService.get("FRONTEND_URL") || "https://orivraa.com"}/payment/callback?gateway=phonepe&txn=${transactionId}`,
      redirectMode: "REDIRECT",
      callbackUrl: `${this.configService.get("API_URL") || "https://api.orivraa.com"}/webhooks/phonepe`,
      paymentInstrument: { type: "PAY_PAGE" },
    };

    const base64Payload = Buffer.from(JSON.stringify(payload)).toString(
      "base64",
    );
    const apiEndpoint = "/pg/v1/pay";
    const checksum =
      crypto
        .createHash("sha256")
        .update(base64Payload + apiEndpoint + saltKey)
        .digest("hex") + `###${saltIndex}`;

    const baseUrl =
      env === "PRODUCTION"
        ? "https://api.phonepe.com/apis/hermes"
        : "https://api-preprod.phonepe.com/apis/pg-sandbox";

    try {
      const response = await fetch(`${baseUrl}${apiEndpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-VERIFY": checksum,
        },
        body: JSON.stringify({ request: base64Payload }),
      });

      const data = await response.json();

      if (data.success && data.data?.instrumentResponse?.redirectInfo?.url) {
        return {
          id: transactionId,
          redirectUrl: data.data.instrumentResponse.redirectInfo.url,
          gateway: "phonepe",
          status: "redirect_pending",
        };
      }

      this.logger.error(
        `PhonePe payment initiation failed: ${JSON.stringify(data)}`,
      );
      throw new BadRequestException(
        data.message || "PhonePe payment initiation failed",
      );
    } catch (err: any) {
      if (err instanceof BadRequestException) throw err;
      this.logger.error(`PhonePe API error: ${err.message}`);
      throw new BadRequestException("PhonePe payment service unavailable");
    }
  }

  async verifyPhonePeWebhook(payload: any): Promise<{
    transactionId: string;
    status: string;
    amount: number;
  }> {
    const saltKey = this.configService.get<string>("PHONEPE_SALT_KEY");

    if (!saltKey) {
      throw new BadRequestException("PhonePe webhook not configured");
    }

    const decodedData = JSON.parse(
      Buffer.from(payload.response, "base64").toString("utf-8"),
    );

    return {
      transactionId: decodedData.data?.merchantTransactionId,
      status:
        decodedData.code === "PAYMENT_SUCCESS" ? "succeeded" : decodedData.code,
      amount: (decodedData.data?.amount || 0) / 100,
    };
  }

  // ═══════════════════════════════════════════════════
  // RAZORPAY ADAPTER (India fallback)
  // ═══════════════════════════════════════════════════

  private async createRazorpayOrder(opts: {
    amount: number;
    currency: string;
    metadata: Record<string, string>;
  }) {
    const keyId = this.configService.get<string>("RAZORPAY_KEY_ID");
    const keySecret = this.configService.get<string>("RAZORPAY_KEY_SECRET");

    if (!keyId || !keySecret || keyId === "" || keySecret === "") {
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
      amount: Math.round(opts.amount * 100),
      currency: opts.currency,
      notes: opts.metadata,
    });

    return {
      id: order.id,
      gateway: "razorpay",
      status: order.status,
    };
  }

  // ═══════════════════════════════════════════════════
  // ESEWA ADAPTER (Nepal)
  // ═══════════════════════════════════════════════════

  private async createEsewaIntent(opts: {
    amount: number;
    currency: string;
    metadata: Record<string, string>;
  }) {
    const merchantId = this.configService.get<string>("ESEWA_MERCHANT_ID");
    const secret = this.configService.get<string>("ESEWA_SECRET");

    if (!merchantId || !secret || merchantId === "" || secret === "") {
      this.logger.warn("eSewa not configured — returning mock intent");
      return {
        id: `esewa_mock_${Date.now()}`,
        redirectUrl: `https://esewa.com.np/mock?txn=mock_${Date.now()}`,
        gateway: "esewa",
        status: "redirect_pending",
      };
    }

    const transactionId = `ORIV_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const esewaParams = {
      amt: opts.amount,
      psc: 0,
      pdc: 0,
      txAmt: 0,
      tAmt: opts.amount,
      pid: transactionId,
      scd: merchantId,
      su: `${this.configService.get("FRONTEND_URL") || "https://orivraa.com"}/payment/callback?gateway=esewa&txn=${transactionId}`,
      fu: `${this.configService.get("FRONTEND_URL") || "https://orivraa.com"}/payment/callback?gateway=esewa&status=failed&txn=${transactionId}`,
    };

    const queryString = Object.entries(esewaParams)
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
      .join("&");

    return {
      id: transactionId,
      redirectUrl: `https://esewa.com.np/epay/main?${queryString}`,
      gateway: "esewa",
      status: "redirect_pending",
    };
  }

  // ═══════════════════════════════════════════════════
  // KHALTI ADAPTER (Nepal)
  // ═══════════════════════════════════════════════════

  private async createKhaltiIntent(opts: {
    amount: number;
    currency: string;
    metadata: Record<string, string>;
  }) {
    const secretKey = this.configService.get<string>("KHALTI_SECRET_KEY");

    if (!secretKey || secretKey === "") {
      this.logger.warn("Khalti not configured — returning mock intent");
      return {
        id: `khalti_mock_${Date.now()}`,
        redirectUrl: `https://khalti.com/mock?txn=mock_${Date.now()}`,
        gateway: "khalti",
        status: "redirect_pending",
      };
    }

    const transactionId = `ORIV_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    try {
      const response = await fetch(
        "https://a.khalti.com/api/v2/epayment/initiate/",
        {
          method: "POST",
          headers: {
            Authorization: `Key ${secretKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            return_url: `${this.configService.get("FRONTEND_URL") || "https://orivraa.com"}/payment/callback?gateway=khalti&txn=${transactionId}`,
            website_url:
              this.configService.get("FRONTEND_URL") || "https://orivraa.com",
            amount: Math.round(opts.amount * 100),
            purchase_order_id: transactionId,
            purchase_order_name: opts.metadata?.type || "Payment",
            customer_info: {
              name: opts.metadata?.customerName || "Customer",
            },
          }),
        },
      );

      const data = await response.json();

      if (data.payment_url) {
        return {
          id: data.pidx || transactionId,
          redirectUrl: data.payment_url,
          gateway: "khalti",
          status: "redirect_pending",
        };
      }

      this.logger.error(`Khalti initiation failed: ${JSON.stringify(data)}`);
      throw new BadRequestException("Khalti payment initiation failed");
    } catch (err: any) {
      if (err instanceof BadRequestException) throw err;
      this.logger.error(`Khalti API error: ${err.message}`);
      throw new BadRequestException("Khalti payment service unavailable");
    }
  }

  // ═══════════════════════════════════════════════════
  // REFUNDS
  // ═══════════════════════════════════════════════════

  async refund(gateway: string, gatewayPaymentId: string, amount?: number) {
    switch (gateway) {
      case "stripe":
        return this.stripeRefund(gatewayPaymentId, amount);
      case "razorpay":
        return this.razorpayRefund(gatewayPaymentId, amount);
      case "phonepe":
        return this.phonePeRefund(gatewayPaymentId, amount);
      default:
        return { id: `refund_manual_${Date.now()}`, gateway, status: "manual" };
    }
  }

  private async stripeRefund(paymentIntentId: string, amount?: number) {
    const stripeKey = this.configService.get<string>("STRIPE_SECRET_KEY");
    if (!stripeKey || stripeKey === "" || stripeKey === "sk_test_placeholder") {
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

    if (!keyId || !keySecret || keyId === "" || keySecret === "") {
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

  private async phonePeRefund(transactionId: string, amount?: number) {
    const merchantId = this.configService.get<string>("PHONEPE_MERCHANT_ID");
    const saltKey = this.configService.get<string>("PHONEPE_SALT_KEY");
    const saltIndex =
      this.configService.get<string>("PHONEPE_SALT_INDEX") || "1";
    const env = this.configService.get<string>("PHONEPE_ENV") || "UAT";

    if (!merchantId || !saltKey || merchantId === "" || saltKey === "") {
      return {
        id: `phonepe_refund_mock_${Date.now()}`,
        gateway: "phonepe",
        status: "processed",
      };
    }

    const refundId = `REF_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const payload = {
      merchantId,
      merchantUserId: "admin",
      originalTransactionId: transactionId,
      merchantTransactionId: refundId,
      amount: amount ? Math.round(amount * 100) : undefined,
    };

    const base64Payload = Buffer.from(JSON.stringify(payload)).toString(
      "base64",
    );
    const apiEndpoint = "/pg/v1/refund";
    const checksum =
      crypto
        .createHash("sha256")
        .update(base64Payload + apiEndpoint + saltKey)
        .digest("hex") + `###${saltIndex}`;

    const baseUrl =
      env === "PRODUCTION"
        ? "https://api.phonepe.com/apis/hermes"
        : "https://api-preprod.phonepe.com/apis/pg-sandbox";

    try {
      const response = await fetch(`${baseUrl}${apiEndpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-VERIFY": checksum,
        },
        body: JSON.stringify({ request: base64Payload }),
      });

      const data = await response.json();
      return {
        id: refundId,
        gateway: "phonepe",
        status: data.success ? "processed" : "failed",
      };
    } catch (err: any) {
      this.logger.error(`PhonePe refund error: ${err.message}`);
      return { id: refundId, gateway: "phonepe", status: "error" };
    }
  }

  // ═══════════════════════════════════════════════════
  // GATEWAY HEALTH CHECK
  // ═══════════════════════════════════════════════════

  async checkGatewayHealth(gatewayName: string): Promise<GatewayHealthResult> {
    const start = Date.now();

    try {
      switch (gatewayName) {
        case "stripe":
          return this.checkStripeHealth(start);
        case "phonepe":
          return this.checkPhonePeHealth(start);
        case "razorpay":
          return this.checkRazorpayHealth(start);
        case "esewa":
          return this.checkEsewaHealth(start);
        case "khalti":
          return this.checkKhaltiHealth(start);
        default:
          return {
            gateway: gatewayName,
            status: "not_configured",
            message: "Unknown gateway",
          };
      }
    } catch (err: any) {
      return {
        gateway: gatewayName,
        status: "error",
        latencyMs: Date.now() - start,
        message: err.message,
      };
    }
  }

  private async checkStripeHealth(
    start: number,
  ): Promise<GatewayHealthResult> {
    const stripeKey = this.configService.get<string>("STRIPE_SECRET_KEY");
    if (!stripeKey || stripeKey === "" || stripeKey === "sk_test_placeholder") {
      return {
        gateway: "stripe",
        status: "not_configured",
        message: "STRIPE_SECRET_KEY not set",
      };
    }

    try {
      const stripe = require("stripe")(stripeKey);
      await stripe.balance.retrieve();
      return {
        gateway: "stripe",
        status: "online",
        latencyMs: Date.now() - start,
      };
    } catch (err: any) {
      return {
        gateway: "stripe",
        status: "offline",
        latencyMs: Date.now() - start,
        message: err.message?.includes("Invalid API Key")
          ? "Invalid API key"
          : err.message,
      };
    }
  }

  private async checkPhonePeHealth(
    start: number,
  ): Promise<GatewayHealthResult> {
    const merchantId = this.configService.get<string>("PHONEPE_MERCHANT_ID");
    const saltKey = this.configService.get<string>("PHONEPE_SALT_KEY");

    if (!merchantId || !saltKey || merchantId === "" || saltKey === "") {
      return {
        gateway: "phonepe",
        status: "not_configured",
        message: "PHONEPE_MERCHANT_ID or PHONEPE_SALT_KEY not set",
      };
    }

    const env = this.configService.get<string>("PHONEPE_ENV") || "UAT";
    const baseUrl =
      env === "PRODUCTION"
        ? "https://api.phonepe.com/apis/hermes"
        : "https://api-preprod.phonepe.com/apis/pg-sandbox";

    try {
      const apiEndpoint = `/pg/v1/status/${merchantId}/HEALTH_CHECK_${Date.now()}`;
      const checksum =
        crypto
          .createHash("sha256")
          .update(apiEndpoint + saltKey)
          .digest("hex") +
        `###${this.configService.get("PHONEPE_SALT_INDEX") || "1"}`;

      const response = await fetch(`${baseUrl}${apiEndpoint}`, {
        method: "GET",
        headers: { "X-VERIFY": checksum, "X-MERCHANT-ID": merchantId },
      });

      const data = await response.json();
      if (
        response.ok ||
        data.code === "TRANSACTION_NOT_FOUND" ||
        data.code === "BAD_REQUEST"
      ) {
        return {
          gateway: "phonepe",
          status: "online",
          latencyMs: Date.now() - start,
        };
      }

      return {
        gateway: "phonepe",
        status: "offline",
        latencyMs: Date.now() - start,
        message: data.message || "PhonePe API unreachable",
      };
    } catch (err: any) {
      return {
        gateway: "phonepe",
        status: "offline",
        latencyMs: Date.now() - start,
        message: err.message,
      };
    }
  }

  private async checkRazorpayHealth(
    start: number,
  ): Promise<GatewayHealthResult> {
    const keyId = this.configService.get<string>("RAZORPAY_KEY_ID");
    const keySecret = this.configService.get<string>("RAZORPAY_KEY_SECRET");

    if (!keyId || !keySecret || keyId === "" || keySecret === "") {
      return {
        gateway: "razorpay",
        status: "not_configured",
        message: "RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET not set",
      };
    }

    try {
      const response = await fetch(
        "https://api.razorpay.com/v1/payments?count=1",
        {
          headers: {
            Authorization:
              "Basic " +
              Buffer.from(`${keyId}:${keySecret}`).toString("base64"),
          },
        },
      );

      if (response.ok || response.status === 200) {
        return {
          gateway: "razorpay",
          status: "online",
          latencyMs: Date.now() - start,
        };
      }

      return {
        gateway: "razorpay",
        status: response.status === 401 ? "offline" : "error",
        latencyMs: Date.now() - start,
        message:
          response.status === 401
            ? "Invalid API credentials"
            : `HTTP ${response.status}`,
      };
    } catch (err: any) {
      return {
        gateway: "razorpay",
        status: "offline",
        latencyMs: Date.now() - start,
        message: err.message,
      };
    }
  }

  private async checkEsewaHealth(
    start: number,
  ): Promise<GatewayHealthResult> {
    const merchantId = this.configService.get<string>("ESEWA_MERCHANT_ID");
    const secret = this.configService.get<string>("ESEWA_SECRET");

    if (!merchantId || !secret || merchantId === "" || secret === "") {
      return {
        gateway: "esewa",
        status: "not_configured",
        message: "ESEWA_MERCHANT_ID or ESEWA_SECRET not set",
      };
    }

    return {
      gateway: "esewa",
      status: "online",
      latencyMs: Date.now() - start,
      message: "Keys configured (eSewa has no health API)",
    };
  }

  private async checkKhaltiHealth(
    start: number,
  ): Promise<GatewayHealthResult> {
    const secretKey = this.configService.get<string>("KHALTI_SECRET_KEY");

    if (!secretKey || secretKey === "") {
      return {
        gateway: "khalti",
        status: "not_configured",
        message: "KHALTI_SECRET_KEY not set",
      };
    }

    try {
      const response = await fetch(
        "https://a.khalti.com/api/v2/epayment/lookup/",
        {
          method: "POST",
          headers: {
            Authorization: `Key ${secretKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ pidx: "health_check" }),
        },
      );

      if (response.status === 400 || response.ok) {
        return {
          gateway: "khalti",
          status: "online",
          latencyMs: Date.now() - start,
        };
      }

      if (response.status === 401) {
        return {
          gateway: "khalti",
          status: "offline",
          latencyMs: Date.now() - start,
          message: "Invalid API key",
        };
      }

      return {
        gateway: "khalti",
        status: "error",
        latencyMs: Date.now() - start,
        message: `HTTP ${response.status}`,
      };
    } catch (err: any) {
      return {
        gateway: "khalti",
        status: "offline",
        latencyMs: Date.now() - start,
        message: err.message,
      };
    }
  }

  // ═══════════════════════════════════════════════════
  // CHECK ALL GATEWAYS HEALTH
  // ═══════════════════════════════════════════════════

  async checkAllGatewaysHealth(): Promise<GatewayHealthResult[]> {
    const configs = await this.prisma.paymentGatewayConfig.findMany({
      where: { isEnabled: true },
    });

    const results = await Promise.allSettled(
      configs.map((c) => this.checkGatewayHealth(c.gatewayName)),
    );

    return results.map((r, i) =>
      r.status === "fulfilled"
        ? r.value
        : {
            gateway: configs[i].gatewayName,
            status: "error" as const,
            message: "Health check failed",
          },
    );
  }

  // ═══════════════════════════════════════════════════
  // ADMIN: GATEWAY CONFIG CRUD
  // ═══════════════════════════════════════════════════

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
    isDefault?: boolean;
    supportedCountries: string[];
    supportedMethods: string[];
    priority: number;
    envKeyLabel: string;
    envKeysRequired?: string[];
    commissionInfo?: string;
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
          isDefault: data.isDefault ?? existing.isDefault,
          supportedCountries: data.supportedCountries as any,
          supportedMethods: data.supportedMethods as any,
          priority: data.priority,
          envKeyLabel: data.envKeyLabel,
          envKeysRequired: data.envKeysRequired || undefined,
          commissionInfo: data.commissionInfo,
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
        isDefault: data.isDefault ?? false,
        supportedCountries: data.supportedCountries as any,
        supportedMethods: data.supportedMethods as any,
        priority: data.priority,
        envKeyLabel: data.envKeyLabel,
        envKeysRequired: data.envKeysRequired || undefined,
        commissionInfo: data.commissionInfo,
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

  async setDefaultGateway(id: string, updatedBy: string) {
    await this.prisma.paymentGatewayConfig.updateMany({
      data: { isDefault: false },
    });

    return this.prisma.paymentGatewayConfig.update({
      where: { id },
      data: { isDefault: true, updatedBy },
    });
  }
}
