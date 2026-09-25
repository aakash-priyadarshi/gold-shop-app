import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import {
  InventoryStatus, InventoryVisibility, Prisma, WorkshopAccountBucket, WorkshopMetalAccountKey, WorkshopMetalJournalReferenceType,
  WorkshopScaleCaptureMethod, WorkshopWeighingSessionStatus,
} from "@prisma/client";
import { assertPositiveQuantumGrams, WORKSHOP_GOLD_995_MATERIAL_KEY } from "@gold-shop/shared";
import { PrismaService } from "../../../prisma/prisma.service";
import { PlanLimitsService } from "../../core/subscriptions/plan-limits.service";
import { SESSION_TTL_MS, SCALE_PRECISION_GRAMS } from "./workshop-metal.types";
import { WorkshopCatalogService } from "./workshop-catalog.service";
import { WorkshopMetalJournalService } from "./workshop-metal-journal.service";
import { WorkshopScaleService } from "./workshop-scale.service";
import { ConfirmWorkshopMovementDto, CreateWorkshopMovementSessionDto, WorkshopMovementKind } from "./dto/workshop-movement.dto";

type AccountDestination = { bucket: WorkshopAccountBucket; scopeId: string; materialKey: string };

const REFERENCE: Record<WorkshopMovementKind, WorkshopMetalJournalReferenceType> = {
  MATERIAL_ISSUE: WorkshopMetalJournalReferenceType.MATERIAL_ISSUE,
  ADDITIONAL_ISSUE: WorkshopMetalJournalReferenceType.MATERIAL_ISSUE,
  PROCESS_INPUT: WorkshopMetalJournalReferenceType.PROCESS_INPUT,
  PROCESS_OUTPUT: WorkshopMetalJournalReferenceType.PROCESS_OUTPUT,
  MIXED_OUTPUT: WorkshopMetalJournalReferenceType.MIXED_OUTPUT,
  TRANSFER_DISPATCH: WorkshopMetalJournalReferenceType.TRANSFER_DISPATCH,
  TRANSFER_RECEIPT: WorkshopMetalJournalReferenceType.TRANSFER_RECEIPT,
  RECOVERY_DEPOSIT: WorkshopMetalJournalReferenceType.RECOVERY_DEPOSIT,
  RECOVERY_SEND: WorkshopMetalJournalReferenceType.RECOVERY_SEND,
  RECOVERY_RESULT: WorkshopMetalJournalReferenceType.RECOVERY_RESULT,
  STONE_SETTING: WorkshopMetalJournalReferenceType.MATERIAL_ISSUE,
  STONE_RETURN: WorkshopMetalJournalReferenceType.PROCESS_OUTPUT,
  FINISHED_RECEIPT: WorkshopMetalJournalReferenceType.FINISHED_RECEIPT,
};

@Injectable()
export class WorkshopMovementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly catalog: WorkshopCatalogService,
    private readonly journal: WorkshopMetalJournalService,
    private readonly scale: WorkshopScaleService,
    private readonly planLimits: PlanLimitsService,
  ) {}

  /** PR #54 posted Gold 995 into a shop-wide WIP account. Allocate each
   *  original reading once to its tree before a scoped workflow consumes it. */
  private async allocateLegacyTreeWip(tx: Prisma.TransactionClient, shopId: string, treeId: string) {
    const defaults = await this.journal.ensureDefaultAccounts(tx, shopId);
    const legacyWipId = defaults.get(WorkshopMetalAccountKey.CASTING_TREE_WIP);
    if (!legacyWipId) throw new BadRequestException("Gold 995 legacy WIP account is unavailable");
    await tx.$queryRaw`SELECT "id" FROM "Shop" WHERE "id" = ${shopId} FOR UPDATE`;
    const oldIssues = await tx.workshopMetalJournal.findMany({
      where: {
        shopId, treeId, status: "POSTED", referenceType: WorkshopMetalJournalReferenceType.GOLD995_ISSUE_TO_TREE,
        lines: { some: { accountId: legacyWipId, debitGrams: { gt: 0 } } },
      },
      include: { lines: true }, orderBy: { postedAt: "asc" },
    });
    if (!oldIssues.length) return;
    const scoped = await this.journal.ensureAccount(tx, shopId, WORKSHOP_GOLD_995_MATERIAL_KEY, WorkshopAccountBucket.WIP, treeId);
    for (const issue of oldIssues) {
      const alreadyAllocated = await tx.workshopMetalJournal.findUnique({
        where: { shopId_referenceType_referenceId: { shopId, referenceType: WorkshopMetalJournalReferenceType.LEGACY_WIP_ALLOCATION, referenceId: issue.id } },
        select: { id: true },
      });
      if (alreadyAllocated) continue;
      const amount = issue.lines.filter((line) => line.accountId === legacyWipId)
        .reduce((sum, line) => sum.plus(line.debitGrams).minus(line.creditGrams), new Prisma.Decimal(0));
      if (amount.lte(0)) continue;
      const grams = amount.toFixed(6);
      await this.journal.postEntry(tx, {
        shopId, referenceType: WorkshopMetalJournalReferenceType.LEGACY_WIP_ALLOCATION,
        referenceId: issue.id, idempotencyKey: `legacy-wip-allocation:${issue.id}`,
        description: `Allocate pre-upgrade Gold 995 issue to tree ${treeId}`,
        transactionDate: new Date(), weightGrams: grams,
        materialKey: WORKSHOP_GOLD_995_MATERIAL_KEY,
        jobId: issue.jobId, treeId, derivedClassification: true,
        metadata: { originalJournalId: issue.id, originalReadingId: issue.scaleReadingId },
        lines: [{ accountId: scoped.id, debitGrams: grams }, { accountId: legacyWipId, creditGrams: grams }],
      });
    }
  }

  async createSession(shopId: string, userId: string, dto: CreateWorkshopMovementSessionDto) {
    await this.scale.requireTraceableShop(shopId, true);
    const kind = dto.movementKind;
    if (dto.transferId && !["TRANSFER_DISPATCH", "TRANSFER_RECEIPT"].includes(kind)) {
      throw new BadRequestException("Transfer context is only valid for dispatch and receipt");
    }
    if (dto.recoveryEventId && !["RECOVERY_SEND", "RECOVERY_RESULT"].includes(kind)) {
      throw new BadRequestException("Recovery event context is only valid for send and result");
    }
    if (dto.recoveryContainerId && !["RECOVERY_DEPOSIT", "RECOVERY_SEND", "RECOVERY_RESULT"].includes(kind) &&
        !(kind === "PROCESS_OUTPUT" && dto.disposition === "RECOVERY_PENDING")) {
      throw new BadRequestException("Recovery bag context does not belong to this movement");
    }
    if (dto.processRunId && !["ADDITIONAL_ISSUE", "PROCESS_INPUT", "MIXED_OUTPUT", "PROCESS_OUTPUT", "RECOVERY_DEPOSIT", "TRANSFER_DISPATCH", "TRANSFER_RECEIPT", "STONE_SETTING", "STONE_RETURN", "FINISHED_RECEIPT"].includes(kind)) {
      throw new BadRequestException("Process run context does not belong to this movement");
    }
    await this.catalog.ensureBaseMaterials(shopId);
    return this.prisma.$transaction(async (tx) => {
      const mixing = dto.movementKind === "MIXED_OUTPUT";
      const material = mixing ? { isActive: true, scalePurpose: "GOLD" as const } :
        await tx.workshopMaterial.findUnique({ where: { shopId_key: { shopId, key: dto.materialKey } } });
      if (!material?.isActive) throw new NotFoundException("Workshop material not found");
      if ((dto.movementKind === "STONE_SETTING" || dto.movementKind === "STONE_RETURN") !== (material.scalePurpose === "STONE") &&
          ["STONE_SETTING", "STONE_RETURN", "RECOVERY_DEPOSIT", "RECOVERY_SEND", "RECOVERY_RESULT", "FINISHED_RECEIPT"].includes(dto.movementKind)) {
        throw new BadRequestException("Movement kind does not match material scale purpose");
      }
      if (material.scalePurpose === "STONE" && ["MATERIAL_ISSUE", "ADDITIONAL_ISSUE"].includes(dto.movementKind)) {
        throw new BadRequestException("Use the explicit Stone setting movement for stones destined for jewellery");
      }
      const device = await tx.workshopScaleDevice.findFirst({ where: { id: dto.deviceId, shopId, isActive: true } });
      if (!device || device.purpose !== material.scalePurpose ||
          !new Prisma.Decimal(device.precisionGrams).eq(SCALE_PRECISION_GRAMS[material.scalePurpose])) {
        throw new BadRequestException("The selected active device does not match the material's scale type and precision");
      }
      if (!["SIMULATOR", "SERIAL", "TCP"].includes(device.adapterKind)) throw new BadRequestException("Unsupported Workshop scale adapter");
      if (device.adapterKind === "SIMULATOR") this.scale.requireSimulatorAllowed(shopId);
      const sequenceDevice = await tx.workshopScaleDevice.update({ where: { id: device.id }, data: { nextSequence: { increment: 1 } } });

      const tree = dto.treeId ? await tx.karigarCastingTree.findFirst({
        where: { id: dto.treeId, shopId },
        include: { job: { select: { status: true } }, movements: { select: { id: true }, take: 1 }, workshopMetalJournals: { select: { id: true }, take: 1 } },
      }) : null;
      if (dto.treeId && !tree) throw new NotFoundException("Casting tree not found in this shop");
      if (tree && (["CANCELLED", "REJECTED"].includes(tree.job.status) ||
          (tree.job.status === "Completed" && kind !== "FINISHED_RECEIPT"))) {
        throw new BadRequestException("Finished or archived jobs cannot start another physical movement");
      }
      if (tree && (tree.movements.length ||
          (new Prisma.Decimal(tree.issuedGrams || 0).gt(0) && !tree.workshopMetalJournals.length) ||
          (tree.metalKey !== WORKSHOP_GOLD_995_MATERIAL_KEY && tree.workshopMetalJournals.length))) {
        throw new BadRequestException("A casting tree with legacy physical history cannot enter the TRACEABLE flow");
      }
      if (tree && tree.metalKey !== WORKSHOP_GOLD_995_MATERIAL_KEY &&
          !(dto.movementKind === "MATERIAL_ISSUE" && dto.materialKey === WORKSHOP_GOLD_995_MATERIAL_KEY)) {
        throw new BadRequestException("Start this casting tree with a physical Gold 995 issue before other traceable movements");
      }
      if (dto.jobId && tree && dto.jobId !== tree.jobId) throw new BadRequestException("Job does not own casting tree");
      const jobId = tree?.jobId ?? dto.jobId ?? null;
      if (jobId) {
        await tx.$queryRaw`SELECT "id" FROM "KarigarJob" WHERE "id" = ${jobId} AND "shopId" = ${shopId} FOR UPDATE`;
        const job = await tx.karigarJob.findFirst({ where: { id: jobId, shopId }, select: { id: true, status: true } });
        if (!job || ["CANCELLED", "REJECTED"].includes(job.status) ||
            (job.status === "Completed" && kind !== "FINISHED_RECEIPT")) {
          throw new NotFoundException("Active job not found in this shop");
        }
      }
      const run = dto.processRunId ? await tx.workshopProcessRun.findFirst({ where: { id: dto.processRunId, shopId } }) : null;
      if (dto.processRunId && (!run || !["OPEN", "RECONCILIATION_PENDING"].includes(run.status))) throw new BadRequestException("Active process run not found");
      if (run && (tree?.id !== run.treeId || (jobId && jobId !== run.jobId) || (dto.batchChildId ?? null) !== run.batchChildId)) {
        throw new BadRequestException("Process run does not belong to this job, tree and child group");
      }
      if (mixing && (!run?.recipeId || dto.materialKey !== `mix_${run.id.replace(/-/g, "")}`)) {
        throw new BadRequestException("Mixed output requires a recipe run and its derived material key");
      }
      const transfer = dto.transferId ? await tx.workshopTransfer.findFirst({ where: { id: dto.transferId, shopId } }) : null;
      if (dto.transferId && (!transfer || transfer.materialKey !== dto.materialKey || (tree && transfer.treeId !== tree.id))) {
        throw new BadRequestException("Transfer does not match shop, material and tree");
      }
      if (dto.movementKind === "TRANSFER_DISPATCH" && transfer?.status !== "PREPARED") throw new ConflictException("Transfer is not prepared for dispatch");
      if (dto.movementKind === "TRANSFER_RECEIPT" && !["DISPATCHED", "EXCEPTION"].includes(transfer?.status ?? "")) throw new ConflictException("Transfer is not dispatched for receipt");
      const container = dto.recoveryContainerId ? await tx.workshopRecoveryContainer.findFirst({ where: { id: dto.recoveryContainerId, shopId } }) : null;
      if (dto.recoveryContainerId && (!container || (dto.movementKind !== "RECOVERY_RESULT" && container.materialKey !== dto.materialKey))) throw new BadRequestException("Recovery container material mismatch");
      if (["RECOVERY_DEPOSIT", "PROCESS_OUTPUT"].includes(dto.movementKind) && container && container.status !== "OPEN") throw new ConflictException("Recovery bag is not open for deposits");
      const event = dto.recoveryEventId ? await tx.workshopRecoveryEvent.findFirst({ where: { id: dto.recoveryEventId, shopId } }) : null;
      if (dto.recoveryEventId && (!event || event.containerId !== container?.id)) throw new BadRequestException("Recovery event does not belong to this container");
      if (dto.movementKind === "RECOVERY_SEND" && event?.status !== "OPEN") throw new ConflictException("Recovery event has already been sent");
      if (dto.movementKind === "RECOVERY_RESULT" && (!event || event.status !== "SENT")) throw new BadRequestException("Send the recovery material before recording the returned result");
      const child = dto.batchChildId ? await tx.workshopBatchChild.findFirst({ where: { id: dto.batchChildId, shopId } }) : null;
      if (dto.batchChildId && (!child || child.treeId !== tree?.id)) throw new BadRequestException("Batch child does not belong to this tree");

      let sourceAccount: { id: string } | null = null;
      let destinationAccount: { id: string } | null = null;
      if (!mixing) {
        const { source, destination } = this.accountsFor(dto, { treeId: tree?.id, runId: run?.id, transferId: transfer?.id, containerId: container?.id, eventId: event?.id, childId: child?.id, containerMaterialKey: container?.materialKey });
        if (source.bucket === WorkshopAccountBucket.WIP && source.materialKey === WORKSHOP_GOLD_995_MATERIAL_KEY && tree?.id) {
          await this.allocateLegacyTreeWip(tx, shopId, tree.id);
        }
        sourceAccount = await this.journal.ensureAccount(tx, shopId, source.materialKey, source.bucket, source.scopeId);
        destinationAccount = await this.journal.ensureAccount(tx, shopId, destination.materialKey, destination.bucket, destination.scopeId);
      }
      const session = await tx.workshopWeighingSession.create({ data: {
        shopId, deviceId: device.id, assignedSequence: sequenceDevice.nextSequence - 1, jobId, treeId: tree?.id ?? null,
        materialKey: dto.materialKey, movementKind: dto.movementKind,
        requiredPurpose: material.scalePurpose,
        sourceAccountId: sourceAccount?.id ?? null, destinationAccountId: destinationAccount?.id ?? null,
        processRunId: run?.id ?? null, transferId: transfer?.id ?? null,
        recoveryContainerId: container?.id ?? null, recoveryEventId: event?.id ?? null,
        batchChildId: child?.id ?? null,
        captureMethod: device.adapterKind === "SIMULATOR" ? WorkshopScaleCaptureMethod.SIMULATOR : WorkshopScaleCaptureMethod.DEVICE,
        actorUserId: userId, expiresAt: new Date(Date.now() + SESSION_TTL_MS),
      } });
      return { id: session.id, movementKind: session.movementKind, materialKey: session.materialKey, requiredPurpose: session.requiredPurpose, deviceId: session.deviceId, assignedSequence: session.assignedSequence, expiresAt: session.expiresAt, sourceAccountId: sourceAccount?.id ?? null, destinationAccountId: destinationAccount?.id ?? null };
    });
  }

  private accountsFor(dto: CreateWorkshopMovementSessionDto, context: {
    treeId?: string; runId?: string; transferId?: string; containerId?: string; eventId?: string; childId?: string; containerMaterialKey?: string;
  }): { source: AccountDestination; destination: AccountDestination } {
    const account = (bucket: WorkshopAccountBucket, scopeId = "", materialKey = dto.materialKey): AccountDestination => ({ bucket, scopeId, materialKey });
    const wip = account(WorkshopAccountBucket.WIP, context.childId ?? context.treeId);
    const process = account(WorkshopAccountBucket.PROCESS, context.runId);
    const vault = account(WorkshopAccountBucket.VAULT);
    const requireScope = (value: string | undefined, message: string) => {
      if (!value) throw new BadRequestException(message);
      return value;
    };
    switch (dto.movementKind) {
      case "MIXED_OUTPUT":
        throw new BadRequestException("Mixed output has multiple measured input materials");
      case "MATERIAL_ISSUE":
        requireScope(context.treeId, "Casting issue requires a tree");
        return { source: vault, destination: wip };
      case "ADDITIONAL_ISSUE":
        requireScope(context.runId, "Additional issue requires an active process run");
        return { source: vault, destination: process };
      case "PROCESS_INPUT":
        requireScope(context.runId, "Process input requires an active process run");
        requireScope(context.treeId, "Process input requires a tree");
        return { source: wip, destination: process };
      case "PROCESS_OUTPUT": {
        requireScope(context.runId, "Process output requires an active process run");
        if (!dto.disposition) throw new BadRequestException("Classify the physical process output");
        if (dto.disposition === "FINISHED") throw new BadRequestException("Use the QC-gated finished receipt for finished metal");
        if (dto.disposition === "RECOVERY_PENDING") {
          requireScope(context.containerId, "Recovery output requires a bag");
          return { source: process, destination: account(WorkshopAccountBucket.RECOVERY_PENDING, context.containerId) };
        }
        if (dto.disposition === "WIP") requireScope(context.treeId, "WIP output requires a tree");
        return { source: process, destination: dto.disposition === "WIP" ? wip : account(dto.disposition as WorkshopAccountBucket) };
      }
      case "TRANSFER_DISPATCH":
        requireScope(context.transferId, "Dispatch requires a transfer");
        requireScope(context.treeId, "Dispatch requires a tree");
        return { source: context.runId ? process : wip, destination: account(WorkshopAccountBucket.TRANSIT, context.transferId) };
      case "TRANSFER_RECEIPT":
        requireScope(context.transferId, "Receipt requires a transfer");
        requireScope(context.treeId, "Receipt requires a tree");
        return { source: account(WorkshopAccountBucket.TRANSIT, context.transferId), destination: context.runId ? process : wip };
      case "RECOVERY_DEPOSIT":
        requireScope(context.runId, "Recovery deposit requires a process run");
        requireScope(context.containerId, "Recovery deposit requires a bag");
        return { source: process, destination: account(WorkshopAccountBucket.RECOVERY_PENDING, context.containerId) };
      case "RECOVERY_SEND":
        requireScope(context.containerId, "Recovery send requires a bag");
        requireScope(context.eventId, "Recovery send requires a recovery event");
        return { source: account(WorkshopAccountBucket.RECOVERY_PENDING, context.containerId), destination: account(WorkshopAccountBucket.REFINERY, context.eventId) };
      case "RECOVERY_RESULT":
        requireScope(context.eventId, "Recovery result requires a recovery event");
        if (!dto.disposition || !["VAULT", "REUSABLE", "SCRAP", "REFINERY"].includes(dto.disposition)) throw new BadRequestException("Classify recovered output");
        return { source: account(WorkshopAccountBucket.REFINERY, context.eventId, context.containerMaterialKey), destination: account(dto.disposition as WorkshopAccountBucket) };
      case "STONE_SETTING":
        requireScope(context.treeId, "Stone setting requires a tree");
        return { source: vault, destination: context.runId ? process : wip };
      case "STONE_RETURN":
        requireScope(context.treeId, "Stone return requires a tree");
        return { source: context.runId ? process : wip, destination: vault };
      case "FINISHED_RECEIPT":
        requireScope(context.treeId, "Finished receipt requires a tree");
        return { source: context.runId ? process : wip, destination: account(WorkshopAccountBucket.FINISHED) };
    }
  }

  private async confirmMixedOutput(tx: Prisma.TransactionClient, shopId: string, userId: string, session: any, dto: ConfirmWorkshopMovementDto) {
    if (!session.processRunId || !session.treeId || !session.reading || session.requiredPurpose !== "GOLD") {
      throw new BadRequestException("Mixed output needs a Gold Scale reading for a casting run");
    }
    await tx.$queryRaw`SELECT "id" FROM "WorkshopProcessRun" WHERE "id" = ${session.processRunId} AND "shopId" = ${shopId} FOR UPDATE`;
    const run = await tx.workshopProcessRun.findFirst({ where: { id: session.processRunId, shopId }, include: { recipe: true } });
    if (!run?.recipe || !["OPEN", "RECONCILIATION_PENDING"].includes(run.status) || run.treeId !== session.treeId || run.jobId !== session.jobId) {
      throw new ConflictException("Recipe process run is not open for this tree");
    }
    const key = `mix_${run.id.replace(/-/g, "")}`;
    if (session.materialKey !== key) throw new BadRequestException("Mixed output material identity has changed");
    const earlier = await tx.workshopMetalJournal.findFirst({ where: { shopId, processRunId: run.id, referenceType: WorkshopMetalJournalReferenceType.MIXED_OUTPUT, status: "POSTED" }, select: { id: true } });
    if (earlier) throw new ConflictException("This recipe run already has a measured mixed output");
    const sources = await tx.workshopMetalAccount.findMany({
      where: { shopId, bucket: WorkshopAccountBucket.PROCESS, scopeId: run.id, balanceGrams: { gt: 0 } },
      orderBy: { balanceGrams: "asc" },
    });
    if (sources.length < 2 || !sources.some((source) => source.materialKey === WORKSHOP_GOLD_995_MATERIAL_KEY) ||
        !sources.some((source) => source.materialKey === "masterAlloy")) {
      throw new BadRequestException("Physically issue Gold 995 and master alloy into this recipe run before mixing");
    }
    const output = session.reading.weightGrams as Prisma.Decimal;
    const total = sources.reduce((sum, source) => sum.plus(source.balanceGrams), new Prisma.Decimal(0));
    if (output.gt(total)) throw new BadRequestException("Measured mixed output exceeds physically issued process inputs");
    const materials = await tx.workshopMaterial.findMany({
      where: { shopId, key: { in: sources.map((source) => source.materialKey) } },
      include: { assays: { orderBy: { assayedAt: "desc" }, take: 1 } },
    });
    const materialByKey = new Map(materials.map((material) => [material.key, material]));
    let allocated = new Prisma.Decimal(0);
    let fineGold = new Prisma.Decimal(0);
    const credits = sources.map((source, index) => {
      const grams = index === sources.length - 1
        ? output.minus(allocated)
        : output.mul(source.balanceGrams).div(total).toDecimalPlaces(6, Prisma.Decimal.ROUND_DOWN);
      if (grams.lt(0) || grams.gt(source.balanceGrams)) throw new BadRequestException("Mixed output allocation exceeds a measured input balance");
      allocated = allocated.plus(grams);
      const material = materialByKey.get(source.materialKey);
      const purity = material?.assays[0]?.fineGoldFraction ?? material?.theoreticalPurity ??
        (source.materialKey === "masterAlloy" ? run.recipe!.alloyFineGoldFraction : null);
      if (purity == null) throw new BadRequestException(`Assay or purity is required for ${source.materialKey} before mixing`);
      fineGold = fineGold.plus(grams.mul(purity));
      return { accountId: source.id, materialKey: source.materialKey, grams: grams.toFixed(6), purity: purity.toFixed(6) };
    }).filter((credit) => new Prisma.Decimal(credit.grams).gt(0));
    const actualPurity = fineGold.div(output).toDecimalPlaces(6, Prisma.Decimal.ROUND_HALF_UP);
    const material = await tx.workshopMaterial.create({ data: {
      shopId, key, name: `${run.recipe.name} batch ${run.id.slice(0, 8)}`,
      kind: "MIXED", scalePurpose: "GOLD", theoreticalPurity: run.recipe.targetFineGoldFraction,
      composition: { recipeId: run.recipe.id, recipeVersion: run.recipe.version, actualFineGoldFraction: actualPurity.toFixed(6), measuredInputs: credits },
      createdByUserId: userId,
    } });
    const destination = await this.journal.ensureAccount(tx, shopId, material.key, WorkshopAccountBucket.WIP, session.batchChildId ?? session.treeId);
    const weight = output.toFixed(6);
    const posted = await this.journal.postEntry(tx, {
      shopId, referenceType: WorkshopMetalJournalReferenceType.MIXED_OUTPUT,
      referenceId: session.reading.id, idempotencyKey: dto.idempotencyKey?.trim() || `workshop:MIXED_OUTPUT:${session.reading.id}`,
      description: `Measured ${run.recipe.name} mixed output ${weight} g`,
      transactionDate: new Date(), weightGrams: weight, materialKey: material.key,
      jobId: run.jobId, treeId: run.treeId, processRunId: run.id, batchChildId: session.batchChildId,
      weighingSessionId: session.id, scaleReadingId: session.reading.id,
      actorUserId: userId, captureMethod: session.reading.captureMethod, scalePurpose: "GOLD",
      metadata: { recipeId: run.recipe.id, recipeVersion: run.recipe.version, targetFineGoldFraction: run.recipe.targetFineGoldFraction.toFixed(6), actualFineGoldFraction: actualPurity.toFixed(6), measuredInputs: credits },
      lines: [{ accountId: destination.id, debitGrams: weight }, ...credits.map((credit) => ({ accountId: credit.accountId, creditGrams: credit.grams }))],
    });
    await tx.workshopWeighingSession.update({ where: { id: session.id }, data: { status: WorkshopWeighingSessionStatus.POSTED, destinationAccountId: destination.id } });
    await tx.auditLog.create({ data: { userId, actorType: "SHOPKEEPER", action: "WORKSHOP_MIXED_OUTPUT", resourceType: "WorkshopMetalJournal", resourceId: posted.entry.id, newValue: { shopId, runId: run.id, recipeId: run.recipe.id, materialKey: material.key, weightGrams: weight, actualFineGoldFraction: actualPurity.toFixed(6) } } });
    return { journal: this.journal.serializeEntry(posted.entry, posted.idempotent), materialKey: material.key, actualFineGoldFraction: actualPurity.toFixed(6), idempotent: posted.idempotent };
  }

  async confirm(shopId: string, userId: string, sessionId: string, dto: ConfirmWorkshopMovementDto) {
    await this.scale.requireTraceableShop(shopId, true);
    if ("weightGrams" in (dto as object)) throw new BadRequestException("Confirm must reference a stored reading, not grams");
    const result = await this.prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<{ id: string }[]>`
        SELECT "id" FROM "WorkshopWeighingSession" WHERE "id" = ${sessionId} AND "shopId" = ${shopId} FOR UPDATE`;
      if (!locked.length) throw new NotFoundException("Weighing session not found");
      const session = await tx.workshopWeighingSession.findFirst({ where: { id: sessionId, shopId }, include: { reading: true, journal: { include: { lines: { include: { account: true } }, finishedInventoryItem: true } }, sourceAccount: true, destinationAccount: true, transfer: { include: { dispatchReading: true } }, recoveryEvent: true } });
      if (!session || session.movementKind === "GOLD995_ISSUE") throw new BadRequestException("Use the Gold 995 issue confirmation for this session");
      if (!session.reading || session.reading.id !== dto.readingId) throw new BadRequestException("Capture a stable reading on this session first");
      if (session.journal) return { journal: this.journal.serializeEntry(session.journal, true), inventoryItem: session.journal.finishedInventoryItem ?? null, idempotent: true };
      if (session.status !== WorkshopWeighingSessionStatus.STABLE_CAPTURED || session.expiresAt.getTime() < Date.now()) throw new BadRequestException("Weighing session is not ready to confirm");
      if (session.reading.shopId !== shopId || session.reading.deviceId !== session.deviceId || session.reading.purpose !== session.requiredPurpose || !session.reading.stable || session.reading.captureMethod !== session.captureMethod || session.reading.sequence < 1) {
        throw new BadRequestException("Captured reading does not match this active session and scale");
      }
      if (session.jobId) {
        await tx.$queryRaw`SELECT "id" FROM "KarigarJob" WHERE "id" = ${session.jobId} AND "shopId" = ${shopId} FOR UPDATE`;
        const job = await tx.karigarJob.findFirst({ where: { id: session.jobId, shopId }, select: { status: true } });
        if (!job || ["CANCELLED", "REJECTED"].includes(job.status) ||
            (job.status === "Completed" && session.movementKind !== "FINISHED_RECEIPT")) {
          throw new ConflictException("Job changed state after the weighing session was opened");
        }
      }
      if (session.captureMethod === WorkshopScaleCaptureMethod.SIMULATOR) this.scale.requireSimulatorAllowed(shopId);
      try { assertPositiveQuantumGrams(session.reading.weightGrams.toFixed(6), session.requiredPurpose); }
      catch (err) { throw new BadRequestException(err instanceof Error ? err.message : "Invalid captured scale quantum"); }
      if (session.movementKind === "MIXED_OUTPUT") {
        if (dto.finishedGoods) throw new BadRequestException("Finished goods details do not apply to mixed output");
        return this.confirmMixedOutput(tx, shopId, userId, session, dto);
      }
      if (!session.sourceAccount || !session.destinationAccount || session.sourceAccount.shopId !== shopId || session.destinationAccount.shopId !== shopId) {
        throw new BadRequestException("Session material accounts are invalid");
      }
      const kind = session.movementKind as WorkshopMovementKind;
      const referenceType = REFERENCE[kind];
      if (!referenceType) throw new BadRequestException("Unsupported physical movement");
      if (kind !== "FINISHED_RECEIPT" && dto.finishedGoods) throw new BadRequestException("Finished goods details are only valid for a finished receipt");
      let runLocked = false;
      let finishedJob: { product: string; metalColor: string | null; purity: string | null; inventoryItemId: string | null; photos: string[] } | null = null;
      let finishedStoneSources: { id: string; materialKey: string; balanceGrams: Prisma.Decimal }[] = [];
      let finishedStoneMaterials: { key: string; name: string; kind: string }[] = [];
      let finishedStoneGrams = new Prisma.Decimal(0);
      if (kind === "FINISHED_RECEIPT") {
        if (!dto.finishedGoods || !session.jobId || !session.treeId || session.requiredPurpose !== "GOLD") {
          throw new BadRequestException("Finished metal receipt needs job, tree, Gold Scale and inventory details");
        }
        const job = await tx.karigarJob.findFirst({ where: { id: session.jobId, shopId }, include: { stages: true } });
        const qc = job?.stages.find((stage) => stage.stage === "QC");
        if (!job || job.status !== "Completed" || qc?.status !== "DONE" || !qc.qcApprovedAt) {
          throw new BadRequestException("Approve Workshop QC before receiving finished goods");
        }
        finishedJob = job;
        await this.planLimits.checkProductLimit(shopId);
        if (session.processRunId) {
          await tx.$queryRaw`SELECT "id" FROM "WorkshopProcessRun" WHERE "id" = ${session.processRunId} AND "shopId" = ${shopId} FOR UPDATE`;
          const run = await tx.workshopProcessRun.findFirst({ where: { id: session.processRunId, shopId } });
          if (!run || !["OPEN", "RECONCILIATION_PENDING"].includes(run.status)) throw new ConflictException("Process run is no longer open");
          runLocked = true;
        }
        // Stone settings are already physical Stone Scale postings. At final
        // receipt they are reclassified, not weighed or issued a second time.
        // Lock in the same order as postEntry so concurrent settings cannot
        // change the amount subtracted from the Gold Scale gross reading.
        await tx.$queryRaw`SELECT "id" FROM "WorkshopMetalAccount" WHERE "shopId" = ${shopId} ORDER BY "id" FOR UPDATE`;
        const stoneMaterials = await tx.workshopMaterial.findMany({
          where: { shopId, scalePurpose: "STONE", isActive: true },
          select: { key: true, name: true, kind: true },
        });
        finishedStoneMaterials = stoneMaterials;
        const stoneKeys = stoneMaterials.map((material) => material.key);
        if (stoneKeys.length) {
          finishedStoneSources = await tx.workshopMetalAccount.findMany({
            where: { shopId, materialKey: { in: stoneKeys }, balanceGrams: { gt: 0 },
              OR: [
                { bucket: WorkshopAccountBucket.WIP, scopeId: session.batchChildId ?? session.treeId },
                ...(session.processRunId ? [{ bucket: WorkshopAccountBucket.PROCESS, scopeId: session.processRunId }] : []),
              ] },
            select: { id: true, materialKey: true, balanceGrams: true },
          });
          finishedStoneGrams = finishedStoneSources.reduce((sum, source) => sum.plus(source.balanceGrams), new Prisma.Decimal(0));
        }
        if (finishedStoneGrams.gte(session.reading.weightGrams)) {
          throw new BadRequestException("Set stone weight must be less than the final gross jewellery reading");
        }
      }
      const grossWeight = session.reading.weightGrams.toFixed(6);
      const weight = kind === "FINISHED_RECEIPT"
        ? session.reading.weightGrams.minus(finishedStoneGrams).toFixed(6)
        : grossWeight;
      let currentTransfer = session.transfer;
      if (session.transferId) {
        await tx.$queryRaw`SELECT "id" FROM "WorkshopTransfer" WHERE "id" = ${session.transferId} AND "shopId" = ${shopId} FOR UPDATE`;
        currentTransfer = await tx.workshopTransfer.findFirst({ where: { id: session.transferId, shopId }, include: { dispatchReading: true } });
        if (kind === "TRANSFER_DISPATCH" && currentTransfer?.status !== "PREPARED") throw new ConflictException("Transfer was already dispatched");
        if (kind === "TRANSFER_RECEIPT" && !["DISPATCHED", "EXCEPTION"].includes(currentTransfer?.status ?? "")) throw new ConflictException("Transfer was already received or cancelled");
      }
      if (session.processRunId && !runLocked) {
        await tx.$queryRaw`SELECT "id" FROM "WorkshopProcessRun" WHERE "id" = ${session.processRunId} AND "shopId" = ${shopId} FOR UPDATE`;
        const run = await tx.workshopProcessRun.findFirst({ where: { id: session.processRunId, shopId } });
        if (!run || !["OPEN", "RECONCILIATION_PENDING"].includes(run.status)) throw new ConflictException("Process run is no longer open");
      }
      if (session.recoveryContainerId && (kind === "RECOVERY_DEPOSIT" || (kind === "PROCESS_OUTPUT" && session.destinationAccount.bucket === WorkshopAccountBucket.RECOVERY_PENDING) || kind === "RECOVERY_SEND")) {
        await tx.$queryRaw`SELECT "id" FROM "WorkshopRecoveryContainer" WHERE "id" = ${session.recoveryContainerId} AND "shopId" = ${shopId} FOR UPDATE`;
        const bag = await tx.workshopRecoveryContainer.findFirst({ where: { id: session.recoveryContainerId, shopId } });
        const expected = kind === "RECOVERY_SEND" ? "CLOSED" : "OPEN";
        if (!bag || bag.status !== expected) throw new ConflictException(`Recovery bag is no longer ${expected.toLowerCase()}`);
      }
      if ((kind === "RECOVERY_SEND" || kind === "RECOVERY_RESULT") && session.recoveryEventId) {
        await tx.$queryRaw`SELECT "id" FROM "WorkshopRecoveryEvent" WHERE "id" = ${session.recoveryEventId} AND "shopId" = ${shopId} FOR UPDATE`;
        const event = await tx.workshopRecoveryEvent.findFirst({ where: { id: session.recoveryEventId, shopId } });
        const expected = kind === "RECOVERY_SEND" ? "OPEN" : "SENT";
        if (!event || event.status !== expected) throw new ConflictException("Recovery event has advanced since this weighing session was opened");
      }
      let transferExcess: { accountId: string; grams: string } | null = null;
      if (kind === "TRANSFER_RECEIPT") {
        const transfer = currentTransfer;
        if (!transfer?.dispatchReading || !["DISPATCHED", "EXCEPTION"].includes(transfer.status) || transfer.dispatchReading.shopId !== shopId) {
          throw new BadRequestException("Transfer has no valid dispatch reading");
        }
        const difference = transfer.dispatchReading.weightGrams.minus(session.reading.weightGrams);
        const tolerance = await tx.workshopToleranceRule.findFirst({ where: { shopId, movementKind: "TRANSFER", materialKey: session.materialKey, scalePurpose: session.requiredPurpose, isActive: true } }) ??
          await tx.workshopToleranceRule.findFirst({ where: { shopId, movementKind: "TRANSFER", materialKey: "", scalePurpose: session.requiredPurpose, isActive: true } });
        const max = tolerance?.maxDifferenceGrams ?? new Prisma.Decimal(0);
        if ((difference.abs().gt(max) || difference.lt(0)) && !transfer.approvedAt) {
          const reason = dto.exceptionReason?.trim();
          if (!reason) throw new BadRequestException("Out-of-tolerance transfer requires a reason and supervisor approval");
          await tx.workshopTransfer.update({ where: { id: transfer.id }, data: { status: "EXCEPTION", differenceGrams: difference, toleranceRuleId: tolerance?.id ?? null, exceptionReason: reason } });
          return { requiresApproval: true, differenceGrams: difference.toFixed(6), toleranceGrams: max.toFixed(6) };
        }
        if (difference.lt(0)) {
          const variance = await this.journal.ensureAccount(tx, shopId, session.materialKey, WorkshopAccountBucket.TRANSFER_VARIANCE, transfer.id);
          transferExcess = { accountId: variance.id, grams: difference.neg().toFixed(6) };
        }
      }
      const posted = await this.journal.postEntry(tx, {
        shopId, referenceType, referenceId: session.reading.id,
        idempotencyKey: dto.idempotencyKey?.trim() || `workshop:${kind}:${session.reading.id}`,
        description: `${kind} ${weight} g ${session.materialKey}`,
        transactionDate: new Date(), weightGrams: weight, materialKey: session.materialKey,
        jobId: session.jobId, treeId: session.treeId, processRunId: session.processRunId,
        transferId: session.transferId, recoveryContainerId: session.recoveryContainerId,
        recoveryEventId: session.recoveryEventId, batchChildId: session.batchChildId,
        weighingSessionId: session.id, scaleReadingId: session.reading.id,
        actorUserId: userId, captureMethod: session.reading.captureMethod,
        scalePurpose: session.requiredPurpose,
        derivedClassification: kind === "FINISHED_RECEIPT" && finishedStoneGrams.gt(0),
        metadata: { movementKind: kind, deviceId: session.deviceId, sequence: session.reading.sequence, rawFrame: session.reading.rawFrame, sourceMaterialKey: session.sourceAccount.materialKey, destinationMaterialKey: session.destinationAccount.materialKey,
          ...(kind === "FINISHED_RECEIPT" ? { measuredGrossGrams: grossWeight, setStoneGrams: finishedStoneGrams.toFixed(6) } : {}) },
        lines: [
          { accountId: session.destinationAccount.id, debitGrams: weight },
          { accountId: session.sourceAccount.id, creditGrams: transferExcess ? currentTransfer!.dispatchReading!.weightGrams.toFixed(6) : weight },
          ...(transferExcess ? [{ accountId: transferExcess.accountId, creditGrams: transferExcess.grams }] : []),
        ],
      });
      if (kind === "MATERIAL_ISSUE" && session.materialKey === WORKSHOP_GOLD_995_MATERIAL_KEY && session.treeId) {
        await tx.karigarCastingTree.update({ where: { id: session.treeId }, data: { metalKey: WORKSHOP_GOLD_995_MATERIAL_KEY, purity: "995" } });
      }
      await tx.workshopWeighingSession.update({ where: { id: session.id }, data: { status: WorkshopWeighingSessionStatus.POSTED } });
      let inventoryItem: any = null;
      if (kind === "FINISHED_RECEIPT" && finishedJob && dto.finishedGoods) {
        const stoneGroups = new Map<string, { sources: typeof finishedStoneSources; grams: Prisma.Decimal }>();
        for (const source of finishedStoneSources) {
          const group = stoneGroups.get(source.materialKey) ?? { sources: [], grams: new Prisma.Decimal(0) };
          group.sources.push(source);
          group.grams = group.grams.plus(source.balanceGrams);
          stoneGroups.set(source.materialKey, group);
        }
        const gemstones = [...stoneGroups].map(([key, group]) => {
          const material = finishedStoneMaterials.find((candidate) => candidate.key === key)!;
          return { type: material.kind === "DIAMOND" ? "DIAMOND" : material.name.slice(0, 64),
            caratWeight: group.grams.div("0.2").toNumber(), materialKey: key };
        });
        const stoneReceiptJournalIds: string[] = [];
        for (const [materialKey, group] of stoneGroups) {
          const finishedAccount = await this.journal.ensureAccount(tx, shopId, materialKey, WorkshopAccountBucket.FINISHED);
          const stoneWeight = group.grams.toFixed(6);
          const stoneReceipt = await this.journal.postEntry(tx, {
            shopId, referenceType: WorkshopMetalJournalReferenceType.FINISHED_RECEIPT,
            referenceId: `stone:${posted.entry.id}:${materialKey}`,
            idempotencyKey: `stone-finished:${posted.entry.id}:${materialKey}`,
            description: `Classify physically set ${materialKey} into finished jewellery`,
            transactionDate: new Date(), weightGrams: stoneWeight, materialKey,
            jobId: session.jobId, treeId: session.treeId, processRunId: session.processRunId,
            batchChildId: session.batchChildId, actorUserId: userId,
            scalePurpose: "STONE", derivedClassification: true,
            metadata: { parentReceiptJournalId: posted.entry.id, sourceAccountIds: group.sources.map((source) => source.id),
              sourceReadingKind: "STONE_SETTING", measuredGrossGrams: grossWeight },
            lines: [{ accountId: finishedAccount.id, debitGrams: stoneWeight },
              ...group.sources.map((source) => ({ accountId: source.id, creditGrams: source.balanceGrams.toFixed(6) }))],
          });
          stoneReceiptJournalIds.push(stoneReceipt.entry.id);
        }
        const material = await tx.workshopMaterial.findUnique({ where: { shopId_key: { shopId, key: session.materialKey } }, include: { assays: { orderBy: { assayedAt: "desc" }, take: 1 } } });
        const effectivePurity = material?.assays[0]?.fineGoldFraction ?? material?.theoreticalPurity;
        inventoryItem = await tx.inventoryItem.create({ data: {
          shopId, workshopReceiptJournalId: posted.entry.id,
          sku: dto.finishedGoods.sku?.trim() || `WF-${session.reading.id.replace(/-/g, "").slice(0, 24).toUpperCase()}`,
          nameEn: dto.finishedGoods.nameEn.trim(), jewelleryType: dto.finishedGoods.jewelleryType,
          buildMethod: "METHOD_A",
          composition: { method: "METHOD_A", preciousMetal: "GOLD", purity: finishedJob.purity ?? null, effectiveFineGoldFraction: effectivePurity?.toFixed(6) ?? null, materialKey: session.materialKey, metalColor: finishedJob.metalColor ?? "YELLOW", workshopJournalId: posted.entry.id, stoneReceiptJournalIds },
          totalWeightGrams: new Prisma.Decimal(weight).toNumber(), grossWeightGrams: session.reading.weightGrams.toNumber(),
          gemstones,
          metalValueNpr: 0, makingChargeNpr: 0, gemstoneValueNpr: 0, taxNpr: 0, totalPriceNpr: 0,
          images: finishedJob.photos, status: InventoryStatus.AVAILABLE, visibility: InventoryVisibility.HIDDEN, stockQuantity: 1,
        } });
        await tx.karigarJob.updateMany({ where: { id: session.jobId!, shopId, inventoryItemId: null }, data: { inventoryItemId: inventoryItem.id } });
        await tx.auditLog.create({ data: { userId, actorType: "SHOPKEEPER", action: "WORKSHOP_FINISHED_RECEIPT", resourceType: "InventoryItem", resourceId: inventoryItem.id, newValue: { shopId, journalId: posted.entry.id, readingId: session.reading.id, metalWeightGrams: weight, measuredGrossGrams: grossWeight, stoneWeightGrams: finishedStoneGrams.toFixed(6), stoneReceiptJournalIds, treeId: session.treeId, jobId: session.jobId } } });
      }
      if (kind === "TRANSFER_DISPATCH" && session.transferId) {
        await tx.workshopTransfer.update({ where: { id: session.transferId }, data: { status: "DISPATCHED", dispatchReadingId: session.reading.id, dispatchUserId: userId, dispatchedAt: new Date() } });
      }
      if (kind === "TRANSFER_RECEIPT" && session.transferId && currentTransfer?.dispatchReading) {
        const difference = currentTransfer.dispatchReading.weightGrams.minus(session.reading.weightGrams);
        await tx.workshopTransfer.update({ where: { id: session.transferId }, data: { status: difference.isZero() ? "RECONCILED" : "RECEIVED", receiveReadingId: session.reading.id, receiveUserId: userId, receivedAt: new Date(), differenceGrams: difference } });
      }
      if (kind === "RECOVERY_SEND" && session.recoveryEventId) {
        await tx.workshopRecoveryEvent.update({ where: { id: session.recoveryEventId }, data: { status: "SENT", sendReadingId: session.reading.id, sendAt: new Date() } });
      }
      return { journal: this.journal.serializeEntry(posted.entry, posted.idempotent), inventoryItem, idempotent: posted.idempotent };
    });
    return result;
  }
}
