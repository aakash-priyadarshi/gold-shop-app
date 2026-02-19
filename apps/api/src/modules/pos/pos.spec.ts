import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { InvoicesService } from "../invoices/invoices.service";
import { PosService } from "./pos.service";

// Mock Prisma
const mockPrisma = {
  wishlistItem: { findMany: jest.fn() },
  posSession: {
    create: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  posSessionItem: {
    create: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  stockReservation: {
    create: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
    aggregate: jest.fn(),
  },
  inventoryItem: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
  },
  productVariant: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  conversation: { findFirst: jest.fn() },
  order: { findFirst: jest.fn() },
};

const mockAudit = { log: jest.fn() };
const mockInvoices = { create: jest.fn() };

describe("PosService", () => {
  let service: PosService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PosService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditService, useValue: mockAudit },
        { provide: InvoicesService, useValue: mockInvoices },
      ],
    }).compile();

    service = module.get<PosService>(PosService);
  });

  describe("getCustomerPicks", () => {
    it("should throw ForbiddenException if no relationship exists", async () => {
      mockPrisma.conversation.findFirst.mockResolvedValue(null);
      mockPrisma.order.findFirst.mockResolvedValue(null);

      await expect(
        service.getCustomerPicks("shop-1", "customer-1"),
      ).rejects.toThrow(ForbiddenException);
    });

    it("should return picks when conversation exists", async () => {
      mockPrisma.conversation.findFirst.mockResolvedValue({ id: "conv-1" });
      mockPrisma.wishlistItem.findMany.mockResolvedValue([
        {
          id: "wl-1",
          inventoryItem: {
            id: "item-1",
            nameEn: "Gold Ring",
            shopId: "shop-1",
          },
        },
      ]);

      const result = await service.getCustomerPicks("shop-1", "customer-1");
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("wl-1");
    });
  });

  describe("createSession", () => {
    it("should cancel existing active sessions and create new", async () => {
      mockPrisma.posSession.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.stockReservation.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.posSession.create.mockResolvedValue({
        id: "sess-1",
        shopId: "shop-1",
        status: "ACTIVE",
        items: [],
      });

      const result = await service.createSession("shop-1", "user-1", {});
      expect(result.id).toBe("sess-1");
      expect(mockPrisma.posSession.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { shopId: "shop-1", status: "ACTIVE" },
        }),
      );
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: "POS_SESSION_CREATED" }),
      );
    });
  });

  describe("addItems – stock reservation", () => {
    beforeEach(() => {
      mockPrisma.posSession.findFirst.mockResolvedValue({
        id: "sess-1",
        shopId: "shop-1",
        status: "ACTIVE",
        expiresAt: new Date(Date.now() + 1800000),
      });
    });

    it("should throw on insufficient stock", async () => {
      mockPrisma.inventoryItem.findFirst.mockResolvedValue({
        id: "item-1",
        shopId: "shop-1",
        totalPriceNpr: 50000,
        stockQuantity: 1,
      });
      // Existing reservations already used all stock
      mockPrisma.stockReservation.aggregate
        .mockResolvedValueOnce({ _sum: { qty: 1 } }) // other sessions reserved 1
        .mockResolvedValueOnce({ _sum: { qty: 0 } }); // this session has 0

      mockPrisma.posSessionItem.findFirst.mockResolvedValue(null);

      await expect(
        service.addItems("shop-1", "sess-1", "user-1", {
          items: [{ inventoryItemId: "item-1", qty: 1 }],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it("should succeed when stock is available", async () => {
      mockPrisma.inventoryItem.findFirst.mockResolvedValue({
        id: "item-1",
        shopId: "shop-1",
        totalPriceNpr: 50000,
        stockQuantity: 5,
      });
      mockPrisma.inventoryItem.findUnique.mockResolvedValue({
        id: "item-1",
        stockQuantity: 5,
      });
      mockPrisma.stockReservation.aggregate
        .mockResolvedValueOnce({ _sum: { qty: 0 } })
        .mockResolvedValueOnce({ _sum: { qty: 0 } });
      mockPrisma.stockReservation.findFirst.mockResolvedValue(null);
      mockPrisma.stockReservation.create.mockResolvedValue({});
      mockPrisma.posSessionItem.findFirst.mockResolvedValue(null);
      mockPrisma.posSessionItem.create.mockResolvedValue({
        id: "si-1",
        qty: 2,
        unitPrice: 50000,
        lineTotal: 100000,
      });
      mockPrisma.posSession.findUnique.mockResolvedValue({
        id: "sess-1",
        items: [
          {
            id: "si-1",
            qty: 2,
            lineTotal: 100000,
            inventoryItem: {},
            variant: null,
          },
        ],
      });

      const result = await service.addItems("shop-1", "sess-1", "user-1", {
        items: [{ inventoryItemId: "item-1", qty: 2 }],
      });
      expect(result?.items).toHaveLength(1);
    });
  });

  describe("checkout", () => {
    it("should throw if session is empty", async () => {
      mockPrisma.posSession.findFirst.mockResolvedValue({
        id: "sess-1",
        shopId: "shop-1",
        status: "ACTIVE",
        items: [],
      });

      await expect(
        service.checkout("shop-1", "sess-1", "user-1", {
          customerName: "Test Customer",
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it("should create invoice, decrement stock, release reservations", async () => {
      mockPrisma.posSession.findFirst.mockResolvedValue({
        id: "sess-1",
        shopId: "shop-1",
        status: "ACTIVE",
        items: [
          {
            id: "si-1",
            inventoryItemId: "item-1",
            variantId: null,
            qty: 1,
            unitPrice: 50000,
            lineTotal: 50000,
            inventoryItem: { nameEn: "Gold Ring", sku: "GR-001" },
            variant: null,
          },
        ],
      });
      mockInvoices.create.mockResolvedValue({
        id: "inv-1",
        invoiceNumber: "INV-20250101-0001",
        totalAmount: 50000,
      });
      mockPrisma.inventoryItem.update.mockResolvedValue({});
      mockPrisma.stockReservation.deleteMany.mockResolvedValue({ count: 1 });
      mockPrisma.posSession.update.mockResolvedValue({
        id: "sess-1",
        status: "CHECKED_OUT",
      });

      const result = await service.checkout("shop-1", "sess-1", "user-1", {
        customerName: "Test Customer",
      });

      expect(result.invoice.id).toBe("inv-1");
      expect(mockPrisma.inventoryItem.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { stockQuantity: { decrement: 1 } },
        }),
      );
      expect(mockPrisma.stockReservation.deleteMany).toHaveBeenCalled();
      expect(mockPrisma.posSession.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: "CHECKED_OUT" },
        }),
      );
    });
  });

  describe("cancelSession", () => {
    it("should release reservations and set CANCELLED", async () => {
      mockPrisma.posSession.findFirst.mockResolvedValue({
        id: "sess-1",
        shopId: "shop-1",
        status: "ACTIVE",
        expiresAt: new Date(Date.now() + 1800000),
      });
      mockPrisma.stockReservation.deleteMany.mockResolvedValue({ count: 2 });
      mockPrisma.posSession.update.mockResolvedValue({
        id: "sess-1",
        status: "CANCELLED",
      });

      const result = await service.cancelSession("shop-1", "sess-1", "user-1");
      expect(result.status).toBe("CANCELLED");
      expect(mockPrisma.stockReservation.deleteMany).toHaveBeenCalledWith({
        where: { posSessionId: "sess-1" },
      });
    });
  });

  describe("expireOverdueSessions", () => {
    it("should expire sessions past their expiresAt and release stock", async () => {
      mockPrisma.posSession.findMany.mockResolvedValue([
        { id: "sess-old-1" },
        { id: "sess-old-2" },
      ]);
      mockPrisma.stockReservation.deleteMany.mockResolvedValue({ count: 3 });
      mockPrisma.posSession.updateMany.mockResolvedValue({ count: 2 });

      const result = await service.expireOverdueSessions();
      expect(result.expired).toBe(2);
      expect(mockPrisma.stockReservation.deleteMany).toHaveBeenCalledWith({
        where: { posSessionId: { in: ["sess-old-1", "sess-old-2"] } },
      });
    });

    it("should do nothing when no expired sessions", async () => {
      mockPrisma.posSession.findMany.mockResolvedValue([]);

      const result = await service.expireOverdueSessions();
      expect(result.expired).toBe(0);
    });
  });
});
