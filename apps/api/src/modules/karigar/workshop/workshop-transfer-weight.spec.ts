import { Prisma, WorkshopMetalJournalReferenceType } from "@prisma/client";
import { effectiveTransferDispatchGrams } from "./workshop-transfer-weight";

describe("effective transfer dispatch weight", () => {
  const transfer = {
    id: "transfer-1",
    dispatchReadingId: "dispatch-reading",
    dispatchReading: { weightGrams: new Prisma.Decimal("100.00") },
  };

  it("uses only the active replacement for this dispatch reading", async () => {
    const tx: any = { workshopMetalJournal: { findFirst: jest.fn().mockResolvedValue({ weightGrams: new Prisma.Decimal("99.50") }) } };
    await expect(effectiveTransferDispatchGrams(tx, "shop-1", transfer)).resolves.toEqual(new Prisma.Decimal("99.50"));
    expect(tx.workshopMetalJournal.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        transferId: "transfer-1",
        referenceType: WorkshopMetalJournalReferenceType.CORRECTION_REPLACEMENT,
        reversedBy: null,
        replacementFor: { is: { referenceType: WorkshopMetalJournalReferenceType.TRANSFER_DISPATCH, scaleReadingId: "dispatch-reading" } },
      }),
    }));
  });

  it("falls back to the dispatch reading when no correction exists", async () => {
    const tx: any = { workshopMetalJournal: { findFirst: jest.fn().mockResolvedValue(null) } };
    await expect(effectiveTransferDispatchGrams(tx, "shop-1", transfer)).resolves.toEqual(new Prisma.Decimal("100.00"));
  });
});
