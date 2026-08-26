import { BadRequestException } from "@nestjs/common";
import { KarigarService } from "./karigar.service";

describe("KarigarService workshop safeguards", () => {
  let prisma: any;
  let service: KarigarService;

  beforeEach(() => {
    prisma = {
      shop: { findUnique: jest.fn() },
      karigarJob: { findFirst: jest.fn(), update: jest.fn() },
      karigarJobStage: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        createMany: jest.fn(),
        update: jest.fn(),
      },
      karigarVaultReserve: { findUnique: jest.fn(), upsert: jest.fn() },
      karigarWorkshop: { findFirst: jest.fn(), update: jest.fn() },
      karigarMetalMovement: { create: jest.fn() },
      inventoryItem: { update: jest.fn() },
      $transaction: jest.fn(async (cb) => (typeof cb === "function" ? cb(prisma) : cb)),
      $queryRaw: jest.fn().mockResolvedValue([{ id: "ws-1" }]),
    };
    const accountingMock = {
      prepareMonetaryContext: jest.fn().mockImplementation((amount, currency) => ({
        transactionCurrency: currency || "NPR",
        transactionAmount: amount,
        canonicalAmountNpr: amount,
        fxRate: 1,
        fxSource: "INTERNAL",
        fxQuotedAt: new Date(),
      })),
      postKarigarWageAccrual: jest.fn().mockResolvedValue({ id: "gl-accrual-1" }),
      postKarigarSettlementPayment: jest.fn().mockResolvedValue({ id: "gl-pay-1" }),
      postKarigarAdvancePayment: jest.fn().mockResolvedValue({ id: "gl-adv-1" }),
      postKarigarAdjustment: jest.fn().mockResolvedValue({ id: "gl-adj-1" }),
    };
    service = new KarigarService(prisma, {} as never, {} as never, accountingMock as never);
  });

  const activeJob = {
    id: "job-1",
    status: "Casting",
    currentStage: "CASTING",
  };
  const cancelledJob = { ...activeJob, status: "CANCELLED" };

  it("requires an approved QC stage before receiving finished goods", async () => {
    (service as any).requireWorkshopShop = jest.fn().mockResolvedValue({});
    prisma.karigarJob.findFirst.mockResolvedValue({
      ...activeJob,
      stages: [{ stage: "QC", status: "DONE", qcApprovedAt: null }],
      trees: [],
    });

    await expect(service.receiveFg("shop-1", "job-1", {})).rejects.toEqual(
      expect.objectContaining<Partial<BadRequestException>>({
        message: "Approve this job in Workshop QC before receiving finished goods",
      }),
    );
  });

  it("rejects a generic QC DONE update", async () => {
    prisma.karigarJob.findFirst.mockResolvedValue(activeJob);
    prisma.shop.findUnique.mockResolvedValue({ workshopMode: true });

    await expect(
      service.updateStage("shop-1", "job-1", "QC", { status: "DONE" }),
    ).rejects.toThrow("Use Workshop QC inspection");
  });

  it("does not let a generic job update enter QC or complete production", async () => {
    prisma.karigarJob.findFirst.mockResolvedValue(activeJob);

    await expect(
      service.updateJob("shop-1", "job-1", { currentStage: "QC" }),
    ).rejects.toThrow("Use the workshop stage flow");
    await expect(
      service.updateJob("shop-1", "job-1", { status: "Completed" }),
    ).rejects.toThrow("Use the workshop stage flow");
    expect(prisma.karigarJob.update).not.toHaveBeenCalled();
  });

  it("does not turn QC gold-out into generic approval", async () => {
    prisma.karigarJob.findFirst.mockResolvedValue(activeJob);
    prisma.shop.findUnique.mockResolvedValue({ workshopMode: true });
    prisma.karigarJobStage.findMany.mockResolvedValue([]);
    prisma.karigarJobStage.findUnique.mockResolvedValue({
      id: "qc-1",
      stage: "QC",
      goldInGrams: 10,
      goldOutGrams: 0,
      scrapGrams: 0,
      dustGrams: 0,
      allowedWastagePercent: 1,
      workshopId: "ws-1",
      status: "IN_PROGRESS",
      notes: null,
      photos: [],
      reworkCount: 0,
      rejectionReason: null,
      startedAt: null,
      completedAt: null,
    });
    jest.spyOn(service as any, "syncJobStatus").mockResolvedValue(undefined);
    jest.spyOn(service, "getJob").mockResolvedValue({} as never);

    await service.updateStage("shop-1", "job-1", "QC", {
      goldOutGrams: 10,
    });

    expect(prisma.karigarJobStage.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "IN_PROGRESS",
          completedAt: null,
        }),
      }),
    );
  });

  it("keeps normal Karigar-book QC completion separate from Workshop approval", async () => {
    prisma.karigarJob.findFirst.mockResolvedValue(activeJob);
    prisma.shop.findUnique.mockResolvedValue({ workshopMode: false });
    prisma.karigarJobStage.findMany.mockResolvedValue([]);
    prisma.karigarJobStage.findUnique.mockResolvedValue({
      id: "qc-1",
      stage: "QC",
      goldInGrams: 10,
      goldOutGrams: 0,
      scrapGrams: 0,
      dustGrams: 0,
      allowedWastagePercent: 1,
      workshopId: "ws-1",
      status: "IN_PROGRESS",
      notes: null,
      photos: [],
      reworkCount: 0,
      rejectionReason: null,
      startedAt: null,
      completedAt: null,
    });
    jest.spyOn(service as any, "syncJobStatus").mockResolvedValue(undefined);
    jest.spyOn(service, "getJob").mockResolvedValue({} as never);

    await service.updateStage("shop-1", "job-1", "QC", {
      goldOutGrams: 10,
    });

    expect(prisma.karigarJobStage.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "DONE" }),
      }),
    );
  });

  it("requires dedicated QC inspection instead of advancing the QC floor stage", async () => {
    (service as any).requireWorkshopShop = jest.fn().mockResolvedValue({
      workshopDepartments: ["CASTING", "QC"],
    });
    prisma.karigarJob.findFirst.mockResolvedValue({
      ...activeJob,
      currentStage: "QC",
    });

    await expect(
      service.advanceFloor("shop-1", "job-1", { goldOutGrams: 10 }),
    ).rejects.toThrow("Use Workshop QC inspection");
  });

  it("uses dedicated QC approval to permit finished-goods receipt", async () => {
    (service as any).requireWorkshopShop = jest.fn().mockResolvedValue({});
    prisma.karigarJob.findFirst.mockResolvedValue({
      ...activeJob,
      currentStage: "QC",
    });
    prisma.karigarJobStage.findMany.mockResolvedValue([]);
    prisma.karigarJobStage.findUnique.mockResolvedValue({
      id: "qc-1",
      goldInGrams: 10,
      goldOutGrams: 0,
      notes: null,
      photos: [],
      rejectionReason: null,
    });
    const tx = {
      karigarJobStage: { update: jest.fn() },
      karigarJob: { update: jest.fn() },
    };
    prisma.$transaction.mockImplementation(async (callback: any) => callback(tx));
    jest.spyOn(service, "getJob").mockResolvedValue({} as never);

    await service.inspectQc("shop-1", "job-1", { decision: "APPROVED" });

    expect(tx.karigarJobStage.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "DONE",
          qcApprovedAt: expect.any(Date),
        }),
      }),
    );

    prisma.karigarJob.findFirst.mockResolvedValue({
      ...activeJob,
      inventoryItemId: "item-1",
      product: "Ring",
      photos: [],
      stages: [{ stage: "QC", status: "DONE", qcApprovedAt: new Date() }],
      trees: [{ finishedGrams: 10 }],
    });
    prisma.inventoryItem.update.mockResolvedValue({ id: "item-1" });

    await expect(service.receiveFg("shop-1", "job-1", {})).resolves.toEqual(
      expect.objectContaining({ inventoryItem: { id: "item-1" } }),
    );
  });

  it("does not permit finished-goods receipt after dedicated QC rework", async () => {
    (service as any).requireWorkshopShop = jest.fn().mockResolvedValue({});
    prisma.karigarJob.findFirst.mockResolvedValue({
      ...activeJob,
      currentStage: "QC",
    });
    prisma.karigarJobStage.findMany.mockResolvedValue([]);
    prisma.karigarJobStage.findUnique.mockResolvedValue({
      id: "qc-1",
      goldInGrams: 10,
      goldOutGrams: 0,
      notes: null,
      photos: [],
      rejectionReason: null,
    });
    const tx = {
      karigarJobStage: { update: jest.fn() },
      karigarJob: { update: jest.fn() },
    };
    prisma.$transaction.mockImplementation(async (callback: any) => callback(tx));
    jest.spyOn(service, "getJob").mockResolvedValue({} as never);

    await service.inspectQc("shop-1", "job-1", { decision: "REWORK" });
    expect(tx.karigarJobStage.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "REWORK", qcApprovedAt: null }),
      }),
    );

    prisma.karigarJob.findFirst.mockResolvedValue({
      ...activeJob,
      stages: [{ stage: "QC", status: "REWORK", qcApprovedAt: null }],
      trees: [{ finishedGrams: 10 }],
    });

    await expect(service.receiveFg("shop-1", "job-1", {})).rejects.toThrow(
      "Approve this job in Workshop QC",
    );
  });

  it("advances ordinary production departments to the next stage", async () => {
    (service as any).requireWorkshopShop = jest.fn().mockResolvedValue({
      workshopDepartments: ["CASTING", "FILING"],
    });
    prisma.karigarJob.findFirst.mockResolvedValue(activeJob);
    jest.spyOn(service as any, "ensureStages").mockResolvedValue(undefined);
    prisma.karigarJobStage.findUnique.mockResolvedValue({
      id: "casting-1",
      status: "IN_PROGRESS",
      goldOutGrams: 0,
      notes: null,
      photos: [],
      startedAt: null,
      completedAt: null,
    });
    const tx = {
      karigarJobStage: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        update: jest.fn(),
      },
      karigarJob: { update: jest.fn() },
    };
    prisma.$transaction.mockImplementation(async (callback: any) => callback(tx));
    jest.spyOn(service as any, "syncJobStatus").mockResolvedValue(undefined);
    jest.spyOn(service, "getJob").mockResolvedValue({} as never);

    await service.advanceFloor("shop-1", "job-1", { goldOutGrams: 10 });

    expect(tx.karigarJob.update).toHaveBeenCalledWith({
      where: { id: "job-1" },
      data: { currentStage: "FILING" },
    });
  });

  it("cancels and retains a job instead of deleting its history", async () => {
    prisma.karigarJob.findFirst.mockResolvedValue(activeJob);
    prisma.karigarJob.update.mockResolvedValue({
      id: "job-1",
      status: "CANCELLED",
    });

    await expect(service.deleteJob("shop-1", "job-1")).resolves.toEqual({
      ok: true,
      status: "CANCELLED",
    });
    expect(prisma.karigarJob.update).toHaveBeenCalledWith({
      where: { id: "job-1" },
      data: { status: "CANCELLED" },
    });
  });

  it.each([
    [
      "update job",
      (service: KarigarService) =>
        service.updateJob("shop-1", "job-1", { status: "Casting" }),
    ],
    [
      "update stage",
      (service: KarigarService) =>
        service.updateStage("shop-1", "job-1", "CASTING", {}),
    ],
    [
      "advance floor",
      (service: KarigarService) =>
        service.advanceFloor("shop-1", "job-1", { goldOutGrams: 1 }),
    ],
    [
      "create tree",
      (service: KarigarService) =>
        service.createTree("shop-1", "job-1", { issuedGrams: 1 }),
    ],
    [
      "update tree",
      (service: KarigarService) =>
        service.updateTree("shop-1", "job-1", "tree-1", {}),
    ],
  ])("rejects %s after cancellation", async (_name, attempt) => {
    prisma.karigarJob.findFirst.mockResolvedValue(cancelledJob);
    (service as any).requireWorkshopShop = jest.fn().mockResolvedValue({});

    await expect(attempt(service)).rejects.toThrow(
      "Cancelled jobs are archived and cannot resume production",
    );
  });

  it("rejects new ISSUE movements and finished-goods receipt after cancellation", async () => {
    prisma.karigarJob.findFirst.mockResolvedValue(cancelledJob);

    await expect(
      service.addMovement("shop-1", "job-1", "user-1", {
        type: "ISSUE",
        weightGrams: 1,
        workshopId: "ws-1",
      }),
    ).rejects.toThrow("Cancelled jobs are archived and cannot resume production");

    (service as any).requireWorkshopShop = jest.fn().mockResolvedValue({});
    prisma.karigarJob.findFirst.mockResolvedValue({
      ...cancelledJob,
      stages: [{ stage: "QC", status: "DONE", qcApprovedAt: new Date() }],
      trees: [{ finishedGrams: 1 }],
    });
    await expect(service.receiveFg("shop-1", "job-1", {})).rejects.toThrow(
      "Cancelled jobs are archived and cannot resume production",
    );
  });

  it("keeps a cancelled job terminal when status synchronization runs", async () => {
    prisma.karigarJob.findFirst.mockResolvedValue(cancelledJob);

    await expect(
      (service as any).syncJobStatus("shop-1", "job-1"),
    ).resolves.toBeUndefined();
    expect(prisma.karigarJob.update).not.toHaveBeenCalled();
  });

  it("keeps cancelled jobs visible as read-only archived history", () => {
    const serialized = (service as any).serializeJob({
      ...cancelledJob,
      workshopId: "ws-1",
      grossWeight: 1,
      metalKey: "goldGrains24k",
      allowedWastagePercent: 1,
      steps: null,
      updatedAt: new Date("2026-08-25T00:00:00.000Z"),
    });

    expect(serialized).toMatchObject({ archived: true, readOnly: true });
  });

  it("still allows physical metal return reconciliation after cancellation", async () => {
    prisma.karigarJob.findFirst.mockResolvedValue(cancelledJob);
    const tx = {
      shop: { findUnique: jest.fn().mockResolvedValue({ currency: "NPR" }) },
      karigarVaultReserve: {
        findUnique: jest.fn().mockResolvedValue({ quantity: 0 }),
        upsert: jest.fn(),
      },
      karigarWorkshop: {
        findFirst: jest
          .fn()
          .mockResolvedValue({ id: "ws-1", wageRatePerGram: 2 }),
        update: jest.fn(),
      },
      karigarMetalMovement: {
        create: jest.fn().mockResolvedValue({ id: "mov-1" }),
        findMany: jest.fn().mockResolvedValue([{ type: "ISSUE", weightGrams: 10 }]),
      },
      karigarFinancialEntry: {
        create: jest.fn().mockResolvedValue({ id: "fin-entry-1" }),
        findMany: jest.fn().mockResolvedValue([]),
      },
      $queryRaw: jest.fn().mockResolvedValue([{ id: "ws-1" }]),
    };
    prisma.$transaction.mockImplementation(async (callback: any) => callback(tx));
    jest.spyOn(service, "getJob").mockResolvedValue({ archived: true } as never);

    await expect(
      service.addMovement("shop-1", "job-1", "user-1", {
        type: "RETURN_FINISHED",
        weightGrams: 1,
        workshopId: "ws-1",
      }),
    ).resolves.toEqual({ archived: true });
    expect(tx.karigarMetalMovement.create).toHaveBeenCalledTimes(1);
    expect(tx.karigarWorkshop.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ outstandingBalance: { decrement: 1 } }),
      }),
    );
  });
});
