import { Prisma, WorkshopScaleCaptureMethod } from "@prisma/client";
import { WorkshopControlService } from "./workshop-control.service";

describe("WorkshopControlService authoritative exceptions", () => {
  let tx: any;
  let journal: any;
  let service: WorkshopControlService;

  beforeEach(() => {
    tx = {
      $queryRaw: jest.fn().mockResolvedValue([{ id: "journal-1" }]),
      workshopMaterial: { findUnique: jest.fn().mockResolvedValue({ key: "masterAlloy", isActive: true, scalePurpose: "GOLD" }) },
      karigarJob: { findFirst: jest.fn().mockResolvedValue({ id: "job-1" }) },
      karigarCastingTree: { findFirst: jest.fn().mockResolvedValue({ id: "tree-1", jobId: "job-1" }) },
      workshopProcessRun: { findFirst: jest.fn().mockResolvedValue({ id: "run-1", jobId: "job-1", treeId: "tree-1" }) },
      workshopMetalJournal: { findFirst: jest.fn() },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
    };
    journal = {
      ensureAccount: jest.fn(async (_client: any, _shopId: string, _key: string, bucket: string) => ({ id: bucket.toLowerCase() })),
      postEntry: jest.fn().mockResolvedValue({ entry: { id: "posted-1" }, idempotent: false }),
      serializeEntry: jest.fn((entry: any) => entry),
    };
    service = new WorkshopControlService(
      { $transaction: (fn: (client: any) => Promise<unknown>) => fn(tx) } as any,
      journal, { requireTraceableShop: jest.fn().mockResolvedValue({}) } as any,
    );
  });

  const override = {
    materialKey: "masterAlloy", sourceBucket: "VAULT" as const,
    destinationBucket: "WIP" as const, destinationScopeId: "tree-1",
    weightGrams: "4.80", reason: "Verified scale outage", idempotencyKey: "override-1",
  };

  it("rejects a foreign-shop job ID even without a tree ID", async () => {
    tx.karigarJob.findFirst.mockResolvedValue(null);

    await expect(service.manualMovement("shop-1", "owner-1", { ...override, jobId: "foreign-job" }))
      .rejects.toThrow("Job does not belong to this shop");
    expect(journal.postEntry).not.toHaveBeenCalled();
  });

  it("marks an authorized manual movement and writes permanent audit context", async () => {
    await service.manualMovement("shop-1", "owner-1", { ...override, jobId: "job-1" });

    expect(journal.postEntry).toHaveBeenCalledWith(tx, expect.objectContaining({
      captureMethod: WorkshopScaleCaptureMethod.MANUAL_OVERRIDE,
      actorUserId: "owner-1",
      metadata: { reason: "Verified scale outage", manual: true },
      lines: [
        { accountId: "wip", debitGrams: "4.80" },
        { accountId: "vault", creditGrams: "4.80" },
      ],
    }));
    expect(tx.auditLog.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      action: "WORKSHOP_MANUAL_MOVEMENT", userId: "owner-1",
    }) });
  });

  it("reverses and replaces a safe journal without editing the original", async () => {
    const original = {
      id: "journal-1", shopId: "shop-1", status: "POSTED", entryNumber: 42,
      referenceType: "MATERIAL_ISSUE", materialKey: "masterAlloy",
      postedAt: new Date(), weightGrams: new Prisma.Decimal("5.00"),
      jobId: "job-1", treeId: "tree-1", processRunId: null, scaleReadingId: "reading-1",
      reversedBy: null, replacedBy: null,
      lines: [
        { accountId: "vault", creditGrams: new Prisma.Decimal("5.00"), debitGrams: new Prisma.Decimal(0), account: { materialKey: "masterAlloy" } },
        { accountId: "wip", creditGrams: new Prisma.Decimal(0), debitGrams: new Prisma.Decimal("5.00"), account: { materialKey: "masterAlloy" } },
      ],
    };
    tx.workshopMetalJournal.findFirst.mockResolvedValueOnce(original).mockResolvedValueOnce(null);
    journal.postEntry.mockResolvedValueOnce({ entry: { id: "reversal-1" }, idempotent: false })
      .mockResolvedValueOnce({ entry: { id: "replacement-1" }, idempotent: false });

    const result = await service.correctJournal("shop-1", "owner-1", "journal-1", {
      replacementWeightGrams: "4.80", reason: "Verified transcription error", idempotencyKey: "correction-1",
    });

    expect(result.id).toBe("replacement-1");
    expect(journal.postEntry).toHaveBeenCalledTimes(2);
    expect(journal.postEntry.mock.calls[0][1]).toEqual(expect.objectContaining({
      reversalOfId: "journal-1", captureMethod: WorkshopScaleCaptureMethod.MANUAL_OVERRIDE,
    }));
    expect(journal.postEntry.mock.calls[1][1]).toEqual(expect.objectContaining({
      replacementForId: "journal-1", weightGrams: "4.80",
    }));
    expect(tx.auditLog.create).toHaveBeenCalledWith({ data: expect.objectContaining({ action: "WORKSHOP_JOURNAL_CORRECT" }) });
  });

  it("does not reverse a journal that already has a correction", async () => {
    tx.workshopMetalJournal.findFirst.mockResolvedValue({
      id: "journal-1", reversedBy: { id: "reversal-1" }, replacedBy: { idempotencyKey: "correction:other", weightGrams: new Prisma.Decimal("4.80") },
    });

    await expect(service.correctJournal("shop-1", "owner-1", "journal-1", {
      replacementWeightGrams: "4.80", reason: "Second edit", idempotencyKey: "correction-2",
    })).rejects.toThrow("already been corrected");
    expect(journal.postEntry).not.toHaveBeenCalled();
  });

  it("blocks a correction after downstream stock has consumed its destination", async () => {
    tx.workshopMetalJournal.findFirst.mockResolvedValueOnce({
      id: "journal-1", status: "POSTED", referenceType: "MATERIAL_ISSUE",
      materialKey: "masterAlloy", postedAt: new Date(), reversedBy: null, replacedBy: null,
      lines: [
        { accountId: "vault", creditGrams: new Prisma.Decimal("5.00"), debitGrams: new Prisma.Decimal(0), account: { materialKey: "masterAlloy" } },
        { accountId: "wip", creditGrams: new Prisma.Decimal(0), debitGrams: new Prisma.Decimal("5.00"), account: { materialKey: "masterAlloy" } },
      ],
    }).mockResolvedValueOnce({ id: "downstream-1" });

    await expect(service.correctJournal("shop-1", "owner-1", "journal-1", {
      replacementWeightGrams: "4.80", reason: "Correction", idempotencyKey: "correction-3",
    })).rejects.toThrow("Later material movements depend on this destination");
    expect(journal.postEntry).not.toHaveBeenCalled();
  });
});
