import { Injectable } from "@nestjs/common";
import { WorkshopAccountBucket } from "@prisma/client";
import { PrismaService } from "../../../prisma/prisma.service";
import { WorkshopMetalJournalService } from "./workshop-metal-journal.service";

@Injectable()
export class WorkshopReportService {
  constructor(private readonly prisma: PrismaService, private readonly journal: WorkshopMetalJournalService) {}

  async dashboard(shopId: string) {
    const [accounts, runs, transfers, bags, readings, corrections, finished, varianceEntries] = await Promise.all([
      this.prisma.workshopMetalAccount.findMany({ where: { shopId, isActive: true }, orderBy: [{ materialKey: "asc" }, { bucket: "asc" }, { scopeId: "asc" }] }),
      this.prisma.workshopProcessRun.findMany({ where: { shopId }, select: { id: true, treeId: true, jobId: true, batchChildId: true, operatorUserId: true, status: true, department: true, workstation: { select: { name: true } }, definition: { select: { name: true } }, job: { select: { product: true } }, batchChild: { select: { label: true } }, approvalUserId: true, approvalAt: true, approvalReason: true }, orderBy: { startedAt: "desc" }, take: 100 }),
      this.prisma.workshopTransfer.findMany({ where: { shopId }, include: { dispatchReading: true, receiveReading: true, toleranceRule: true }, orderBy: { createdAt: "desc" }, take: 100 }),
      this.prisma.workshopRecoveryContainer.findMany({ where: { shopId }, include: { events: { include: { assays: true } } }, orderBy: { openedAt: "desc" }, take: 100 }),
      this.prisma.workshopScaleReading.findMany({ where: { shopId }, include: { device: { select: { name: true, adapterKind: true } }, journal: { select: { id: true, referenceType: true } } }, orderBy: { capturedAt: "desc" }, take: 100 }),
      this.prisma.workshopMetalJournal.findMany({ where: { shopId, referenceType: { in: ["MANUAL_OVERRIDE", "REVERSAL", "CORRECTION_REPLACEMENT", "MATERIAL_OPENING_BALANCE", "GOLD995_OPENING_BALANCE"] } }, include: { lines: { include: { account: true } } }, orderBy: { postedAt: "desc" }, take: 100 }),
      this.prisma.inventoryItem.findMany({ where: { shopId, workshopReceiptJournalId: { not: null } }, select: { id: true, nameEn: true, sku: true, totalWeightGrams: true, visibility: true, workshopReceiptJournalId: true }, orderBy: { createdAt: "desc" }, take: 100 }),
      this.prisma.workshopMetalJournal.findMany({ where: { shopId, referenceType: "PROCESS_OUTPUT", processRunId: { not: null }, scaleReadingId: null }, select: { id: true, processRunId: true, materialKey: true, weightGrams: true, postedAt: true, actorUserId: true, metadata: true }, orderBy: { postedAt: "desc" }, take: 100 }),
    ]);
    const stock = accounts.map((account) => ({
      accountId: account.id, materialKey: account.materialKey, bucket: account.bucket,
      scopeId: account.scopeId, balanceGrams: account.balanceGrams.toFixed(6),
      purity: account.purity?.toFixed(6) ?? null,
    }));
    const process = runs.map((run) => ({
      ...run, unclassified: stock.filter((account) => account.bucket === WorkshopAccountBucket.PROCESS && account.scopeId === run.id),
    }));
    const runsById = new Map(runs.map((run) => [run.id, run]));
    return {
      generatedAt: new Date(),
      materialStock: stock,
      process,
      processVariance: varianceEntries.filter((entry) => entry.metadata && typeof entry.metadata === "object" && !Array.isArray(entry.metadata) &&
        (entry.metadata as Record<string, unknown>).classification === "PROCESS_VARIANCE").map((entry) => ({
        id: entry.id, processRunId: entry.processRunId, materialKey: entry.materialKey,
        weightGrams: entry.weightGrams.toFixed(6), classifiedAt: entry.postedAt,
        approverUserId: entry.actorUserId,
        process: entry.processRunId ? runsById.get(entry.processRunId) ?? null : null,
      })),
      transferVariance: transfers.map((transfer) => ({
        id: transfer.id, treeId: transfer.treeId, materialKey: transfer.materialKey,
        fromDepartment: transfer.fromDepartment, toDepartment: transfer.toDepartment,
        status: transfer.status, dispatchGrams: transfer.dispatchReading?.weightGrams.toFixed(6) ?? null,
        receiveGrams: transfer.receiveReading?.weightGrams.toFixed(6) ?? null,
        differenceGrams: transfer.differenceGrams?.toFixed(6) ?? null,
        toleranceGrams: transfer.toleranceRule?.maxDifferenceGrams.toFixed(6) ?? null,
        exceptionReason: transfer.exceptionReason, approvedByUserId: transfer.approvedByUserId,
      })),
      recovery: bags.map((bag) => ({
        id: bag.id, code: bag.code, materialKey: bag.materialKey, status: bag.status,
        expectedBalanceGrams: stock.find((account) => account.bucket === WorkshopAccountBucket.RECOVERY_PENDING && account.scopeId === bag.id)?.balanceGrams ?? "0.000000",
        events: bag.events.map((event) => ({ id: event.id, status: event.status, varianceGrams: event.varianceGrams?.toFixed(6) ?? null, assayedFractions: event.assays.map((assay) => assay.fineGoldFraction.toFixed(6)) })),
      })),
      scaleAudit: readings.map((reading) => ({
        id: reading.id, deviceId: reading.deviceId, deviceName: reading.device.name,
        adapterKind: reading.device.adapterKind, purpose: reading.purpose,
        weightGrams: reading.weightGrams.toFixed(6), stable: reading.stable,
        sequence: reading.sequence, readingAt: reading.readingAt, capturedAt: reading.capturedAt,
        actorUserId: reading.actorUserId, rawFrame: reading.rawFrame, samples: reading.sampleFrames,
        journalId: reading.journal?.id ?? null, referenceType: reading.journal?.referenceType ?? null,
      })),
      correctionHistory: corrections.map((entry) => this.journal.serializeEntry(entry, false)),
      finishedGoods: finished,
    };
  }
}
