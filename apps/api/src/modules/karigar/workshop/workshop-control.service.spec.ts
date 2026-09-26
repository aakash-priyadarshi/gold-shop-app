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

  it("replays a reversal-only correction with the same idempotency key", async () => {
    tx.workshopMetalJournal.findFirst.mockResolvedValue({
      id: "journal-1", reversedBy: { id: "reversal-1", idempotencyKey: "reversal:retry-1" }, replacedBy: null,
    });
    const result = await service.correctJournal("shop-1", "owner-1", "journal-1", {
      reason: "Verified void", idempotencyKey: "retry-1",
    });
    expect(result).toEqual({ id: "journal-1", status: "REVERSED", voided: true, idempotent: true });
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
    })).rejects.toThrow("Later material movements depend on this account");
    expect(journal.postEntry).not.toHaveBeenCalled();
  });

  it("blocks correction when a later classification used the scoped process source", async () => {
    tx.workshopMetalJournal.findFirst.mockResolvedValueOnce({
      id: "journal-1", status: "POSTED", referenceType: "PROCESS_OUTPUT",
      materialKey: "masterAlloy", postedAt: new Date(), reversedBy: null, replacedBy: null,
      lines: [
        { accountId: "process", creditGrams: new Prisma.Decimal("5.00"), debitGrams: new Prisma.Decimal(0), account: { materialKey: "masterAlloy", scopeId: "run-1" } },
        { accountId: "wip", creditGrams: new Prisma.Decimal(0), debitGrams: new Prisma.Decimal("5.00"), account: { materialKey: "masterAlloy", scopeId: "tree-1" } },
      ],
    }).mockResolvedValueOnce({ id: "classification-1" });

    await expect(service.correctJournal("shop-1", "owner-1", "journal-1", {
      replacementWeightGrams: "4.80", reason: "Correction", idempotencyKey: "correction-4",
    })).rejects.toThrow("Later material movements depend on this account");
    expect(tx.workshopMetalJournal.findFirst).toHaveBeenLastCalledWith(expect.objectContaining({
      where: expect.objectContaining({ lines: { some: { accountId: { in: ["process", "wip"] } } } }),
    }));
    expect(journal.postEntry).not.toHaveBeenCalled();
  });

  describe("Dedicated workflow-aware corrections", () => {
    it("handles TRANSFER_DISPATCH: reverses transit metal and resets transfer to PREPARED when voided", async () => {
      const transfer = { id: "transfer-1", shopId: "shop-1", status: "DISPATCHED", materialKey: "goldGrains995", dispatchReadingId: "read-1" };
      const original = {
        id: "dispatch-journal-1", shopId: "shop-1", status: "POSTED", referenceType: "TRANSFER_DISPATCH",
        materialKey: "goldGrains995", postedAt: new Date(), weightGrams: new Prisma.Decimal("100.00"),
        transferId: "transfer-1", reversedBy: null, replacedBy: null,
        lines: [
          { accountId: "dept-a", creditGrams: new Prisma.Decimal("100.00"), debitGrams: new Prisma.Decimal(0), account: { materialKey: "goldGrains995" } },
          { accountId: "transit", creditGrams: new Prisma.Decimal(0), debitGrams: new Prisma.Decimal("100.00"), account: { materialKey: "goldGrains995" } },
        ],
      };
      tx.workshopTransfer = {
        findFirst: jest.fn().mockResolvedValue(transfer),
        update: jest.fn().mockResolvedValue({ ...transfer, status: "PREPARED" }),
      };
      tx.workshopMetalAccount = {
        findUnique: jest.fn().mockResolvedValue({ id: "transit", balanceGrams: new Prisma.Decimal("100.00") }),
      };
      tx.workshopMetalJournal.findFirst.mockResolvedValueOnce(original);
      journal.postEntry.mockResolvedValueOnce({ entry: { id: "reversal-dispatch" }, idempotent: false });

      const result: any = await service.correctJournal("shop-1", "owner-1", "dispatch-journal-1", {
        reason: "Cancelled dispatch before transit pickup", idempotencyKey: "corr-disp-1",
      });

      expect(result.status).toBe("REVERSED");
      expect(result.voided).toBe(true);
      expect(tx.workshopTransfer.update).toHaveBeenCalledWith({
        where: { id: "transfer-1" },
        data: expect.objectContaining({ status: "PREPARED", dispatchReadingId: null }),
      });
    });

    it("blocks TRANSFER_DISPATCH correction if the transfer was already received downstream", async () => {
      const original = {
        id: "dispatch-journal-1", shopId: "shop-1", status: "POSTED", referenceType: "TRANSFER_DISPATCH",
        transferId: "transfer-1", reversedBy: null, replacedBy: null,
      };
      tx.workshopTransfer = {
        findFirst: jest.fn().mockResolvedValue({ id: "transfer-1", status: "RECEIVED" }),
      };
      tx.workshopMetalJournal.findFirst.mockResolvedValueOnce(original);

      await expect(service.correctJournal("shop-1", "owner-1", "dispatch-journal-1", {
        reason: "Attempted late rollback", idempotencyKey: "corr-disp-2",
      })).rejects.toThrow("Transfer has already been received downstream");
      expect(journal.postEntry).not.toHaveBeenCalled();
    });

    it("blocks RECOVERY_DEPOSIT correction if the bag is already closed", async () => {
      const original = {
        id: "deposit-journal-1", shopId: "shop-1", status: "POSTED", referenceType: "RECOVERY_DEPOSIT",
        recoveryContainerId: "bag-1", reversedBy: null, replacedBy: null,
      };
      tx.workshopRecoveryContainer = {
        findFirst: jest.fn().mockResolvedValue({ id: "bag-1", status: "CLOSED" }),
      };
      tx.workshopMetalJournal.findFirst.mockResolvedValueOnce(original);

      await expect(service.correctJournal("shop-1", "owner-1", "deposit-journal-1", {
        reason: "Deposit correction", idempotencyKey: "corr-rec-1",
      })).rejects.toThrow("closed or sent to refinery");
      expect(journal.postEntry).not.toHaveBeenCalled();
    });

    it("reverses FINISHED_RECEIPT, voids InventoryItem, and unlinks job when not yet sold", async () => {
      const original = {
        id: "fg-journal-1", shopId: "shop-1", status: "POSTED", referenceType: "FINISHED_RECEIPT",
        materialKey: "goldGrains995", postedAt: new Date(), weightGrams: new Prisma.Decimal("15.50"),
        jobId: "job-1", reversedBy: null, replacedBy: null,
        metadata: {},
        lines: [
          { accountId: "wip", creditGrams: new Prisma.Decimal("15.50"), debitGrams: new Prisma.Decimal(0), account: { materialKey: "goldGrains995" } },
          { accountId: "finished", creditGrams: new Prisma.Decimal(0), debitGrams: new Prisma.Decimal("15.50"), account: { materialKey: "goldGrains995" } },
        ],
      };
      tx.inventoryItem = {
        findFirst: jest.fn().mockResolvedValue({ id: "inv-item-1", status: "ACTIVE", stockQuantity: 1 }),
        update: jest.fn().mockResolvedValue({ id: "inv-item-1", status: "DISCONTINUED" }),
      };
      tx.order = { findFirst: jest.fn().mockResolvedValue(null) };
      tx.karigarJob = {
        update: jest.fn().mockResolvedValue({ id: "job-1" }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findFirst: jest.fn().mockResolvedValue({ id: "job-1", inventoryItemId: null }),
      };
      tx.workshopMetalAccount = {
        findUnique: jest.fn().mockResolvedValue({ id: "finished", balanceGrams: new Prisma.Decimal("15.50") }),
      };
      tx.workshopMetalJournal.findFirst.mockResolvedValueOnce(original);
      tx.workshopMetalJournal.findMany = jest.fn().mockResolvedValue([]);
      journal.postEntry.mockResolvedValueOnce({ entry: { id: "reversal-fg" }, idempotent: false });

      const result: any = await service.correctJournal("shop-1", "owner-1", "fg-journal-1", {
        reason: "Stone weight miscalculated during final receipt", idempotencyKey: "corr-fg-1",
      });

      expect(result.status).toBe("REVERSED");
      expect(result.voided).toBe(true);
      expect(result.voidedInventoryItemId).toBe("inv-item-1");
      expect(tx.inventoryItem.update).toHaveBeenCalledWith({
        where: { id: "inv-item-1" },
        data: expect.objectContaining({ status: "DISCONTINUED", stockQuantity: 0 }),
      });
      expect(tx.karigarJob.update).toHaveBeenCalledWith({
        where: { id: "job-1" },
        data: expect.objectContaining({ inventoryItemId: null, status: "In Progress" }),
      });
    });

    it("blocks FINISHED_RECEIPT correction if InventoryItem has already been sold", async () => {
      const original = {
        id: "fg-journal-1", shopId: "shop-1", status: "POSTED", referenceType: "FINISHED_RECEIPT",
        materialKey: "goldGrains995", reversedBy: null, replacedBy: null,
      };
      tx.inventoryItem = {
        findFirst: jest.fn().mockResolvedValue({ id: "inv-item-1", status: "SOLD", stockQuantity: 0 }),
      };
      tx.workshopMetalJournal.findFirst.mockResolvedValueOnce(original);

      await expect(service.correctJournal("shop-1", "owner-1", "fg-journal-1", {
        reason: "Correction", idempotencyKey: "corr-fg-2",
      })).rejects.toThrow("already been commercially sold or reserved");
      expect(journal.postEntry).not.toHaveBeenCalled();
    });

    it("blocks FINISHED_RECEIPT correction if InventoryItem is RESERVED", async () => {
      const original = {
        id: "fg-journal-2", shopId: "shop-1", status: "POSTED", referenceType: "FINISHED_RECEIPT",
        materialKey: "goldGrains995", reversedBy: null, replacedBy: null,
      };
      tx.inventoryItem = {
        findFirst: jest.fn().mockResolvedValue({ id: "inv-item-2", status: "RESERVED", stockQuantity: 1 }),
      };
      tx.workshopMetalJournal.findFirst.mockResolvedValueOnce(original);

      await expect(service.correctJournal("shop-1", "owner-1", "fg-journal-2", {
        reason: "Correction", idempotencyKey: "corr-fg-reserved",
      })).rejects.toThrow("already been commercially sold or reserved");
      expect(journal.postEntry).not.toHaveBeenCalled();
    });

    it("blocks FINISHED_RECEIPT correction if InventoryItem has active order reference", async () => {
      const original = {
        id: "fg-journal-3", shopId: "shop-1", status: "POSTED", referenceType: "FINISHED_RECEIPT",
        materialKey: "goldGrains995", reversedBy: null, replacedBy: null,
      };
      tx.inventoryItem = {
        findFirst: jest.fn().mockResolvedValue({ id: "inv-item-3", status: "AVAILABLE", stockQuantity: 1 }),
      };
      tx.order = {
        findFirst: jest.fn().mockResolvedValue({ id: "ord-1", orderNumber: "ORD-9999", status: "PROCESSING" }),
      };
      tx.workshopMetalJournal.findFirst.mockResolvedValueOnce(original);

      await expect(service.correctJournal("shop-1", "owner-1", "fg-journal-3", {
        reason: "Correction", idempotencyKey: "corr-fg-order",
      })).rejects.toThrow("referenced on active order ORD-9999");
      expect(journal.postEntry).not.toHaveBeenCalled();
    });

    it("blocks FINISHED_RECEIPT correction if InventoryItem stockQuantity is zero or negative", async () => {
      const original = {
        id: "fg-journal-4", shopId: "shop-1", status: "POSTED", referenceType: "FINISHED_RECEIPT",
        materialKey: "goldGrains995", reversedBy: null, replacedBy: null,
      };
      tx.inventoryItem = {
        findFirst: jest.fn().mockResolvedValue({ id: "inv-item-4", status: "AVAILABLE", stockQuantity: 0 }),
      };
      tx.workshopMetalJournal.findFirst.mockResolvedValueOnce(original);

      await expect(service.correctJournal("shop-1", "owner-1", "fg-journal-4", {
        reason: "Correction", idempotencyKey: "corr-fg-zero",
      })).rejects.toThrow("already been commercially sold or reserved");
      expect(journal.postEntry).not.toHaveBeenCalled();
    });

    it("handles ADDITIONAL_ISSUE: safely reverses solder issue and restores to vault", async () => {
      const original = {
        id: "add-issue-1", entryNumber: "WMJ-ADD-001", shopId: "shop-1", status: "POSTED",
        referenceType: "MATERIAL_ISSUE", materialKey: "solder22k", postedAt: new Date(),
        weightGrams: new Prisma.Decimal("2.500000"), jobId: "job-1", treeId: "tree-1",
        processRunId: "run-1", reversedBy: null, replacedBy: null,
        metadata: { movementKind: "ADDITIONAL_ISSUE" },
        lines: [
          { accountId: "vault-solder", creditGrams: new Prisma.Decimal("2.500000"), debitGrams: new Prisma.Decimal(0), account: { materialKey: "solder22k" } },
          { accountId: "process-solder", creditGrams: new Prisma.Decimal(0), debitGrams: new Prisma.Decimal("2.500000"), account: { materialKey: "solder22k" } },
        ],
      };
      tx.workshopProcessRun = {
        findFirst: jest.fn().mockResolvedValue({ id: "run-1", shopId: "shop-1", status: "OPEN" }),
      };
      tx.workshopMetalAccount = {
        findUnique: jest.fn().mockResolvedValue({ id: "process-solder", balanceGrams: new Prisma.Decimal("2.500000") }),
      };
      tx.workshopMetalJournal.findFirst.mockResolvedValueOnce(original);
      journal.postEntry.mockResolvedValueOnce({ entry: { id: "reversal-add-1" }, idempotent: false });

      const result: any = await service.correctJournal("shop-1", "owner-1", "add-issue-1", {
        reason: "Entered wrong solder weight at scale",
        idempotencyKey: "corr-add-1",
      });

      expect(result.status).toBe("REVERSED");
      expect(result.voided).toBe(true);
      expect(journal.postEntry).toHaveBeenCalledWith(tx, expect.objectContaining({
        referenceType: "REVERSAL",
        reversalOfId: "add-issue-1",
        weightGrams: "2.500000",
        lines: [
          { accountId: "vault-solder", debitGrams: "2.500000" },
          { accountId: "process-solder", creditGrams: "2.500000" },
        ],
      }));
      expect(tx.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: "WORKSHOP_ADDITIONAL_ISSUE_CORRECT",
        }),
      });
    });

    it("handles ADDITIONAL_ISSUE: safely replaces solder issue with replacement weight", async () => {
      const original = {
        id: "add-issue-2", entryNumber: "WMJ-ADD-002", shopId: "shop-1", status: "POSTED",
        referenceType: "MATERIAL_ISSUE", materialKey: "solder22k", postedAt: new Date(),
        weightGrams: new Prisma.Decimal("3.000000"), jobId: "job-1", treeId: "tree-1",
        processRunId: "run-1", reversedBy: null, replacedBy: null,
        metadata: { movementKind: "ADDITIONAL_ISSUE" },
        lines: [
          { accountId: "vault-solder", creditGrams: new Prisma.Decimal("3.000000"), debitGrams: new Prisma.Decimal(0), account: { materialKey: "solder22k" } },
          { accountId: "process-solder", creditGrams: new Prisma.Decimal(0), debitGrams: new Prisma.Decimal("3.000000"), account: { materialKey: "solder22k" } },
        ],
      };
      tx.workshopProcessRun = {
        findFirst: jest.fn().mockResolvedValue({ id: "run-1", shopId: "shop-1", status: "OPEN" }),
      };
      tx.workshopMetalAccount = {
        findUnique: jest.fn().mockResolvedValue({ id: "process-solder", balanceGrams: new Prisma.Decimal("3.000000") }),
      };
      tx.workshopMetalJournal.findFirst.mockResolvedValueOnce(original);
      journal.postEntry
        .mockResolvedValueOnce({ entry: { id: "reversal-add-2" }, idempotent: false })
        .mockResolvedValueOnce({ entry: { id: "replacement-add-2" }, idempotent: false });

      const result: any = await service.correctJournal("shop-1", "owner-1", "add-issue-2", {
        reason: "Scale re-tare required",
        replacementWeightGrams: "2.800000",
        idempotencyKey: "corr-add-2",
      });

      expect(result.id).toBe("replacement-add-2");
      expect(journal.postEntry).toHaveBeenCalledTimes(2);
      expect(journal.postEntry).toHaveBeenNthCalledWith(1, tx, expect.objectContaining({
        referenceType: "REVERSAL",
        reversalOfId: "add-issue-2",
        weightGrams: "3.000000",
      }));
      expect(journal.postEntry).toHaveBeenNthCalledWith(2, tx, expect.objectContaining({
        referenceType: "CORRECTION_REPLACEMENT",
        replacementForId: "add-issue-2",
        weightGrams: "2.800000",
        lines: [
          { accountId: "process-solder", debitGrams: "2.800000" },
          { accountId: "vault-solder", creditGrams: "2.800000" },
        ],
      }));
    });

    it("blocks ADDITIONAL_ISSUE correction if downstream consumption makes process balance insufficient", async () => {
      const original = {
        id: "add-issue-3", entryNumber: "WMJ-ADD-003", shopId: "shop-1", status: "POSTED",
        referenceType: "MATERIAL_ISSUE", materialKey: "solder22k", postedAt: new Date(),
        weightGrams: new Prisma.Decimal("3.000000"), jobId: "job-1", treeId: "tree-1",
        processRunId: "run-1", reversedBy: null, replacedBy: null,
        metadata: { movementKind: "ADDITIONAL_ISSUE" },
        lines: [
          { accountId: "vault-solder", creditGrams: new Prisma.Decimal("3.000000"), debitGrams: new Prisma.Decimal(0), account: { materialKey: "solder22k" } },
          { accountId: "process-solder", creditGrams: new Prisma.Decimal(0), debitGrams: new Prisma.Decimal("3.000000"), account: { materialKey: "solder22k" } },
        ],
      };
      tx.workshopProcessRun = {
        findFirst: jest.fn().mockResolvedValue({ id: "run-1", shopId: "shop-1", status: "OPEN" }),
      };
      // Process account only has 1.00g left (2.00g consumed downstream)
      tx.workshopMetalAccount = {
        findUnique: jest.fn().mockResolvedValue({ id: "process-solder", balanceGrams: new Prisma.Decimal("1.000000") }),
      };
      tx.workshopMetalJournal.findFirst.mockResolvedValueOnce(original);

      await expect(service.correctJournal("shop-1", "owner-1", "add-issue-3", {
        reason: "Correction",
        idempotencyKey: "corr-add-3",
      })).rejects.toThrow("Downstream material consumption makes this correction unsafe");
      expect(journal.postEntry).not.toHaveBeenCalled();
    });

    it("blocks ADDITIONAL_ISSUE correction if process run is already CLOSED", async () => {
      const original = {
        id: "add-issue-4", entryNumber: "WMJ-ADD-004", shopId: "shop-1", status: "POSTED",
        referenceType: "MATERIAL_ISSUE", materialKey: "solder22k", postedAt: new Date(),
        weightGrams: new Prisma.Decimal("3.000000"), jobId: "job-1", treeId: "tree-1",
        processRunId: "run-1", reversedBy: null, replacedBy: null,
        metadata: { movementKind: "ADDITIONAL_ISSUE" },
        lines: [
          { accountId: "vault-solder", creditGrams: new Prisma.Decimal("3.000000"), debitGrams: new Prisma.Decimal(0), account: { materialKey: "solder22k" } },
          { accountId: "process-solder", creditGrams: new Prisma.Decimal(0), debitGrams: new Prisma.Decimal("3.000000"), account: { materialKey: "solder22k" } },
        ],
      };
      tx.workshopProcessRun = {
        findFirst: jest.fn().mockResolvedValue({ id: "run-1", shopId: "shop-1", status: "CLOSED" }),
      };
      tx.workshopMetalJournal.findFirst.mockResolvedValueOnce(original);

      await expect(service.correctJournal("shop-1", "owner-1", "add-issue-4", {
        reason: "Correction",
        idempotencyKey: "corr-add-4",
      })).rejects.toThrow("Process run is already closed");
      expect(journal.postEntry).not.toHaveBeenCalled();
    });
  });
});
