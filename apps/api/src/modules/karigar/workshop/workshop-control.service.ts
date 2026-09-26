import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import {
  InventoryStatus,
  InventoryVisibility,
  Prisma,
  WorkshopAccountBucket,
  WorkshopMetalJournalReferenceType,
  WorkshopScaleCaptureMethod,
} from "@prisma/client";
import { PrismaService } from "../../../prisma/prisma.service";
import { WorkshopMetalJournalService } from "./workshop-metal-journal.service";
import { WorkshopScaleService } from "./workshop-scale.service";
import { effectiveTransferDispatchGrams } from "./workshop-transfer-weight";
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
        if (dto.replacementWeightGrams && original.replacedBy?.idempotencyKey === `correction:${dto.idempotencyKey}` &&
            original.replacedBy.weightGrams.eq(new Prisma.Decimal(dto.replacementWeightGrams))) {
          return this.journal.serializeEntry(original.replacedBy, true);
        }
        if (!dto.replacementWeightGrams && original.reversedBy?.idempotencyKey === `reversal:${dto.idempotencyKey}` && !original.replacedBy) {
          if (original.referenceType === WorkshopMetalJournalReferenceType.FINISHED_RECEIPT) {
            const item = await tx.inventoryItem.findFirst({
              where: { workshopReceiptJournalId: original.id, shopId },
              select: { id: true },
            });
            return {
              id: original.id,
              status: "REVERSED",
              voided: true,
              idempotent: true,
              voidedInventoryItemId: item?.id ?? null,
            };
          }
          return { id: original.id, status: "REVERSED", voided: true, idempotent: true };
        }
        throw new ConflictException("This journal has already been corrected");
      }

      if (
        original.referenceType === WorkshopMetalJournalReferenceType.REVERSAL ||
        original.referenceType === WorkshopMetalJournalReferenceType.CORRECTION_REPLACEMENT
      ) {
        throw new BadRequestException("Reversals and replacement journals cannot be directly corrected");
      }

      // Route to dedicated workflow correction procedures
      if (original.referenceType === WorkshopMetalJournalReferenceType.TRANSFER_DISPATCH) {
        return this.correctTransferDispatch(tx, shopId, userId, original, dto);
      }
      if (original.referenceType === WorkshopMetalJournalReferenceType.TRANSFER_RECEIPT) {
        return this.correctTransferReceipt(tx, shopId, userId, original, dto);
      }
      if (original.referenceType === WorkshopMetalJournalReferenceType.RECOVERY_DEPOSIT) {
        return this.correctRecoveryDeposit(tx, shopId, userId, original, dto);
      }
      if (original.referenceType === WorkshopMetalJournalReferenceType.RECOVERY_SEND) {
        return this.correctRecoverySend(tx, shopId, userId, original, dto);
      }
      if (original.referenceType === WorkshopMetalJournalReferenceType.RECOVERY_RESULT) {
        return this.correctRecoveryResult(tx, shopId, userId, original, dto);
      }
      if (original.referenceType === WorkshopMetalJournalReferenceType.FINISHED_RECEIPT) {
        return this.correctFinishedReceipt(tx, shopId, userId, original, dto);
      }
      if (original.referenceType === WorkshopMetalJournalReferenceType.MIXED_OUTPUT) {
        return this.correctMixedOutput(tx, shopId, userId, original, dto);
      }
      const isStoneMovement =
        ["MATERIAL_ISSUE", "PROCESS_OUTPUT"].includes(original.referenceType) &&
        ((original.metadata as any)?.movementKind === "STONE_SETTING" ||
         (original.metadata as any)?.movementKind === "STONE_RETURN" ||
         (original.metadata as any)?.sourceReadingKind === "STONE_SETTING");
      if (isStoneMovement) {
        return this.correctStoneSettingOrReturn(tx, shopId, userId, original, dto);
      }
      const isAdditionalIssue =
        original.referenceType === WorkshopMetalJournalReferenceType.MATERIAL_ISSUE &&
        ((original.metadata as any)?.movementKind === "ADDITIONAL_ISSUE" || !!original.processRunId);
      if (isAdditionalIssue) {
        return this.correctAdditionalIssue(tx, shopId, userId, original, dto);
      }

      if (!["MATERIAL_ISSUE", "PROCESS_INPUT", "PROCESS_OUTPUT", "MANUAL_OVERRIDE"].includes(original.referenceType)) {
        throw new BadRequestException("This movement has linked workflow state and needs a dedicated correction procedure");
      }
      if (!dto.replacementWeightGrams) {
        throw new BadRequestException("Replacement weight is required for standard two-account movement correction");
      }
      if (original.lines.length !== 2 || original.lines.some((line) => line.account.materialKey !== original.materialKey)) {
        throw new BadRequestException("Only a two-account, single-material movement can use this correction procedure");
      }
      const source = original.lines.find((line) => line.creditGrams.gt(0));
      const destination = original.lines.find((line) => line.debitGrams.gt(0));
      if (!source || !destination) throw new BadRequestException("Original journal is not a simple source-to-destination movement");
      // A later posting against the destination can have consumed or
      // reallocated these grams. Never correct that history in isolation.
      const guardedAccountIds = [source.accountId, destination.accountId].sort();
      await tx.$queryRaw`SELECT "id" FROM "WorkshopMetalAccount" WHERE "shopId" = ${shopId} AND "id" IN (${Prisma.join(guardedAccountIds)}) ORDER BY "id" FOR UPDATE`;
      const downstreamAccountIds = source.account.scopeId ? guardedAccountIds : [destination.accountId];
      const downstream = await tx.workshopMetalJournal.findFirst({
        where: {
          shopId, status: "POSTED", id: { not: original.id }, postedAt: { gte: original.postedAt },
          reversedBy: null,
          lines: { some: { accountId: { in: downstreamAccountIds } } },
        },
        select: { id: true },
      });
      if (downstream) throw new ConflictException("Later material movements depend on this account; reconcile them before correcting the original");
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

  private async correctTransferDispatch(
    tx: Prisma.TransactionClient,
    shopId: string,
    userId: string,
    original: any,
    dto: CorrectWorkshopJournalDto,
  ) {
    const transfer = await tx.workshopTransfer.findFirst({
      where: { shopId, OR: [{ id: original.transferId ?? "" }, { dispatchReadingId: original.scaleReadingId ?? "" }] },
      include: { receiveReading: true },
    });
    if (!transfer) throw new NotFoundException("Linked transfer not found");
    if (["RECEIVED", "RECONCILED", "EXCEPTION"].includes(transfer.status) || transfer.receiveReadingId) {
      throw new ConflictException("Transfer has already been received downstream. Correct or reverse the transfer receipt first.");
    }
    const source = original.lines.find((l: any) => l.creditGrams.gt(0));
    const dest = original.lines.find((l: any) => l.debitGrams.gt(0));
    if (!source || !dest) throw new BadRequestException("Transfer dispatch lines are invalid");
    const material = await tx.workshopMaterial.findUnique({ where: { shopId_key: { shopId, key: original.materialKey } } });
    const oldWeight = original.weightGrams.toFixed(6);

    await this.journal.postEntry(tx, {
      shopId, referenceType: WorkshopMetalJournalReferenceType.REVERSAL,
      referenceId: original.id, idempotencyKey: `reversal:${dto.idempotencyKey}`,
      description: `Reversal of dispatch ${original.entryNumber}: ${dto.reason.trim()}`,
      transactionDate: new Date(), weightGrams: oldWeight, materialKey: original.materialKey,
      jobId: original.jobId, treeId: original.treeId, transferId: transfer.id,
      actorUserId: userId, captureMethod: WorkshopScaleCaptureMethod.MANUAL_OVERRIDE,
      reversalOfId: original.id, scalePurpose: material?.scalePurpose ?? "GOLD",
      metadata: { reason: dto.reason.trim(), originalReadingId: original.scaleReadingId, originalJournalId: original.id, workflow: "TRANSFER_DISPATCH" },
      lines: [{ accountId: source.accountId, debitGrams: oldWeight }, { accountId: dest.accountId, creditGrams: oldWeight }],
    });

    const repWeight = dto.replacementWeightGrams ? new Prisma.Decimal(dto.replacementWeightGrams) : null;
    let replacementEntry = null;
    if (repWeight && repWeight.gt(0)) {
      const repGrams = repWeight.toFixed(6);
      const posted = await this.journal.postEntry(tx, {
        shopId, referenceType: WorkshopMetalJournalReferenceType.CORRECTION_REPLACEMENT,
        referenceId: original.id, idempotencyKey: `correction:${dto.idempotencyKey}`,
        description: `Replacement dispatch for ${original.entryNumber}: ${dto.reason.trim()}`,
        transactionDate: new Date(), weightGrams: repGrams, materialKey: original.materialKey,
        jobId: original.jobId, treeId: original.treeId, transferId: transfer.id,
        actorUserId: userId, captureMethod: WorkshopScaleCaptureMethod.MANUAL_OVERRIDE,
        replacementForId: original.id, scalePurpose: material?.scalePurpose ?? "GOLD",
        metadata: { reason: dto.reason.trim(), originalReadingId: original.scaleReadingId, originalJournalId: original.id, workflow: "TRANSFER_DISPATCH" },
        lines: [{ accountId: dest.accountId, debitGrams: repGrams }, { accountId: source.accountId, creditGrams: repGrams }],
      });
      replacementEntry = posted.entry;
    } else {
      await tx.workshopTransfer.update({
        where: { id: transfer.id },
        data: { status: "PREPARED", dispatchReadingId: null, dispatchUserId: null, dispatchedAt: null },
      });
    }

    await tx.auditLog.create({
      data: {
        userId, actorType: "SHOPKEEPER", action: "WORKSHOP_TRANSFER_DISPATCH_CORRECT",
        resourceType: "WorkshopTransfer", resourceId: transfer.id,
        newValue: { shopId, journalId: original.id, reason: dto.reason.trim(), replacementWeightGrams: dto.replacementWeightGrams ?? null },
      },
    });
    return replacementEntry ? this.journal.serializeEntry(replacementEntry, false) : { id: original.id, status: "REVERSED", voided: true };
  }

  private async correctTransferReceipt(
    tx: Prisma.TransactionClient,
    shopId: string,
    userId: string,
    original: any,
    dto: CorrectWorkshopJournalDto,
  ) {
    const transfer = await tx.workshopTransfer.findFirst({
      where: { shopId, OR: [{ id: original.transferId ?? "" }, { receiveReadingId: original.scaleReadingId ?? "" }] },
      include: { dispatchReading: true },
    });
    if (!transfer) throw new NotFoundException("Linked transfer not found");
    if (!transfer.dispatchReading) throw new BadRequestException("Transfer dispatch reading is missing");

    const dest = original.lines.find((l: any) => l.debitGrams.gt(0));
    const source = original.lines.find((l: any) => l.creditGrams.gt(0));
    if (!dest || !source) throw new BadRequestException("Transfer receipt lines are invalid");

    const destAccount = await tx.workshopMetalAccount.findUnique({ where: { id: dest.accountId } });
    if (!destAccount || destAccount.balanceGrams.lt(original.weightGrams)) {
      throw new ConflictException("Downstream operations have consumed received material from this account; reconcile downstream operations before correcting transfer receipt");
    }

    const varianceJournal = await tx.workshopMetalJournal.findFirst({
      where: { shopId, transferId: transfer.id, status: "POSTED", reversedBy: null, metadata: { path: ["classification"], equals: "TRANSFER_VARIANCE" } },
    });
    if (varianceJournal) {
      throw new ConflictException("Transfer variance has already been classified; correct or reverse the variance classification first");
    }

    const material = await tx.workshopMaterial.findUnique({ where: { shopId_key: { shopId, key: original.materialKey } } });
    const oldWeight = original.weightGrams.toFixed(6);

    await this.journal.postEntry(tx, {
      shopId, referenceType: WorkshopMetalJournalReferenceType.REVERSAL,
      referenceId: original.id, idempotencyKey: `reversal:${dto.idempotencyKey}`,
      description: `Reversal of receive ${original.entryNumber}: ${dto.reason.trim()}`,
      transactionDate: new Date(), weightGrams: oldWeight, materialKey: original.materialKey,
      jobId: original.jobId, treeId: original.treeId, transferId: transfer.id,
      actorUserId: userId, captureMethod: WorkshopScaleCaptureMethod.MANUAL_OVERRIDE,
      reversalOfId: original.id, scalePurpose: material?.scalePurpose ?? "GOLD",
      metadata: { reason: dto.reason.trim(), originalReadingId: original.scaleReadingId, originalJournalId: original.id, workflow: "TRANSFER_RECEIPT" },
      lines: [{ accountId: source.accountId, debitGrams: oldWeight }, { accountId: dest.accountId, creditGrams: oldWeight }],
    });

    const repWeight = dto.replacementWeightGrams ? new Prisma.Decimal(dto.replacementWeightGrams) : null;
    let replacementEntry = null;
    if (repWeight && repWeight.gt(0)) {
      const repGrams = repWeight.toFixed(6);
      const posted = await this.journal.postEntry(tx, {
        shopId, referenceType: WorkshopMetalJournalReferenceType.CORRECTION_REPLACEMENT,
        referenceId: original.id, idempotencyKey: `correction:${dto.idempotencyKey}`,
        description: `Replacement receive for ${original.entryNumber}: ${dto.reason.trim()}`,
        transactionDate: new Date(), weightGrams: repGrams, materialKey: original.materialKey,
        jobId: original.jobId, treeId: original.treeId, transferId: transfer.id,
        actorUserId: userId, captureMethod: WorkshopScaleCaptureMethod.MANUAL_OVERRIDE,
        replacementForId: original.id, scalePurpose: material?.scalePurpose ?? "GOLD",
        metadata: { reason: dto.reason.trim(), originalReadingId: original.scaleReadingId, originalJournalId: original.id, workflow: "TRANSFER_RECEIPT" },
        lines: [{ accountId: dest.accountId, debitGrams: repGrams }, { accountId: source.accountId, creditGrams: repGrams }],
      });
      replacementEntry = posted.entry;

      const effectiveDispatch = await effectiveTransferDispatchGrams(tx, shopId, transfer);
      const diff = effectiveDispatch.minus(repWeight);
      const tolerance = await tx.workshopToleranceRule.findFirst({
        where: { shopId, movementKind: "TRANSFER", materialKey: original.materialKey, scalePurpose: material?.scalePurpose ?? "GOLD", isActive: true },
      }) ?? await tx.workshopToleranceRule.findFirst({
        where: { shopId, movementKind: "TRANSFER", materialKey: "", scalePurpose: material?.scalePurpose ?? "GOLD", isActive: true },
      });
      const maxTol = tolerance?.maxDifferenceGrams ?? new Prisma.Decimal(0);
      const status = diff.abs().gt(maxTol) || diff.lt(0) ? "EXCEPTION" : diff.isZero() ? "RECONCILED" : "RECEIVED";
      await tx.workshopTransfer.update({
        where: { id: transfer.id },
        data: { status, differenceGrams: diff, toleranceRuleId: tolerance?.id ?? null },
      });
    } else {
      await tx.workshopTransfer.update({
        where: { id: transfer.id },
        data: { status: "DISPATCHED", receiveReadingId: null, receiveUserId: null, receivedAt: null, differenceGrams: null },
      });
    }

    await tx.auditLog.create({
      data: {
        userId, actorType: "SHOPKEEPER", action: "WORKSHOP_TRANSFER_RECEIPT_CORRECT",
        resourceType: "WorkshopTransfer", resourceId: transfer.id,
        newValue: { shopId, journalId: original.id, reason: dto.reason.trim(), replacementWeightGrams: dto.replacementWeightGrams ?? null },
      },
    });
    return replacementEntry ? this.journal.serializeEntry(replacementEntry, false) : { id: original.id, status: "REVERSED", voided: true };
  }

  private async correctRecoveryDeposit(
    tx: Prisma.TransactionClient,
    shopId: string,
    userId: string,
    original: any,
    dto: CorrectWorkshopJournalDto,
  ) {
    const bag = await tx.workshopRecoveryContainer.findFirst({
      where: { id: original.recoveryContainerId, shopId },
      include: { events: true },
    });
    if (!bag) throw new NotFoundException("Recovery bag not found");
    if (bag.status !== "OPEN" || bag.events.some((e: any) => e.status !== "CANCELLED")) {
      throw new ConflictException("Recovery bag has already been closed or sent to refinery; dependent recovery events must be addressed first");
    }
    const bagAccount = await tx.workshopMetalAccount.findUnique({
      where: { shopId_materialKey_bucket_scopeId: { shopId, materialKey: original.materialKey, bucket: WorkshopAccountBucket.RECOVERY_PENDING, scopeId: bag.id } },
    });
    if (!bagAccount || bagAccount.balanceGrams.lt(original.weightGrams)) {
      throw new ConflictException("Recovery bag balance is insufficient to reverse this deposit");
    }
    const source = original.lines.find((l: any) => l.creditGrams.gt(0));
    const dest = original.lines.find((l: any) => l.debitGrams.gt(0));
    if (!source || !dest) throw new BadRequestException("Recovery deposit lines are invalid");

    const material = await tx.workshopMaterial.findUnique({ where: { shopId_key: { shopId, key: original.materialKey } } });
    const oldWeight = original.weightGrams.toFixed(6);

    await this.journal.postEntry(tx, {
      shopId, referenceType: WorkshopMetalJournalReferenceType.REVERSAL,
      referenceId: original.id, idempotencyKey: `reversal:${dto.idempotencyKey}`,
      description: `Reversal of recovery deposit ${original.entryNumber}: ${dto.reason.trim()}`,
      transactionDate: new Date(), weightGrams: oldWeight, materialKey: original.materialKey,
      jobId: original.jobId, treeId: original.treeId, processRunId: original.processRunId,
      recoveryContainerId: bag.id, actorUserId: userId, captureMethod: WorkshopScaleCaptureMethod.MANUAL_OVERRIDE,
      reversalOfId: original.id, scalePurpose: material?.scalePurpose ?? "GOLD",
      metadata: { reason: dto.reason.trim(), originalReadingId: original.scaleReadingId, originalJournalId: original.id, workflow: "RECOVERY_DEPOSIT" },
      lines: [{ accountId: source.accountId, debitGrams: oldWeight }, { accountId: dest.accountId, creditGrams: oldWeight }],
    });

    let replacementEntry = null;
    if (dto.replacementWeightGrams && new Prisma.Decimal(dto.replacementWeightGrams).gt(0)) {
      const posted = await this.journal.postEntry(tx, {
        shopId, referenceType: WorkshopMetalJournalReferenceType.CORRECTION_REPLACEMENT,
        referenceId: original.id, idempotencyKey: `correction:${dto.idempotencyKey}`,
        description: `Replacement recovery deposit for ${original.entryNumber}: ${dto.reason.trim()}`,
        transactionDate: new Date(), weightGrams: dto.replacementWeightGrams, materialKey: original.materialKey,
        jobId: original.jobId, treeId: original.treeId, processRunId: original.processRunId,
        recoveryContainerId: bag.id, actorUserId: userId, captureMethod: WorkshopScaleCaptureMethod.MANUAL_OVERRIDE,
        replacementForId: original.id, scalePurpose: material?.scalePurpose ?? "GOLD",
        metadata: { reason: dto.reason.trim(), originalReadingId: original.scaleReadingId, originalJournalId: original.id, workflow: "RECOVERY_DEPOSIT" },
        lines: [{ accountId: dest.accountId, debitGrams: dto.replacementWeightGrams }, { accountId: source.accountId, creditGrams: dto.replacementWeightGrams }],
      });
      replacementEntry = posted.entry;
    }

    await tx.auditLog.create({
      data: {
        userId, actorType: "SHOPKEEPER", action: "WORKSHOP_RECOVERY_DEPOSIT_CORRECT",
        resourceType: "WorkshopRecoveryContainer", resourceId: bag.id,
        newValue: { shopId, journalId: original.id, reason: dto.reason.trim(), replacementWeightGrams: dto.replacementWeightGrams ?? null },
      },
    });
    return replacementEntry ? this.journal.serializeEntry(replacementEntry, false) : { id: original.id, status: "REVERSED", voided: true };
  }

  private async correctRecoverySend(
    tx: Prisma.TransactionClient,
    shopId: string,
    userId: string,
    original: any,
    dto: CorrectWorkshopJournalDto,
  ) {
    const event = await tx.workshopRecoveryEvent.findFirst({
      where: { id: original.recoveryEventId, shopId },
      include: { container: true },
    });
    if (!event) throw new NotFoundException("Recovery event not found");
    if (event.status === "RECONCILED" || event.varianceGrams != null) {
      throw new ConflictException("Recovery event has already been reconciled; reverse reconciliation first");
    }
    const hasResults = await tx.workshopMetalJournal.count({
      where: { shopId, recoveryEventId: event.id, referenceType: WorkshopMetalJournalReferenceType.RECOVERY_RESULT, status: "POSTED", reversedBy: null },
    });
    if (hasResults > 0) {
      throw new ConflictException("Recovery event has already produced recovery results; correct or reverse recovery results first");
    }
    const refineryAccount = await tx.workshopMetalAccount.findUnique({
      where: { shopId_materialKey_bucket_scopeId: { shopId, materialKey: original.materialKey, bucket: WorkshopAccountBucket.REFINERY, scopeId: event.id } },
    });
    if (!refineryAccount || refineryAccount.balanceGrams.lt(original.weightGrams)) {
      throw new ConflictException("Refinery balance is insufficient to reverse this recovery send");
    }
    const source = original.lines.find((l: any) => l.creditGrams.gt(0));
    const dest = original.lines.find((l: any) => l.debitGrams.gt(0));
    if (!source || !dest) throw new BadRequestException("Recovery send lines are invalid");

    const material = await tx.workshopMaterial.findUnique({ where: { shopId_key: { shopId, key: original.materialKey } } });
    const oldWeight = original.weightGrams.toFixed(6);

    await this.journal.postEntry(tx, {
      shopId, referenceType: WorkshopMetalJournalReferenceType.REVERSAL,
      referenceId: original.id, idempotencyKey: `reversal:${dto.idempotencyKey}`,
      description: `Reversal of recovery send ${original.entryNumber}: ${dto.reason.trim()}`,
      transactionDate: new Date(), weightGrams: oldWeight, materialKey: original.materialKey,
      recoveryContainerId: event.containerId, recoveryEventId: event.id,
      actorUserId: userId, captureMethod: WorkshopScaleCaptureMethod.MANUAL_OVERRIDE,
      reversalOfId: original.id, scalePurpose: material?.scalePurpose ?? "GOLD",
      metadata: { reason: dto.reason.trim(), originalReadingId: original.scaleReadingId, originalJournalId: original.id, workflow: "RECOVERY_SEND" },
      lines: [{ accountId: source.accountId, debitGrams: oldWeight }, { accountId: dest.accountId, creditGrams: oldWeight }],
    });

    let replacementEntry = null;
    if (dto.replacementWeightGrams && new Prisma.Decimal(dto.replacementWeightGrams).gt(0)) {
      const posted = await this.journal.postEntry(tx, {
        shopId, referenceType: WorkshopMetalJournalReferenceType.CORRECTION_REPLACEMENT,
        referenceId: original.id, idempotencyKey: `correction:${dto.idempotencyKey}`,
        description: `Replacement recovery send for ${original.entryNumber}: ${dto.reason.trim()}`,
        transactionDate: new Date(), weightGrams: dto.replacementWeightGrams, materialKey: original.materialKey,
        recoveryContainerId: event.containerId, recoveryEventId: event.id,
        actorUserId: userId, captureMethod: WorkshopScaleCaptureMethod.MANUAL_OVERRIDE,
        replacementForId: original.id, scalePurpose: material?.scalePurpose ?? "GOLD",
        metadata: { reason: dto.reason.trim(), originalReadingId: original.scaleReadingId, originalJournalId: original.id, workflow: "RECOVERY_SEND" },
        lines: [{ accountId: dest.accountId, debitGrams: dto.replacementWeightGrams }, { accountId: source.accountId, creditGrams: dto.replacementWeightGrams }],
      });
      replacementEntry = posted.entry;
    } else {
      await tx.workshopRecoveryEvent.update({ where: { id: event.id }, data: { status: "OPEN", sendReadingId: null, sendAt: null } });
      await tx.workshopRecoveryContainer.update({ where: { id: event.containerId }, data: { status: "OPEN", closedAt: null, destination: null } });
    }

    await tx.auditLog.create({
      data: {
        userId, actorType: "SHOPKEEPER", action: "WORKSHOP_RECOVERY_SEND_CORRECT",
        resourceType: "WorkshopRecoveryEvent", resourceId: event.id,
        newValue: { shopId, journalId: original.id, reason: dto.reason.trim(), replacementWeightGrams: dto.replacementWeightGrams ?? null },
      },
    });
    return replacementEntry ? this.journal.serializeEntry(replacementEntry, false) : { id: original.id, status: "REVERSED", voided: true };
  }

  private async correctRecoveryResult(
    tx: Prisma.TransactionClient,
    shopId: string,
    userId: string,
    original: any,
    dto: CorrectWorkshopJournalDto,
  ) {
    const event = await tx.workshopRecoveryEvent.findFirst({
      where: { id: original.recoveryEventId, shopId },
      include: { container: true },
    });
    if (!event) throw new NotFoundException("Recovery event not found");

    const dest = original.lines.find((l: any) => l.debitGrams.gt(0));
    const source = original.lines.find((l: any) => l.creditGrams.gt(0));
    if (!dest || !source) throw new BadRequestException("Recovery result lines are invalid");

    const destAccount = await tx.workshopMetalAccount.findUnique({ where: { id: dest.accountId } });
    if (!destAccount || destAccount.balanceGrams.lt(original.weightGrams)) {
      throw new ConflictException("Recovered material has already been consumed from the destination account; reconcile downstream usage before correcting this result");
    }

    const material = await tx.workshopMaterial.findUnique({ where: { shopId_key: { shopId, key: original.materialKey } } });
    const oldWeight = original.weightGrams.toFixed(6);

    await this.journal.postEntry(tx, {
      shopId, referenceType: WorkshopMetalJournalReferenceType.REVERSAL,
      referenceId: original.id, idempotencyKey: `reversal:${dto.idempotencyKey}`,
      description: `Reversal of recovery result ${original.entryNumber}: ${dto.reason.trim()}`,
      transactionDate: new Date(), weightGrams: oldWeight, materialKey: original.materialKey,
      recoveryContainerId: event.containerId, recoveryEventId: event.id,
      actorUserId: userId, captureMethod: WorkshopScaleCaptureMethod.MANUAL_OVERRIDE,
      reversalOfId: original.id, scalePurpose: material?.scalePurpose ?? "GOLD",
      metadata: { reason: dto.reason.trim(), originalReadingId: original.scaleReadingId, originalJournalId: original.id, workflow: "RECOVERY_RESULT" },
      lines: [{ accountId: source.accountId, debitGrams: oldWeight }, { accountId: dest.accountId, creditGrams: oldWeight }],
    });

    let replacementEntry = null;
    if (dto.replacementWeightGrams && new Prisma.Decimal(dto.replacementWeightGrams).gt(0)) {
      const posted = await this.journal.postEntry(tx, {
        shopId, referenceType: WorkshopMetalJournalReferenceType.CORRECTION_REPLACEMENT,
        referenceId: original.id, idempotencyKey: `correction:${dto.idempotencyKey}`,
        description: `Replacement recovery result for ${original.entryNumber}: ${dto.reason.trim()}`,
        transactionDate: new Date(), weightGrams: dto.replacementWeightGrams, materialKey: original.materialKey,
        recoveryContainerId: event.containerId, recoveryEventId: event.id,
        actorUserId: userId, captureMethod: WorkshopScaleCaptureMethod.MANUAL_OVERRIDE,
        replacementForId: original.id, scalePurpose: material?.scalePurpose ?? "GOLD",
        metadata: { reason: dto.reason.trim(), originalReadingId: original.scaleReadingId, originalJournalId: original.id, workflow: "RECOVERY_RESULT" },
        lines: [{ accountId: dest.accountId, debitGrams: dto.replacementWeightGrams }, { accountId: source.accountId, creditGrams: dto.replacementWeightGrams }],
      });
      replacementEntry = posted.entry;
    }

    if (event.status === "RECONCILED") {
      await tx.workshopRecoveryEvent.update({ where: { id: event.id }, data: { status: "SENT", varianceGrams: null, approvedAt: null, approvedByUserId: null } });
      await tx.workshopRecoveryContainer.update({ where: { id: event.containerId }, data: { status: "CLOSED" } });
    }

    await tx.auditLog.create({
      data: {
        userId, actorType: "SHOPKEEPER", action: "WORKSHOP_RECOVERY_RESULT_CORRECT",
        resourceType: "WorkshopRecoveryEvent", resourceId: event.id,
        newValue: { shopId, journalId: original.id, reason: dto.reason.trim(), replacementWeightGrams: dto.replacementWeightGrams ?? null },
      },
    });
    return replacementEntry ? this.journal.serializeEntry(replacementEntry, false) : { id: original.id, status: "REVERSED", voided: true };
  }

  private async correctFinishedReceipt(
    tx: Prisma.TransactionClient,
    shopId: string,
    userId: string,
    original: any,
    dto: CorrectWorkshopJournalDto,
  ) {
    if ((original.metadata as any)?.parentReceiptJournalId) {
      throw new BadRequestException("This is a child stone classification journal; correct the main finished jewellery receipt journal instead");
    }

    const item = await tx.inventoryItem.findFirst({
      where: { workshopReceiptJournalId: original.id, shopId },
    });
    if (item) {
      if (item.status === "SOLD" || item.status === "RESERVED" || item.stockQuantity <= 0) {
        throw new ConflictException(`This inventory item has already been commercially sold or reserved (status: ${item.status}, quantity: ${item.stockQuantity}). Downstream commercial use must be resolved before this workshop receipt can be corrected.`);
      }
      const order = await tx.order.findFirst({
        where: { inventoryItemId: item.id, status: { notIn: ["CANCELLED", "REFUNDED"] } },
      });
      if (order) {
        throw new ConflictException(`This inventory item is referenced on active order ${order.orderNumber}; cancel or refund the order before correcting the workshop receipt.`);
      }
    }

    const stoneReceipts = await tx.workshopMetalJournal.findMany({
      where: {
        shopId, referenceType: WorkshopMetalJournalReferenceType.FINISHED_RECEIPT, status: "POSTED", reversedBy: null,
        metadata: { path: ["parentReceiptJournalId"], equals: original.id },
      },
      include: { lines: true },
    });

    const material = await tx.workshopMaterial.findUnique({ where: { shopId_key: { shopId, key: original.materialKey } } });
    const oldWeight = original.weightGrams.toFixed(6);

    for (const stoneReceipt of stoneReceipts) {
      const stoneDest = stoneReceipt.lines.find((l) => l.debitGrams.gt(0));
      const stoneSources = stoneReceipt.lines.filter((l) => l.creditGrams.gt(0));
      if (stoneDest && stoneSources.length) {
        await this.journal.postEntry(tx, {
          shopId, referenceType: WorkshopMetalJournalReferenceType.REVERSAL,
          referenceId: stoneReceipt.id, idempotencyKey: `reversal:${dto.idempotencyKey}:stone:${stoneReceipt.id}`,
          description: `Reversal of stone classification ${stoneReceipt.entryNumber}: ${dto.reason.trim()}`,
          transactionDate: new Date(), weightGrams: stoneReceipt.weightGrams.toFixed(6),
          materialKey: stoneReceipt.materialKey, jobId: original.jobId, treeId: original.treeId,
          actorUserId: userId, captureMethod: WorkshopScaleCaptureMethod.MANUAL_OVERRIDE,
          reversalOfId: stoneReceipt.id, scalePurpose: "STONE",
          metadata: { reason: dto.reason.trim(), parentReceiptJournalId: original.id, workflow: "FINISHED_RECEIPT_STONE" },
          lines: [
            ...stoneSources.map((s) => ({ accountId: s.accountId, debitGrams: s.creditGrams.toFixed(6) })),
            { accountId: stoneDest.accountId, creditGrams: stoneReceipt.weightGrams.toFixed(6) },
          ],
        });
      }
    }

    const dest = original.lines.find((l: any) => l.debitGrams.gt(0));
    const source = original.lines.find((l: any) => l.creditGrams.gt(0));
    if (!dest || !source) throw new BadRequestException("Finished receipt lines are invalid");

    await this.journal.postEntry(tx, {
      shopId, referenceType: WorkshopMetalJournalReferenceType.REVERSAL,
      referenceId: original.id, idempotencyKey: `reversal:${dto.idempotencyKey}`,
      description: `Reversal of finished receipt ${original.entryNumber}: ${dto.reason.trim()}`,
      transactionDate: new Date(), weightGrams: oldWeight, materialKey: original.materialKey,
      jobId: original.jobId, treeId: original.treeId, processRunId: original.processRunId,
      actorUserId: userId, captureMethod: WorkshopScaleCaptureMethod.MANUAL_OVERRIDE,
      reversalOfId: original.id, scalePurpose: material?.scalePurpose ?? "GOLD",
      metadata: { reason: dto.reason.trim(), originalReadingId: original.scaleReadingId, originalJournalId: original.id, workflow: "FINISHED_RECEIPT" },
      lines: [{ accountId: source.accountId, debitGrams: oldWeight }, { accountId: dest.accountId, creditGrams: oldWeight }],
    });

    if (item) {
      await tx.inventoryItem.update({
        where: { id: item.id },
        data: {
          status: InventoryStatus.DISCONTINUED,
          visibility: InventoryVisibility.HIDDEN,
          stockQuantity: 0,
        },
      });
    }

    if (original.jobId) {
      await tx.karigarJob.update({
        where: { id: original.jobId },
        data: { inventoryItemId: null, status: "In Progress" },
      });
    }

    await tx.auditLog.create({
      data: {
        userId, actorType: "SHOPKEEPER", action: "WORKSHOP_FINISHED_RECEIPT_CORRECT",
        resourceType: "WorkshopMetalJournal", resourceId: original.id,
        newValue: { shopId, journalId: original.id, reason: dto.reason.trim(), voidedItemId: item?.id ?? null },
      },
    });

    return { id: original.id, status: "REVERSED", voided: true, voidedInventoryItemId: item?.id ?? null };
  }

  private async correctStoneSettingOrReturn(
    tx: Prisma.TransactionClient,
    shopId: string,
    userId: string,
    original: any,
    dto: CorrectWorkshopJournalDto,
  ) {
    if (original.jobId) {
      const job = await tx.karigarJob.findFirst({ where: { id: original.jobId, shopId }, select: { inventoryItemId: true } });
      if (job?.inventoryItemId) {
        throw new ConflictException("Finished goods receipt has already consumed/classified stone settings for this job. Correct finished receipt first.");
      }
    }
    let hasFinished = 0;
    if (original.treeId) {
      hasFinished = await tx.workshopMetalJournal.count({
        where: { shopId, treeId: original.treeId, referenceType: WorkshopMetalJournalReferenceType.FINISHED_RECEIPT, status: "POSTED", reversedBy: null },
      });
    } else if (original.jobId) {
      hasFinished = await tx.workshopMetalJournal.count({
        where: { shopId, jobId: original.jobId, referenceType: WorkshopMetalJournalReferenceType.FINISHED_RECEIPT, status: "POSTED", reversedBy: null },
      });
    }
    if (hasFinished > 0) {
      throw new ConflictException("Finished goods receipt has already consumed stone settings for this job/tree. Correct finished receipt first.");
    }

    const source = original.lines.find((l: any) => l.creditGrams.gt(0));
    const dest = original.lines.find((l: any) => l.debitGrams.gt(0));
    if (!source || !dest) throw new BadRequestException("Stone journal lines are invalid");

    const destAccount = await tx.workshopMetalAccount.findUnique({ where: { id: dest.accountId } });
    if (!destAccount || destAccount.balanceGrams.lt(original.weightGrams)) {
      throw new ConflictException("Stone balance is insufficient to reverse this movement; later stone operations depend on this account");
    }

    const oldWeight = original.weightGrams.toFixed(6);

    await this.journal.postEntry(tx, {
      shopId, referenceType: WorkshopMetalJournalReferenceType.REVERSAL,
      referenceId: original.id, idempotencyKey: `reversal:${dto.idempotencyKey}`,
      description: `Reversal of stone movement ${original.entryNumber}: ${dto.reason.trim()}`,
      transactionDate: new Date(), weightGrams: oldWeight, materialKey: original.materialKey,
      jobId: original.jobId, treeId: original.treeId, processRunId: original.processRunId,
      actorUserId: userId, captureMethod: WorkshopScaleCaptureMethod.MANUAL_OVERRIDE,
      reversalOfId: original.id, scalePurpose: "STONE",
      metadata: { reason: dto.reason.trim(), originalReadingId: original.scaleReadingId, originalJournalId: original.id, workflow: "STONE_MOVEMENT" },
      lines: [{ accountId: source.accountId, debitGrams: oldWeight }, { accountId: dest.accountId, creditGrams: oldWeight }],
    });

    let replacementEntry = null;
    if (dto.replacementWeightGrams && new Prisma.Decimal(dto.replacementWeightGrams).gt(0)) {
      const posted = await this.journal.postEntry(tx, {
        shopId, referenceType: WorkshopMetalJournalReferenceType.CORRECTION_REPLACEMENT,
        referenceId: original.id, idempotencyKey: `correction:${dto.idempotencyKey}`,
        description: `Replacement stone movement for ${original.entryNumber}: ${dto.reason.trim()}`,
        transactionDate: new Date(), weightGrams: dto.replacementWeightGrams, materialKey: original.materialKey,
        jobId: original.jobId, treeId: original.treeId, processRunId: original.processRunId,
        actorUserId: userId, captureMethod: WorkshopScaleCaptureMethod.MANUAL_OVERRIDE,
        replacementForId: original.id, scalePurpose: "STONE",
        metadata: { reason: dto.reason.trim(), originalReadingId: original.scaleReadingId, originalJournalId: original.id, workflow: "STONE_MOVEMENT" },
        lines: [{ accountId: dest.accountId, debitGrams: dto.replacementWeightGrams }, { accountId: source.accountId, creditGrams: dto.replacementWeightGrams }],
      });
      replacementEntry = posted.entry;
    }

    await tx.auditLog.create({
      data: {
        userId, actorType: "SHOPKEEPER", action: "WORKSHOP_STONE_MOVEMENT_CORRECT",
        resourceType: "WorkshopMetalJournal", resourceId: original.id,
        newValue: { shopId, journalId: original.id, reason: dto.reason.trim(), replacementWeightGrams: dto.replacementWeightGrams ?? null },
      },
    });
    return replacementEntry ? this.journal.serializeEntry(replacementEntry, false) : { id: original.id, status: "REVERSED", voided: true };
  }

  private async correctMixedOutput(
    tx: Prisma.TransactionClient,
    shopId: string,
    userId: string,
    original: any,
    dto: CorrectWorkshopJournalDto,
  ) {
    const mixedWipLine = original.lines.find((l: any) => l.debitGrams.gt(0));
    const inputLines = original.lines.filter((l: any) => l.creditGrams.gt(0));
    if (!mixedWipLine || !inputLines.length) throw new BadRequestException("Mixed output lines are invalid");

    const mixedAccount = await tx.workshopMetalAccount.findUnique({ where: { id: mixedWipLine.accountId } });
    if (!mixedAccount || mixedAccount.balanceGrams.lt(original.weightGrams)) {
      throw new ConflictException("Downstream processes have already consumed this mixed material. Reconcile or reverse downstream operations before correcting mixed output.");
    }

    const oldWeight = original.weightGrams.toFixed(6);

    await this.journal.postEntry(tx, {
      shopId, referenceType: WorkshopMetalJournalReferenceType.REVERSAL,
      referenceId: original.id, idempotencyKey: `reversal:${dto.idempotencyKey}`,
      description: `Reversal of mixed output ${original.entryNumber}: ${dto.reason.trim()}`,
      transactionDate: new Date(), weightGrams: oldWeight, materialKey: original.materialKey,
      jobId: original.jobId, treeId: original.treeId, processRunId: original.processRunId,
      actorUserId: userId, captureMethod: WorkshopScaleCaptureMethod.MANUAL_OVERRIDE,
      reversalOfId: original.id, scalePurpose: "GOLD",
      metadata: { reason: dto.reason.trim(), originalReadingId: original.scaleReadingId, originalJournalId: original.id, workflow: "MIXED_OUTPUT" },
      lines: [
        ...inputLines.map((inp: any) => ({ accountId: inp.accountId, debitGrams: inp.creditGrams.toFixed(6) })),
        { accountId: mixedWipLine.accountId, creditGrams: oldWeight },
      ],
    });

    await tx.auditLog.create({
      data: {
        userId, actorType: "SHOPKEEPER", action: "WORKSHOP_MIXED_OUTPUT_CORRECT",
        resourceType: "WorkshopMetalJournal", resourceId: original.id,
        newValue: { shopId, journalId: original.id, reason: dto.reason.trim() },
      },
    });
    return { id: original.id, status: "REVERSED", voided: true };
  }

  private async correctAdditionalIssue(
    tx: Prisma.TransactionClient,
    shopId: string,
    userId: string,
    original: any,
    dto: CorrectWorkshopJournalDto,
  ) {
    if (!original.processRunId) {
      throw new BadRequestException("Additional issue requires an associated process run");
    }

    const run = await tx.workshopProcessRun.findFirst({
      where: { id: original.processRunId, shopId },
    });
    if (!run) throw new NotFoundException("Linked workshop process run not found");
    if (!["OPEN", "RECONCILIATION_PENDING"].includes(run.status)) {
      throw new ConflictException("Process run is already closed; cannot correct an additional issue on a closed run");
    }

    const source = original.lines.find((l: any) => l.creditGrams.gt(0));
    const dest = original.lines.find((l: any) => l.debitGrams.gt(0));
    if (!source || !dest) throw new BadRequestException("Additional issue journal lines are invalid");

    const destAcct = await tx.workshopMetalAccount.findUnique({
      where: { id: dest.accountId },
    });
    if (!destAcct || destAcct.balanceGrams.lt(original.weightGrams)) {
      throw new ConflictException(
        "Downstream material consumption makes this correction unsafe: available process balance is less than the issued weight"
      );
    }

    const downstream = await tx.workshopMetalJournal.findFirst({
      where: {
        shopId,
        status: "POSTED",
        id: { not: original.id },
        processRunId: original.processRunId,
        postedAt: { gte: original.postedAt },
        reversedBy: null,
        lines: { some: { accountId: dest.accountId, creditGrams: { gt: 0 } } },
      },
      select: { id: true },
    });
    if (downstream) {
      throw new ConflictException(
        "Later process movements have consumed this material; reconcile them before correcting the original issue"
      );
    }

    const material = await tx.workshopMaterial.findUnique({
      where: { shopId_key: { shopId, key: original.materialKey } },
    });
    const oldWeight = original.weightGrams.toFixed(6);

    // 1. Reversal: restore material to source account, remove from process account
    await this.journal.postEntry(tx, {
      shopId,
      referenceType: WorkshopMetalJournalReferenceType.REVERSAL,
      referenceId: original.id,
      idempotencyKey: `reversal:${dto.idempotencyKey}`,
      description: `Reversal of additional issue ${original.entryNumber}: ${dto.reason.trim()}`,
      transactionDate: new Date(),
      weightGrams: oldWeight,
      materialKey: original.materialKey,
      jobId: original.jobId,
      treeId: original.treeId,
      processRunId: original.processRunId,
      actorUserId: userId,
      captureMethod: WorkshopScaleCaptureMethod.MANUAL_OVERRIDE,
      reversalOfId: original.id,
      scalePurpose: material?.scalePurpose ?? "GOLD",
      metadata: {
        reason: dto.reason.trim(),
        originalReadingId: original.scaleReadingId,
        originalJournalId: original.id,
        workflow: "ADDITIONAL_ISSUE",
        movementKind: "ADDITIONAL_ISSUE",
      },
      lines: [
        { accountId: source.accountId, debitGrams: oldWeight },
        { accountId: dest.accountId, creditGrams: oldWeight },
      ],
    });

    // 2. Replacement (if replacement weight provided)
    const repWeight = dto.replacementWeightGrams ? new Prisma.Decimal(dto.replacementWeightGrams) : null;
    let replacementEntry = null;
    if (repWeight && repWeight.gt(0)) {
      const repGrams = repWeight.toFixed(6);
      const posted = await this.journal.postEntry(tx, {
        shopId,
        referenceType: WorkshopMetalJournalReferenceType.CORRECTION_REPLACEMENT,
        referenceId: original.id,
        idempotencyKey: `correction:${dto.idempotencyKey}`,
        description: `Replacement additional issue for ${original.entryNumber}: ${dto.reason.trim()}`,
        transactionDate: new Date(),
        weightGrams: repGrams,
        materialKey: original.materialKey,
        jobId: original.jobId,
        treeId: original.treeId,
        processRunId: original.processRunId,
        actorUserId: userId,
        captureMethod: WorkshopScaleCaptureMethod.MANUAL_OVERRIDE,
        replacementForId: original.id,
        scalePurpose: material?.scalePurpose ?? "GOLD",
        metadata: {
          reason: dto.reason.trim(),
          originalReadingId: original.scaleReadingId,
          originalJournalId: original.id,
          workflow: "ADDITIONAL_ISSUE",
          movementKind: "ADDITIONAL_ISSUE",
        },
        lines: [
          { accountId: dest.accountId, debitGrams: repGrams },
          { accountId: source.accountId, creditGrams: repGrams },
        ],
      });
      replacementEntry = posted.entry;
    }

    await tx.auditLog.create({
      data: {
        userId,
        actorType: "SHOPKEEPER",
        action: "WORKSHOP_ADDITIONAL_ISSUE_CORRECT",
        resourceType: "WorkshopMetalJournal",
        resourceId: original.id,
        newValue: {
          shopId,
          processRunId: original.processRunId,
          journalId: original.id,
          reason: dto.reason.trim(),
          replacementWeightGrams: dto.replacementWeightGrams ?? null,
        },
      },
    });

    return replacementEntry
      ? this.journal.serializeEntry(replacementEntry, false)
      : { id: original.id, status: "REVERSED", voided: true };
  }
}

