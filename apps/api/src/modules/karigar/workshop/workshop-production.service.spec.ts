import { Prisma, WorkshopAccountBucket } from "@prisma/client";
import { WorkshopProductionService } from "./workshop-production.service";

const grams = (value: string) => new Prisma.Decimal(value);

describe("WorkshopProductionService batch reconciliation", () => {
  const tree = {
    id: "tree-1", shopId: "shop-1", jobId: "job-1",
    lines: [{ weightGrams: 50 }], workshopBatchChildren: [], workshopProcessRuns: [], job: {},
  };
  const entry = (bucket: WorkshopAccountBucket, debit: string, credit: string) => ({
    id: `${bucket}-${debit}-${credit}`, referenceType: "MATERIAL_ISSUE", weightGrams: grams("50"),
    lines: [{ accountId: "a", account: { bucket }, debitGrams: grams(debit), creditGrams: grams(credit) }],
  });
  const journal = { serializeEntry: jest.fn((value) => ({ id: value.id })) } as any;
  const scale = {} as any;

  function service(journals: unknown[], returnedTree: any = tree) {
    const prisma = {
      karigarCastingTree: { findFirst: jest.fn().mockResolvedValue(returnedTree) },
      workshopMetalJournal: { findMany: jest.fn().mockResolvedValue(journals) },
    } as any;
    return new WorkshopProductionService(prisma, journal, scale);
  }

  it("keeps a batch pending while physically measured metal remains in tree WIP", async () => {
    const report = await service([entry(WorkshopAccountBucket.WIP, "50", "0")]).batchReconciliation("shop-1", "tree-1");
    expect(report.outstandingWipGrams).toBe("50.000000");
    expect(report.reconciliationState).toBe("RECONCILIATION_PENDING");
  });

  it("does not count both a received transfer and its temporary transit debit as final output", async () => {
    const journals = [
      entry(WorkshopAccountBucket.WIP, "50", "0"),
      { ...entry(WorkshopAccountBucket.TRANSIT, "50", "0"), referenceType: "TRANSFER_DISPATCH", lines: [
        { accountId: "w", account: { bucket: WorkshopAccountBucket.WIP }, debitGrams: grams("0"), creditGrams: grams("50") },
        { accountId: "t", account: { bucket: WorkshopAccountBucket.TRANSIT }, debitGrams: grams("50"), creditGrams: grams("0") },
      ] },
      { ...entry(WorkshopAccountBucket.TRANSIT, "0", "50"), referenceType: "TRANSFER_RECEIPT", lines: [
        { accountId: "t", account: { bucket: WorkshopAccountBucket.TRANSIT }, debitGrams: grams("0"), creditGrams: grams("50") },
        { accountId: "w", account: { bucket: WorkshopAccountBucket.WIP }, debitGrams: grams("50"), creditGrams: grams("0") },
      ] },
    ];
    const report = await service(journals).batchReconciliation("shop-1", "tree-1");
    expect(report.inTransitGrams).toBe("0.000000");
    expect(report.outstandingWipGrams).toBe("50.000000");
    expect(report.dispositions).not.toHaveProperty("TRANSIT");
    expect(report.reconciliationState).toBe("RECONCILIATION_PENDING");
  });

  it("reports CAD, recipe recommendations and actual measured inputs separately by material", async () => {
    const entries = [
      { id: "gold-input", referenceType: "MATERIAL_ISSUE", materialKey: "goldGrains995", weightGrams: grams("55.30"), lines: [
        { account: { bucket: WorkshopAccountBucket.WIP, materialKey: "goldGrains995" }, debitGrams: grams("55.30"), creditGrams: grams("0") },
      ] },
      { id: "alloy-input", referenceType: "MATERIAL_ISSUE", materialKey: "masterAlloy", weightGrams: grams("4.70"), lines: [
        { account: { bucket: WorkshopAccountBucket.WIP, materialKey: "masterAlloy" }, debitGrams: grams("4.70"), creditGrams: grams("0") },
      ] },
    ];
    const svc = service(entries, { ...tree, workshopProcessRuns: [{ id: "run-1", targetWeightGrams: grams("60"), recipe: {
      targetFineGoldFraction: grams("0.916667"), alloyFineGoldFraction: grams("0"),
    } }] });
    jest.spyOn(svc, "runReconciliation").mockResolvedValue({ reconciliationState: "RECONCILIATION_PENDING" } as any);
    const report = await svc.batchReconciliation("shop-1", "tree-1");
    expect(report.theoreticalCadGrams).toBe("50.000000");
    expect(report.recommendedInputsByMaterial).toEqual({ goldGrains995: "55.280000", masterAlloy: "4.720000" });
    expect(report.actualInputsByMaterial).toEqual({ goldGrains995: "55.300000", masterAlloy: "4.700000" });
    expect(report.balancesByMaterial).toEqual({
      goldGrains995: { WIP: "55.300000" }, masterAlloy: { WIP: "4.700000" },
    });
  });
});

describe("WorkshopProductionService TRACEABLE QC", () => {
  const createService = (runStatus: string) => {
    const tx: any = {
      $queryRaw: jest.fn().mockResolvedValue([{ id: "job-1" }]),
      karigarJob: { findFirst: jest.fn().mockResolvedValue({ id: "job-1", status: "Casting" }), update: jest.fn().mockResolvedValue({}) },
      karigarJobStage: { findUnique: jest.fn().mockResolvedValue({ id: "qc-1", status: "IN_PROGRESS", qcApprovedAt: null }), update: jest.fn().mockResolvedValue({}) },
      workshopProcessRun: { findMany: jest.fn().mockResolvedValue([{ status: runStatus }]) },
      workshopRouteStep: { findMany: jest.fn().mockResolvedValue([{ status: "DONE" }]) },
      workshopTransfer: { findMany: jest.fn().mockResolvedValue([{ status: "RECONCILED" }]) },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
    };
    const service = new WorkshopProductionService(
      { $transaction: (fn: (client: any) => Promise<unknown>) => fn(tx) } as any,
      {} as any, { requireTraceableShop: jest.fn().mockResolvedValue({}) } as any,
    );
    return { service, tx };
  };

  it("approves reconciled process work without copying a Float stage weight", async () => {
    const { service, tx } = createService("RECONCILED");
    const result = await service.inspectQc("shop-1", "supervisor-1", "job-1", { decision: "APPROVED" });
    expect(result).toEqual(expect.objectContaining({ decision: "APPROVED", qcApprovedAt: expect.any(Date) }));
    expect(tx.karigarJobStage.update).toHaveBeenCalledWith({ where: { id: "qc-1" }, data: expect.objectContaining({ status: "DONE", qcApprovedAt: expect.any(Date) }) });
    expect(tx.karigarJobStage.update.mock.calls[0][0].data).not.toHaveProperty("goldOutGrams");
    expect(tx.auditLog.create).toHaveBeenCalledWith({ data: expect.objectContaining({ action: "WORKSHOP_TRACEABLE_QC", userId: "supervisor-1" }) });
  });

  it("blocks QC while a process run is not physically reconciled", async () => {
    const { service, tx } = createService("RECONCILIATION_PENDING");
    await expect(service.inspectQc("shop-1", "supervisor-1", "job-1", { decision: "APPROVED" }))
      .rejects.toThrow("Reconcile every process");
    expect(tx.karigarJobStage.update).not.toHaveBeenCalled();
  });
});

describe("WorkshopProductionService completed-job boundaries", () => {
  it("does not add process routes after QC has completed the job", async () => {
    const tx: any = {
      $queryRaw: jest.fn().mockResolvedValue([{ id: "job-1" }]),
      karigarJob: { findFirst: jest.fn().mockResolvedValue({ id: "job-1", status: "Completed" }) },
      workshopRouteTemplate: { findFirst: jest.fn().mockResolvedValue({ id: "route-1", steps: [] }) },
      workshopRouteStep: { createMany: jest.fn() },
    };
    const service = new WorkshopProductionService(
      { $transaction: (fn: (client: any) => Promise<unknown>) => fn(tx) } as any,
      {} as any, { requireTraceableShop: jest.fn().mockResolvedValue({}) } as any,
    );

    await expect(service.assignRoute("shop-1", "supervisor-1", "job-1", "route-1"))
      .rejects.toThrow("Finished or archived jobs");
    expect(tx.workshopRouteStep.createMany).not.toHaveBeenCalled();
  });

  it("does not add physical batch children after QC has completed the job", async () => {
    const tx: any = {
      $queryRaw: jest.fn().mockResolvedValue([{ id: "job-1" }]),
      karigarJob: { findFirst: jest.fn().mockResolvedValue({ status: "Completed" }) },
      workshopBatchChild: { create: jest.fn() },
    };
    const service = new WorkshopProductionService(
      {
        karigarCastingTree: { findFirst: jest.fn().mockResolvedValue({ id: "tree-1", jobId: "job-1", job: { qty: 50 } }) },
        $transaction: (fn: (client: any) => Promise<unknown>) => fn(tx),
      } as any,
      {} as any, { requireTraceableShop: jest.fn().mockResolvedValue({}) } as any,
    );

    await expect(service.createChild("shop-1", "supervisor-1", {
      treeId: "tree-1", kind: "DESIGN_GROUP", label: "Design A", quantity: 10,
    })).rejects.toThrow("Finished or archived jobs");
    expect(tx.workshopBatchChild.create).not.toHaveBeenCalled();
  });
});
