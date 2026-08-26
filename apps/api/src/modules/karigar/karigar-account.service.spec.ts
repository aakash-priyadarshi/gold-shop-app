import { ConflictException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { KarigarService } from "./karigar.service";

describe("KarigarService Account & Settlement Ledger", () => {
  let prisma: any;
  let accounting: any;
  let service: KarigarService;

  beforeEach(() => {
    accounting = {
      prepareMonetaryContext: jest.fn().mockImplementation((amount, currency) => ({
        transactionCurrency: currency || "NPR",
        transactionAmount: new Prisma.Decimal(amount),
        canonicalAmountNpr: new Prisma.Decimal(amount),
        fxRate: new Prisma.Decimal(1),
        fxSource: "INTERNAL",
        fxQuotedAt: new Date(),
      })),
      postKarigarWageAccrual: jest.fn().mockResolvedValue({ id: "gl-accrual-1" }),
      postKarigarSettlementPayment: jest.fn().mockResolvedValue({ id: "gl-pay-1" }),
      postKarigarAdvancePayment: jest.fn().mockResolvedValue({ id: "gl-adv-1" }),
      postKarigarAdjustment: jest.fn().mockResolvedValue({ id: "gl-adj-1" }),
    };

    prisma = {
      shop: { findUnique: jest.fn() },
      karigarJob: {
        findFirst: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
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
        count: jest.fn().mockResolvedValue(0),
        update: jest.fn(),
        delete: jest.fn(),
      },
      karigarMetalMovement: {
        create: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
      karigarFinancialEntry: {
        create: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
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
      $queryRaw: jest.fn().mockResolvedValue([{ id: "ws-1" }]),
    };

    service = new KarigarService(
      prisma,
      { ensureShopPricesMatchCurrency: jest.fn() } as never,
      {} as never,
      accounting as never,
    );
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

  describe("Anti-overreturn metal checks, RETURN_UNUSED & TRANSFER", () => {
    it("rejects metal return exceeding outstanding balance for that metalKey", async () => {
      prisma.karigarWorkshop.findFirst.mockResolvedValue(mockWorkshop);
      prisma.karigarMetalMovement.findMany.mockResolvedValue([
        { type: "ISSUE", weightGrams: 100 },
        { type: "RETURN_FINISHED", weightGrams: 90 },
      ]);

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

      expect(prisma.karigarVaultReserve.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { shopId_materialKey: { shopId: "shop-1", materialKey: "goldGrains24k" } },
          update: { quantity: 120 },
        }),
      );

      expect(prisma.karigarWorkshop.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "ws-1" },
          data: expect.objectContaining({
            metalReturned: { increment: 20 },
            outstandingBalance: { decrement: 20 },
          }),
        }),
      );

      expect(prisma.karigarFinancialEntry.create).not.toHaveBeenCalled();
    });

    it("creates WAGE_ACCRUAL financial entry and posts to General Ledger on RETURN_FINISHED", async () => {
      prisma.karigarWorkshop.findFirst.mockResolvedValue(mockWorkshop);
      prisma.karigarMetalMovement.findMany.mockResolvedValue([
        { type: "ISSUE", weightGrams: 100 },
      ]);
      prisma.karigarVaultReserve.findUnique.mockResolvedValue({ quantity: 50 });
      prisma.shop.findUnique.mockResolvedValue({ currency: "NPR" });
      const mockMovement = { id: "mov-finished-1", createdAt: new Date() };
      prisma.karigarMetalMovement.create.mockResolvedValue(mockMovement);
      prisma.karigarFinancialEntry.create.mockResolvedValue({
        id: "fin-wage-1",
        amount: new Prisma.Decimal(12000),
      });
      prisma.karigarFinancialEntry.findMany.mockResolvedValue([
        { type: "WAGE_ACCRUAL", amount: new Prisma.Decimal(12000) },
      ]);

      await service.addMovement("shop-1", null, "user-1", {
        type: "RETURN_FINISHED",
        weightGrams: 60,
        workshopId: "ws-1",
        metalKey: "goldGrains24k",
      });

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

      expect(accounting.postKarigarWageAccrual).toHaveBeenCalledWith(
        prisma,
        expect.objectContaining({
          shopId: "shop-1",
          financialEntryId: "fin-wage-1",
          workshopId: "ws-1",
        }),
      );
    });

    it("verifies TRANSFER creates movement record without mutating vault or float", async () => {
      prisma.karigarWorkshop.findFirst.mockResolvedValue(mockWorkshop);
      prisma.karigarMetalMovement.create.mockResolvedValue({ id: "mov-transfer-1" });

      await service.addMovement("shop-1", null, "user-1", {
        type: "TRANSFER",
        weightGrams: 25,
        workshopId: "ws-1",
        metalKey: "goldGrains24k",
        note: "Transfer to branch workshop",
      });

      expect(prisma.karigarMetalMovement.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          shopId: "shop-1",
          workshopId: "ws-1",
          type: "TRANSFER",
          weightGrams: 25,
          metalKey: "goldGrains24k",
        }),
      });

      expect(prisma.karigarVaultReserve.upsert).not.toHaveBeenCalled();
      expect(prisma.karigarFinancialEntry.create).not.toHaveBeenCalled();
    });
  });

  describe("Settlement Payments, FIFO Auto-Allocation & Idempotency", () => {
    it("records payment with automatic FIFO allocation across outstanding jobs", async () => {
      prisma.karigarWorkshop.findFirst.mockResolvedValue(mockWorkshop);
      // Two jobs with unallocated wage accruals
      prisma.karigarFinancialEntry.findMany.mockImplementation(({ where }: any) => {
        if (where?.type === "WAGE_ACCRUAL") {
          return [
            { jobId: "job-1", amount: new Prisma.Decimal(3000), createdAt: new Date("2026-08-01") },
            { jobId: "job-2", amount: new Prisma.Decimal(4000), createdAt: new Date("2026-08-02") },
          ];
        }
        return [
          { type: "WAGE_ACCRUAL", amount: new Prisma.Decimal(7000) },
        ];
      });
      prisma.karigarFinancialAllocation.findMany.mockResolvedValue([
        { jobId: "job-1", amount: new Prisma.Decimal(1000) }, // 2000 remaining on job-1
      ]);

      const entryResult = {
        id: "fin-pay-fifo",
        shopId: "shop-1",
        workshopId: "ws-1",
        type: "SETTLEMENT_PAYMENT",
        amount: new Prisma.Decimal(4500),
        currency: "NPR",
        createdAt: new Date(),
      };
      prisma.karigarFinancialEntry.create.mockResolvedValue(entryResult);

      const res = await service.recordPayment("shop-1", "ws-1", "user-1", {
        amount: 4500,
        paymentMethod: "BANK_TRANSFER",
      });

      expect(prisma.karigarFinancialAllocation.createMany).toHaveBeenCalledWith({
        data: [
          { shopId: "shop-1", financialEntryId: "fin-pay-fifo", jobId: "job-1", amount: new Prisma.Decimal(2000) },
          { shopId: "shop-1", financialEntryId: "fin-pay-fifo", jobId: "job-2", amount: new Prisma.Decimal(2500) },
        ],
      });

      expect(accounting.postKarigarSettlementPayment).toHaveBeenCalledWith(
        prisma,
        expect.objectContaining({
          shopId: "shop-1",
          financialEntryId: "fin-pay-fifo",
          method: "BANK_TRANSFER",
        }),
      );

      expect(res.entry.amount).toBe(4500);
    });

    it("supports replay with exact idempotency key payload fingerprint", async () => {
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

      expect(prisma.karigarFinancialEntry.create).not.toHaveBeenCalled();
      expect(res.entry.id).toBe("existing-entry-id");
    });

    it("throws ConflictException when idempotency key is reused for different payload", async () => {
      prisma.karigarFinancialEntry.findUnique.mockResolvedValue({
        id: "existing-entry-id",
        shopId: "shop-1",
        workshopId: "ws-1",
        type: "SETTLEMENT_PAYMENT",
        amount: new Prisma.Decimal(3000),
        allocations: [],
      });

      // Different amount (4000 vs 3000) with same idempotency key
      await expect(
        service.recordPayment("shop-1", "ws-1", "user-1", {
          amount: 4000,
          idempotencyKey: "idem-abc-123",
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe("Workshop Deletion Safeguards & Restrictive Integrity", () => {
    it("refuses to delete workshop if financial ledger history exists", async () => {
      prisma.karigarWorkshop.findFirst.mockResolvedValue(mockWorkshop);
      prisma.karigarJob.count.mockResolvedValue(0);
      prisma.karigarFinancialEntry.count.mockResolvedValue(3); // 3 ledger entries exist
      prisma.karigarMetalMovement.count.mockResolvedValue(0);

      await expect(
        service.deleteWorkshop("shop-1", "ws-1"),
      ).rejects.toThrow(
        "Cannot delete workshop with existing job, ledger, or metal movement history. Archive the workshop instead.",
      );

      expect(prisma.karigarWorkshop.delete).not.toHaveBeenCalled();
    });

    it("allows deletion only when workshop has zero history", async () => {
      prisma.karigarWorkshop.findFirst.mockResolvedValue(mockWorkshop);
      prisma.karigarJob.count.mockResolvedValue(0);
      prisma.karigarFinancialEntry.count.mockResolvedValue(0);
      prisma.karigarMetalMovement.count.mockResolvedValue(0);

      const res = await service.deleteWorkshop("shop-1", "ws-1");
      expect(res).toEqual({ ok: true });
      expect(prisma.karigarWorkshop.delete).toHaveBeenCalledWith({
        where: { id: "ws-1" },
      });
    });
  });

  describe("Statement Filters & Query Contracts", () => {
    it("filters statement by jobId including both direct jobs and allocated jobs", async () => {
      prisma.karigarWorkshop.findFirst.mockResolvedValue(mockWorkshop);

      await service.getWorkshopStatement("shop-1", "ws-1", {
        jobId: "target-job-1",
      });

      expect(prisma.karigarFinancialEntry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            shopId: "shop-1",
            workshopId: "ws-1",
            OR: [
              { jobId: "target-job-1" },
              { allocations: { some: { jobId: "target-job-1" } } },
            ],
          }),
        }),
      );
    });
  });
});
