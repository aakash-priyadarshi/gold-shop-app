import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, WorkshopAccountBucket, WorkshopMetalJournalReferenceType, WorkshopScaleCaptureMethod } from "@prisma/client";
import { PrismaService } from "../../../prisma/prisma.service";
import { WorkshopMetalJournalService } from "./workshop-metal-journal.service";
import { WorkshopScaleService } from "./workshop-scale.service";
import { CorrectWorkshopJournalDto, WorkshopManualMovementDto } from "./dto/workshop-control.dto";
import { WorkshopMaterialOpeningDto } from "./dto/workshop-control.dto";
import { WORKSHOP_GOLD_995_MATERIAL_KEY } from "@gold-shop/shared";

@Injectable()
export class WorkshopControlService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly journal: WorkshopMetalJournalService,
    private readonly scale: WorkshopScaleService,
  ) {}

  async materialOpening(shopId: string, userId: string, dto: WorkshopMaterialOpeningDto) {
    await this.scale.requireTraceableShop(shopId, true);
    if (dto.materialKey === WORKSHOP_GOLD_995_MATERIAL_KEY) throw new BadRequestException("Use the controlled Gold 995 cutover for Gold 995 opening stock");
    return this.prisma.$transaction(async (tx) => {
      const material = await tx.workshopMaterial.findUnique({ where: { shopId_key: { shopId, key: dto.materialKey } } });
      if (!material?.isActive) throw new NotFoundException("Active workshop material not found");
      const vault = await this.journal.ensureAccount(tx, shopId, material.key, WorkshopAccountBucket.VAULT);
      const equity = await this.journal.ensureAccount(tx, shopId, material.key, WorkshopAccountBucket.OPENING_EQUITY);
      const posted = await this.journal.postEntry(tx, {
        shopId, referenceType: WorkshopMetalJournalReferenceType.MATERIAL_OPENING_BALANCE,
        referenceId: dto.idempotencyKey.trim(), idempotencyKey: dto.idempotencyKey.trim(),
        description: `Verified ${material.name} opening stock: ${dto.source.trim()}`,
        transactionDate: new Date(), weightGrams: dto.weightGrams, materialKey: material.key,
        actorUserId: userId, captureMethod: WorkshopScaleCaptureMethod.MANUAL_OVERRIDE,
        scalePurpose: material.scalePurpose,
        metadata: { source: dto.source.trim(), reason: dto.reason.trim(), manual: true },
        lines: [{ accountId: vault.id, debitGrams: dto.weightGrams }, { accountId: equity.id, creditGrams: dto.weightGrams }],
      });
      if (!posted.idempotent) await tx.auditLog.create({ data: {
        userId, actorType: "SHOPKEEPER", action: "WORKSHOP_MATERIAL_OPENING",
        resourceType: "WorkshopMetalJournal", resourceId: posted.entry.id,
        newValue: { shopId, materialKey: material.key, weightGrams: dto.weightGrams, source: dto.source.trim(), reason: dto.reason.trim() },
      } });
      return this.journal.serializeEntry(posted.entry, posted.idempotent);
    });
  }

  async manualMovement(shopId: string, userId: string, dto: WorkshopManualMovementDto) {
    await this.scale.requireTraceableShop(shopId, true);
    if (dto.sourceBucket === dto.destinationBucket && (dto.sourceScopeId ?? "") === (dto.destinationScopeId ?? "")) {
      throw new BadRequestException("Source and destination accounts must differ");
    }
    return this.prisma.$transaction(async (tx) => {
      const material = await tx.workshopMaterial.findUnique({ where: { shopId_key: { shopId, key: dto.materialKey } } });
      if (!material?.isActive) throw new NotFoundException("Active workshop material not found");
      const source = await this.journal.ensureAccount(tx, shopId, dto.materialKey, dto.sourceBucket as WorkshopAccountBucket, dto.sourceScopeId ?? "");
      const destination = await this.journal.ensureAccount(tx, shopId, dto.materialKey, dto.destinationBucket as WorkshopAccountBucket, dto.destinationScopeId ?? "");
      if (dto.jobId) {
        const job = await tx.karigarJob.findFirst({ where: { id: dto.jobId, shopId }, select: { id: true } });
        if (!job) throw new BadRequestException("Job does not belong to this shop");
      }
      if (dto.treeId) {
        const tree = await tx.karigarCastingTree.findFirst({ where: { id: dto.treeId, shopId } });
        if (!tree || (dto.jobId && tree.jobId !== dto.jobId)) throw new BadRequestException("Tree and job do not match this shop");
      }
      if (dto.processRunId) {
        const run = await tx.workshopProcessRun.findFirst({ where: { id: dto.processRunId, shopId } });
        if (!run || (dto.treeId && run.treeId !== dto.treeId) || (dto.jobId && run.jobId !== dto.jobId)) {
          throw new BadRequestException("Process run does not match this tree and job");
        }
      }
      const posted = await this.journal.postEntry(tx, {
        shopId, referenceType: WorkshopMetalJournalReferenceType.MANUAL_OVERRIDE,
        referenceId: dto.idempotencyKey.trim(), idempotencyKey: dto.idempotencyKey.trim(),
        description: `Owner manual movement: ${dto.reason.trim()}`,
        transactionDate: new Date(), weightGrams: dto.weightGrams,
        materialKey: dto.materialKey, jobId: dto.jobId ?? null, treeId: dto.treeId ?? null,
        processRunId: dto.processRunId ?? null, actorUserId: userId,
        captureMethod: WorkshopScaleCaptureMethod.MANUAL_OVERRIDE,
        scalePurpose: material.scalePurpose,
        metadata: { reason: dto.reason.trim(), manual: true },
        lines: [{ accountId: destination.id, debitGrams: dto.weightGrams }, { accountId: source.id, creditGrams: dto.weightGrams }],
      });
      if (!posted.idempotent) await tx.auditLog.create({ data: {
        userId, actorType: "SHOPKEEPER", action: "WORKSHOP_MANUAL_MOVEMENT",
        resourceType: "WorkshopMetalJournal", resourceId: posted.entry.id,
        newValue: { shopId, materialKey: dto.materialKey, weightGrams: dto.weightGrams, reason: dto.reason.trim(), sourceAccountId: source.id, destinationAccountId: destination.id },
      } });
      return this.journal.serializeEntry(posted.entry, posted.idempotent);
    });
  }

  async correctJournal(shopId: string, userId: string, journalId: string, dto: CorrectWorkshopJournalDto) {
    await this.scale.requireTraceableShop(shopId, true);
    return this.prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<{ id: string }[]>`
        SELECT "id" FROM "WorkshopMetalJournal" WHERE "id" = ${journalId} AND "shopId" = ${shopId} FOR UPDATE`;
      if (!locked.length) throw new NotFoundException("Workshop journal not found");
      const original = await tx.workshopMetalJournal.findFirst({
        where: { id: journalId, shopId, status: "POSTED" },
        include: { lines: { include: { account: true } }, reversedBy: true, replacedBy: { include: { lines: { include: { account: true } } } } },
      });
      if (!original) throw new NotFoundException("Posted workshop journal not found");
      if (original.reversedBy || original.replacedBy) {
        if (original.replacedBy?.idempotencyKey === `correction:${dto.idempotencyKey}` &&
            original.replacedBy.weightGrams.eq(new Prisma.Decimal(dto.replacementWeightGrams))) {
          return this.journal.serializeEntry(original.replacedBy, true);
        }
        throw new ConflictException("This journal has already been corrected");
      }
      if (!["MATERIAL_ISSUE", "PROCESS_INPUT", "PROCESS_OUTPUT", "MANUAL_OVERRIDE"].includes(original.referenceType)) {
        throw new BadRequestException("This movement has linked workflow state and needs a dedicated correction procedure");
      }
      if (original.lines.length !== 2 || original.lines.some((line) => line.account.materialKey !== original.materialKey)) {
        throw new BadRequestException("Only a two-account, single-material movement can use this correction procedure");
      }
      const source = original.lines.find((line) => line.creditGrams.gt(0));
      const destination = original.lines.find((line) => line.debitGrams.gt(0));
      if (!source || !destination) throw new BadRequestException("Original journal is not a simple source-to-destination movement");
      // A later posting against the destination can have consumed or
      // reallocated these grams. Never correct that history in isolation.
      await tx.$queryRaw`SELECT "id" FROM "WorkshopMetalAccount" WHERE "shopId" = ${shopId} ORDER BY "id" FOR UPDATE`;
      const downstream = await tx.workshopMetalJournal.findFirst({
        where: {
          shopId, status: "POSTED", id: { not: original.id }, postedAt: { gte: original.postedAt },
          lines: { some: { accountId: destination.accountId } },
        },
        select: { id: true },
      });
      if (downstream) throw new ConflictException("Later material movements depend on this destination; reconcile them before correcting the original");
      const material = await tx.workshopMaterial.findUnique({ where: { shopId_key: { shopId, key: original.materialKey } } });
      if (!material) throw new BadRequestException("Original material is unavailable");
      const oldWeight = original.weightGrams.toFixed(6);
      await this.journal.postEntry(tx, {
        shopId, referenceType: WorkshopMetalJournalReferenceType.REVERSAL,
        referenceId: original.id, idempotencyKey: `reversal:${dto.idempotencyKey}`,
        description: `Reversal of ${original.entryNumber}: ${dto.reason.trim()}`,
        transactionDate: new Date(), weightGrams: oldWeight, materialKey: original.materialKey,
        jobId: original.jobId, treeId: original.treeId, processRunId: original.processRunId,
        actorUserId: userId, captureMethod: WorkshopScaleCaptureMethod.MANUAL_OVERRIDE,
        reversalOfId: original.id, scalePurpose: material.scalePurpose,
        metadata: { reason: dto.reason.trim(), originalReadingId: original.scaleReadingId, originalJournalId: original.id },
        lines: [{ accountId: source.accountId, debitGrams: oldWeight }, { accountId: destination.accountId, creditGrams: oldWeight }],
      });
      const posted = await this.journal.postEntry(tx, {
        shopId, referenceType: WorkshopMetalJournalReferenceType.CORRECTION_REPLACEMENT,
        referenceId: original.id, idempotencyKey: `correction:${dto.idempotencyKey}`,
        description: `Replacement for ${original.entryNumber}: ${dto.reason.trim()}`,
        transactionDate: new Date(), weightGrams: dto.replacementWeightGrams, materialKey: original.materialKey,
        jobId: original.jobId, treeId: original.treeId, processRunId: original.processRunId,
        actorUserId: userId, captureMethod: WorkshopScaleCaptureMethod.MANUAL_OVERRIDE,
        replacementForId: original.id, scalePurpose: material.scalePurpose,
        metadata: { reason: dto.reason.trim(), originalReadingId: original.scaleReadingId, originalJournalId: original.id },
        lines: [{ accountId: destination.accountId, debitGrams: dto.replacementWeightGrams }, { accountId: source.accountId, creditGrams: dto.replacementWeightGrams }],
      });
      await tx.auditLog.create({ data: {
        userId, actorType: "SHOPKEEPER", action: "WORKSHOP_JOURNAL_CORRECT",
        resourceType: "WorkshopMetalJournal", resourceId: original.id,
        newValue: { shopId, reason: dto.reason.trim(), replacementWeightGrams: dto.replacementWeightGrams, replacementJournalId: posted.entry.id },
      } });
      return this.journal.serializeEntry(posted.entry, posted.idempotent);
    });
  }
}
