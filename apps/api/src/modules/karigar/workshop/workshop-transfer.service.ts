import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, WorkshopAccountBucket, WorkshopMetalJournalReferenceType } from "@prisma/client";
import { randomUUID } from "crypto";
import { PrismaService } from "../../../prisma/prisma.service";
import { WorkshopMetalJournalService } from "./workshop-metal-journal.service";
import { WorkshopScaleService } from "./workshop-scale.service";
import { CreateWorkshopTransferDto } from "./dto/workshop-transfer.dto";

@Injectable()
export class WorkshopTransferService {
  constructor(private readonly prisma: PrismaService, private readonly journal: WorkshopMetalJournalService, private readonly scale: WorkshopScaleService) {}

  async create(shopId: string, userId: string, dto: CreateWorkshopTransferDto) {
    await this.scale.requireTraceableShop(shopId, true);
    const tree = await this.prisma.karigarCastingTree.findFirst({ where: { id: dto.treeId, shopId }, select: { id: true, jobId: true, job: { select: { status: true } } } });
    const material = await this.prisma.workshopMaterial.findUnique({ where: { shopId_key: { shopId, key: dto.materialKey } } });
    if (!tree || !material?.isActive) throw new NotFoundException("Tree or active material not found in this shop");
    if (["Completed", "CANCELLED", "REJECTED"].includes(tree.job.status)) throw new ConflictException("Finished or archived jobs cannot prepare a transfer");
    if (dto.fromDepartment.trim() === dto.toDepartment.trim()) throw new BadRequestException("Transfer departments must differ");
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "KarigarJob" WHERE "id" = ${tree.jobId} AND "shopId" = ${shopId} FOR UPDATE`;
      const currentJob = await tx.karigarJob.findFirst({ where: { id: tree.jobId, shopId }, select: { status: true } });
      if (!currentJob || ["Completed", "CANCELLED", "REJECTED"].includes(currentJob.status)) throw new ConflictException("Job changed state before transfer preparation");
      const transfer = await tx.workshopTransfer.create({ data: {
        shopId, jobId: tree.jobId, treeId: tree.id, materialKey: material.key,
        fromDepartment: dto.fromDepartment.trim(), toDepartment: dto.toDepartment.trim(),
      } });
      await tx.auditLog.create({ data: { userId, actorType: "SHOPKEEPER", action: "WORKSHOP_TRANSFER_PREPARE", resourceType: "WorkshopTransfer", resourceId: transfer.id, newValue: { shopId, treeId: tree.id, materialKey: material.key, fromDepartment: transfer.fromDepartment, toDepartment: transfer.toDepartment } } });
      return transfer;
    });
  }

  async list(shopId: string) {
    const transfers = await this.prisma.workshopTransfer.findMany({ where: { shopId }, include: { dispatchReading: true, receiveReading: true, toleranceRule: true }, orderBy: { createdAt: "desc" }, take: 100 });
    return transfers.map((transfer) => ({
      ...transfer,
      differenceGrams: transfer.differenceGrams?.toFixed(6) ?? null,
      dispatchGrams: transfer.dispatchReading?.weightGrams.toFixed(6) ?? null,
      receiveGrams: transfer.receiveReading?.weightGrams.toFixed(6) ?? null,
      toleranceGrams: transfer.toleranceRule?.maxDifferenceGrams.toFixed(6) ?? "0.000000",
    }));
  }

  async approve(shopId: string, userId: string, id: string, reason: string) {
    if (!reason?.trim()) throw new BadRequestException("Approval reason is required");
    return this.prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<{ id: string }[]>`SELECT "id" FROM "WorkshopTransfer" WHERE "id" = ${id} AND "shopId" = ${shopId} FOR UPDATE`;
      if (!rows.length) throw new NotFoundException("Transfer not found");
      const transfer = await tx.workshopTransfer.findFirst({ where: { id, shopId } });
      if (!transfer || transfer.status !== "EXCEPTION" || !transfer.differenceGrams) throw new ConflictException("Transfer has no pending exception");
      if (transfer.dispatchUserId === userId || transfer.receiveUserId === userId) throw new BadRequestException("A dispatching or receiving operator cannot approve their own exception");
      const approved = await tx.workshopTransfer.update({ where: { id }, data: { approvedByUserId: userId, approvedAt: new Date(), approvalReason: reason.trim() } });
      await tx.auditLog.create({ data: { userId, actorType: "SHOPKEEPER", action: "WORKSHOP_TRANSFER_EXCEPTION_APPROVE", resourceType: "WorkshopTransfer", resourceId: id, newValue: { shopId, differenceGrams: transfer.differenceGrams.toFixed(6), reason: reason.trim() } } });
      return { ...approved, differenceGrams: approved.differenceGrams?.toFixed(6) };
    });
  }

  async classifyDifference(shopId: string, userId: string, id: string, reason: string, sourceAccountId?: string) {
    if (!reason?.trim()) throw new BadRequestException("Transfer difference classification requires a reason");
    return this.prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<{ id: string }[]>`SELECT "id" FROM "WorkshopTransfer" WHERE "id" = ${id} AND "shopId" = ${shopId} FOR UPDATE`;
      if (!rows.length) throw new NotFoundException("Transfer not found");
      const transfer = await tx.workshopTransfer.findFirst({ where: { id, shopId, status: "RECEIVED" }, include: { dispatchReading: true, receiveReading: true } });
      if (!transfer?.dispatchReading || !transfer.receiveReading || !transfer.differenceGrams || transfer.differenceGrams.isZero()) throw new ConflictException("No received transfer difference to classify");
      if (transfer.dispatchUserId === userId || transfer.receiveUserId === userId) throw new BadRequestException("A participating operator cannot classify their own transfer difference");
      const positiveDifference = transfer.differenceGrams.gt(0);
      const transit = await tx.workshopMetalAccount.findUnique({ where: { shopId_materialKey_bucket_scopeId: { shopId, materialKey: transfer.materialKey, bucket: WorkshopAccountBucket.TRANSIT, scopeId: id } } });
      const variance = await this.journal.ensureAccount(tx, shopId, transfer.materialKey, WorkshopAccountBucket.TRANSFER_VARIANCE, id);
      let source: { id: string; balanceGrams: Prisma.Decimal };
      let destination: { id: string; balanceGrams: Prisma.Decimal };
      if (positiveDifference) {
        if (!transit || !transit.balanceGrams.eq(transfer.differenceGrams)) throw new ConflictException("Transfer transit balance does not match measured difference");
        source = transit;
        destination = variance;
      } else {
        if (!sourceAccountId) throw new BadRequestException("Identify a physically verified source stock account for the excess receipt");
        const stock = await tx.workshopMetalAccount.findFirst({ where: { id: sourceAccountId, shopId, materialKey: transfer.materialKey, bucket: { in: [WorkshopAccountBucket.VAULT, WorkshopAccountBucket.REUSABLE] }, isActive: true } });
        if (!stock || stock.balanceGrams.lt(transfer.differenceGrams.neg()) || !variance.balanceGrams.eq(transfer.differenceGrams)) {
          throw new ConflictException("Verified source stock or transfer variance balance does not match the excess receipt");
        }
        source = stock;
        destination = variance;
      }
      const weight = transfer.differenceGrams.abs().toFixed(6);
      const ref = randomUUID();
      const posted = await this.journal.postEntry(tx, {
        shopId, referenceType: WorkshopMetalJournalReferenceType.TRANSFER_RECEIPT,
        referenceId: ref, idempotencyKey: `transfer-variance:${id}:${ref}`,
        description: `Classified transfer variance: ${reason.trim()}`, transactionDate: new Date(),
        weightGrams: weight, materialKey: transfer.materialKey,
        jobId: transfer.jobId, treeId: transfer.treeId, transferId: id,
        actorUserId: userId, derivedClassification: true,
        metadata: { classification: "TRANSFER_VARIANCE", dispatchReadingId: transfer.dispatchReadingId, receiveReadingId: transfer.receiveReadingId, reason: reason.trim(), approverUserId: userId, sourceAccountId: source.id },
        lines: [{ accountId: destination.id, debitGrams: weight }, { accountId: source.id, creditGrams: weight }],
      });
      await tx.workshopTransfer.update({ where: { id }, data: { status: "RECONCILED", approvedByUserId: userId, approvedAt: new Date(), approvalReason: reason.trim() } });
      await tx.auditLog.create({ data: { userId, actorType: "SHOPKEEPER", action: "WORKSHOP_TRANSFER_VARIANCE_CLASSIFY", resourceType: "WorkshopTransfer", resourceId: id, newValue: { shopId, weightGrams: weight, reason: reason.trim(), journalId: posted.entry.id } } });
      return this.journal.serializeEntry(posted.entry, posted.idempotent);
    });
  }

  async cancelPrepared(shopId: string, userId: string, id: string) {
    return this.prisma.$transaction(async (tx) => {
      const changed = await tx.workshopTransfer.updateMany({ where: { id, shopId, status: "PREPARED" }, data: { status: "CANCELLED" } });
      if (changed.count !== 1) throw new ConflictException("Only an untouched prepared transfer can be cancelled");
      const cancelled = await tx.workshopTransfer.findUniqueOrThrow({ where: { id } });
      await tx.auditLog.create({ data: { userId, actorType: "SHOPKEEPER", action: "WORKSHOP_TRANSFER_CANCEL", resourceType: "WorkshopTransfer", resourceId: id, newValue: { shopId } } });
      return cancelled;
    });
  }
}
