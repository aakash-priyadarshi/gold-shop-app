import { BadRequestException } from "@nestjs/common";
import { Prisma, WorkshopMetalJournalReferenceType } from "@prisma/client";

/** A corrected dispatch keeps its original scale evidence but posts new effective grams. */
export async function effectiveTransferDispatchGrams(
  tx: Prisma.TransactionClient,
  shopId: string,
  transfer: {
    id: string;
    dispatchReadingId: string | null;
    dispatchReading: { weightGrams: Prisma.Decimal } | null;
  },
): Promise<Prisma.Decimal> {
  if (!transfer.dispatchReadingId || !transfer.dispatchReading) {
    throw new BadRequestException("Transfer has no valid dispatch reading");
  }
  const replacement = await tx.workshopMetalJournal.findFirst({
    where: {
      shopId,
      transferId: transfer.id,
      referenceType: WorkshopMetalJournalReferenceType.CORRECTION_REPLACEMENT,
      status: "POSTED",
      reversedBy: null,
      replacementFor: {
        is: {
          referenceType: WorkshopMetalJournalReferenceType.TRANSFER_DISPATCH,
          scaleReadingId: transfer.dispatchReadingId,
        },
      },
    },
    orderBy: { postedAt: "desc" },
    select: { weightGrams: true },
  });
  return replacement?.weightGrams ?? transfer.dispatchReading.weightGrams;
}
