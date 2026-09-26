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
});
