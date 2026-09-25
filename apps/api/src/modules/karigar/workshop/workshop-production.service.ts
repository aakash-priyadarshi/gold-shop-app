import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, WorkshopAccountBucket, WorkshopMetalJournalReferenceType } from "@prisma/client";
import { randomUUID } from "crypto";
import { PrismaService } from "../../../prisma/prisma.service";
import { WorkshopMetalJournalService } from "./workshop-metal-journal.service";
import { WorkshopScaleService } from "./workshop-scale.service";
import { CreateWorkshopChildDto, InspectTraceableQcDto, StartWorkshopProcessDto } from "./dto/workshop-production.dto";
import { RouteStepChangeDto } from "./dto/workshop-catalog.dto";

@Injectable()
export class WorkshopProductionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly journal: WorkshopMetalJournalService,
    private readonly scale: WorkshopScaleService,
  ) {}

  async listJobs(shopId: string) {
    await this.scale.requireTraceableShop(shopId);
    return this.prisma.karigarJob.findMany({
      where: { shopId, status: { not: "CANCELLED" } },
      select: {
        id: true, product: true, artisan: true, metalKey: true, status: true, qty: true, inventoryItemId: true,
        trees: { select: { id: true, label: true, metalKey: true, issuedGrams: true, lines: { select: { id: true, weightGrams: true } } } },
        workshopProcessRuns: { select: { id: true, treeId: true, definitionId: true, status: true, recipeId: true, batchChildId: true, department: true, workstationId: true }, orderBy: { startedAt: "desc" } },
        workshopRouteSteps: { select: { id: true, definitionId: true, position: true, status: true }, orderBy: { position: "asc" } },
        workshopBatchChildren: { select: { id: true, treeId: true, kind: true, label: true, quantity: true } },
      },
      orderBy: { updatedAt: "desc" }, take: 100,
    });
  }

  async assignRoute(shopId: string, userId: string, jobId: string, templateId: string) {
    await this.scale.requireTraceableShop(shopId, true);
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "KarigarJob" WHERE "id" = ${jobId} AND "shopId" = ${shopId} FOR UPDATE`;
      const job = await tx.karigarJob.findFirst({ where: { id: jobId, shopId }, select: { id: true, status: true } });
      const template = await tx.workshopRouteTemplate.findFirst({ where: { id: templateId, shopId, isActive: true }, include: { steps: { orderBy: { position: "asc" } } } });
      if (!job || !template) throw new NotFoundException("Job or active route template not found in this shop");
      if (["CANCELLED", "REJECTED", "Completed"].includes(job.status)) throw new ConflictException("Finished or archived jobs cannot receive a new process route");
      const existing = await tx.workshopRouteStep.count({ where: { shopId, jobId } });
      if (existing) throw new ConflictException("Job already has a route; modify its steps instead");
      await tx.workshopRouteStep.createMany({ data: template.steps.map((step) => ({ shopId, jobId, definitionId: step.definitionId, position: step.position })) });
      await tx.auditLog.create({ data: { userId, actorType: "SHOPKEEPER", action: "WORKSHOP_ROUTE_ASSIGN", resourceType: "KarigarJob", resourceId: jobId, newValue: { shopId, templateId } } });
      return tx.workshopRouteStep.findMany({ where: { shopId, jobId }, orderBy: { position: "asc" }, include: { definition: true } });
    });
  }

  async changeRouteStep(shopId: string, userId: string, jobId: string, stepId: string, dto: RouteStepChangeDto) {
    await this.scale.requireTraceableShop(shopId, true);
    return this.prisma.$transaction(async (tx) => {
      // Serialize additions from different source steps in the same job so
      // they cannot choose the same final route position.
      await tx.$queryRaw`SELECT "id" FROM "KarigarJob" WHERE "id" = ${jobId} AND "shopId" = ${shopId} FOR UPDATE`;
      const job = await tx.karigarJob.findFirst({ where: { id: jobId, shopId }, select: { status: true } });
      if (!job || ["CANCELLED", "REJECTED", "Completed"].includes(job.status)) throw new ConflictException("Finished or archived jobs cannot change process routes");
      await tx.$queryRaw`SELECT "id" FROM "WorkshopRouteStep" WHERE "id" = ${stepId} AND "shopId" = ${shopId} FOR UPDATE`;
      const step = await tx.workshopRouteStep.findFirst({ where: { id: stepId, shopId, jobId } });
      if (!step) throw new NotFoundException("Job route step not found");
      const reason = dto.reason?.trim();
      if (!reason) throw new BadRequestException("Route change requires a reason");
      if (dto.action === "SKIP") {
        const runs = await tx.workshopProcessRun.count({ where: { routeStepId: step.id } });
        if (runs) throw new ConflictException("A started route step cannot be skipped");
        const changed = await tx.workshopRouteStep.update({ where: { id: step.id }, data: { status: "SKIPPED", reason } });
        await tx.auditLog.create({ data: { userId, actorType: "SHOPKEEPER", action: "WORKSHOP_ROUTE_SKIP", resourceType: "WorkshopRouteStep", resourceId: step.id, newValue: { shopId, reason } } });
        return changed;
      }
      const definitionId = dto.action === "ADD" ? dto.definitionId : step.definitionId;
      if (!definitionId) throw new BadRequestException("Add requires a process definition");
      const definition = await tx.workshopProcessDefinition.findFirst({ where: { id: definitionId, shopId, isActive: true } });
      if (!definition) throw new BadRequestException("Active process definition not found in this shop");
      const last = await tx.workshopRouteStep.findFirst({ where: { shopId, jobId }, orderBy: { position: "desc" } });
      const added = await tx.workshopRouteStep.create({ data: { shopId, jobId, definitionId, position: (last?.position ?? -1) + 1, reason: `${dto.action}: ${reason}` } });
      await tx.auditLog.create({ data: { userId, actorType: "SHOPKEEPER", action: `WORKSHOP_ROUTE_${dto.action}`, resourceType: "WorkshopRouteStep", resourceId: added.id, newValue: { shopId, jobId, sourceStepId: step.id, reason } } });
      return added;
    });
  }

  async createChild(shopId: string, userId: string, dto: CreateWorkshopChildDto) {
    await this.scale.requireTraceableShop(shopId, true);
    const tree = await this.prisma.karigarCastingTree.findFirst({ where: { id: dto.treeId, shopId }, include: { job: { select: { qty: true } } } });
    if (!tree) throw new NotFoundException("Casting tree not found");
    if (dto.treeLineId) {
      const line = await this.prisma.karigarCastingTreeLine.findFirst({ where: { id: dto.treeLineId, treeId: tree.id } });
      if (!line) throw new BadRequestException("CAD line does not belong to this tree");
    }
    if (dto.kind === "PIECE" && dto.quantity !== 1) throw new BadRequestException("Individual piece quantity must be one");
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "KarigarJob" WHERE "id" = ${tree.jobId} AND "shopId" = ${shopId} FOR UPDATE`;
      const job = await tx.karigarJob.findFirst({ where: { id: tree.jobId, shopId }, select: { status: true } });
      if (!job || ["CANCELLED", "REJECTED", "Completed"].includes(job.status)) throw new ConflictException("Finished or archived jobs cannot add batch children");
      const child = await tx.workshopBatchChild.create({ data: {
        shopId, jobId: tree.jobId, treeId: tree.id, treeLineId: dto.treeLineId ?? null,
        kind: dto.kind, label: dto.label.trim(), quantity: dto.quantity,
      } });
      await tx.auditLog.create({ data: { userId, actorType: "SHOPKEEPER", action: "WORKSHOP_BATCH_CHILD_CREATE", resourceType: "WorkshopBatchChild", resourceId: child.id, newValue: { shopId, treeId: tree.id, kind: child.kind, quantity: child.quantity } } });
      return child;
    });
  }

  async startRun(shopId: string, userId: string, dto: StartWorkshopProcessDto) {
    await this.scale.requireTraceableShop(shopId, true);
    const tree = await this.prisma.karigarCastingTree.findFirst({ where: { id: dto.treeId, shopId }, include: { job: { select: { status: true } } } });
    const definition = await this.prisma.workshopProcessDefinition.findFirst({ where: { id: dto.definitionId, shopId, isActive: true } });
    if (!tree || !definition || ["CANCELLED", "REJECTED", "Completed"].includes(tree.job.status)) throw new BadRequestException("Active tree and process are required");
    if (dto.routeStepId) {
      const step = await this.prisma.workshopRouteStep.findFirst({ where: { id: dto.routeStepId, shopId, jobId: tree.jobId, definitionId: definition.id, status: "PENDING" } });
      if (!step) throw new BadRequestException("Route step is not pending for this job and process");
    }
    if (dto.batchChildId) {
      const child = await this.prisma.workshopBatchChild.findFirst({ where: { id: dto.batchChildId, shopId, treeId: tree.id } });
      if (!child) throw new BadRequestException("Batch child does not belong to this tree");
    }
    if (dto.workstationId) {
      const machine = await this.prisma.workshopWorkstation.findFirst({ where: { id: dto.workstationId, shopId, isActive: true } });
      if (!machine || (machine.definitionId && machine.definitionId !== definition.id)) throw new BadRequestException("Workstation is not active for this process");
    }
    if (dto.recipeId) {
      const recipe = await this.prisma.workshopAlloyRecipe.findFirst({ where: { id: dto.recipeId, shopId, isActive: true } });
      if (!recipe) throw new BadRequestException("Active alloy recipe not found");
    }
    const target = dto.targetWeightGrams ? new Prisma.Decimal(dto.targetWeightGrams) : null;
    if (target && target.lte(0)) throw new BadRequestException("Target weight must be positive");
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "KarigarJob" WHERE "id" = ${tree.jobId} AND "shopId" = ${shopId} FOR UPDATE`;
      const currentJob = await tx.karigarJob.findFirst({ where: { id: tree.jobId, shopId }, select: { status: true } });
      if (!currentJob || ["CANCELLED", "REJECTED", "Completed"].includes(currentJob.status)) throw new ConflictException("Job is no longer open for a process run");
      if (dto.routeStepId) {
        await tx.$queryRaw`SELECT "id" FROM "WorkshopRouteStep" WHERE "id" = ${dto.routeStepId} AND "shopId" = ${shopId} FOR UPDATE`;
        const currentStep = await tx.workshopRouteStep.findFirst({ where: { id: dto.routeStepId, shopId, jobId: tree.jobId, definitionId: definition.id, status: "PENDING" } });
        if (!currentStep) throw new ConflictException("Route step was already started or changed");
      }
      const run = await tx.workshopProcessRun.create({ data: {
        shopId, jobId: tree.jobId, treeId: tree.id,
        batchChildId: dto.batchChildId ?? null, definitionId: definition.id,
        routeStepId: dto.routeStepId ?? null, workstationId: dto.workstationId ?? null,
        recipeId: dto.recipeId ?? null, targetWeightGrams: target,
        department: dto.department?.trim() || definition.department,
        notes: dto.notes?.trim() || null, operatorUserId: userId,
      } });
      if (dto.routeStepId) await tx.workshopRouteStep.update({ where: { id: dto.routeStepId }, data: { status: "STARTED" } });
      return run;
    });
  }

  async runReconciliation(shopId: string, runId: string) {
    return this.reconciliation(this.prisma, shopId, runId);
  }

  async inspectQc(shopId: string, userId: string, jobId: string, dto: InspectTraceableQcDto) {
    await this.scale.requireTraceableShop(shopId, true);
    return this.prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<{ id: string }[]>`SELECT "id" FROM "KarigarJob" WHERE "id" = ${jobId} AND "shopId" = ${shopId} FOR UPDATE`;
      if (!locked.length) throw new NotFoundException("Workshop job not found");
      const job = await tx.karigarJob.findFirst({ where: { id: jobId, shopId }, select: { id: true, status: true } });
      if (!job || ["CANCELLED", "REJECTED"].includes(job.status)) throw new ConflictException("Archived or rejected jobs cannot pass QC");
      const qc = await tx.karigarJobStage.findUnique({ where: { jobId_stage: { jobId, stage: "QC" } } });
      if (!qc) throw new NotFoundException("Workshop QC record not found");
      if (qc.status === "DONE" && qc.qcApprovedAt) {
        if (dto.decision === "APPROVED") return { jobId, decision: "APPROVED", qcApprovedAt: qc.qcApprovedAt, idempotent: true };
        throw new ConflictException("Approved QC cannot be changed after finished receipt; use a controlled rework workflow");
      }
      const reason = dto.reason?.trim();
      if (dto.decision !== "APPROVED" && !reason) throw new BadRequestException("Rework or rejection requires a reason");
      if (dto.decision === "APPROVED") {
        const [runs, steps, transfers] = await Promise.all([
          tx.workshopProcessRun.findMany({ where: { shopId, jobId }, select: { id: true, status: true, definition: { select: { name: true } } } }),
          tx.workshopRouteStep.findMany({ where: { shopId, jobId }, select: { id: true, position: true, status: true, definition: { select: { name: true } } } }),
          tx.workshopTransfer.findMany({ where: { shopId, jobId }, select: { id: true, fromDepartment: true, toDepartment: true, status: true } }),
        ]);
        const openRuns = runs.filter((run) => run.status !== "RECONCILED");
        const pendingSteps = steps.filter((step) => !["DONE", "SKIPPED"].includes(step.status));
        const pendingTransfers = transfers.filter((transfer) => !["RECONCILED", "CANCELLED"].includes(transfer.status));
        if (!runs.length || openRuns.length || pendingSteps.length || pendingTransfers.length) {
          const blockers: string[] = [];
          if (!runs.length) blockers.push("No process runs recorded for this job");
          if (openRuns.length) blockers.push(`${openRuns.length} process run(s) not reconciled: ${openRuns.map((r) => r.definition?.name || r.id).join(", ")}`);
          if (pendingSteps.length) blockers.push(`${pendingSteps.length} route step(s) pending: ${pendingSteps.map((s) => s.definition?.name || s.id).join(", ")}`);
          if (pendingTransfers.length) blockers.push(`${pendingTransfers.length} transfer(s) unresolved: ${pendingTransfers.map((t) => `${t.fromDepartment} → ${t.toDepartment} (${t.status})`).join(", ")}`);
          throw new ConflictException(`Reconcile every process, route step and transfer before TRACEABLE QC approval: ${blockers.join("; ")}`);
        }
      }
      const now = new Date();
      await tx.karigarJobStage.update({ where: { id: qc.id }, data: {
        status: dto.decision === "APPROVED" ? "DONE" : dto.decision === "REWORK" ? "REWORK" : "REJECTED",
        qcApprovedAt: dto.decision === "APPROVED" ? now : null,
        completedAt: dto.decision === "REWORK" ? null : now,
        ...(dto.notes ? { notes: dto.notes.trim() } : {}),
        ...(reason ? { rejectionReason: reason } : {}),
        ...(dto.decision === "REWORK" ? { reworkCount: { increment: 1 } } : {}),
      } });
      await tx.karigarJob.update({ where: { id: jobId }, data: {
        currentStage: "QC", status: dto.decision === "APPROVED" ? "Completed" : dto.decision === "REWORK" ? "Rework" : "REJECTED",
      } });
      await tx.auditLog.create({ data: { userId, actorType: "SHOPKEEPER", action: "WORKSHOP_TRACEABLE_QC", resourceType: "KarigarJob", resourceId: jobId,
        newValue: { shopId, decision: dto.decision, reason: reason ?? null, source: "reconciled-process-runs" } } });
      return { jobId, decision: dto.decision, qcApprovedAt: dto.decision === "APPROVED" ? now : null, idempotent: false };
    });
  }

  private async reconciliation(db: PrismaService | Prisma.TransactionClient, shopId: string, runId: string) {
    const run = await db.workshopProcessRun.findFirst({ where: { id: runId, shopId }, include: { definition: true, workstation: true, recipe: true } });
    if (!run) throw new NotFoundException("Process run not found");
    const accounts = await db.workshopMetalAccount.findMany({ where: { shopId, bucket: WorkshopAccountBucket.PROCESS, scopeId: runId } });
    const journals = await db.workshopMetalJournal.findMany({ where: { shopId, processRunId: runId, status: "POSTED" }, include: { lines: { include: { account: true } } }, orderBy: { postedAt: "asc" } });
    const toleranceRules = await db.workshopToleranceRule.findMany({
      where: { shopId, movementKind: "PROCESS", isActive: true },
    });
    const byMaterial = accounts.map((account) => {
      const relevant = journals.flatMap((j) => j.lines.filter((line) => line.accountId === account.id));
      const input = relevant.reduce((sum, line) => sum.plus(line.debitGrams), new Prisma.Decimal(0));
      const output = relevant.reduce((sum, line) => sum.plus(line.creditGrams), new Prisma.Decimal(0));
      const unclassified = account.balanceGrams;

      const rule = toleranceRules.find((r) => r.definitionId === run.definitionId && r.materialKey === account.materialKey)
        ?? toleranceRules.find((r) => r.definitionId === run.definitionId && (!r.materialKey || r.materialKey === ""))
        ?? toleranceRules.find((r) => (!r.definitionId || r.definitionId === "") && r.materialKey === account.materialKey)
        ?? toleranceRules.find((r) => (!r.definitionId || r.definitionId === "") && (!r.materialKey || r.materialKey === ""));

      const maxDiff = rule?.maxDifferenceGrams ?? null;
      const policy = rule?.policy ?? "REQUIRE_CLASSIFICATION";
      const isWithinTolerance = maxDiff ? unclassified.abs().lte(maxDiff) : false;

      return {
        materialKey: account.materialKey,
        inputGrams: input.toFixed(6),
        outputGrams: output.toFixed(6),
        unclassifiedGrams: unclassified.toFixed(6),
        tolerance: rule ? {
          ruleId: rule.id,
          maxDifferenceGrams: rule.maxDifferenceGrams.toFixed(6),
          policy,
          isWithinTolerance,
        } : null,
      };
    });
    return {
      run: { ...run, targetWeightGrams: run.targetWeightGrams?.toFixed(6) ?? null },
      materials: byMaterial,
      reconciliationState: journals.length && byMaterial.every((m) => m.unclassifiedGrams === "0.000000") ? "RECONCILED" : "RECONCILIATION_PENDING",
      journals: journals.map((entry) => this.journal.serializeEntry(entry, false)),
    };
  }

  async classifyVariance(shopId: string, userId: string, runId: string, materialKey: string, reason: string) {
    await this.scale.requireTraceableShop(shopId, true);
    if (!reason?.trim()) throw new BadRequestException("Variance classification requires a reason");
    return this.prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<{ id: string }[]>`SELECT "id" FROM "WorkshopProcessRun" WHERE "id" = ${runId} AND "shopId" = ${shopId} FOR UPDATE`;
      if (!locked.length) throw new NotFoundException("Process run not found");
      const run = await tx.workshopProcessRun.findFirst({ where: { id: runId, shopId } });
      if (!run || !["OPEN", "RECONCILIATION_PENDING"].includes(run.status)) throw new BadRequestException("Only open process runs may classify variance");
      if (run.operatorUserId === userId) throw new BadRequestException("An operator cannot approve their own process variance");
      const source = await tx.workshopMetalAccount.findUnique({ where: { shopId_materialKey_bucket_scopeId: { shopId, materialKey, bucket: WorkshopAccountBucket.PROCESS, scopeId: runId } } });
      if (!source || source.balanceGrams.lte(0)) throw new BadRequestException("No unresolved physical balance for this material");
      const dest = await this.journal.ensureAccount(tx, shopId, materialKey, WorkshopAccountBucket.PROCESS_VARIANCE);
      const grams = source.balanceGrams.toFixed(6);
      const ref = randomUUID();

      const tolerance = await tx.workshopToleranceRule.findFirst({
        where: { shopId, movementKind: "PROCESS", definitionId: run.definitionId, materialKey, isActive: true },
      }) ?? await tx.workshopToleranceRule.findFirst({
        where: { shopId, movementKind: "PROCESS", definitionId: run.definitionId, materialKey: "", isActive: true },
      }) ?? await tx.workshopToleranceRule.findFirst({
        where: { shopId, movementKind: "PROCESS", definitionId: "", materialKey, isActive: true },
      }) ?? await tx.workshopToleranceRule.findFirst({
        where: { shopId, movementKind: "PROCESS", definitionId: "", materialKey: "", isActive: true },
      });
      const withinTolerance = tolerance ? source.balanceGrams.lte(tolerance.maxDifferenceGrams) : false;

      const entry = await this.journal.postEntry(tx, {
        shopId, referenceType: WorkshopMetalJournalReferenceType.PROCESS_OUTPUT,
        referenceId: ref, idempotencyKey: `classify:${runId}:${materialKey}:${ref}`,
        description: `Supervisor-classified process variance: ${reason.trim()}`,
        transactionDate: new Date(), weightGrams: grams, materialKey,
        jobId: run.jobId, treeId: run.treeId, processRunId: run.id,
        actorUserId: userId, derivedClassification: true,
        metadata: {
          classification: "PROCESS_VARIANCE",
          reason: reason.trim(),
          derivedFromAccountId: source.id,
          approverUserId: userId,
          toleranceRuleId: tolerance?.id ?? null,
          withinTolerance,
          limitGrams: tolerance?.maxDifferenceGrams.toFixed(6) ?? null,
          actualDifferenceGrams: grams,
        },
        lines: [{ accountId: dest.id, debitGrams: grams }, { accountId: source.id, creditGrams: grams }],
      });
      await tx.workshopProcessRun.update({ where: { id: runId }, data: { approvalUserId: userId, approvalAt: new Date(), approvalReason: reason.trim() } });
      await tx.auditLog.create({ data: { userId, actorType: "SHOPKEEPER", action: "WORKSHOP_PROCESS_VARIANCE_CLASSIFY", resourceType: "WorkshopProcessRun", resourceId: runId, newValue: { shopId, materialKey, weightGrams: grams, reason: reason.trim(), journalId: entry.entry.id } } });
      return this.journal.serializeEntry(entry.entry, entry.idempotent);
    });
  }

  async closeRun(shopId: string, runId: string, notes?: string, actorUserId?: string) {
    return this.prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<{ id: string }[]>`SELECT "id" FROM "WorkshopProcessRun" WHERE "id" = ${runId} AND "shopId" = ${shopId} FOR UPDATE`;
      if (!locked.length) throw new NotFoundException("Process run not found");
      const runRec = await tx.workshopProcessRun.findFirst({ where: { id: runId, shopId } });
      if (!runRec) throw new NotFoundException("Process run not found");
      if (!["OPEN", "RECONCILIATION_PENDING"].includes(runRec.status)) throw new ConflictException("Process run is already closed");

      // Auto-accept unclassified remainder within tolerance if configured policy is ACCEPT_WITHIN_TOLERANCE
      const accounts = await tx.workshopMetalAccount.findMany({
        where: { shopId, bucket: WorkshopAccountBucket.PROCESS, scopeId: runId },
      });
      const toleranceRules = await tx.workshopToleranceRule.findMany({
        where: { shopId, movementKind: "PROCESS", isActive: true },
      });

      for (const account of accounts) {
        if (account.balanceGrams.lte(0)) continue;
        const rule = toleranceRules.find((r) => r.definitionId === runRec.definitionId && r.materialKey === account.materialKey)
          ?? toleranceRules.find((r) => r.definitionId === runRec.definitionId && (!r.materialKey || r.materialKey === ""))
          ?? toleranceRules.find((r) => (!r.definitionId || r.definitionId === "") && r.materialKey === account.materialKey)
          ?? toleranceRules.find((r) => (!r.definitionId || r.definitionId === "") && (!r.materialKey || r.materialKey === ""));

        if (rule && rule.policy === "ACCEPT_WITHIN_TOLERANCE" && account.balanceGrams.lte(rule.maxDifferenceGrams)) {
          const dest = await this.journal.ensureAccount(tx, shopId, account.materialKey, WorkshopAccountBucket.PROCESS_VARIANCE);
          const grams = account.balanceGrams.toFixed(6);
          const ref = randomUUID();
          await this.journal.postEntry(tx, {
            shopId, referenceType: WorkshopMetalJournalReferenceType.PROCESS_OUTPUT,
            referenceId: ref, idempotencyKey: `auto-accept:${runId}:${account.materialKey}:${ref}`,
            description: `Auto-accepted process variance within tolerance (${rule.id}): max ${rule.maxDifferenceGrams.toFixed(6)}g`,
            transactionDate: new Date(), weightGrams: grams, materialKey: account.materialKey,
            jobId: runRec.jobId, treeId: runRec.treeId, processRunId: runRec.id,
            actorUserId: actorUserId || runRec.operatorUserId, derivedClassification: true,
            metadata: {
              classification: "PROCESS_VARIANCE",
              autoAccepted: true,
              ruleId: rule.id,
              limitGrams: rule.maxDifferenceGrams.toFixed(6),
              actualDifferenceGrams: grams,
              policy: rule.policy,
              timestamp: new Date().toISOString(),
            },
            lines: [{ accountId: dest.id, debitGrams: grams }, { accountId: account.id, creditGrams: grams }],
          });
        }
      }

      const report = await this.reconciliation(tx, shopId, runId);
      if (report.reconciliationState !== "RECONCILED") {
        const unclassified = report.materials.filter((m) => m.unclassifiedGrams !== "0.000000");
        throw new ConflictException(
          `Classify or resolve all physical process remainder before closing. Remaining unclassified: ${unclassified.map((m) => `${m.materialKey} (${m.unclassifiedGrams}g)`).join(", ")} requires supervisor classification.`
        );
      }
      const run = await tx.workshopProcessRun.update({ where: { id: runId }, data: { status: "RECONCILED", endedAt: new Date(), ...(notes ? { notes } : {}) } });
      if (run.routeStepId) await tx.workshopRouteStep.update({ where: { id: run.routeStepId }, data: { status: "DONE" } });
      return run;
    });
  }

  async batchReconciliation(shopId: string, treeId: string) {
    const tree = await this.prisma.karigarCastingTree.findFirst({ where: { id: treeId, shopId }, include: { lines: true, job: true, workshopBatchChildren: true, workshopProcessRuns: { include: { recipe: true } } } });
    if (!tree) throw new NotFoundException("Casting tree not found");
    const journals = await this.prisma.workshopMetalJournal.findMany({ where: { shopId, treeId, status: "POSTED" }, include: { lines: { include: { account: true } } }, orderBy: { postedAt: "asc" } });
    const theoretical = tree.lines.reduce((sum, line) => sum.plus(String(line.weightGrams)), new Prisma.Decimal(0));
    const inputs = journals.filter((j) => ["GOLD995_ISSUE_TO_TREE", "MATERIAL_ISSUE"].includes(j.referenceType));
    const actualInputs = inputs.reduce((sum, j) => sum.plus(j.weightGrams), new Prisma.Decimal(0));
    const actualByMaterial = new Map<string, Prisma.Decimal>();
    for (const input of inputs) {
      actualByMaterial.set(input.materialKey, (actualByMaterial.get(input.materialKey) ?? new Prisma.Decimal(0)).plus(input.weightGrams));
    }
    const recommendedByMaterial = new Map<string, Prisma.Decimal>();
    for (const run of tree.workshopProcessRuns) {
      if (!run.recipe || !run.targetWeightGrams) continue;
      const target = run.targetWeightGrams;
      const gold = target.mul(run.recipe.targetFineGoldFraction.minus(run.recipe.alloyFineGoldFraction))
        .div(new Prisma.Decimal("0.995").minus(run.recipe.alloyFineGoldFraction))
        .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
      recommendedByMaterial.set("goldGrains995", (recommendedByMaterial.get("goldGrains995") ?? new Prisma.Decimal(0)).plus(gold));
      recommendedByMaterial.set("masterAlloy", (recommendedByMaterial.get("masterAlloy") ?? new Prisma.Decimal(0)).plus(target.minus(gold)));
    }
    const balances = new Map<string, Prisma.Decimal>();
    const balancesByMaterial = new Map<string, Map<string, Prisma.Decimal>>();
    for (const journal of journals) {
      for (const line of journal.lines) {
        const bucket = line.account.bucket;
        if (bucket === WorkshopAccountBucket.VAULT || bucket === WorkshopAccountBucket.OPENING_EQUITY) continue;
        const delta = line.debitGrams.minus(line.creditGrams);
        balances.set(bucket, (balances.get(bucket) ?? new Prisma.Decimal(0)).plus(delta));
        const material = line.account.materialKey;
        const materialBalances = balancesByMaterial.get(material) ?? new Map<string, Prisma.Decimal>();
        materialBalances.set(bucket, (materialBalances.get(bucket) ?? new Prisma.Decimal(0)).plus(delta));
        balancesByMaterial.set(material, materialBalances);
      }
    }
    const runReports = await Promise.all(tree.workshopProcessRuns.map((run) => this.runReconciliation(shopId, run.id)));
    const unclassified = balances.get(WorkshopAccountBucket.PROCESS) ?? new Prisma.Decimal(0);
    const outstandingWip = balances.get(WorkshopAccountBucket.WIP) ?? new Prisma.Decimal(0);
    const inTransit = balances.get(WorkshopAccountBucket.TRANSIT) ?? new Prisma.Decimal(0);
    const dispositions = Object.fromEntries([...balances]
      .filter(([bucket]) => bucket !== WorkshopAccountBucket.PROCESS && bucket !== WorkshopAccountBucket.WIP && bucket !== WorkshopAccountBucket.TRANSIT)
      .map(([bucket, value]) => [bucket, value.toFixed(6)]));
    return {
      treeId, jobId: tree.jobId, theoreticalCadGrams: theoretical.toFixed(6),
      actualInputGrams: actualInputs.toFixed(6),
      actualInputsByMaterial: Object.fromEntries([...actualByMaterial].map(([key, value]) => [key, value.toFixed(6)])),
      recommendedInputsByMaterial: Object.fromEntries([...recommendedByMaterial].map(([key, value]) => [key, value.toFixed(6)])),
      balancesByMaterial: Object.fromEntries([...balancesByMaterial].map(([key, buckets]) => [key,
        Object.fromEntries([...buckets].map(([bucket, value]) => [bucket, value.toFixed(6)]))])),
      dispositions,
      unclassifiedGrams: unclassified.toFixed(6),
      outstandingWipGrams: outstandingWip.toFixed(6),
      inTransitGrams: inTransit.toFixed(6),
      reconciliationState: journals.length && unclassified.isZero() && outstandingWip.isZero() && inTransit.isZero() &&
        runReports.every((run) => run.reconciliationState === "RECONCILED") ? "RECONCILED" : "RECONCILIATION_PENDING",
      children: tree.workshopBatchChildren,
      processRuns: runReports,
      journals: journals.map((entry) => this.journal.serializeEntry(entry, false)),
      theoreticalIsStock: false,
    };
  }
}
