import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma, SellerAiActionStatus } from "@prisma/client";
import { AuditService } from "../audit/audit.service";
import { UpdateInventoryItemDto } from "../inventory/dto/inventory.dto";
import { InventoryService } from "../inventory/inventory.service";
import { OrdersService } from "../orders/orders.service";
import { PrismaService } from "../../prisma/prisma.service";
import { SellerAiApiKeyContext } from "./seller-ai-api-key.guard";

const ACTION_TTL_MS = 10 * 60 * 1000;
const MAX_PAGE_SIZE = 50;
const ORDER_STATUSES = [
  "CONFIRMED",
  "IN_PROGRESS",
  "READY",
  "PACKED",
  "SHIPPED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
] as const;

type JsonRpcRequest = {
  jsonrpc?: string;
  id?: string | number | null;
  method?: string;
  params?: Record<string, unknown>;
};

type ActionPayload =
  | {
      type: "inventory_update";
      itemId: string;
      changes: UpdateInventoryItemDto;
    }
  | { type: "order_status_update"; orderId: string; detailedStatus: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function textResult(value: unknown, isError = false) {
  return {
    content: [{ type: "text", text: JSON.stringify(value) }],
    ...(isError ? { isError: true } : {}),
  };
}

function hasScope(key: SellerAiApiKeyContext, scope: string): boolean {
  return key.scopes.includes(scope);
}

@Injectable()
export class SellerAiService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly inventory: InventoryService,
    private readonly orders: OrdersService,
  ) {}

  async handleMcp(
    key: SellerAiApiKeyContext,
    rawMessage: unknown,
    requestInfo: { ipAddress?: string; userAgent?: string },
  ) {
    if (!isRecord(rawMessage)) {
      return this.error(null, -32600, "Invalid JSON-RPC request");
    }
    const message = rawMessage as JsonRpcRequest;
    if (message.jsonrpc !== "2.0" || typeof message.method !== "string") {
      return this.error(message.id, -32600, "Invalid JSON-RPC request");
    }

    if (message.method === "notifications/initialized") {
      return null;
    }
    if (message.method === "ping") {
      return this.result(message.id, {});
    }
    if (message.method === "initialize") {
      return this.result(message.id, {
        protocolVersion: "2025-03-26",
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: "orivraa-seller", version: "1.0.0" },
        instructions:
          "Read tools use only the scopes granted by the shopkeeper. Write tools create a pending request; a logged-in shopkeeper must confirm it in Orivraa before any data changes.",
      });
    }
    if (message.method === "tools/list") {
      return this.result(message.id, { tools: this.getTools(key) });
    }
    if (message.method === "tools/call") {
      return this.callTool(key, message, requestInfo);
    }

    return this.error(message.id, -32601, "Method not found");
  }

  async listActions(shopId: string) {
    await this.expirePendingActions(shopId);
    return this.prisma.sellerAiAction.findMany({
      where: { shopId },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }

  async rejectAction(shopId: string, actionId: string, userId: string) {
    await this.expirePendingActions(shopId);
    const rejected = await this.prisma.sellerAiAction.updateMany({
      where: { id: actionId, shopId, status: SellerAiActionStatus.PENDING },
      data: {
        status: SellerAiActionStatus.REJECTED,
        rejectedByUserId: userId,
        rejectedAt: new Date(),
      },
    });
    if (rejected.count !== 1) {
      throw new BadRequestException("This AI request is no longer pending");
    }

    await this.audit.log({
      userId,
      actorType: "SHOPKEEPER",
      action: "AI_WRITE_REJECTED",
      resourceType: "SellerAiAction",
      resourceId: actionId,
      metadata: { shopId },
    });
    return this.getAction(shopId, actionId);
  }

  async confirmAction(shopId: string, actionId: string, userId: string) {
    await this.expirePendingActions(shopId);
    const action = await this.getAction(shopId, actionId);
    if (action.status !== SellerAiActionStatus.PENDING) {
      throw new BadRequestException("This AI request is no longer pending");
    }

    const claimed = await this.prisma.sellerAiAction.updateMany({
      where: {
        id: actionId,
        shopId,
        status: SellerAiActionStatus.PENDING,
        expiresAt: { gt: new Date() },
      },
      data: { status: SellerAiActionStatus.PROCESSING },
    });
    if (claimed.count !== 1) {
      throw new BadRequestException(
        "This AI request is no longer available for confirmation",
      );
    }

    try {
      const payload = this.parseActionPayload(action.payload);
      let result: unknown;
      if (payload.type === "inventory_update") {
        result = await this.inventory.update(
          payload.itemId,
          userId,
          payload.changes,
        );
      } else if (payload.type === "order_status_update") {
        result = await this.orders.shopkeeperUpdateOrderStatus(
          payload.orderId,
          userId,
          { detailedStatus: payload.detailedStatus },
          shopId,
        );
      } else {
        throw new BadRequestException("Unsupported AI action");
      }

      await this.prisma.sellerAiAction.update({
        where: { id: actionId },
        data: {
          status: SellerAiActionStatus.CONFIRMED,
          confirmedByUserId: userId,
          confirmedAt: new Date(),
        },
      });
      await this.audit.log({
        userId,
        actorType: "SHOPKEEPER",
        action: "AI_WRITE_CONFIRMED",
        resourceType: "SellerAiAction",
        resourceId: actionId,
        metadata: {
          shopId,
          toolName: action.toolName,
          keyPrefix: action.keyPrefix,
        },
      });
      return { action: await this.getAction(shopId, actionId), result };
    } catch (error) {
      await this.prisma.sellerAiAction.update({
        where: { id: actionId },
        data: { status: SellerAiActionStatus.FAILED },
      });
      await this.audit.log({
        userId,
        actorType: "SHOPKEEPER",
        action: "AI_WRITE_FAILED",
        resourceType: "SellerAiAction",
        resourceId: actionId,
        metadata: {
          shopId,
          toolName: action.toolName,
          keyPrefix: action.keyPrefix,
        },
      });
      throw error;
    }
  }

  private async callTool(
    key: SellerAiApiKeyContext,
    message: JsonRpcRequest,
    requestInfo: { ipAddress?: string; userAgent?: string },
  ) {
    const params = message.params;
    const toolName = typeof params?.name === "string" ? params.name : "";
    const args = isRecord(params?.arguments) ? params.arguments : {};

    try {
      let data: unknown;
      switch (toolName) {
        case "inventory_search":
          this.requireScope(key, "inventory:read");
          data = await this.searchInventory(key, args);
          break;
        case "orders_list":
          this.requireScope(key, "orders:read");
          data = await this.listOrders(key, args);
          break;
        case "propose_inventory_update":
          this.requireScope(key, "inventory:write");
          data = await this.proposeInventoryUpdate(key, args);
          break;
        case "propose_order_status_update":
          this.requireScope(key, "orders:write");
          data = await this.proposeOrderStatusUpdate(key, args);
          break;
        case "ai_action_status":
          if (
            !hasScope(key, "inventory:write") &&
            !hasScope(key, "orders:write")
          ) {
            throw new ForbiddenException(
              "A write scope is required to view AI action status",
            );
          }
          data = await this.actionStatus(key, args);
          break;
        default:
          return this.result(
            message.id,
            textResult({ error: "Unknown or unavailable tool" }, true),
          );
      }

      await this.audit.log({
        userId: key.shop.userId,
        actorType: "SELLER_AI",
        action: "AI_MCP_TOOL_CALLED",
        resourceType: "SellerAiMcp",
        resourceId: key.id,
        metadata: { shopId: key.shopId, keyPrefix: key.keyPrefix, toolName },
        ipAddress: requestInfo.ipAddress,
        userAgent: requestInfo.userAgent,
      });
      return this.result(message.id, textResult(data));
    } catch (error) {
      const messageText =
        error instanceof Error ? error.message : "Tool request failed";
      return this.result(message.id, textResult({ error: messageText }, true));
    }
  }

  private getTools(key: SellerAiApiKeyContext) {
    const tools: Array<Record<string, unknown>> = [];
    if (hasScope(key, "inventory:read")) {
      tools.push({
        name: "inventory_search",
        description:
          "Search this shop's inventory by SKU, name, RFID, or hallmark number.",
        inputSchema: {
          type: "object",
          properties: {
            search: { type: "string", maxLength: 100 },
            page: { type: "integer", minimum: 1 },
            limit: { type: "integer", minimum: 1, maximum: MAX_PAGE_SIZE },
          },
          additionalProperties: false,
        },
        annotations: { readOnlyHint: true, destructiveHint: false },
      });
    }
    if (hasScope(key, "orders:read")) {
      tools.push({
        name: "orders_list",
        description:
          "List this shop's recent orders. Customer email and phone are deliberately excluded.",
        inputSchema: {
          type: "object",
          properties: {
            status: { type: "string" },
            page: { type: "integer", minimum: 1 },
            limit: { type: "integer", minimum: 1, maximum: MAX_PAGE_SIZE },
          },
          additionalProperties: false,
        },
        annotations: { readOnlyHint: true, destructiveHint: false },
      });
    }
    if (hasScope(key, "inventory:write")) {
      tools.push({
        name: "propose_inventory_update",
        description:
          "Propose an inventory edit. It does not modify data until a logged-in shopkeeper confirms it in Orivraa.",
        inputSchema: {
          type: "object",
          required: ["itemId", "changes"],
          properties: {
            itemId: { type: "string" },
            changes: { type: "object", minProperties: 1 },
          },
          additionalProperties: false,
        },
        annotations: { readOnlyHint: false, destructiveHint: false },
      });
    }
    if (hasScope(key, "orders:write")) {
      tools.push({
        name: "propose_order_status_update",
        description:
          "Propose a non-financial order-status change. It does not modify an order until a logged-in shopkeeper confirms it in Orivraa.",
        inputSchema: {
          type: "object",
          required: ["orderId", "detailedStatus"],
          properties: {
            orderId: { type: "string" },
            detailedStatus: { type: "string", enum: ORDER_STATUSES },
          },
          additionalProperties: false,
        },
        annotations: { readOnlyHint: false, destructiveHint: false },
      });
    }
    if (hasScope(key, "inventory:write") || hasScope(key, "orders:write")) {
      tools.push({
        name: "ai_action_status",
        description:
          "Check whether an AI write request has been confirmed, rejected, expired, or failed by the shopkeeper.",
        inputSchema: {
          type: "object",
          required: ["actionId"],
          properties: { actionId: { type: "string" } },
          additionalProperties: false,
        },
        annotations: { readOnlyHint: true, destructiveHint: false },
      });
    }
    return tools;
  }

  private async searchInventory(
    key: SellerAiApiKeyContext,
    args: Record<string, unknown>,
  ) {
    const limit = this.pageSize(args.limit);
    const page = this.page(args.page);
    const search =
      typeof args.search === "string" ? args.search.slice(0, 100) : undefined;
    const result = await this.inventory.findShopInventory(
      key.shopId,
      key.shop.userId,
      {
        page,
        limit,
        search,
      },
    );
    return {
      currency: result.currency,
      pagination: result.pagination,
      items: result.items.map((item) => ({
        id: item.id,
        sku: item.sku,
        name: item.nameEn,
        jewelleryType: item.jewelleryType,
        status: item.status,
        stockQuantity: item.stockQuantity,
        totalWeightGrams: item.totalWeightGrams,
        totalPrice: item.totalPriceNpr,
        hallmarkNumber: item.hallmarkNumber,
      })),
    };
  }

  private async listOrders(
    key: SellerAiApiKeyContext,
    args: Record<string, unknown>,
  ) {
    const result = await this.orders.findShopOrders(key.shopId, {
      page: this.page(args.page),
      limit: this.pageSize(args.limit),
      status: typeof args.status === "string" ? args.status : undefined,
    });
    return {
      pagination: result.pagination,
      orders: result.orders.map((order) => ({
        id: order.id,
        orderNumber: order.orderNumber,
        orderType: order.orderType,
        status: order.status,
        detailedStatus: order.detailedStatus,
        paymentStatus: order.paymentStatus,
        total: order.totalNpr,
        currency: order.displayCurrency,
        createdAt: order.createdAt,
        customer: {
          id: order.customer.id,
          name: `${order.customer.firstName} ${order.customer.lastName}`.trim(),
        },
      })),
    };
  }

  private async proposeInventoryUpdate(
    key: SellerAiApiKeyContext,
    args: Record<string, unknown>,
  ) {
    const itemId = this.requiredId(args.itemId, "itemId");
    const changes = this.inventoryChanges(args.changes);
    const item = await this.prisma.inventoryItem.findFirst({
      where: { id: itemId, shopId: key.shopId },
      select: { id: true, sku: true, nameEn: true },
    });
    if (!item)
      throw new NotFoundException("Inventory item not found in this shop");

    const action = await this.createAction(
      key,
      "propose_inventory_update",
      "inventory_update",
      {
        type: "inventory_update",
        itemId,
        changes,
      },
      `Update ${item.sku || item.nameEn}: ${Object.keys(changes).join(", ")}`,
    );
    return this.pendingActionResult(action.id, action.expiresAt);
  }

  private async proposeOrderStatusUpdate(
    key: SellerAiApiKeyContext,
    args: Record<string, unknown>,
  ) {
    const orderId = this.requiredId(args.orderId, "orderId");
    const detailedStatus =
      typeof args.detailedStatus === "string" ? args.detailedStatus : "";
    if (!(ORDER_STATUSES as readonly string[]).includes(detailedStatus)) {
      throw new BadRequestException(
        "detailedStatus is not allowed for a shopkeeper AI request",
      );
    }
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, shopId: key.shopId },
      select: { id: true, orderNumber: true },
    });
    if (!order) throw new NotFoundException("Order not found in this shop");

    const action = await this.createAction(
      key,
      "propose_order_status_update",
      "order_status_update",
      {
        type: "order_status_update",
        orderId,
        detailedStatus,
      },
      `Set order ${order.orderNumber} status to ${detailedStatus}`,
    );
    return this.pendingActionResult(action.id, action.expiresAt);
  }

  private async actionStatus(
    key: SellerAiApiKeyContext,
    args: Record<string, unknown>,
  ) {
    const actionId = this.requiredId(args.actionId, "actionId");
    await this.expirePendingActions(key.shopId);
    const action = await this.prisma.sellerAiAction.findFirst({
      where: { id: actionId, shopId: key.shopId, apiKeyId: key.id },
      select: {
        id: true,
        status: true,
        summary: true,
        expiresAt: true,
        confirmedAt: true,
        rejectedAt: true,
      },
    });
    if (!action)
      throw new NotFoundException("AI action not found for this key");
    return action;
  }

  private async createAction(
    key: SellerAiApiKeyContext,
    toolName: string,
    actionType: string,
    payload: ActionPayload,
    summary: string,
  ) {
    const expiresAt = new Date(Date.now() + ACTION_TTL_MS);
    const action = await this.prisma.sellerAiAction.create({
      data: {
        shopId: key.shopId,
        apiKeyId: key.id,
        keyPrefix: key.keyPrefix,
        toolName,
        actionType,
        summary,
        payload: payload as unknown as Prisma.InputJsonValue,
        status: SellerAiActionStatus.PENDING,
        expiresAt,
      },
    });
    await this.audit.log({
      userId: key.shop.userId,
      actorType: "SELLER_AI",
      action: "AI_WRITE_REQUESTED",
      resourceType: "SellerAiAction",
      resourceId: action.id,
      metadata: { shopId: key.shopId, keyPrefix: key.keyPrefix, toolName },
    });
    return action;
  }

  private pendingActionResult(actionId: string, expiresAt: Date) {
    return {
      actionId,
      status: "PENDING",
      expiresAt,
      message:
        "No data changed. A logged-in shopkeeper must review and confirm this request in Orivraa → AI integrations within 10 minutes.",
    };
  }

  private async expirePendingActions(shopId: string) {
    await this.prisma.sellerAiAction.updateMany({
      where: {
        shopId,
        status: SellerAiActionStatus.PENDING,
        expiresAt: { lte: new Date() },
      },
      data: { status: SellerAiActionStatus.EXPIRED },
    });
  }

  private async getAction(shopId: string, actionId: string) {
    const action = await this.prisma.sellerAiAction.findFirst({
      where: { id: actionId, shopId },
    });
    if (!action) throw new NotFoundException("AI action not found");
    return action;
  }

  private requireScope(key: SellerAiApiKeyContext, scope: string) {
    if (!hasScope(key, scope))
      throw new ForbiddenException(`This AI key does not have ${scope}`);
  }

  private requiredId(value: unknown, field: string) {
    if (typeof value !== "string" || value.length < 1 || value.length > 100) {
      throw new BadRequestException(`${field} is required`);
    }
    return value;
  }

  private page(value: unknown) {
    return typeof value === "number" && Number.isInteger(value) && value > 0
      ? value
      : 1;
  }

  private pageSize(value: unknown) {
    const requested =
      typeof value === "number" && Number.isInteger(value) ? value : 20;
    return Math.max(1, Math.min(MAX_PAGE_SIZE, requested));
  }

  private inventoryChanges(value: unknown): UpdateInventoryItemDto {
    if (!isRecord(value))
      throw new BadRequestException("changes must be an object");
    const allowedStringFields = [
      "nameEn",
      "nameNe",
      "nameHi",
      "descriptionEn",
      "descriptionNe",
      "descriptionHi",
    ];
    const allowedNumberFields = [
      "metalValueNpr",
      "makingChargeNpr",
      "gemstoneValueNpr",
      "taxNpr",
      "wastagePercent",
      "stockQuantity",
    ];
    const entries = Object.entries(value);
    if (!entries.length)
      throw new BadRequestException("changes cannot be empty");
    for (const [field, fieldValue] of entries) {
      if (allowedStringFields.includes(field)) {
        if (typeof fieldValue !== "string" || fieldValue.length > 500) {
          throw new BadRequestException(`${field} must be a short string`);
        }
      } else if (allowedNumberFields.includes(field)) {
        if (
          typeof fieldValue !== "number" ||
          !Number.isFinite(fieldValue) ||
          fieldValue < 0
        ) {
          throw new BadRequestException(
            `${field} must be a non-negative number`,
          );
        }
        if (field === "stockQuantity" && !Number.isInteger(fieldValue)) {
          throw new BadRequestException("stockQuantity must be a whole number");
        }
      } else if (field === "labels") {
        if (
          !Array.isArray(fieldValue) ||
          fieldValue.length > 20 ||
          fieldValue.some(
            (label) => typeof label !== "string" || label.length > 100,
          )
        ) {
          throw new BadRequestException(
            "labels must be an array of up to 20 short strings",
          );
        }
      } else {
        throw new BadRequestException(
          `${field} cannot be changed by a seller AI key`,
        );
      }
    }
    return value as UpdateInventoryItemDto;
  }

  private parseActionPayload(payload: unknown): ActionPayload {
    if (!isRecord(payload) || typeof payload.type !== "string") {
      throw new BadRequestException("Invalid AI action payload");
    }
    if (payload.type === "inventory_update") {
      return {
        type: "inventory_update",
        itemId: this.requiredId(payload.itemId, "itemId"),
        changes: this.inventoryChanges(payload.changes),
      };
    }
    if (payload.type === "order_status_update") {
      const detailedStatus =
        typeof payload.detailedStatus === "string"
          ? payload.detailedStatus
          : "";
      if (!(ORDER_STATUSES as readonly string[]).includes(detailedStatus)) {
        throw new BadRequestException("Invalid AI order-status payload");
      }
      return {
        type: "order_status_update",
        orderId: this.requiredId(payload.orderId, "orderId"),
        detailedStatus,
      };
    }
    throw new BadRequestException("Unsupported AI action payload");
  }

  private result(id: JsonRpcRequest["id"], result: unknown) {
    return { jsonrpc: "2.0", id: id ?? null, result };
  }

  private error(id: JsonRpcRequest["id"], code: number, message: string) {
    return { jsonrpc: "2.0", id: id ?? null, error: { code, message } };
  }
}
