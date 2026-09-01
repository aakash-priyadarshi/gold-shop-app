import { SellerAiActionStatus } from "@prisma/client";
import { SellerAiApiKeyContext } from "./seller-ai-api-key.guard";
import { SellerAiService } from "./seller-ai.service";

describe("SellerAiService", () => {
  const key: SellerAiApiKeyContext = {
    id: "key-1",
    shopId: "shop-1",
    shop: {
      id: "shop-1",
      shopName: "Test Shop",
      userId: "owner-1",
      isActive: true,
    },
    scopes: ["inventory:read", "inventory:write"],
    keyName: "Claude test",
    keyPrefix: "ovrk_test",
    kind: "SELLER_AI",
  };

  let prisma: any;
  let audit: any;
  let inventory: any;
  let orders: any;
  let service: SellerAiService;

  beforeEach(() => {
    prisma = {
      sellerAiAction: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      inventoryItem: { findFirst: jest.fn() },
      order: { findFirst: jest.fn() },
    };
    audit = { log: jest.fn().mockResolvedValue(undefined) };
    inventory = { findShopInventory: jest.fn(), update: jest.fn() };
    orders = {
      findShopOrders: jest.fn(),
      shopkeeperUpdateOrderStatus: jest.fn(),
    };
    service = new SellerAiService(prisma, audit, inventory, orders);
  });

  it("only advertises tools covered by the key's scopes", async () => {
    const response: any = await service.handleMcp(
      key,
      {
        jsonrpc: "2.0",
        id: 1,
        method: "tools/list",
      },
      {},
    );

    expect(
      response.result.tools.map((tool: { name: string }) => tool.name),
    ).toEqual([
      "inventory_search",
      "propose_inventory_update",
      "ai_action_status",
    ]);
    expect(
      response.result.tools.map((tool: { name: string }) => tool.name),
    ).not.toEqual(
      expect.arrayContaining([
        "sale_create",
        "payment_create",
        "refund_create",
        "inventory_delete",
      ]),
    );
  });

  it("creates a pending inventory request without changing inventory", async () => {
    prisma.inventoryItem.findFirst.mockResolvedValue({
      id: "item-1",
      sku: "RING-01",
      nameEn: "Gold ring",
    });
    prisma.sellerAiAction.create.mockResolvedValue({
      id: "action-1",
      expiresAt: new Date("2026-09-01T12:10:00.000Z"),
    });

    const response: any = await service.handleMcp(
      key,
      {
        jsonrpc: "2.0",
        id: 2,
        method: "tools/call",
        params: {
          name: "propose_inventory_update",
          arguments: { itemId: "item-1", changes: { makingChargeNpr: 500 } },
        },
      },
      {},
    );

    const body = JSON.parse(response.result.content[0].text);
    expect(body).toMatchObject({ actionId: "action-1", status: "PENDING" });
    expect(inventory.update).not.toHaveBeenCalled();
    expect(prisma.sellerAiAction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: SellerAiActionStatus.PENDING }),
      }),
    );
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: "AI_WRITE_REQUESTED" }),
    );
  });

  it("executes a pending request only after a logged-in shopkeeper confirms it", async () => {
    const action = {
      id: "action-1",
      shopId: "shop-1",
      keyPrefix: "ovrk_test",
      toolName: "propose_inventory_update",
      status: SellerAiActionStatus.PENDING,
      payload: {
        type: "inventory_update",
        itemId: "item-1",
        changes: { makingChargeNpr: 500 },
      },
    };
    prisma.sellerAiAction.findFirst.mockResolvedValue(action);
    prisma.sellerAiAction.updateMany
      .mockResolvedValueOnce({ count: 0 })
      .mockResolvedValueOnce({ count: 1 });
    prisma.sellerAiAction.update.mockResolvedValue({});
    inventory.update.mockResolvedValue({ id: "item-1", makingChargeNpr: 500 });

    const result = await service.confirmAction("shop-1", "action-1", "owner-1");

    expect(inventory.update).toHaveBeenCalledWith("item-1", "owner-1", {
      makingChargeNpr: 500,
    });
    expect(result.result).toEqual({ id: "item-1", makingChargeNpr: 500 });
    expect(prisma.sellerAiAction.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: SellerAiActionStatus.CONFIRMED,
          confirmedByUserId: "owner-1",
        }),
      }),
    );
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: "AI_WRITE_CONFIRMED" }),
    );
  });
});
