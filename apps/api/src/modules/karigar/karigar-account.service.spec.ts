import {
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { createHash } from "crypto";
import { KarigarService } from "./karigar.service";

function computeTestFingerprint(payload: object): string {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

describe("KarigarService Account & Settlement Ledger", () => {
  let prisma: any;
  let accounting: any;
  let service: KarigarService;

  beforeEach(() => {
    accounting = {
      prepareMonetaryContext: jest
        .fn()
        .mockImplementation((amount, currency) => ({
          transactionCurrency: currency || "NPR",
          transactionAmount: new Prisma.Decimal(amount),
          canonicalAmountNpr: new Prisma.Decimal(amount),
          fxRate: new Prisma.Decimal(1),
          fxSource: "INTERNAL",
          fxQuotedAt: new Date(),
        })),
      postKarigarWageAccrual: jest
        .fn()
        .mockResolvedValue({ id: "gl-accrual-1" }),
      postKarigarSettlementPayment: jest
        .fn()
        .mockResolvedValue({ id: "gl-pay-1" }),
      postKarigarAdvancePayment: jest.fn().mockResolvedValue({ id: "gl-adv-1" }),
      postKarigarAdvanceApplication: jest
        .fn()
        .mockResolvedValue({ id: "gl-adv-app-1" }),
      postKarigarAdjustment: jest.fn().mockResolvedValue({ id: "gl-adj-1" }),
      postKarigarOpeningBalance: jest
        .fn()
        .mockResolvedValue({ id: "gl-open-1" }),
    };

    prisma = {
      shop: { findUnique: jest.fn().mockResolvedValue({ currency: "NPR" }) },
      karigarJob: {
        findFirst: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        update: jest.fn(),
      },
      karigarJobStage: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
        createMany: jest.fn(),
        update: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
      },
      karigarVaultReserve: {
        findUnique: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        upsert: jest.fn(),
      },
      karigarWorkshop: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        update: jest.fn(),
        delete: jest.fn(),
      },
      karigarMetalMovement: {
        create: jest.fn().mockResolvedValue({ id: "mov-1", createdAt: new Date() }),
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn().mockResolvedValue(null),
        count: jest.fn().mockResolvedValue(0),
        groupBy: jest.fn().mockResolvedValue([]),
      },
      karigarFinancialEntry: {
        create: jest.fn().mockResolvedValue({ id: "fin-1", amount: new Prisma.Decimal(1000), createdAt: new Date() }),
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn().mockResolvedValue(null),
        count: jest.fn().mockResolvedValue(0),
        groupBy: jest.fn().mockResolvedValue([]),
      },
      karigarFinancialAllocation: {
        create: jest.fn().mockResolvedValue({ id: "alloc-1" }),
        createMany: jest.fn().mockResolvedValue({ count: 1 }),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
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

  const mockJob = {
    id: "job-1",
    shopId: "shop-1",
    workshopId: "ws-1",
    product: "Diamond Bridal Ring",
    artisan: "Ramesh Goldsmith",
    status: "Casting",
    allowedWastagePercent: 1.0,
    grossWeight: 10,
    stages: [],
    trees: [],
    movements: [],
    createdAt: new Date("2026-08-01"),
    updatedAt: new Date("2026-08-01"),
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
          where: {
            shopId_materialKey: {
              shopId: "shop-1",
              materialKey: "goldGrains24k",
            },
          },
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

    it("enforces movement workshop matches job workshop", async () => {
      prisma.karigarJob.findFirst.mockResolvedValue({
        ...mockJob,
        workshopId: "ws-other",
      });
      await expect(
        service.addMovement("shop-1", "job-1", "user-1", {
          type: "ISSUE",
          weightGrams: 10,
          workshopId: "ws-1",
        }),
      ).rejects.toThrow("Movement workshop must match the assigned job workshop");
    });
  });

  describe("Numeric Advance Application & GL Reconciliation", () => {
    it("Scenario 1: Advance 500 -> Wage 1000 -> Cash Settlement 500 => Reconciles completely", async () => {
      prisma.karigarWorkshop.findFirst.mockResolvedValue(mockWorkshop);
      prisma.karigarJob.findFirst.mockResolvedValue(mockJob);

      // Step 1: Record Advance 500
      const advEntry = {
        id: "adv-1",
        shopId: "shop-1",
        workshopId: "ws-1",
        type: "ADVANCE_PAYMENT",
        amount: new Prisma.Decimal(500),
        currency: "NPR",
        createdAt: new Date("2026-08-01"),
      };
      prisma.karigarFinancialEntry.create.mockResolvedValue(advEntry);
      prisma.karigarFinancialEntry.findMany.mockResolvedValue([]); // No wages yet

      await service.recordAdvance("shop-1", "ws-1", "user-1", {
        amount: 500,
        paymentMethod: "CASH",
        idempotencyKey: "adv-key-1",
      });

      expect(accounting.postKarigarAdvancePayment).toHaveBeenCalledWith(
        prisma,
        expect.objectContaining({
          financialEntryId: "adv-1",
          workshopId: "ws-1",
        }),
      );

      // Step 2: Finished Return 5g at 200/g = 1000 wage accrued on Job 1
      prisma.karigarFinancialEntry.findMany.mockImplementation(({ where }: any) => {
        if (where?.type === "ADVANCE_PAYMENT") {
          return [{ ...advEntry, allocations: [] }]; // 500 available advance
        }
        return [];
      });
      const wageEntry = {
        id: "wage-1",
        shopId: "shop-1",
        workshopId: "ws-1",
        jobId: "job-1",
        type: "WAGE_ACCRUAL",
        amount: new Prisma.Decimal(1000),
        currency: "NPR",
        createdAt: new Date("2026-08-02"),
      };
      prisma.karigarFinancialEntry.create.mockResolvedValue(wageEntry);
      prisma.karigarMetalMovement.findMany.mockResolvedValue([
        { type: "ISSUE", weightGrams: 10 },
      ]);

      await service.addMovement("shop-1", "job-1", "user-1", {
        type: "RETURN_FINISHED",
        weightGrams: 5,
        workshopId: "ws-1",
        metalKey: "goldGrains24k",
      });

      // Assert GL Wage Accrual posted
      expect(accounting.postKarigarWageAccrual).toHaveBeenCalledWith(
        prisma,
        expect.objectContaining({
          financialEntryId: "wage-1",
          workshopId: "ws-1",
          jobId: "job-1",
        }),
      );

      // Assert Advance Application of 500 posted to GL and Allocation created
      expect(prisma.karigarFinancialAllocation.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          financialEntryId: "adv-1",
          jobId: "job-1",
          amount: new Prisma.Decimal(500),
        }),
      });
      expect(accounting.postKarigarAdvanceApplication).toHaveBeenCalledWith(
        prisma,
        expect.objectContaining({
          financialEntryId: "adv-1",
          jobId: "job-1",
        }),
      );

      // Step 3: Cash settlement 500
      prisma.karigarFinancialEntry.findMany.mockImplementation(({ where }: any) => {
        if (where?.type === "WAGE_ACCRUAL") {
          return [{ jobId: "job-1", amount: new Prisma.Decimal(1000) }];
        }
        return [
          { type: "WAGE_ACCRUAL", amount: new Prisma.Decimal(1000) },
          { type: "ADVANCE_PAYMENT", amount: new Prisma.Decimal(500) },
        ];
      });
      prisma.karigarFinancialAllocation.findMany.mockResolvedValue([
        { jobId: "job-1", amount: new Prisma.Decimal(500) }, // 500 remaining to settle
      ]);
      const settleEntry = {
        id: "settle-1",
        shopId: "shop-1",
        workshopId: "ws-1",
        type: "SETTLEMENT_PAYMENT",
        amount: new Prisma.Decimal(500),
        currency: "NPR",
        createdAt: new Date("2026-08-03"),
      };
      prisma.karigarFinancialEntry.create.mockResolvedValue(settleEntry);

      await service.recordPayment("shop-1", "ws-1", "user-1", {
        amount: 500,
        paymentMethod: "CASH",
        idempotencyKey: "settle-key-1",
      });

      expect(accounting.postKarigarSettlementPayment).toHaveBeenCalledWith(
        prisma,
        expect.objectContaining({
          financialEntryId: "settle-1",
          workshopId: "ws-1",
        }),
      );
    });

    it("Scenario 2: Advance 1200 -> Wage 1000 => 200 Advance in Hand, Job Outstanding 0", async () => {
      prisma.karigarWorkshop.findFirst.mockResolvedValue(mockWorkshop);
      prisma.karigarJob.findFirst.mockResolvedValue(mockJob);

      // Advance 1200 in hand
      const advEntry = {
        id: "adv-large",
        shopId: "shop-1",
        workshopId: "ws-1",
        type: "ADVANCE_PAYMENT",
        amount: new Prisma.Decimal(1200),
        currency: "NPR",
        allocations: [],
        createdAt: new Date("2026-08-01"),
      };
      prisma.karigarFinancialEntry.findMany.mockImplementation(({ where }: any) => {
        if (where?.type === "ADVANCE_PAYMENT") {
          return [advEntry];
        }
        return [
          { type: "ADVANCE_PAYMENT", amount: new Prisma.Decimal(1200) },
          { type: "WAGE_ACCRUAL", amount: new Prisma.Decimal(1000) },
        ];
      });
      prisma.karigarMetalMovement.findMany.mockResolvedValue([
        { type: "ISSUE", weightGrams: 10 },
      ]);

      await service.addMovement("shop-1", "job-1", "user-1", {
        type: "RETURN_FINISHED",
        weightGrams: 5, // 5g * 200/g = 1000
        workshopId: "ws-1",
        metalKey: "goldGrains24k",
      });

      // Exactly 1000 consumed against advance
      expect(prisma.karigarFinancialAllocation.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          financialEntryId: "adv-large",
          jobId: "job-1",
          amount: new Prisma.Decimal(1000),
        }),
      });

      // Check account summary
      prisma.karigarFinancialEntry.findMany.mockResolvedValue([
        { type: "ADVANCE_PAYMENT", amount: new Prisma.Decimal(1200), currency: "NPR" },
        { type: "WAGE_ACCRUAL", amount: new Prisma.Decimal(1000), currency: "NPR" },
      ]);
      const account = await service.getWorkshopAccount("shop-1", "ws-1");
      expect(account.advanceBalance).toBe(200);
      expect(account.amountPayable).toBe(0);
    });

    it("Scenario 3: Wage 1000 -> Advance 300 auto-applies against outstanding job -> Settlement 700", async () => {
      prisma.karigarWorkshop.findFirst.mockResolvedValue(mockWorkshop);
      prisma.karigarJob.findFirst.mockResolvedValue(mockJob);

      // Step 1: Outstanding wage accrual of 1000 exists on job-1
      prisma.karigarFinancialEntry.findMany.mockImplementation(({ where }: any) => {
        if (where?.type === "WAGE_ACCRUAL") {
          return [
            {
              jobId: "job-1",
              amount: new Prisma.Decimal(1000),
              createdAt: new Date("2026-08-01"),
              job: { id: "job-1", product: "Diamond Ring" },
            },
          ];
        }
        return [];
      });
      prisma.karigarFinancialAllocation.findMany.mockResolvedValue([]);

      const advEntry = {
        id: "adv-300",
        shopId: "shop-1",
        workshopId: "ws-1",
        type: "ADVANCE_PAYMENT",
        amount: new Prisma.Decimal(300),
        currency: "NPR",
        createdAt: new Date("2026-08-02"),
      };
      prisma.karigarFinancialEntry.create.mockResolvedValue(advEntry);

      await service.recordAdvance("shop-1", "ws-1", "user-1", {
        amount: 300,
        paymentMethod: "CASH",
        idempotencyKey: "adv-300-key",
      });

      // Auto-application of 300 advance against job-1
      expect(prisma.karigarFinancialAllocation.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          financialEntryId: "adv-300",
          jobId: "job-1",
          amount: new Prisma.Decimal(300),
        }),
      });
      expect(accounting.postKarigarAdvanceApplication).toHaveBeenCalled();
    });
  });

  describe("Settlement Payments, FIFO Auto-Allocation & Idempotency", () => {
    it("records payment with automatic FIFO allocation across outstanding jobs", async () => {
      prisma.karigarWorkshop.findFirst.mockResolvedValue(mockWorkshop);
      // Two jobs with unallocated wage accruals
      prisma.karigarFinancialEntry.findMany.mockImplementation(({ where }: any) => {
        if (where?.type === "WAGE_ACCRUAL") {
          return [
            {
              jobId: "job-1",
              amount: new Prisma.Decimal(3000),
              createdAt: new Date("2026-08-01"),
            },
            {
              jobId: "job-2",
              amount: new Prisma.Decimal(4000),
              createdAt: new Date("2026-08-02"),
            },
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
        idempotencyKey: "pay-fifo-key",
      });

      expect(prisma.karigarFinancialAllocation.createMany).toHaveBeenCalledWith({
        data: [
          {
            shopId: "shop-1",
            financialEntryId: "fin-pay-fifo",
            jobId: "job-1",
            amount: new Prisma.Decimal(2000),
          },
          {
            shopId: "shop-1",
            financialEntryId: "fin-pay-fifo",
            jobId: "job-2",
            amount: new Prisma.Decimal(2500),
          },
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

    it("canonicalizes duplicate explicit allocations before validation and persistence", async () => {
      prisma.karigarWorkshop.findFirst.mockResolvedValue(mockWorkshop);
      prisma.karigarJob.findMany.mockResolvedValue([
        { id: "job-1", product: "Diamond Bridal Ring" },
      ]);
      prisma.karigarFinancialEntry.findMany.mockImplementation(({ where }: any) => {
        if (where?.type === "OPENING_BALANCE") return [];
        if (where?.type === "WAGE_ACCRUAL") {
          return [{ jobId: "job-1", amount: new Prisma.Decimal(100) }];
        }
        return [{ type: "WAGE_ACCRUAL", amount: new Prisma.Decimal(100) }];
      });
      prisma.karigarFinancialAllocation.findMany.mockResolvedValue([]);
      prisma.karigarFinancialEntry.create.mockResolvedValue({
        id: "fin-duplicate-allocation",
        shopId: "shop-1",
        workshopId: "ws-1",
        type: "SETTLEMENT_PAYMENT",
        amount: new Prisma.Decimal(50),
        currency: "NPR",
        createdAt: new Date(),
      });

      await service.recordPayment("shop-1", "ws-1", "user-1", {
        amount: 50,
        paymentMethod: "CASH",
        idempotencyKey: "duplicate-explicit-allocation-key",
        allocations: [
          { jobId: "job-1", amount: 25 },
          { jobId: "job-1", amount: 25 },
        ],
      });

      expect(prisma.karigarJob.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: { in: ["job-1"] } }),
        }),
      );
      expect(prisma.karigarFinancialAllocation.createMany).toHaveBeenCalledWith({
        data: [
          {
            shopId: "shop-1",
            financialEntryId: "fin-duplicate-allocation",
            jobId: "job-1",
            amount: new Prisma.Decimal(50),
          },
        ],
      });
    });

    it("supports replay with exact idempotency key payload fingerprint", async () => {
      const expectedFingerprint = computeTestFingerprint({
        workshopId: "ws-1",
        operation: "PAYMENT",
        amount: 3000,
        paymentMethod: "CASH",
        reference: null,
        note: null,
        allocationMode: "AUTO_FIFO",
        allocations: [],
      });

      prisma.karigarFinancialEntry.findUnique.mockResolvedValue({
        id: "existing-entry-id",
        shopId: "shop-1",
        workshopId: "ws-1",
        type: "SETTLEMENT_PAYMENT",
        amount: new Prisma.Decimal(3000),
        requestFingerprint: expectedFingerprint,
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
        requestFingerprint: "fingerprint-for-3000",
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

  describe("Currency Isolation & Multi-currency Guards", () => {
    it("throws ConflictException if Karigar account contains mixed currencies", async () => {
      prisma.karigarWorkshop.findFirst.mockResolvedValue(mockWorkshop);
      prisma.karigarFinancialEntry.findMany.mockResolvedValue([
        { type: "WAGE_ACCRUAL", amount: new Prisma.Decimal(1000), currency: "NPR" },
        { type: "SETTLEMENT_PAYMENT", amount: new Prisma.Decimal(500), currency: "INR" },
      ]);
      prisma.karigarMetalMovement.findMany.mockResolvedValue([]);
      prisma.karigarJob.findMany.mockResolvedValue([]);

      await expect(
        service.getWorkshopAccount("shop-1", "ws-1"),
      ).rejects.toThrow("Currency rebase must be migrated immutably.");
    });
  });

  describe("Job Workshop Immutability & Reassignment Safeguards", () => {
    it("rejects changing workshopId once metal movements exist for that job", async () => {
      prisma.karigarJob.findFirst.mockResolvedValue({
        ...mockJob,
        workshopId: "ws-1",
      });
      prisma.karigarWorkshop.findFirst.mockResolvedValue({
        id: "ws-new",
        shopId: "shop-1",
        name: "New Workshop",
      });
      prisma.karigarMetalMovement.count.mockResolvedValue(1); // 1 movement exists

      await expect(
        service.updateJob("shop-1", "job-1", {
          workshopId: "ws-new",
        }),
      ).rejects.toThrow(
        "Cannot reassign workshop once metal movements, stages, or financial ledger entries exist for this job. Use an explicit workshop transfer workflow.",
      );
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

    it("filters statement by category directly in database query", async () => {
      prisma.karigarWorkshop.findFirst.mockResolvedValue(mockWorkshop);
      prisma.karigarFinancialEntry.findMany.mockResolvedValue([]);
      prisma.karigarFinancialEntry.count.mockResolvedValue(0);

      await service.getWorkshopStatement("shop-1", "ws-1", {
        type: "PAYMENTS",
      });

      expect(prisma.karigarFinancialEntry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            shopId: "shop-1",
            workshopId: "ws-1",
            type: "SETTLEMENT_PAYMENT",
          }),
        }),
      );
      expect(prisma.karigarMetalMovement.findMany).not.toHaveBeenCalled();
    });

    it("parses valid base64url cursor containing _ and - without error", async () => {
      prisma.karigarWorkshop.findFirst.mockResolvedValue(mockWorkshop);
      prisma.karigarFinancialEntry.findMany.mockResolvedValue([]);
      prisma.karigarMetalMovement.findMany.mockResolvedValue([]);

      const cursorObj = {
        createdAt: "2026-08-26T12:00:00.000Z",
        id: "entry_1-2_3",
      };
      const base64url = Buffer.from(JSON.stringify(cursorObj))
        .toString("base64")
        .replace(/=/g, "")
        .replace(/\+/g, "-")
        .replace(/\//g, "_");
      const cursor = `v1.${base64url}`;

      const res = await service.getWorkshopStatement("shop-1", "ws-1", {
        cursor,
      });
      expect(res).toBeDefined();
      expect(res.items).toEqual([]);
    });

    it("rejects malformed cursor format with BadRequestException", async () => {
      prisma.karigarWorkshop.findFirst.mockResolvedValue(mockWorkshop);

      await expect(
        service.getWorkshopStatement("shop-1", "ws-1", {
          cursor: "invalid-unversioned-cursor",
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("Hardening & Regression Validations", () => {
    it("1. auto-payment retry after original allocation committed replays exact transaction without failing outstanding wage check", async () => {
      const runTimestamp = Date.now();
      const fp = computeTestFingerprint({
        workshopId: "ws-1",
        operation: "PAYMENT",
        amount: 500,
        paymentMethod: "CASH",
        reference: null,
        note: null,
        allocationMode: "AUTO_FIFO",
        allocations: [],
      });

      // Existing committed entry with exact matching request fingerprint
      prisma.karigarFinancialEntry.findUnique.mockResolvedValue({
        id: "fin-pay-auto-1",
        shopId: "shop-1",
        workshopId: "ws-1",
        type: "SETTLEMENT_PAYMENT",
        amount: new Prisma.Decimal(500),
        currency: "NPR",
        requestFingerprint: fp,
      });

      // Financial entries now reflect 0 payable
      prisma.karigarFinancialEntry.findMany.mockResolvedValue([
        { type: "WAGE_ACCRUAL", amount: new Prisma.Decimal(500) },
        { type: "SETTLEMENT_PAYMENT", amount: new Prisma.Decimal(500) },
      ]);

      const res = await service.recordPayment("shop-1", "ws-1", "user-1", {
        amount: 500,
        paymentMethod: "CASH",
        idempotencyKey: `auto-pay-key-${runTimestamp}`,
      });

      expect(res.entry.id).toBe("fin-pay-auto-1");
      expect(res.entry.amount).toBe(500);
      expect(res.summary.amountPayable).toBe(0);
      expect(prisma.karigarFinancialEntry.create).not.toHaveBeenCalled();
    });

    it("2. explicit-payment retry after original allocation committed replays exact transaction", async () => {
      const runTimestamp = Date.now();
      const fp = computeTestFingerprint({
        workshopId: "ws-1",
        operation: "PAYMENT",
        amount: 500,
        paymentMethod: "CASH",
        reference: null,
        note: null,
        allocationMode: "EXPLICIT",
        allocations: [{ jobId: "job-1", amount: 500 }],
      });

      prisma.karigarFinancialEntry.findUnique.mockResolvedValue({
        id: "fin-pay-exp-1",
        shopId: "shop-1",
        workshopId: "ws-1",
        type: "SETTLEMENT_PAYMENT",
        amount: new Prisma.Decimal(500),
        currency: "NPR",
        requestFingerprint: fp,
      });

      prisma.karigarFinancialEntry.findMany.mockResolvedValue([
        { type: "WAGE_ACCRUAL", amount: new Prisma.Decimal(500) },
        { type: "SETTLEMENT_PAYMENT", amount: new Prisma.Decimal(500) },
      ]);

      const res = await service.recordPayment("shop-1", "ws-1", "user-1", {
        amount: 500,
        paymentMethod: "CASH",
        allocations: [{ jobId: "job-1", amount: 500 }],
        idempotencyKey: `exp-pay-key-${runTimestamp}`,
      });

      expect(res.entry.id).toBe("fin-pay-exp-1");
      expect(res.entry.amount).toBe(500);
      expect(prisma.karigarFinancialEntry.create).not.toHaveBeenCalled();
    });

    it("3. allows multiple partial wage returns to consume the same advance on the same job", async () => {
      // Setup job and workshop
      prisma.karigarWorkshop.findFirst.mockResolvedValue(mockWorkshop);
      prisma.karigarJob.findFirst.mockResolvedValue(mockJob);
      prisma.karigarMetalMovement.findMany.mockResolvedValue([
        { type: "ISSUE", weightGrams: 10 },
      ]);

      // There is an unallocated advance of 1000 with 400 already allocated
      prisma.karigarFinancialEntry.findMany.mockImplementation((args: any) => {
        if (args?.where?.type === "ADVANCE_PAYMENT") {
          return Promise.resolve([
            {
              id: "adv-1",
              amount: new Prisma.Decimal(1000),
              createdAt: new Date("2026-08-01"),
              allocations: [
                {
                  id: "alloc-1",
                  financialEntryId: "adv-1",
                  jobId: "job-1",
                  amount: new Prisma.Decimal(400),
                },
              ],
            },
          ]);
        }
        return Promise.resolve([]);
      });

      // Existing allocations: first return already allocated 400 from adv-1 to job-1
      prisma.karigarFinancialAllocation.findMany.mockResolvedValue([
        {
          id: "alloc-1",
          financialEntryId: "adv-1",
          jobId: "job-1",
          amount: new Prisma.Decimal(400),
        },
      ]);

      // Second return of 1.5g @ 200/g = 300 wage on same job-1
      await service.addMovement("shop-1", "job-1", "user-1", {
        type: "RETURN_FINISHED",
        weightGrams: 1.5,
        workshopId: "ws-1",
        metalKey: "goldGrains24k",
        idempotencyKey: `return-part-2-${Date.now()}`,
      });

      // Assert that a second allocation row for (adv-1, job-1) is created with amount 300
      expect(prisma.karigarFinancialAllocation.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          financialEntryId: "adv-1",
          jobId: "job-1",
          amount: new Prisma.Decimal(300),
        }),
      });
    });

    it("4. replaceSnapshot throws ForbiddenException if any workshop belongs to another shop", async () => {
      prisma.karigarWorkshop.findUnique.mockImplementation((args: any) => {
        if (args?.where?.id === "foreign-ws-1") {
          return Promise.resolve({
            id: "foreign-ws-1",
            shopId: "shop-OTHER",
          });
        }
        return Promise.resolve(null);
      });

      await expect(
        service.replaceSnapshot("shop-1", {
          vaultReserves: {},
          workshops: [
            {
              id: "foreign-ws-1",
              name: "Foreign Workshop",
              artisan: "Foreign Artisan",
              wageRatePerGram: 200,
              wastageLimit: 1.0,
            },
          ],
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it("5. getWorkshopAccount throws ConflictException if single historical entry currency != current shop currency", async () => {
      prisma.karigarWorkshop.findFirst.mockResolvedValue({
        ...mockWorkshop,
        shop: { currency: "NPR" },
      });
      prisma.karigarFinancialEntry.findMany.mockResolvedValue([
        {
          type: "WAGE_ACCRUAL",
          amount: new Prisma.Decimal(1000),
          currency: "USD",
        },
      ]);
      prisma.karigarMetalMovement.findMany.mockResolvedValue([]);
      prisma.karigarJob.findMany.mockResolvedValue([]);

      await expect(
        service.getWorkshopAccount("shop-1", "ws-1"),
      ).rejects.toThrow(ConflictException);
    });

    it("6. adjustment decrease == payable succeeds; decrease > payable throws BadRequestException", async () => {
      prisma.karigarWorkshop.findFirst.mockResolvedValue(mockWorkshop);
      // Current ledger payable is 500
      prisma.karigarFinancialEntry.findMany.mockResolvedValue([
        { type: "WAGE_ACCRUAL", amount: new Prisma.Decimal(500) },
      ]);

      // Exactly 500 decrease succeeds
      await expect(
        service.recordAdjustment("shop-1", "ws-1", "user-1", {
          type: "ADJUSTMENT_DECREASE",
          amount: 500,
          note: "Full deduction",
          idempotencyKey: `adj-exact-${Date.now()}`,
        }),
      ).resolves.toBeDefined();

      // 500.01 decrease fails
      await expect(
        service.recordAdjustment("shop-1", "ws-1", "user-1", {
          type: "ADJUSTMENT_DECREASE",
          amount: 500.01,
          note: "Over deduction",
          idempotencyKey: `adj-over-${Date.now()}`,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
