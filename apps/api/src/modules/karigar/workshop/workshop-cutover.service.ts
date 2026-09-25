import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import {
  Prisma,
  WorkshopLedgerVersion,
  WorkshopMetalAccountKey,
  WorkshopMetalJournalReferenceType,
  WorkshopMetalJournalStatus,
  WorkshopScaleCaptureMethod,
} from "@prisma/client";
import { assertPositiveQuantumGrams, WORKSHOP_GOLD_995_MATERIAL_KEY } from "@gold-shop/shared";
import { PrismaService } from "../../../prisma/prisma.service";
import { WorkshopOpeningBalanceDto } from "./dto/workshop-weighing.dto";
import { WorkshopMetalJournalService } from "./workshop-metal-journal.service";

@Injectable()
export class WorkshopCutoverService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly journal: WorkshopMetalJournalService,
  ) {}

  async status(shopId: string) {
    const shop = await this.prisma.shop.findUnique({
      where: { id: shopId },
      select: { workshopMode: true, workshopLedgerVersion: true, workshopInitializedAt: true },
    });
    if (!shop) throw new NotFoundException("Shop not found");
    return {
      ...shop,
      ready: shop.workshopMode && shop.workshopLedgerVersion === WorkshopLedgerVersion.TRACEABLE &&
        shop.workshopInitializedAt !== null,
    };
  }

  async postManualOpening(shopId: string, userId: string, dto: WorkshopOpeningBalanceDto) {
    if (dto.materialKey !== WORKSHOP_GOLD_995_MATERIAL_KEY || dto.confirmedPhysicalGold995 !== true) {
      throw new BadRequestException("Confirm that this stock is physical Gold 995, not 24K / 999 gold");
    }
    try {
      assertPositiveQuantumGrams(dto.weightGrams, "GOLD");
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : "Invalid opening grams");
    }
    const reason = dto.reason?.trim();
    const source = dto.source?.trim();
    const key = dto.idempotencyKey?.trim();
    if (!reason || !source || !key) {
      throw new BadRequestException("Opening balance requires a reason, source and idempotency key");
    }

    return this.prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<{ id: string }[]>`
        SELECT "id" FROM "Shop" WHERE "id" = ${shopId} FOR UPDATE`;
      if (!locked.length) throw new NotFoundException("Shop not found");
      const shop = await tx.shop.findUnique({
        where: { id: shopId },
        select: { workshopMode: true, workshopLedgerVersion: true },
      });
      if (!shop?.workshopMode || shop.workshopLedgerVersion !== WorkshopLedgerVersion.TRACEABLE) {
        throw new BadRequestException("Enable TRACEABLE Workshop Mode before opening stock");
      }
      const existing = await tx.workshopMetalJournal.findUnique({
        where: { shopId_idempotencyKey: { shopId, idempotencyKey: key } },
        include: { lines: { include: { account: true } } },
      });
      if (existing) {
        if (existing.referenceType !== WorkshopMetalJournalReferenceType.GOLD995_OPENING_BALANCE ||
            existing.weightGrams.toFixed(6) !== this.journal.serializeGrams(dto.weightGrams) ||
            existing.actorUserId !== userId ||
            (existing.metadata as { reason?: string; source?: string } | null)?.reason !== reason ||
            (existing.metadata as { reason?: string; source?: string } | null)?.source !== source) {
          throw new ConflictException("Opening idempotency key was used for different stock");
        }
        return this.journal.serializeEntry(existing, true);
      }
      const posted = await tx.workshopMetalJournal.findFirst({
        where: { shopId, status: WorkshopMetalJournalStatus.POSTED, materialKey: WORKSHOP_GOLD_995_MATERIAL_KEY },
        select: { id: true },
      });
      if (posted) throw new ConflictException("Gold 995 opening stock is already established or production has begun");
      const entry = await this.journal.postEntry(tx, {
        shopId,
        referenceType: WorkshopMetalJournalReferenceType.GOLD995_OPENING_BALANCE,
        referenceId: key,
        idempotencyKey: key,
        description: `Physical Gold 995 opening stock: ${source}`,
        transactionDate: new Date(),
        weightGrams: dto.weightGrams,
        materialKey: WORKSHOP_GOLD_995_MATERIAL_KEY,
        actorUserId: userId,
        captureMethod: WorkshopScaleCaptureMethod.MANUAL_OVERRIDE,
        metadata: { reason, source, confirmedPhysicalGold995: true },
        lines: [
          { accountKey: WorkshopMetalAccountKey.GOLD995_VAULT, debitGrams: dto.weightGrams },
          { accountKey: WorkshopMetalAccountKey.OPENING_EQUITY, creditGrams: dto.weightGrams },
        ],
      });
      await tx.shop.update({ where: { id: shopId }, data: { workshopInitializedAt: new Date() } });
      await tx.auditLog.create({
        data: {
          userId,
          actorType: "SHOPKEEPER",
          action: "WORKSHOP_OPENING_BALANCE",
          resourceType: "WorkshopMetalJournal",
          resourceId: entry.entry.id,
          newValue: { shopId, materialKey: dto.materialKey, weightGrams: this.journal.serializeGrams(dto.weightGrams), reason, source, captureMethod: "MANUAL_OVERRIDE" } as Prisma.InputJsonValue,
        },
      });
      return this.journal.serializeEntry(entry.entry, entry.idempotent);
    });
  }
}
