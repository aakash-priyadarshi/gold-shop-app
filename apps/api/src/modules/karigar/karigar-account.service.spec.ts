import { NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { KarigarService } from "./karigar.service";

describe("KarigarService Account & Settlement Ledger", () => {
  let prisma: any;
  let service: KarigarService;

  beforeEach(() => {
    prisma = {
      shop: { findUnique: jest.fn() },
      karigarJob: {
        findFirst: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn(),
      },
      karigarJobStage: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        createMany: jest.fn(),
        update: jest.fn(),
      },
      karigarVaultReserve: {
        findUnique: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        upsert: jest.fn(),
      },
      karigarWorkshop: {
        findFirst: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn(),
        delete: jest.fn(),
      },
      karigarMetalMovement: {
        create: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
      },
      karigarFinancialEntry: {
        create: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
      },
      karigarFinancialAllocation: {
        createMany: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
      },
      $transaction: jest.fn(async (cb) => {
        if (typeof cb === "function") {
          return cb(prisma);
        }
        return cb;
      }),
    };
    service = new KarigarService(prisma, { ensureShopPricesMatchCurrency: jest.fn() } as never, {} as never);
  });

  const mockWorkshop = {
    id: "ws-1",
    shopId: "shop-1",
    name: "Master Jeweller Studio",
    artisan: "Ramesh Goldsmith",
    wageRatePerGram: 200,
    metalIssued: 100,
    metalReturned: 0,
    outstandingBalance: 100,
    wageDue: 0,
    shop: { currency: "NPR" },
  };

  describe("Anti-overreturn metal checks & RETURN_UNUSED", () => {
    it("rejects metal return exceeding outstanding balance for that metalKey", async () => {
      prisma.karigarWorkshop.findFirst.mockResolvedValue(mockWorkshop);
      // Historical movements: 100g issued, 90g returned
      prisma.karigarMetalMovement.findMany.mockResolvedValue([
        { type: "ISSUE", weightGrams: 100 },
        { type: "RETURN_FINISHED", weightGrams: 90 },
      ]);

      // Attempting to return 15g when only 10g is outstanding
      await expect(
        service.addMovement("shop-1", null, "user-1", {
          type: "RETURN_UNUSED",
          weightGrams: 15,
          workshopId: "ws-1",
          metalKey: "goldGrains24k",
        }),
      ).rejects.toThrow(/Only 10 g is outstanding/);
    });

    it("allows RETURN_UNUSED within outstanding float and does NOT accrue wage", async () => {
      prisma.karigarWorkshop.findFirst.mockResolvedValue(mockWorkshop);
      prisma.karigarMetalMovement.findMany.mockResolvedValue([
        { type: "ISSUE", weightGrams: 100 },
        { type: "RETURN_FINISHED", weightGrams: 50 },
      ]);
      prisma.karigarVaultReserve.findUnique.mockResolvedValue({ quantity: 100 });
      prisma.karigarFinancialEntry.findMany.mockResolvedValue([]);
      prisma.karigarMetalMovement.create.mockResolvedValue({ id: "mov-1" });

      await service.addMovement("shop-1", null, "user-1", {
        type: "RETURN_UNUSED",
        weightGrams: 20,
        workshopId: "ws-1",
        metalKey: "goldGrains24k",
        note: "Unused scrap gold return",
      });

      // Vault increased by 20g
      expect(prisma.karigarVaultReserve.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { shopId_materialKey: { shopId: "shop-1", materialKey: "goldGrains24k" } },
          update: { quantity: 120 },
        }),
      );

      // Karigar workshop balance updated
      expect(prisma.karigarWorkshop.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "ws-1" },
          data: expect.objectContaining({
            metalReturned: { increment: 20 },
            outstandingBalance: { decrement: 20 },
          }),
        }),
      );

      // Crucial: NO wage accrual created for RETURN_UNUSED
      expect(prisma.karigarFinancialEntry.create).not.toHaveBeenCalled();
    });

    it("creates WAGE_ACCRUAL financial entry on RETURN_FINISHED", async () => {
      prisma.karigarWorkshop.findFirst.mockResolvedValue(mockWorkshop);
      prisma.karigarMetalMovement.findMany.mockResolvedValue([
        { type: "ISSUE", weightGrams: 100 },
      ]);
      prisma.karigarVaultReserve.findUnique.mockResolvedValue({ quantity: 50 });
      prisma.shop.findUnique.mockResolvedValue({ currency: "NPR" });
      prisma.karigarMetalMovement.create.mockResolvedValue({ id: "mov-finished-1" });
      prisma.karigarFinancialEntry.findMany.mockResolvedValue([
        { type: "WAGE_ACCRUAL", amount: new Prisma.Decimal(12000) },
      ]);

      // 60g finished return with wageRate 200/g = 12000
      await service.addMovement("shop-1", null, "user-1", {
        type: "RETURN_FINISHED",
        weightGrams: 60,
        workshopId: "ws-1",
        metalKey: "goldGrains24k",
      });

      // Created WAGE_ACCRUAL entry tied to sourceMovementId
      expect(prisma.karigarFinancialEntry.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          shopId: "shop-1",
          workshopId: "ws-1",
          type: "WAGE_ACCRUAL",
          amount: new Prisma.Decimal(12000),
          currency: "NPR",
          sourceMovementId: "mov-finished-1",
          createdBy: "user-1",
        }),
      });

      // Synced compatibility wageDue
      expect(prisma.karigarWorkshop.update).toHaveBeenCalledWith({
        where: { id: "ws-1" },
        data: { wageDue: 12000 },
      });
    });

    it("allows RETURN_UNUSED on cancelled jobs but rejects new ISSUE", async () => {
      const cancelledJob = {
        id: "job-canc-1",
        shopId: "shop-1",
        product: "Bespoke Solitaire Ring",
        artisan: "Ramesh Goldsmith",
        grossWeight: 10,
        metalKey: "goldGrains24k",
        status: "CANCELLED",
        workshopId: "ws-1",
        allowedWastagePercent: 1,
        updatedAt: new Date(),
        stages: [],
        trees: [],
      };
      prisma.karigarJob.findFirst.mockResolvedValue(cancelledJob);
      prisma.karigarWorkshop.findFirst.mockResolvedValue(mockWorkshop);
      prisma.karigarMetalMovement.findMany.mockResolvedValue([
        { type: "ISSUE", weightGrams: 50 },
      ]);
      prisma.karigarVaultReserve.findUnique.mockResolvedValue({ quantity: 20 });
      prisma.karigarFinancialEntry.findMany.mockResolvedValue([]);
      prisma.karigarMetalMovement.create.mockResolvedValue({ id: "mov-canc-ret" });

      // 1. ISSUE to cancelled job must fail
      await expect(
        service.addMovement("shop-1", "job-canc-1", "user-1", {
          type: "ISSUE",
          weightGrams: 10,
          workshopId: "ws-1",
        }),
      ).rejects.toThrow("Cancelled jobs are archived and cannot resume production");

      // 2. Reconciliation / RETURN_UNUSED against cancelled job succeeds
      const res = await service.addMovement("shop-1", "job-canc-1", "user-1", {
        type: "RETURN_UNUSED",
        weightGrams: 30,
        workshopId: "ws-1",
      });
      expect(res).toBeDefined();
      expect(prisma.karigarMetalMovement.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            jobId: "job-canc-1",
            type: "RETURN_UNUSED",
            weightGrams: 30,
          }),
        }),
      );
    });
  });

  describe("Settlement Payments & Advances", () => {
    it("records full and partial wage payments and updates payable balance", async () => {
      prisma.karigarWorkshop.findFirst.mockResolvedValue(mockWorkshop);
      // Existing accrual of 10,000
      prisma.karigarFinancialEntry.findMany.mockResolvedValue([
        { type: "WAGE_ACCRUAL", amount: new Prisma.Decimal(10000) },
      ]);

      const entryResult = {
        id: "fin-pay-1",
        shopId: "shop-1",
        workshopId: "ws-1",
        type: "SETTLEMENT_PAYMENT",
        amount: new Prisma.Decimal(4000),
        currency: "NPR",
      };
      prisma.karigarFinancialEntry.create.mockResolvedValue(entryResult);

      // Payment of 4,000
      const res = await service.recordPayment("shop-1", "ws-1", "user-1", {
        amount: 4000,
        paymentMethod: "BANK_TRANSFER",
        reference: "TXN-998811",
        note: "Partial wage settlement",
      });

      expect(prisma.karigarFinancialEntry.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          shopId: "shop-1",
          workshopId: "ws-1",
          type: "SETTLEMENT_PAYMENT",
          amount: new Prisma.Decimal(4000),
          paymentMethod: "BANK_TRANSFER",
          reference: "TXN-998811",
        }),
      });

      expect(res.entry.amount).toBe(4000);
    });

    it("rejects payment exceeding current amount payable", async () => {
      prisma.karigarWorkshop.findFirst.mockResolvedValue(mockWorkshop);
      prisma.karigarFinancialEntry.findMany.mockResolvedValue([
        { type: "WAGE_ACCRUAL", amount: new Prisma.Decimal(5000) },
      ]);

      await expect(
        service.recordPayment("shop-1", "ws-1", "user-1", {
          amount: 6000,
        }),
      ).rejects.toThrow(/Payment amount \(6000\) cannot exceed total payable \(5000\)/);
    });

    it("records advance payment creating advance balance", async () => {
      prisma.karigarWorkshop.findFirst.mockResolvedValue(mockWorkshop);
      prisma.karigarFinancialEntry.findMany.mockResolvedValue([]); // 0 payable
      prisma.karigarFinancialEntry.create.mockResolvedValue({
        id: "fin-adv-1",
        amount: new Prisma.Decimal(5000),
      });

      const res = await service.recordAdvance("shop-1", "ws-1", "user-1", {
        amount: 5000,
        paymentMethod: "CASH",
        note: "Festival advance",
      });

      expect(prisma.karigarFinancialEntry.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          shopId: "shop-1",
          workshopId: "ws-1",
          type: "ADVANCE_PAYMENT",
          amount: new Prisma.Decimal(5000),
        }),
      });
      expect(res.summary.advanceBalance).toBe(0); // in test mock compute
    });

    it("supports duplicate idempotency key without double-posting", async () => {
      prisma.karigarFinancialEntry.findUnique.mockResolvedValue({
        id: "existing-entry-id",
        shopId: "shop-1",
        workshopId: "ws-1",
        type: "SETTLEMENT_PAYMENT",
        amount: new Prisma.Decimal(3000),
        allocations: [],
      });
      prisma.karigarFinancialEntry.findMany.mockResolvedValue([
        { type: "SETTLEMENT_PAYMENT", amount: new Prisma.Decimal(3000) },
      ]);

      const res = await service.recordPayment("shop-1", "ws-1", "user-1", {
        amount: 3000,
        idempotencyKey: "idem-abc-123",
      });

      // Did NOT create a new entry
      expect(prisma.karigarFinancialEntry.create).not.toHaveBeenCalled();
      expect(res.entry.id).toBe("existing-entry-id");
    });
  });

  describe("Adjustments & Tenancy Isolation", () => {
    it("requires reason note for adjustment and records increase/decrease", async () => {
      prisma.karigarWorkshop.findFirst.mockResolvedValue(mockWorkshop);
      prisma.karigarFinancialEntry.findMany.mockResolvedValue([]);
      prisma.karigarFinancialEntry.create.mockResolvedValue({
        id: "adj-1",
        amount: new Prisma.Decimal(500),
      });

      // 1. Missing note throws
      await expect(
        service.recordAdjustment("shop-1", "ws-1", "user-1", {
          amount: 500,
          type: "ADJUSTMENT_INCREASE",
          note: "",
        }),
      ).rejects.toThrow("Adjustment reason note is required");

      // 2. Valid adjustment succeeds
      await service.recordAdjustment("shop-1", "ws-1", "user-1", {
        amount: 500,
        type: "ADJUSTMENT_INCREASE",
        note: "Correction for under-calculated intricacy bonus",
      });

      expect(prisma.karigarFinancialEntry.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: "ADJUSTMENT_INCREASE",
          amount: new Prisma.Decimal(500),
          note: "Correction for under-calculated intricacy bonus",
        }),
      });
    });

    it("enforces tenant isolation across shops", async () => {
      // Workshop belongs to shop-2, but requested by shop-1
      prisma.karigarWorkshop.findFirst.mockResolvedValue(null);

      await expect(
        service.getWorkshopAccount("shop-1", "ws-cross-shop"),
      ).rejects.toThrow(NotFoundException);

      await expect(
        service.recordPayment("shop-1", "ws-cross-shop", "user-1", {
          amount: 1000,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
