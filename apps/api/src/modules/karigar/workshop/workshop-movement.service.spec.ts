import { Prisma, WorkshopAccountBucket, WorkshopScaleCaptureMethod, WorkshopWeighingSessionStatus } from "@prisma/client";
import { WorkshopMovementService } from "./workshop-movement.service";

const grams = (value: string) => new Prisma.Decimal(value);

describe("WorkshopMovementService transfer receipts", () => {
  const reading = {
    id: "receive-reading", shopId: "shop-1", deviceId: "device-1", purpose: "GOLD",
    stable: true, captureMethod: WorkshopScaleCaptureMethod.DEVICE, sequence: 2,
    weightGrams: grams("101.00"),
  };
  const transfer = {
    id: "transfer-1", status: "DISPATCHED", dispatchReading: { id: "dispatch-reading", shopId: "shop-1", weightGrams: grams("100.00") },
    dispatchReadingId: "dispatch-reading",
    approvedAt: null as Date | null,
  };
  const session = {
    id: "session-1", shopId: "shop-1", status: WorkshopWeighingSessionStatus.STABLE_CAPTURED,
    expiresAt: new Date(Date.now() + 60_000), reading, journal: null,
    movementKind: "TRANSFER_RECEIPT", materialKey: "goldGrains995",
    jobId: "job-1", treeId: "tree-1", transferId: transfer.id,
    processRunId: null, recoveryContainerId: null, recoveryEventId: null, batchChildId: null,
    requiredPurpose: "GOLD", deviceId: "device-1", captureMethod: WorkshopScaleCaptureMethod.DEVICE,
    sourceAccount: { id: "transit-1", shopId: "shop-1", materialKey: "goldGrains995" },
    destinationAccount: { id: "wip-1", shopId: "shop-1", materialKey: "goldGrains995" },
    transfer,
  };
  let tx: any;
  let journal: any;
  let service: WorkshopMovementService;

  beforeEach(() => {
    transfer.status = "DISPATCHED";
    transfer.approvedAt = null;
    tx = {
      $queryRaw: jest.fn().mockResolvedValue([{ id: "session-1" }]),
      workshopWeighingSession: { findFirst: jest.fn().mockResolvedValue(session), update: jest.fn().mockResolvedValue({}) },
      karigarJob: { findFirst: jest.fn().mockResolvedValue({ status: "Casting" }) },
      workshopTransfer: { findFirst: jest.fn().mockImplementation(async () => transfer), update: jest.fn().mockResolvedValue({}) },
      workshopMetalJournal: { findFirst: jest.fn().mockResolvedValue(null) },
      workshopToleranceRule: { findFirst: jest.fn().mockResolvedValue({ id: "rule-1", maxDifferenceGrams: grams("0.10") }) },
    };
    journal = {
      ensureAccount: jest.fn().mockResolvedValue({ id: "variance-1", bucket: WorkshopAccountBucket.TRANSFER_VARIANCE }),
      postEntry: jest.fn().mockResolvedValue({ entry: { id: "journal-1" }, idempotent: false }),
      serializeEntry: jest.fn().mockReturnValue({ id: "journal-1" }),
    };
    const prisma = { $transaction: (fn: (client: any) => Promise<unknown>) => fn(tx) } as any;
    const scale = { requireTraceableShop: jest.fn().mockResolvedValue({}) } as any;
    service = new WorkshopMovementService(prisma, {} as any, journal, scale, {} as any);
  });

  it("holds an overweight receipt for supervisor approval without posting grams", async () => {
    const result = await service.confirm("shop-1", "operator-2", session.id, { readingId: reading.id, exceptionReason: "Unexpected extra gram" });
    expect(result).toEqual({ requiresApproval: true, differenceGrams: "-1.000000", toleranceGrams: "0.100000" });
    expect(journal.postEntry).not.toHaveBeenCalled();
    expect(tx.workshopTransfer.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "EXCEPTION" }) }));
  });

  it("posts an approved overweight receipt with a negative scoped variance instead of creating untracked stock", async () => {
    transfer.status = "EXCEPTION";
    transfer.approvedAt = new Date();
    const result = await service.confirm("shop-1", "operator-2", session.id, { readingId: reading.id });
    expect(result).toEqual(expect.objectContaining({ journal: { id: "journal-1" } }));
    expect(journal.ensureAccount).toHaveBeenCalledWith(tx, "shop-1", "goldGrains995", WorkshopAccountBucket.TRANSFER_VARIANCE, transfer.id);
    expect(journal.postEntry).toHaveBeenCalledWith(tx, expect.objectContaining({
      weightGrams: "101.000000",
      lines: [
        { accountId: "wip-1", debitGrams: "101.000000" },
        { accountId: "transit-1", creditGrams: "100.000000" },
        { accountId: "variance-1", creditGrams: "1.000000" },
      ],
    }));
  });

  it("rejects a recovery deposit session if its bag was closed before confirmation", async () => {
    tx.workshopWeighingSession.findFirst.mockResolvedValue({
      ...session, movementKind: "RECOVERY_DEPOSIT", transferId: null, transfer: null,
      processRunId: "run-1", recoveryContainerId: "bag-1",
      sourceAccount: { id: "process-1", shopId: "shop-1", materialKey: "goldGrains995", bucket: WorkshopAccountBucket.PROCESS },
      destinationAccount: { id: "bag-account", shopId: "shop-1", materialKey: "goldGrains995", bucket: WorkshopAccountBucket.RECOVERY_PENDING },
    });
    tx.workshopProcessRun = { findFirst: jest.fn().mockResolvedValue({ id: "run-1", status: "OPEN" }) };
    tx.workshopRecoveryContainer = { findFirst: jest.fn().mockResolvedValue({ id: "bag-1", status: "CLOSED" }) };

    await expect(service.confirm("shop-1", "operator-2", session.id, { readingId: reading.id }))
      .rejects.toThrow("Recovery bag is no longer open");
    expect(journal.postEntry).not.toHaveBeenCalled();
  });
});

describe("WorkshopMovementService finished jewellery with set stones", () => {
  it("requires the explicit Stone setting workflow instead of a generic material issue", async () => {
    const tx = { workshopMaterial: { findUnique: jest.fn().mockResolvedValue({ isActive: true, scalePurpose: "STONE" }) } };
    const service = new WorkshopMovementService(
      { $transaction: (fn: (client: any) => Promise<unknown>) => fn(tx) } as any,
      { ensureBaseMaterials: jest.fn().mockResolvedValue(undefined) } as any,
      {} as any, { requireTraceableShop: jest.fn().mockResolvedValue({}) } as any, {} as any,
    );
    await expect(service.createSession("shop-1", "operator-1", {
      movementKind: "MATERIAL_ISSUE", materialKey: "diamond", deviceId: "stone-scale", treeId: "tree-1",
    })).rejects.toThrow("Use the explicit Stone setting movement");
  });

  it("subtracts physically set stone grams from gross, classifies each stone once, and links carats to inventory", async () => {
    const session = {
      id: "finish-session", shopId: "shop-1", status: WorkshopWeighingSessionStatus.STABLE_CAPTURED,
      expiresAt: new Date(Date.now() + 60_000), journal: null,
      reading: { id: "gross-reading", shopId: "shop-1", deviceId: "gold-scale", purpose: "GOLD",
        stable: true, captureMethod: WorkshopScaleCaptureMethod.DEVICE, sequence: 8, weightGrams: grams("12.35") },
      movementKind: "FINISHED_RECEIPT", materialKey: "mixed-22k", jobId: "job-1", treeId: "tree-1",
      processRunId: null, transferId: null, recoveryContainerId: null, recoveryEventId: null, batchChildId: "piece-1",
      requiredPurpose: "GOLD", deviceId: "gold-scale", captureMethod: WorkshopScaleCaptureMethod.DEVICE,
      sourceAccount: { id: "metal-wip", shopId: "shop-1", materialKey: "mixed-22k" },
      destinationAccount: { id: "metal-finished", shopId: "shop-1", materialKey: "mixed-22k" },
      transfer: null,
    };
    const tx: any = {
      $queryRaw: jest.fn().mockResolvedValue([{ id: session.id }]),
      workshopWeighingSession: { findFirst: jest.fn().mockResolvedValue(session), update: jest.fn().mockResolvedValue({}) },
      karigarJob: { findFirst: jest.fn().mockResolvedValue({ product: "Ring", purity: "22K", metalColor: "YELLOW", status: "Completed", inventoryItemId: null, photos: [],
        stages: [{ stage: "QC", status: "DONE", qcApprovedAt: new Date() }] }), updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      workshopMaterial: {
        findMany: jest.fn().mockResolvedValue([
          { key: "diamond", name: "Natural Diamond", kind: "DIAMOND" },
          { key: "ruby", name: "Ruby", kind: "STONE" },
        ]),
        findUnique: jest.fn().mockResolvedValue({ theoreticalPurity: grams("0.916667"), assays: [] }),
      },
      workshopMetalAccount: { findMany: jest.fn().mockResolvedValue([
        { id: "diamond-wip", materialKey: "diamond", balanceGrams: grams("0.120") },
        { id: "ruby-wip", materialKey: "ruby", balanceGrams: grams("0.080") },
      ]) },
      inventoryItem: { create: jest.fn().mockResolvedValue({ id: "inventory-1" }) },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
    };
    let serial = 0;
    const journal: any = {
      ensureAccount: jest.fn().mockImplementation(async (_tx: any, _shopId: string, materialKey: string) => ({ id: `${materialKey}-finished` })),
      postEntry: jest.fn().mockImplementation(async () => ({ entry: { id: `journal-${++serial}` }, idempotent: false })),
      serializeEntry: jest.fn().mockImplementation((entry: any) => ({ id: entry.id })),
    };
    const service = new WorkshopMovementService(
      { $transaction: (fn: (client: any) => Promise<unknown>) => fn(tx) } as any,
      {} as any, journal,
      { requireTraceableShop: jest.fn().mockResolvedValue({}) } as any,
      { checkProductLimit: jest.fn().mockResolvedValue(undefined) } as any,
    );

    const result = await service.confirm("shop-1", "operator-1", session.id, {
      readingId: "gross-reading", finishedGoods: { nameEn: "Finished ring", jewelleryType: "RING" as any },
    });

    expect(result).toEqual(expect.objectContaining({ journal: { id: "journal-1" }, inventoryItem: { id: "inventory-1" } }));
    expect(journal.postEntry).toHaveBeenCalledTimes(3);
    expect(journal.postEntry).toHaveBeenNthCalledWith(1, tx, expect.objectContaining({
      weightGrams: "12.150000", scaleReadingId: "gross-reading", derivedClassification: true,
      metadata: expect.objectContaining({ measuredGrossGrams: "12.350000", setStoneGrams: "0.200000" }),
    }));
    expect(journal.postEntry).toHaveBeenNthCalledWith(2, tx, expect.objectContaining({
      weightGrams: "0.120000", materialKey: "diamond", derivedClassification: true,
      lines: [{ accountId: "diamond-finished", debitGrams: "0.120000" }, { accountId: "diamond-wip", creditGrams: "0.120000" }],
    }));
    expect(tx.inventoryItem.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      workshopReceiptJournalId: "journal-1", totalWeightGrams: 12.15, grossWeightGrams: 12.35,
      gemstones: [
        { type: "DIAMOND", caratWeight: 0.6, materialKey: "diamond" },
        { type: "Ruby", caratWeight: 0.4, materialKey: "ruby" },
      ],
    }) });
  });
});
