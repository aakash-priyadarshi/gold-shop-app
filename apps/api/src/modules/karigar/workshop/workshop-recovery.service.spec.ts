import { WorkshopRecoveryService } from "./workshop-recovery.service";

describe("WorkshopRecoveryService classification", () => {
  it("requires an active physical result even when an assay exists", async () => {
    const tx: any = {
      $queryRaw: jest.fn().mockResolvedValue([{ id: "event-1" }]),
      workshopRecoveryEvent: { findFirst: jest.fn().mockResolvedValue({ id: "event-1", status: "SENT", sendReadingId: "send-1", sendReading: { actorUserId: "operator-1" }, container: { materialKey: "goldGrains995" } }) },
      workshopMetalJournal: { findFirst: jest.fn().mockResolvedValue(null) },
      workshopMaterialAssay: { findFirst: jest.fn().mockResolvedValue({ id: "assay-1" }) },
    };
    const service = new WorkshopRecoveryService({ $transaction: (fn: (client: any) => Promise<unknown>) => fn(tx) } as any, {} as any, {} as any);
    await expect(service.classifyAndClose("shop-1", "supervisor-1", "event-1", "Verified"))
      .rejects.toThrow("Physical recovery or refinery return weighing result");
    expect(tx.workshopMetalJournal.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ scaleReadingId: { not: null }, reversedBy: null }) }));
    expect(tx.workshopMaterialAssay.findFirst).not.toHaveBeenCalled();
  });
  it("prevents the physical sender from approving their own recovery variance", async () => {
    const tx = {
      $queryRaw: jest.fn().mockResolvedValue([{ id: "event-1" }]),
      workshopRecoveryEvent: { findFirst: jest.fn().mockResolvedValue({
        id: "event-1", status: "SENT", sendReadingId: "reading-1",
        sendReading: { actorUserId: "operator-1" }, container: { id: "bag-1", materialKey: "goldGrains995" },
      }) },
      workshopMetalAccount: { findMany: jest.fn() },
    };
    const service = new WorkshopRecoveryService(
      { $transaction: (fn: (client: typeof tx) => Promise<unknown>) => fn(tx) } as any,
      {} as any, {} as any,
    );
    await expect(service.classifyAndClose("shop-1", "operator-1", "event-1", "Verified residue"))
      .rejects.toThrow("A sending operator cannot classify their own recovery difference");
    expect(tx.workshopMetalAccount.findMany).not.toHaveBeenCalled();
  });

  it("rejects recordAssay when assay material does not match recovery container material", async () => {
    const prisma: any = {
      workshopMaterial: { findFirst: jest.fn().mockResolvedValue({ id: "mat-alloy", key: "masterAlloy" }) },
      workshopRecoveryEvent: { findFirst: jest.fn().mockResolvedValue({
        id: "event-1", status: "SENT", container: { materialKey: "goldGrains995" },
      }) },
    };
    const service = new WorkshopRecoveryService(prisma, {} as any, {} as any);
    await expect(service.recordAssay("shop-1", "user-1", {
      materialId: "mat-alloy",
      recoveryEventId: "event-1",
      fineGoldFraction: "0.500000",
      source: "Lab",
    })).rejects.toThrow("Assay material must match the recovery container physical material");
  });

  it("accepts recordAssay when assay material matches recovery container material", async () => {
    const tx: any = {
      workshopMaterialAssay: { create: jest.fn().mockResolvedValue({ id: "assay-1", fineGoldFraction: "0.995000" }) },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
    };
    const prisma: any = {
      workshopMaterial: { findFirst: jest.fn().mockResolvedValue({ id: "mat-gold", key: "goldGrains995" }) },
      workshopRecoveryEvent: { findFirst: jest.fn().mockResolvedValue({
        id: "event-1", status: "SENT", container: { materialKey: "goldGrains995" },
      }) },
      $transaction: (fn: (client: any) => Promise<unknown>) => fn(tx),
    };
    const service = new WorkshopRecoveryService(prisma, {} as any, {} as any);
    const res = await service.recordAssay("shop-1", "user-1", {
      materialId: "mat-gold",
      recoveryEventId: "event-1",
      fineGoldFraction: "0.995000",
      source: "Government Hallmarking",
    });
    expect(res.fineGoldFraction).toBe("0.995000");
  });

  it("settles recovery event when assay is absent but valid physical result exists", async () => {
    const tx: any = {
      $queryRaw: jest.fn().mockResolvedValue([{ id: "event-1" }]),
      workshopRecoveryEvent: {
        findFirst: jest.fn().mockResolvedValue({
          id: "event-1", status: "SENT", sendReadingId: "send-1",
          sendReading: { actorUserId: "other-user" },
          containerId: "container-1", container: { materialKey: "goldGrains995" },
        }),
        update: jest.fn().mockResolvedValue({}),
      },
      workshopMetalJournal: {
        findFirst: jest.fn().mockResolvedValue({ id: "physical-result-1" }),
      },
      workshopMaterialAssay: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
      workshopMetalAccount: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      workshopRecoveryContainer: {
        update: jest.fn().mockResolvedValue({}),
      },
      auditLog: {
        create: jest.fn().mockResolvedValue({}),
      },
    };
    const journalMock: any = {
      ensureAccount: jest.fn().mockResolvedValue({ id: "variance-account-1" }),
      serializeEntry: jest.fn(),
    };
    const service = new WorkshopRecoveryService(
      { $transaction: (fn: (client: any) => Promise<unknown>) => fn(tx) } as any,
      journalMock,
      {} as any,
    );
    const result = await service.classifyAndClose("shop-1", "supervisor-1", "event-1", "Settled without optional assay");
    expect(result.eventId).toBe("event-1");
    expect(result.assay).toBeNull();
    expect(tx.workshopMaterialAssay.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        recoveryEventId: "event-1",
        material: { key: "goldGrains995" },
      }),
    }));
  });
});
