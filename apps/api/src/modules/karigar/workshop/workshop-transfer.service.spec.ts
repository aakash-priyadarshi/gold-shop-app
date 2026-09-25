import { BadRequestException } from "@nestjs/common";
import { Prisma, WorkshopAccountBucket } from "@prisma/client";
import { WorkshopTransferService } from "./workshop-transfer.service";

const grams = (value: string) => new Prisma.Decimal(value);

describe("WorkshopTransferService difference classification", () => {
  const transfer = {
    id: "transfer-1", shopId: "shop-1", status: "RECEIVED", materialKey: "goldGrains995",
    treeId: "tree-1", jobId: "job-1", differenceGrams: grams("-1"),
    dispatchReadingId: "dispatch-1", receiveReadingId: "receive-1",
    dispatchReading: { id: "dispatch-1" }, receiveReading: { id: "receive-1" },
    dispatchUserId: "operator-1", receiveUserId: "operator-2",
  };
  let tx: any;
  let journal: any;
  let service: WorkshopTransferService;

  beforeEach(() => {
    tx = {
      $queryRaw: jest.fn().mockResolvedValue([{ id: transfer.id }]),
      workshopTransfer: {
        findFirst: jest.fn().mockResolvedValue(transfer),
        update: jest.fn().mockResolvedValue({ ...transfer, status: "RECONCILED" }),
      },
      workshopMetalAccount: {
        findUnique: jest.fn().mockResolvedValue({ id: "transit-1", balanceGrams: grams("0") }),
        findFirst: jest.fn().mockResolvedValue({ id: "vault-1", balanceGrams: grams("10") }),
      },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
    };
    journal = {
      ensureAccount: jest.fn().mockResolvedValue({ id: "variance-1", balanceGrams: grams("-1") }),
      postEntry: jest.fn().mockResolvedValue({ entry: { id: "journal-1" }, idempotent: false }),
      serializeEntry: jest.fn().mockReturnValue({ id: "journal-1" }),
    };
    const prisma = { $transaction: (fn: (client: any) => Promise<unknown>) => fn(tx) } as any;
    service = new WorkshopTransferService(prisma, journal, {} as any);
  });

  it("rejects excess receipt classification without a verified source account", async () => {
    await expect(service.classifyDifference("shop-1", "supervisor-1", transfer.id, "Stock verified"))
      .rejects.toBeInstanceOf(BadRequestException);
    expect(journal.postEntry).not.toHaveBeenCalled();
  });

  it("clears negative transfer variance only by debiting it and crediting verified physical stock", async () => {
    await service.classifyDifference("shop-1", "supervisor-1", transfer.id, "Extra gram came from verified vault", "vault-1");
    expect(tx.workshopMetalAccount.findFirst).toHaveBeenCalledWith({ where: expect.objectContaining({
      id: "vault-1", shopId: "shop-1", materialKey: "goldGrains995", bucket: { in: [WorkshopAccountBucket.VAULT, WorkshopAccountBucket.REUSABLE] },
    }) });
    expect(journal.postEntry).toHaveBeenCalledWith(tx, expect.objectContaining({
      weightGrams: "1.000000",
      lines: [{ accountId: "variance-1", debitGrams: "1.000000" }, { accountId: "vault-1", creditGrams: "1.000000" }],
    }));
    expect(tx.workshopTransfer.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "RECONCILED" }) }));
  });

  it("does not replace an existing transfer exception approver", async () => {
    tx.workshopTransfer.findFirst.mockResolvedValue({ ...transfer, status: "EXCEPTION", approvedAt: new Date(), approvedByUserId: "supervisor-1" });
    await expect(service.approve("shop-1", "supervisor-2", transfer.id, "Second approval"))
      .rejects.toThrow("already approved");
    expect(tx.workshopTransfer.update).not.toHaveBeenCalled();
  });
});
