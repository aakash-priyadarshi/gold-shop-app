import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, WorkshopAccountBucket, WorkshopMetalJournalReferenceType } from "@prisma/client";
import { randomUUID } from "crypto";
import { PrismaService } from "../../../prisma/prisma.service";
import { WorkshopMetalJournalService } from "./workshop-metal-journal.service";
import { WorkshopScaleService } from "./workshop-scale.service";
import { CreateWorkshopRecoveryContainerDto, WorkshopAssayDto } from "./dto/workshop-recovery.dto";

@Injectable()
export class WorkshopRecoveryService {
  constructor(private readonly prisma: PrismaService, private readonly journal: WorkshopMetalJournalService, private readonly scale: WorkshopScaleService) {}

  async createContainer(shopId: string, userId: string, dto: CreateWorkshopRecoveryContainerDto) {
    await this.scale.requireTraceableShop(shopId, true);
    const material = await this.prisma.workshopMaterial.findUnique({ where: { shopId_key: { shopId, key: dto.materialKey } } });
    if (!material?.isActive || material.scalePurpose !== "GOLD") throw new BadRequestException("Recovery bag requires an active metal material");
    if (dto.sourceProcessRunId) {
      const run = await this.prisma.workshopProcessRun.findFirst({ where: { id: dto.sourceProcessRunId, shopId } });
      if (!run) throw new BadRequestException("Source process run does not belong to this shop");
    }
    if (dto.workstationId) {
      const machine = await this.prisma.workshopWorkstation.findFirst({ where: { id: dto.workstationId, shopId } });
      if (!machine) throw new BadRequestException("Workstation does not belong to this shop");
    }
    return this.prisma.$transaction(async (tx) => {
      const bag = await tx.workshopRecoveryContainer.create({ data: {
        shopId, code: dto.code.trim(), materialKey: dto.materialKey,
        sourceProcessRunId: dto.sourceProcessRunId ?? null, workstationId: dto.workstationId ?? null,
      } });
      await tx.auditLog.create({ data: { userId, actorType: "SHOPKEEPER", action: "WORKSHOP_RECOVERY_BAG_CREATE", resourceType: "WorkshopRecoveryContainer", resourceId: bag.id, newValue: { shopId, code: bag.code, materialKey: bag.materialKey } } });
      return bag;
    });
  }

  async list(shopId: string) {
    const bags = await this.prisma.workshopRecoveryContainer.findMany({ where: { shopId }, include: { events: true }, orderBy: { openedAt: "desc" }, take: 100 });
    const balances = await this.prisma.workshopMetalAccount.findMany({ where: { shopId, bucket: WorkshopAccountBucket.RECOVERY_PENDING, scopeId: { in: bags.map((bag) => bag.id) } } });
    const byBag = new Map(balances.map((account) => [account.scopeId, account.balanceGrams.toFixed(6)]));
    return bags.map((bag) => ({ ...bag, expectedBalanceGrams: byBag.get(bag.id) ?? "0.000000" }));
  }

  async bagDetail(shopId: string, id: string) {
    const bag = await this.prisma.workshopRecoveryContainer.findFirst({ where: { id, shopId }, include: { workstation: true, sourceProcessRun: true, events: true, journals: { include: { lines: { include: { account: true } }, scaleReading: true }, orderBy: { postedAt: "asc" } } } });
    if (!bag) throw new NotFoundException("Recovery bag not found");
    const account = await this.prisma.workshopMetalAccount.findUnique({ where: { shopId_materialKey_bucket_scopeId: { shopId, materialKey: bag.materialKey, bucket: WorkshopAccountBucket.RECOVERY_PENDING, scopeId: id } } });
    return { ...bag, expectedBalanceGrams: account?.balanceGrams.toFixed(6) ?? "0.000000", deposits: bag.journals.filter((j) => j.referenceType === "RECOVERY_DEPOSIT").map((j) => this.journal.serializeEntry(j, false)) };
  }

  async createEvent(shopId: string, userId: string, containerId: string) {
    await this.scale.requireTraceableShop(shopId, true);
    return this.prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<{ id: string }[]>`SELECT "id" FROM "WorkshopRecoveryContainer" WHERE "id" = ${containerId} AND "shopId" = ${shopId} FOR UPDATE`;
      if (!locked.length) throw new NotFoundException("Recovery bag not found");
      const bag = await tx.workshopRecoveryContainer.findFirst({ where: { id: containerId, shopId, status: "OPEN" } });
      if (!bag) throw new ConflictException("Only an open bag may be sent for recovery");
      const account = await tx.workshopMetalAccount.findUnique({ where: { shopId_materialKey_bucket_scopeId: { shopId, materialKey: bag.materialKey, bucket: WorkshopAccountBucket.RECOVERY_PENDING, scopeId: bag.id } } });
      if (!account || account.balanceGrams.lte(0)) throw new BadRequestException("Recovery bag has no weighed deposits");
      const event = await tx.workshopRecoveryEvent.create({ data: { shopId, containerId: bag.id } });
      await tx.workshopRecoveryContainer.update({ where: { id: bag.id }, data: { status: "CLOSED", closedAt: new Date(), destination: "REFINERY" } });
      await tx.auditLog.create({ data: { userId, actorType: "SHOPKEEPER", action: "WORKSHOP_RECOVERY_BAG_CLOSE", resourceType: "WorkshopRecoveryContainer", resourceId: bag.id, newValue: { shopId, expectedGrams: account.balanceGrams.toFixed(6), recoveryEventId: event.id } } });
      return { ...event, expectedGrams: account.balanceGrams.toFixed(6) };
    });
  }

  async eventDetail(shopId: string, id: string) {
    const event = await this.prisma.workshopRecoveryEvent.findFirst({ where: { id, shopId }, include: { container: true, sendReading: true, assays: true, journals: { include: { lines: { include: { account: true } }, scaleReading: true }, orderBy: { postedAt: "asc" } } } });
    if (!event) throw new NotFoundException("Recovery event not found");
    const [bagAccount, refineryAccount] = await Promise.all([
      this.prisma.workshopMetalAccount.findUnique({ where: { shopId_materialKey_bucket_scopeId: { shopId, materialKey: event.container.materialKey, bucket: WorkshopAccountBucket.RECOVERY_PENDING, scopeId: event.containerId } } }),
      this.prisma.workshopMetalAccount.findUnique({ where: { shopId_materialKey_bucket_scopeId: { shopId, materialKey: event.container.materialKey, bucket: WorkshopAccountBucket.REFINERY, scopeId: id } } }),
    ]);
    return {
      ...event,
      sendGrams: event.sendReading?.weightGrams.toFixed(6) ?? null,
      bagUnclassifiedGrams: bagAccount?.balanceGrams.toFixed(6) ?? "0.000000",
      refineryUnclassifiedGrams: refineryAccount?.balanceGrams.toFixed(6) ?? "0.000000",
      varianceGrams: event.varianceGrams?.toFixed(6) ?? null,
      journals: event.journals.map((j) => this.journal.serializeEntry(j, false)),
    };
  }

  async recordAssay(shopId: string, userId: string, dto: WorkshopAssayDto) {
    const material = await this.prisma.workshopMaterial.findFirst({ where: { id: dto.materialId, shopId } });
    if (!material) throw new NotFoundException("Workshop material not found");
    if (dto.recoveryEventId) {
      const event = await this.prisma.workshopRecoveryEvent.findFirst({
        where: { id: dto.recoveryEventId, shopId },
        include: { container: true },
      });
      if (!event || event.status === "OPEN") throw new BadRequestException("Assay requires a sent recovery event in this shop");
      if (material.key !== event.container.materialKey) {
        throw new BadRequestException("Assay material must match the recovery container physical material");
      }
    }
    const purity = new Prisma.Decimal(dto.fineGoldFraction);
    if (purity.lt(0) || purity.gt(1)) throw new BadRequestException("Assay purity must be between zero and one");
    return this.prisma.$transaction(async (tx) => {
      const assay = await tx.workshopMaterialAssay.create({ data: {
        shopId, materialId: material.id, recoveryEventId: dto.recoveryEventId ?? null,
        fineGoldFraction: purity, source: dto.source.trim(), evidence: dto.evidence?.trim() || null,
        actorUserId: userId,
      } });
      await tx.auditLog.create({ data: { userId, actorType: "SHOPKEEPER", action: "WORKSHOP_MATERIAL_ASSAY", resourceType: "WorkshopMaterialAssay", resourceId: assay.id, newValue: { shopId, materialId: material.id, fineGoldFraction: purity.toFixed(6), source: dto.source.trim(), recoveryEventId: dto.recoveryEventId ?? null } } });
      return { ...assay, fineGoldFraction: purity.toFixed(6) };
    });
  }

  async classifyAndClose(shopId: string, userId: string, id: string, reason: string) {
    if (!reason?.trim()) throw new BadRequestException("Recovery variance classification requires a reason");
    return this.prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<{ id: string }[]>`SELECT "id" FROM "WorkshopRecoveryEvent" WHERE "id" = ${id} AND "shopId" = ${shopId} FOR UPDATE`;
      if (!locked.length) throw new NotFoundException("Recovery event not found");
      const event = await tx.workshopRecoveryEvent.findFirst({ where: { id, shopId }, include: { container: true, sendReading: { select: { actorUserId: true } } } });
      if (!event || event.status !== "SENT" || !event.sendReadingId) throw new ConflictException("Recovery must be physically sent before final reconciliation");
      if (event.sendReading?.actorUserId === userId) throw new BadRequestException("A sending operator cannot classify their own recovery difference");

      const hasPhysicalResult = await tx.workshopMetalJournal.findFirst({
        where: {
          shopId,
          recoveryEventId: id,
          referenceType: WorkshopMetalJournalReferenceType.RECOVERY_RESULT,
          scaleReadingId: { not: null },
          reversalOfId: null,
          status: "POSTED",
          reversedBy: null,
        },
        select: { id: true },
      });
      if (!hasPhysicalResult) {
        throw new BadRequestException("Physical recovery or refinery return weighing result must be recorded before final settlement");
      }

      const latestAssay = await tx.workshopMaterialAssay.findFirst({
        where: {
          shopId,
          recoveryEventId: id,
          material: { key: event.container.materialKey },
        },
        orderBy: { assayedAt: "desc" },
      });

      const accounts = await tx.workshopMetalAccount.findMany({ where: { shopId, materialKey: event.container.materialKey, OR: [
        { bucket: WorkshopAccountBucket.RECOVERY_PENDING, scopeId: event.containerId },
        { bucket: WorkshopAccountBucket.REFINERY, scopeId: event.id },
      ] } });
      const variance = await this.journal.ensureAccount(tx, shopId, event.container.materialKey, WorkshopAccountBucket.RECOVERY_VARIANCE);
      const journals = [];
      let total = new Prisma.Decimal(0);
      for (const source of accounts) {
        if (source.balanceGrams.lte(0)) continue;
        const weight = source.balanceGrams.toFixed(6);
        const ref = randomUUID();
        const posted = await this.journal.postEntry(tx, {
          shopId, referenceType: WorkshopMetalJournalReferenceType.RECOVERY_RESULT,
          referenceId: ref, idempotencyKey: `recovery-variance:${id}:${source.id}:${ref}`,
          description: `Classified recovery variance: ${reason.trim()}`,
          transactionDate: new Date(), weightGrams: weight, materialKey: source.materialKey,
          recoveryContainerId: event.containerId, recoveryEventId: id, actorUserId: userId,
          derivedClassification: true,
          metadata: { classification: "RECOVERY_VARIANCE", sourceAccountId: source.id, reason: reason.trim(), approverUserId: userId, assayId: latestAssay?.id ?? null },
          lines: [{ accountId: variance.id, debitGrams: weight }, { accountId: source.id, creditGrams: weight }],
        });
        journals.push(this.journal.serializeEntry(posted.entry, posted.idempotent));
        total = total.plus(weight);
      }
      await tx.workshopRecoveryEvent.update({ where: { id }, data: { status: "RECONCILED", varianceGrams: total, approvedByUserId: userId, approvedAt: new Date(), notes: reason.trim() } });
      await tx.workshopRecoveryContainer.update({ where: { id: event.containerId }, data: { status: "PROCESSED" } });
      await tx.auditLog.create({ data: { userId, actorType: "SHOPKEEPER", action: "WORKSHOP_RECOVERY_RECONCILE", resourceType: "WorkshopRecoveryEvent", resourceId: id, newValue: { shopId, varianceGrams: total.toFixed(6), reason: reason.trim(), journalIds: journals.map((journal) => journal.id), assayPurity: latestAssay?.fineGoldFraction ? latestAssay.fineGoldFraction.toFixed(6) : null } } });
      return { eventId: id, varianceGrams: total.toFixed(6), journals, assay: latestAssay ? { id: latestAssay.id, fineGoldFraction: latestAssay.fineGoldFraction.toFixed(6), source: latestAssay.source } : null };
    });
  }
}
