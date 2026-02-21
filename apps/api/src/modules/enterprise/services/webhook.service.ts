import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import * as crypto from "crypto";
import { PrismaService } from "../../../prisma/prisma.service";

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createWebhook(
    shopId: string,
    data: {
      url: string;
      events: string[];
    },
  ) {
    if (!data.url.startsWith("https://")) {
      throw new BadRequestException("Webhook URL must use HTTPS");
    }

    // Generate HMAC secret
    const secret = `whsec_${crypto.randomBytes(24).toString("hex")}`;

    const webhook = await this.prisma.webhookSubscription.create({
      data: {
        shopId,
        url: data.url,
        secret,
        events: data.events as any,
      },
    });

    return {
      id: webhook.id,
      url: webhook.url,
      secret, // Only shown on creation
      events: webhook.events,
      isActive: webhook.isActive,
      createdAt: webhook.createdAt,
    };
  }

  async listWebhooks(shopId: string) {
    return this.prisma.webhookSubscription.findMany({
      where: { shopId },
      select: {
        id: true,
        url: true,
        events: true,
        isActive: true,
        failureCount: true,
        lastDeliveredAt: true,
        lastFailedAt: true,
        lastHttpStatus: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async updateWebhook(
    shopId: string,
    webhookId: string,
    data: Partial<{ url: string; events: string[]; isActive: boolean }>,
  ) {
    const webhook = await this.prisma.webhookSubscription.findFirst({
      where: { id: webhookId, shopId },
    });
    if (!webhook) throw new NotFoundException("Webhook not found");

    return this.prisma.webhookSubscription.update({
      where: { id: webhook.id },
      data: {
        ...(data.url && { url: data.url }),
        ...(data.events && { events: data.events as any }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        // Reset failure count if re-enabled
        ...(data.isActive === true && { failureCount: 0 }),
      },
    });
  }

  async deleteWebhook(shopId: string, webhookId: string) {
    const webhook = await this.prisma.webhookSubscription.findFirst({
      where: { id: webhookId, shopId },
    });
    if (!webhook) throw new NotFoundException("Webhook not found");
    return this.prisma.webhookSubscription.delete({ where: { id: webhook.id } });
  }

  /**
   * Fire a webhook event to all subscribers.
   * Called by other services when events occur.
   */
  async fireEvent(
    shopId: string,
    event: string,
    payload: Record<string, unknown>,
  ) {
    const webhooks = await this.prisma.webhookSubscription.findMany({
      where: {
        shopId,
        isActive: true,
        events: { has: event as any },
      },
    });

    for (const webhook of webhooks) {
      try {
        const timestamp = Math.floor(Date.now() / 1000).toString();
        const body = JSON.stringify({ event, data: payload, timestamp });
        const signature = crypto
          .createHmac("sha256", webhook.secret)
          .update(`${timestamp}.${body}`)
          .digest("hex");

        const response = await fetch(webhook.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Orivraa-Signature": `v1=${signature}`,
            "X-Orivraa-Timestamp": timestamp,
            "X-Orivraa-Event": event,
          },
          body,
          signal: AbortSignal.timeout(10000), // 10 second timeout
        });

        await this.prisma.webhookSubscription.update({
          where: { id: webhook.id },
          data: {
            lastDeliveredAt: new Date(),
            lastHttpStatus: response.status,
            failureCount: response.ok ? 0 : webhook.failureCount + 1,
            // Auto-disable after 10 consecutive failures
            ...(webhook.failureCount >= 9 && !response.ok
              ? { isActive: false }
              : {}),
          },
        });
      } catch (error) {
        this.logger.warn(
          `Webhook delivery failed for ${webhook.id}: ${error.message}`,
        );
        const newFailCount = webhook.failureCount + 1;
        await this.prisma.webhookSubscription.update({
          where: { id: webhook.id },
          data: {
            lastFailedAt: new Date(),
            failureCount: newFailCount,
            ...(newFailCount >= 10 ? { isActive: false } : {}),
          },
        });
      }
    }
  }

  getAvailableEvents() {
    return [
      "ORDER_CREATED",
      "ORDER_STATUS_CHANGED",
      "ORDER_COMPLETED",
      "ORDER_CANCELLED",
      "PAYMENT_RECEIVED",
      "INVENTORY_LOW_STOCK",
      "INVENTORY_UPDATED",
      "RFQ_RECEIVED",
      "OFFER_ACCEPTED",
      "PRICE_ALERT",
      "SUBSCRIPTION_CHANGED",
    ];
  }
}
