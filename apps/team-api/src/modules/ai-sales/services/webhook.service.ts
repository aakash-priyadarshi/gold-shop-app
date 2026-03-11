import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service";
import { ConfigService } from "@nestjs/config";
import * as crypto from "crypto";

/**
 * WebhookService — Push call outcomes and lead events to external CRMs.
 *
 * Events: call.completed, call.failed, lead.converted, lead.scored,
 * lead.stage_changed, experiment.completed, follow_up.scheduled
 *
 * Each endpoint has HMAC signature verification, retry logic,
 * and health tracking.
 */
@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  /* ─── ENDPOINT CRUD ─── */

  async createEndpoint(data: {
    name: string;
    url: string;
    events: string[];
    secret?: string;
    headers?: Record<string, string>;
  }) {
    return this.prisma.webhookEndpoint.create({ data: data as any });
  }

  async listEndpoints() {
    return this.prisma.webhookEndpoint.findMany({
      include: { _count: { select: { deliveries: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  async getEndpoint(id: string) {
    return this.prisma.webhookEndpoint.findUnique({
      where: { id },
      include: {
        deliveries: { orderBy: { createdAt: "desc" }, take: 20 },
      },
    });
  }

  async updateEndpoint(id: string, data: Record<string, any>) {
    return this.prisma.webhookEndpoint.update({ where: { id }, data });
  }

  async deleteEndpoint(id: string) {
    await this.prisma.webhookDelivery.deleteMany({ where: { endpointId: id } });
    return this.prisma.webhookEndpoint.delete({ where: { id } });
  }

  async toggleEndpoint(id: string, isActive: boolean) {
    return this.prisma.webhookEndpoint.update({
      where: { id },
      data: { isActive },
    });
  }

  /* ─── EVENT DISPATCH ─── */

  /**
   * Dispatch an event to all subscribed endpoints.
   * Called by various services after significant events.
   */
  async dispatch(event: string, payload: Record<string, any>) {
    const endpoints = await this.prisma.webhookEndpoint.findMany({
      where: {
        isActive: true,
        events: { has: event },
        consecutiveFailures: { lt: 10 }, // circuit breaker
      },
    });

    if (!endpoints.length) return;

    const deliveryPromises = endpoints.map((ep) => this.deliver(ep, event, payload));
    await Promise.allSettled(deliveryPromises);
  }

  /**
   * Deliver a payload to a specific endpoint with HMAC signing.
   */
  private async deliver(
    endpoint: any,
    event: string,
    payload: Record<string, any>,
  ) {
    const body = JSON.stringify({
      event,
      timestamp: new Date().toISOString(),
      data: payload,
    });

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "X-Webhook-Event": event,
      ...(endpoint.headers || {}),
    };

    // HMAC signature if secret is configured
    if (endpoint.secret) {
      const signature = crypto
        .createHmac("sha256", endpoint.secret)
        .update(body)
        .digest("hex");
      headers["X-Webhook-Signature"] = `sha256=${signature}`;
    }

    let statusCode: number | undefined;
    let responseBody: string | undefined;
    let error: string | undefined;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

      const resp = await fetch(endpoint.url, {
        method: "POST",
        headers,
        body,
        signal: controller.signal,
      });

      clearTimeout(timeout);
      statusCode = resp.status;
      responseBody = await resp.text().catch(() => "");

      if (resp.ok) {
        await this.prisma.webhookEndpoint.update({
          where: { id: endpoint.id },
          data: {
            lastSuccessAt: new Date(),
            consecutiveFailures: 0,
            totalDelivered: { increment: 1 },
          },
        });
      } else {
        error = `HTTP ${resp.status}`;
        await this.markFailure(endpoint.id);
      }
    } catch (err: any) {
      error = err.message;
      await this.markFailure(endpoint.id);
    }

    // Log delivery
    await this.prisma.webhookDelivery.create({
      data: {
        endpointId: endpoint.id,
        event,
        payload: { event, data: payload } as any,
        statusCode,
        responseBody: responseBody?.substring(0, 1000),
        error,
        deliveredAt: statusCode && statusCode >= 200 && statusCode < 300 ? new Date() : undefined,
      },
    });
  }

  private async markFailure(endpointId: string) {
    await this.prisma.webhookEndpoint.update({
      where: { id: endpointId },
      data: {
        lastFailureAt: new Date(),
        consecutiveFailures: { increment: 1 },
        totalFailed: { increment: 1 },
      },
    });
  }

  /* ─── DELIVERY LOG ─── */

  async listDeliveries(endpointId?: string, limit = 50) {
    const where: any = {};
    if (endpointId) where.endpointId = endpointId;
    return this.prisma.webhookDelivery.findMany({
      where,
      include: { endpoint: { select: { name: true, url: true } } },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }

  /**
   * Retry a failed delivery.
   */
  async retryDelivery(deliveryId: string) {
    const delivery = await this.prisma.webhookDelivery.findUnique({
      where: { id: deliveryId },
      include: { endpoint: true },
    });
    if (!delivery || !delivery.endpoint) return { error: "Delivery not found" };

    await this.deliver(delivery.endpoint, delivery.event, delivery.payload as any);
    return { retried: true };
  }

  /**
   * Test an endpoint with a dummy event.
   */
  async testEndpoint(id: string) {
    const endpoint = await this.prisma.webhookEndpoint.findUnique({ where: { id } });
    if (!endpoint) return { error: "Endpoint not found" };

    await this.deliver(endpoint, "test.ping", {
      message: "This is a test webhook from Orivraa AI Sales",
      timestamp: new Date().toISOString(),
    });

    return { tested: true };
  }

  /**
   * Get webhook stats.
   */
  async getStats() {
    const [totalEndpoints, activeEndpoints, totalDelivered, totalFailed] = await Promise.all([
      this.prisma.webhookEndpoint.count(),
      this.prisma.webhookEndpoint.count({ where: { isActive: true } }),
      this.prisma.webhookEndpoint.aggregate({ _sum: { totalDelivered: true } }),
      this.prisma.webhookEndpoint.aggregate({ _sum: { totalFailed: true } }),
    ]);

    return {
      totalEndpoints,
      activeEndpoints,
      totalDelivered: totalDelivered._sum.totalDelivered || 0,
      totalFailed: totalFailed._sum.totalFailed || 0,
    };
  }
}
