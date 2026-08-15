import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  KarigarMovementType,
  KarigarStage,
  JewelleryType,
  InventoryStatus,
  Prisma,
} from "@prisma/client";
import {
  KARIGAR_STAGES,
  computeGoldLoss,
  stageGoldLoss,
  type KarigarStageCode,
} from "@gold-shop/shared";
import { PrismaService } from "../../prisma/prisma.service";
import { ShopPriceRebaseService } from "../shops/shop-price-rebase.service";
import { PlanLimitsService } from "../core/subscriptions/plan-limits.service";
import {
  AdvanceKarigarFloorDto,
  CreateCastingTreeDto,
  CreateKarigarJobDto,
  CreateKarigarMovementDto,
  InspectKarigarQcDto,
  ReceiveKarigarFgDto,
  SaveKarigarStateDto,
  UpdateCastingTreeDto,
  UpdateKarigarJobDto,
  UpdateKarigarStageDto,
} from "./dto/karigar.dto";
import {
  issueRequiresWorkshop,
  wageForFinishedReturn,
} from "./karigar-ledger";
import {
  buildWorkshopTower,
  finishedGramsForReceive,
  nextDepartment,
  resolveDepartments,
  type TowerJobInput,
} from "./karigar-workshop";

const BUILT_IN_VAULT: Record<string, string> = {
  goldGrains24k: "Gold Grains (24K)",
  goldBars24k: "Gold Cast Bars (24K)",
  silverBullion999: "Silver Bullion (999)",
};

@Injectable()
export class KarigarService {
  constructor(
    private prisma: PrismaService,
    private priceRebase: ShopPriceRebaseService,
    private planLimits: PlanLimitsService,
  ) {}

  async getSnapshot(shopId: string) {
    if (!shopId) {
      return { vaultReserves: {}, workshops: [], jobs: [], customMaterials: [] };
    }
    await this.priceRebase.ensureShopPricesMatchCurrency(shopId);

    const [workshops, jobs, reserves, movements] = await Promise.all([
      this.prisma.karigarWorkshop.findMany({
        where: { shopId },
        orderBy: { createdAt: "asc" },
      }),
      this.prisma.karigarJob.findMany({
        where: { shopId },
        orderBy: { createdAt: "desc" },
        include: {
          stages: { orderBy: { createdAt: "asc" } },
          trees: { include: { lines: { orderBy: { sortOrder: "asc" } } } },
        },
      }),
      this.prisma.karigarVaultReserve.findMany({ where: { shopId } }),
      this.prisma.karigarMetalMovement.findMany({
        where: { shopId },
        orderBy: { createdAt: "desc" },
        take: 500,
      }),
    ]);

    const vaultReserves: Record<string, number> = {
      goldGrains24k: 0,
      goldBars24k: 0,
      silverBullion999: 0,
    };
    const customMaterials: Array<{
      key: string;
      label: string;
      vaultKey: string;
    }> = [];
    for (const r of reserves) {
      vaultReserves[r.materialKey] = r.quantity;
      if (r.isCustom && r.customKey) {
        customMaterials.push({
          key: r.customKey,
          label: r.label,
          vaultKey: r.materialKey,
        });
      }
    }

    const byWorkshop = this.aggregateWorkshopMovements(movements);

    return {
      vaultReserves,
      workshops: workshops.map((w) => {
        const agg = byWorkshop.get(w.id);
        const issued = agg?.issued ?? w.metalIssued;
        const returned = agg?.returned ?? w.metalReturned;
        const loss = computeGoldLoss({
          issuedGrams: issued,
          finishedGrams: agg?.finished ?? 0,
          sprueButtonGrams: agg?.sprue ?? 0,
          recoverableGrams: agg?.recoverable ?? 0,
          allowedPercent: w.wastageLimit,
        });
        return {
          id: w.id,
          name: w.name,
          artisan: w.artisan,
          location: w.location,
          phone: w.phone ?? undefined,
          email: w.email ?? undefined,
          rating: w.rating,
          metalIssued: issued,
          metalReturned: returned,
          wastagePercent: issued > 0 ? (loss.actualLoss / issued) * 100 : 0,
          wastageLimit: w.wastageLimit,
          wageRatePerGram: w.wageRatePerGram,
          outstandingBalance: w.outstandingBalance,
          wageDue: w.wageDue,
          goldLoss: loss,
        };
      }),
      jobs: jobs.map((j) => this.serializeJob(j)),
      customMaterials,
      goldLoss: this.buildGoldLossReport(jobs, workshops),
    };
  }

  /**
   * Upsert workshops (identity + wages) and vault. Never deletes jobs or
   * movements — the gold ledger is append-only.
   */
  async replaceSnapshot(shopId: string, dto: SaveKarigarStateDto) {
    const customMaterials = dto.customMaterials ?? [];
    const customByVaultKey = new Map(
      customMaterials.map((m) => [m.vaultKey, m]),
    );

    const reserveKeys = new Set<string>([
      ...Object.keys(dto.vaultReserves ?? {}),
      ...customMaterials.map((m) => m.vaultKey),
    ]);

    await this.prisma.$transaction(async (tx) => {
      for (const w of dto.workshops) {
        await tx.karigarWorkshop.upsert({
          where: { id: w.id },
          create: {
            id: w.id,
            shopId,
            name: w.name,
            artisan: w.artisan,
            location: w.location ?? "Local",
            phone: w.phone ?? null,
            email: w.email ?? null,
            rating: w.rating ?? 5,
            metalIssued: w.metalIssued ?? 0,
            metalReturned: w.metalReturned ?? 0,
            wastagePercent: w.wastagePercent ?? 0,
            wastageLimit: w.wastageLimit ?? 1,
            wageRatePerGram: w.wageRatePerGram ?? 0,
            outstandingBalance: w.outstandingBalance ?? 0,
            wageDue: w.wageDue ?? 0,
          },
          update: {
            name: w.name,
            artisan: w.artisan,
            location: w.location ?? "Local",
            phone: w.phone ?? null,
            email: w.email ?? null,
            rating: w.rating ?? 5,
            wastageLimit: w.wastageLimit ?? 1,
            wageRatePerGram: w.wageRatePerGram ?? 0,
            wageDue: w.wageDue ?? 0,
          },
        });
      }

      for (const key of reserveKeys) {
        const cm = customByVaultKey.get(key);
        await tx.karigarVaultReserve.upsert({
          where: { shopId_materialKey: { shopId, materialKey: key } },
          create: {
            shopId,
            materialKey: key,
            quantity: Number(dto.vaultReserves?.[key] ?? 0) || 0,
            isCustom: !!cm,
            customKey: cm?.key ?? null,
            label: cm?.label ?? BUILT_IN_VAULT[key] ?? key,
          },
          update: {
            isCustom: !!cm,
            customKey: cm?.key ?? null,
            label: cm?.label ?? BUILT_IN_VAULT[key] ?? key,
            quantity: Number(dto.vaultReserves?.[key] ?? 0) || 0,
          },
        });
      }
    });

    return this.getSnapshot(shopId);
  }

  async createJob(shopId: string, dto: CreateKarigarJobDto) {
    const workshopId = dto.workshopId.trim();
    if (!issueRequiresWorkshop(workshopId)) {
      throw new BadRequestException("Select a karigar for this job");
    }
    const workshop = await this.prisma.karigarWorkshop.findFirst({
      where: { id: workshopId, shopId },
    });
    if (!workshop) throw new NotFoundException("Karigar not found");

    const id = dto.id?.trim() || `job-${Date.now()}`;
    const allowed = dto.allowedWastagePercent ?? 1;
    const job = await this.prisma.$transaction(async (tx) => {
      const created = await tx.karigarJob.create({
        data: {
          id,
          shopId,
          workshopId: workshop.id,
          product: dto.product,
          artisan: dto.artisan?.trim() || workshop.artisan,
          grossWeight: dto.grossWeight ?? 0,
          metalKey: dto.metalKey ?? "goldGrains24k",
          allowedWastagePercent: allowed,
          status: "Casting",
          currentStage: KarigarStage.CASTING,
          walkInCustomerId: dto.walkInCustomerId ?? null,
          shopQuoteId: dto.shopQuoteId ?? null,
          dueAt: this.parseDueAt(dto.dueAt),
          priority: dto.priority ?? "NORMAL",
          qty: dto.qty ?? 1,
          sizeLabel: dto.sizeLabel ?? null,
          purity: dto.purity ?? null,
          metalColor: dto.metalColor ?? null,
          photos: dto.photos ?? [],
          notes: dto.notes ?? null,
          bom: dto.bom ? (dto.bom as Prisma.InputJsonValue) : Prisma.JsonNull,
          steps: {
            casting: false,
            filing: false,
            setting: false,
            polishing: false,
            hallmark: false,
          },
        },
      });
      await this.ensureStages(tx, shopId, created.id, workshop.id, allowed);
      return created;
    });
    return this.getJob(shopId, job.id);
  }

  async updateJob(shopId: string, jobId: string, dto: UpdateKarigarJobDto) {
    await this.requireJob(shopId, jobId);
    await this.prisma.karigarJob.update({
      where: { id: jobId },
      data: {
        ...(dto.product != null ? { product: dto.product } : {}),
        ...(dto.artisan != null ? { artisan: dto.artisan } : {}),
        ...(dto.workshopId !== undefined
          ? { workshopId: dto.workshopId || null }
          : {}),
        ...(dto.grossWeight != null ? { grossWeight: dto.grossWeight } : {}),
        ...(dto.metalKey != null ? { metalKey: dto.metalKey } : {}),
        ...(dto.allowedWastagePercent != null
          ? { allowedWastagePercent: dto.allowedWastagePercent }
          : {}),
        ...(dto.status != null ? { status: dto.status } : {}),
        ...(dto.walkInCustomerId !== undefined
          ? { walkInCustomerId: dto.walkInCustomerId || null }
          : {}),
        ...(dto.shopQuoteId !== undefined
          ? { shopQuoteId: dto.shopQuoteId || null }
          : {}),
        ...(dto.dueAt !== undefined ? { dueAt: this.parseDueAt(dto.dueAt) } : {}),
        ...(dto.priority != null ? { priority: dto.priority } : {}),
        ...(dto.qty != null ? { qty: dto.qty } : {}),
        ...(dto.sizeLabel !== undefined ? { sizeLabel: dto.sizeLabel || null } : {}),
        ...(dto.purity !== undefined ? { purity: dto.purity || null } : {}),
        ...(dto.metalColor !== undefined
          ? { metalColor: dto.metalColor || null }
          : {}),
        ...(dto.photos != null ? { photos: dto.photos } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes || null } : {}),
        ...(dto.bom !== undefined
          ? { bom: dto.bom ? (dto.bom as Prisma.InputJsonValue) : Prisma.JsonNull }
          : {}),
        ...(dto.currentStage != null
          ? { currentStage: dto.currentStage as KarigarStage }
          : {}),
      },
    });
    return this.getJob(shopId, jobId);
  }

  async deleteJob(shopId: string, jobId: string) {
    await this.requireJob(shopId, jobId);
    await this.prisma.karigarJob.delete({ where: { id: jobId } });
    return { ok: true };
  }

  async deleteWorkshop(shopId: string, workshopId: string) {
    const ws = await this.prisma.karigarWorkshop.findFirst({
      where: { id: workshopId, shopId },
    });
    if (!ws) throw new NotFoundException("Karigar not found");
    const openJobs = await this.prisma.karigarJob.count({
      where: { shopId, workshopId },
    });
    if (openJobs > 0) {
      throw new BadRequestException(
        "Unlink or delete this karigar's jobs before removing them",
      );
    }
    await this.prisma.karigarWorkshop.delete({ where: { id: workshopId } });
    return { ok: true };
  }

  async addMovement(
    shopId: string,
    jobId: string | null,
    userId: string | undefined,
    dto: CreateKarigarMovementDto,
  ) {
    const weight = dto.weightGrams;
    const metalKey = dto.metalKey ?? "goldGrains24k";
    const stage = (dto.stage as KarigarStage | undefined) ?? undefined;
    let job: Awaited<ReturnType<typeof this.requireJob>> | null = null;
    if (jobId) {
      job = await this.requireJob(shopId, jobId);
      await this.ensureStages(
        this.prisma,
        shopId,
        job.id,
        dto.workshopId ?? job.workshopId,
        job.allowedWastagePercent,
      );
    }

    const type = dto.type as KarigarMovementType;
    const workshopId = dto.workshopId ?? job?.workshopId ?? null;

    if (type === "ISSUE" && !issueRequiresWorkshop(workshopId)) {
      throw new BadRequestException("Select a karigar before issuing metal");
    }

    await this.prisma.$transaction(async (tx) => {
      if (type === "ISSUE") {
        const workshop = await tx.karigarWorkshop.findFirst({
          where: { id: workshopId as string, shopId },
        });
        if (!workshop) throw new NotFoundException("Karigar not found");
        await this.adjustVault(tx, shopId, metalKey, -weight);
        await tx.karigarWorkshop.update({
          where: { id: workshop.id },
          data: {
            metalIssued: { increment: weight },
            outstandingBalance: { increment: weight },
          },
        });
        if (job) {
          const targetStage = stage ?? KarigarStage.CASTING;
          await tx.karigarJobStage.update({
            where: { jobId_stage: { jobId: job.id, stage: targetStage } },
            data: { goldInGrams: { increment: weight } },
          });
        }
      } else if (
        type === "RETURN_FINISHED" ||
        type === "RETURN_SPRUE" ||
        type === "SCRAP" ||
        type === "DUST"
      ) {
        await this.adjustVault(tx, shopId, metalKey, weight);
        if (workshopId) {
          const workshop = await tx.karigarWorkshop.findFirst({
            where: { id: workshopId, shopId },
          });
          if (workshop) {
            const wage =
              type === "RETURN_FINISHED"
                ? wageForFinishedReturn(weight, workshop.wageRatePerGram)
                : 0;
            await tx.karigarWorkshop.update({
              where: { id: workshop.id },
              data: {
                metalReturned: { increment: weight },
                outstandingBalance: { decrement: weight },
                ...(wage > 0 ? { wageDue: { increment: wage } } : {}),
              },
            });
          }
        }
      } else if (type === "ADJUST") {
        await this.adjustVault(tx, shopId, metalKey, weight);
      }

      await tx.karigarMetalMovement.create({
        data: {
          shopId,
          jobId: job?.id ?? null,
          workshopId,
          treeId: dto.treeId ?? null,
          stage: stage ?? null,
          type,
          metalKey,
          weightGrams: weight,
          purity: dto.purity ?? null,
          note: dto.note ?? null,
          lotId: dto.lotId ?? null,
          createdBy: userId ?? null,
        },
      });
    });

    if (job) {
      return this.getJob(shopId, job.id);
    }
    return this.getSnapshot(shopId);
  }

  async updateStage(
    shopId: string,
    jobId: string,
    stage: string,
    dto: UpdateKarigarStageDto,
  ) {
    await this.requireJob(shopId, jobId);
    const stageEnum = this.parseStage(stage);
    await this.ensureStages(this.prisma, shopId, jobId, dto.workshopId, dto.allowedWastagePercent);
    const existing = await this.prisma.karigarJobStage.findUnique({
      where: { jobId_stage: { jobId, stage: stageEnum } },
    });
    if (!existing) throw new NotFoundException("Stage not found");

    const goldIn = dto.goldInGrams ?? existing.goldInGrams;
    const goldOut = dto.goldOutGrams ?? existing.goldOutGrams;
    const scrap = dto.scrapGrams ?? existing.scrapGrams;
    const dust = dto.dustGrams ?? existing.dustGrams;
    const allowed = dto.allowedWastagePercent ?? existing.allowedWastagePercent;
    const done = goldOut > 0 || dto.status === "DONE";

    await this.prisma.karigarJobStage.update({
      where: { id: existing.id },
      data: {
        goldInGrams: goldIn,
        goldOutGrams: goldOut,
        scrapGrams: scrap,
        dustGrams: dust,
        allowedWastagePercent: allowed,
        workshopId: dto.workshopId ?? existing.workshopId,
        status: dto.status ?? (done ? "DONE" : existing.status),
        notes: dto.notes !== undefined ? dto.notes : existing.notes,
        photos: dto.photos ?? existing.photos,
        reworkCount: dto.reworkCount ?? existing.reworkCount,
        rejectionReason:
          dto.rejectionReason !== undefined
            ? dto.rejectionReason
            : existing.rejectionReason,
        startedAt: existing.startedAt ?? (goldIn > 0 ? new Date() : null),
        completedAt: done ? existing.completedAt ?? new Date() : existing.completedAt,
      },
    });

    const shop = await this.prisma.shop.findUnique({
      where: { id: shopId },
      select: { workshopDepartments: true },
    });
    const departments = resolveDepartments(shop?.workshopDepartments);
    await this.syncJobStatus(shopId, jobId, departments);
    return this.getJob(shopId, jobId);
  }

  async createTree(shopId: string, jobId: string, dto: CreateCastingTreeDto) {
    const job = await this.requireJob(shopId, jobId);
    await this.ensureStages(
      this.prisma,
      shopId,
      jobId,
      job.workshopId,
      job.allowedWastagePercent,
    );
    const tree = await this.prisma.karigarCastingTree.create({
      data: {
        shopId,
        jobId,
        label: dto.label ?? "Tree",
        issuedGrams: dto.issuedGrams,
        metalKey: dto.metalKey ?? job.metalKey,
        purity: dto.purity ?? "24K",
        allowedWastagePercent:
          dto.allowedWastagePercent ?? job.allowedWastagePercent,
      },
      include: { lines: true },
    });
    return {
      ...tree,
      goldLoss: computeGoldLoss({
        issuedGrams: tree.issuedGrams,
        finishedGrams: tree.finishedGrams,
        sprueButtonGrams: tree.sprueButtonGrams,
        recoverableGrams: tree.recoverableGrams,
        allowedPercent: tree.allowedWastagePercent,
      }),
    };
  }

  async updateTree(
    shopId: string,
    jobId: string,
    treeId: string,
    dto: UpdateCastingTreeDto,
  ) {
    await this.requireJob(shopId, jobId);
    const tree = await this.prisma.karigarCastingTree.findFirst({
      where: { id: treeId, jobId, shopId },
    });
    if (!tree) throw new NotFoundException("Casting tree not found");

    if (dto.lines) {
      await this.prisma.$transaction([
        this.prisma.karigarCastingTreeLine.deleteMany({ where: { treeId } }),
        this.prisma.karigarCastingTreeLine.createMany({
          data: dto.lines.map((line, index) => ({
            treeId,
            label: line.label,
            weightGrams: line.weightGrams,
            sortOrder: index,
          })),
        }),
      ]);
    }

    const finishedFromLines = dto.lines
      ? dto.lines.reduce((sum, line) => sum + line.weightGrams, 0)
      : undefined;

    const updated = await this.prisma.karigarCastingTree.update({
      where: { id: treeId },
      data: {
        ...(dto.label != null ? { label: dto.label } : {}),
        ...(dto.issuedGrams != null ? { issuedGrams: dto.issuedGrams } : {}),
        ...(dto.finishedGrams != null || finishedFromLines != null
          ? { finishedGrams: dto.finishedGrams ?? finishedFromLines ?? 0 }
          : {}),
        ...(dto.sprueButtonGrams != null
          ? { sprueButtonGrams: dto.sprueButtonGrams }
          : {}),
        ...(dto.recoverableGrams != null
          ? { recoverableGrams: dto.recoverableGrams }
          : {}),
        ...(dto.allowedWastagePercent != null
          ? { allowedWastagePercent: dto.allowedWastagePercent }
          : {}),
        ...(dto.purity != null ? { purity: dto.purity } : {}),
        ...(dto.status != null ? { status: dto.status } : {}),
      },
      include: { lines: { orderBy: { sortOrder: "asc" } } },
    });

    await this.prisma.karigarJobStage.update({
      where: { jobId_stage: { jobId, stage: KarigarStage.CASTING } },
      data: {
        goldInGrams: updated.issuedGrams,
        goldOutGrams: updated.finishedGrams,
        scrapGrams: updated.sprueButtonGrams + updated.recoverableGrams,
      },
    });

    return {
      ...updated,
      goldLoss: computeGoldLoss({
        issuedGrams: updated.issuedGrams,
        finishedGrams: updated.finishedGrams,
        sprueButtonGrams: updated.sprueButtonGrams,
        recoverableGrams: updated.recoverableGrams,
        allowedPercent: updated.allowedWastagePercent,
      }),
    };
  }

  async goldLossReport(shopId: string, from?: string, to?: string) {
    const createdAt =
      from || to
        ? {
            ...(from ? { gte: new Date(from) } : {}),
            ...(to ? { lte: new Date(to) } : {}),
          }
        : undefined;
    const [jobs, workshops] = await Promise.all([
      this.prisma.karigarJob.findMany({
        where: { shopId, ...(createdAt ? { createdAt } : {}) },
        include: {
          stages: true,
          trees: { include: { lines: true } },
        },
      }),
      this.prisma.karigarWorkshop.findMany({ where: { shopId } }),
    ]);
    return this.buildGoldLossReport(jobs, workshops);
  }

  async loadSampleJob(shopId: string, userId?: string) {
    const workshops = await this.prisma.karigarWorkshop.findMany({
      where: { shopId },
      take: 1,
    });
    let workshop = workshops[0];
    if (!workshop) {
      workshop = await this.prisma.karigarWorkshop.create({
        data: {
          id: `ws-demo-${Date.now()}`,
          shopId,
          name: "Demo casting bench",
          artisan: "Sample karigar",
          wastageLimit: 1,
        },
      });
    }

    const vault = await this.prisma.karigarVaultReserve.findUnique({
      where: { shopId_materialKey: { shopId, materialKey: "goldGrains24k" } },
    });
    const have = vault?.quantity ?? 0;
    if (have < 1000) {
      await this.adjustVault(
        this.prisma,
        shopId,
        "goldGrains24k",
        1000 - have,
      );
    }

    const job = await this.createJob(shopId, {
      product: "Sample job — 1 kg casting tree",
      artisan: workshop.artisan,
      workshopId: workshop.id,
      grossWeight: 1000,
      allowedWastagePercent: 1,
      metalKey: "goldGrains24k",
    });

    await this.addMovement(shopId, job.id, userId, {
      type: "ISSUE",
      weightGrams: 1000,
      workshopId: workshop.id,
      stage: "CASTING",
      metalKey: "goldGrains24k",
      note: "Sample issue for gold-loss demo",
    });

    const tree = await this.createTree(shopId, job.id, {
      label: "Tree 1",
      issuedGrams: 1000,
      allowedWastagePercent: 1,
      purity: "24K",
    });

    await this.updateTree(shopId, job.id, tree.id, {
      finishedGrams: 920,
      sprueButtonGrams: 50,
      recoverableGrams: 20,
      lines: [
        { label: "Bangle A", weightGrams: 310 },
        { label: "Bangle B", weightGrams: 305 },
        { label: "Pair of earrings", weightGrams: 305 },
      ],
    });

    await this.addMovement(shopId, job.id, userId, {
      type: "RETURN_FINISHED",
      weightGrams: 920,
      workshopId: workshop.id,
      metalKey: "goldGrains24k",
      note: "Finished pieces from tree",
    });
    await this.addMovement(shopId, job.id, userId, {
      type: "RETURN_SPRUE",
      weightGrams: 50,
      workshopId: workshop.id,
      metalKey: "goldGrains24k",
      note: "Sprue / button",
    });
    await this.addMovement(shopId, job.id, userId, {
      type: "SCRAP",
      weightGrams: 20,
      workshopId: workshop.id,
      metalKey: "goldGrains24k",
      note: "Recoverable filings",
    });

    const stageWeights: Array<{
      stage: string;
      goldIn: number;
      goldOut: number;
      scrap: number;
      dust: number;
    }> = [
      { stage: "FILING", goldIn: 920, goldOut: 910, scrap: 6, dust: 2 },
      { stage: "SETTING", goldIn: 910, goldOut: 908, scrap: 0, dust: 1 },
      { stage: "POLISHING", goldIn: 908, goldOut: 905, scrap: 1, dust: 1 },
      { stage: "FINAL_POLISH", goldIn: 905, goldOut: 903, scrap: 0, dust: 1 },
      { stage: "QC", goldIn: 903, goldOut: 903, scrap: 0, dust: 0 },
    ];
    for (const row of stageWeights) {
      await this.updateStage(shopId, job.id, row.stage, {
        goldInGrams: row.goldIn,
        goldOutGrams: row.goldOut,
        scrapGrams: row.scrap,
        dustGrams: row.dust,
        allowedWastagePercent: 1,
        status: "DONE",
        workshopId: workshop.id,
      });
    }

    return this.getJob(shopId, job.id);
  }

  async getJob(shopId: string, jobId: string) {
    const job = await this.prisma.karigarJob.findFirst({
      where: { id: jobId, shopId },
      include: {
        stages: { orderBy: { createdAt: "asc" } },
        trees: { include: { lines: { orderBy: { sortOrder: "asc" } } } },
        movements: { orderBy: { createdAt: "desc" }, take: 50 },
      },
    });
    if (!job) throw new NotFoundException("Job not found");
    return this.serializeJob(job);
  }

  private async requireWorkshopShop(shopId: string) {
    const shop = await this.prisma.shop.findUnique({
      where: { id: shopId },
      select: { workshopMode: true, workshopDepartments: true },
    });
    if (!shop) throw new NotFoundException("Shop not found");
    if (!shop.workshopMode) {
      throw new BadRequestException(
        "Workshop mode is disabled. Turn on Workshop mode in Shop Settings to use the factory floor.",
      );
    }
    return shop;
  }

  async getTower(shopId: string) {
    const shop = await this.requireWorkshopShop(shopId);
    const departments = resolveDepartments(shop.workshopDepartments);
    const [jobs, workshops, vault] = await Promise.all([
      this.prisma.karigarJob.findMany({
        where: { shopId },
        include: { stages: true, trees: true },
      }),
      this.prisma.karigarWorkshop.findMany({ where: { shopId } }),
      this.prisma.karigarVaultReserve.findUnique({
        where: {
          shopId_materialKey: { shopId, materialKey: "goldGrains24k" },
        },
      }),
    ]);
    const tower = buildWorkshopTower({
      jobs: jobs.map((job) => this.toTowerJob(job)),
      workshops,
      vaultGoldGrams: vault?.quantity ?? 0,
      departments,
    });
    const slim = (rows: TowerJobInput[]) =>
      rows.map((job) => ({
        id: job.id,
        product: job.product,
        artisan: job.artisan,
        status: job.status,
        dueAt: job.dueAt?.toISOString() ?? null,
        currentStage: job.currentStage,
        inventoryItemId: job.inventoryItemId,
      }));
    return {
      departments,
      overdue: slim(tower.overdue),
      waitingOnNext: slim(tower.waitingOnNext),
      lossLimit: slim(tower.lossLimit),
      unreceivedFg: slim(tower.unreceivedFg),
      qcPending: slim(tower.qcPending),
      dueThisWeek: slim(tower.dueThisWeek),
      unreceivedMetal: tower.unreceivedMetal,
      wagesDue: tower.wagesDue,
      lowVault: tower.lowVault,
      vaultGoldGrams: tower.vaultGoldGrams,
      deptLoad: tower.deptLoad,
      reworkRate: tower.reworkRate,
      onTimePercent: tower.onTimePercent,
    };
  }

  async getFloor(shopId: string, dept?: string) {
    const shop = await this.requireWorkshopShop(shopId);
    const departments = resolveDepartments(shop.workshopDepartments);
    const stageFilter = dept ? this.parseStage(dept) : undefined;
    const jobs = await this.prisma.karigarJob.findMany({
      where: {
        shopId,
        status: { notIn: ["Completed", "CANCELLED", "REJECTED"] },
        ...(stageFilter ? { currentStage: stageFilter } : {}),
      },
      orderBy: [{ dueAt: "asc" }, { createdAt: "asc" }],
      include: {
        stages: { orderBy: { createdAt: "asc" } },
        trees: { include: { lines: { orderBy: { sortOrder: "asc" } } } },
      },
    });
    return {
      departments,
      dept: stageFilter ?? null,
      jobs: jobs.map((job) => this.serializeJob(job)),
    };
  }

  async advanceFloor(
    shopId: string,
    jobId: string,
    dto: AdvanceKarigarFloorDto,
  ) {
    const shop = await this.requireWorkshopShop(shopId);
    const departments = resolveDepartments(shop.workshopDepartments);
    const job = await this.requireJob(shopId, jobId);
    await this.ensureStages(
      this.prisma,
      shopId,
      jobId,
      job.workshopId,
      job.allowedWastagePercent,
    );
    const current = (job.currentStage ??
      departments[0] ??
      KarigarStage.CASTING) as KarigarStageCode;
    const existing = await this.prisma.karigarJobStage.findUnique({
      where: {
        jobId_stage: { jobId, stage: current as KarigarStage },
      },
    });
    if (!existing) throw new NotFoundException("Stage not found");
    if (existing.status === "DONE") {
      throw new BadRequestException("This stage has already been advanced");
    }
    const goldOut = dto.goldOutGrams ?? existing.goldOutGrams;
    if (goldOut <= 0) {
      throw new BadRequestException(
        "Enter gold out (grams) to send this job to the next department",
      );
    }
    const next = nextDepartment(current, departments);
    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      const updatedStage = await tx.karigarJobStage.updateMany({
        where: { id: existing.id, status: { not: "DONE" } },
        data: {
          goldOutGrams: goldOut,
          status: "DONE",
          notes: dto.notes ?? existing.notes,
          photos: dto.photos ?? existing.photos,
          startedAt: existing.startedAt ?? now,
          completedAt: existing.completedAt ?? now,
        },
      });
      if (updatedStage.count === 0) {
        throw new BadRequestException("Stage transition was already applied");
      }
      if (next) {
        await tx.karigarJobStage.update({
          where: { jobId_stage: { jobId, stage: next as KarigarStage } },
          data: {
            goldInGrams: { increment: goldOut },
            startedAt: now,
            status: "IN_PROGRESS",
          },
        });
        await tx.karigarJob.update({
          where: { id: jobId },
          data: { currentStage: next as KarigarStage },
        });
      } else {
        await tx.karigarJob.update({
          where: { id: jobId },
          data: { currentStage: KarigarStage.QC, status: "Completed" },
        });
      }
    });
    await this.syncJobStatus(shopId, jobId, departments);
    return this.getJob(shopId, jobId);
  }

  async inspectQc(shopId: string, jobId: string, dto: InspectKarigarQcDto) {
    await this.requireWorkshopShop(shopId);
    const job = await this.requireJob(shopId, jobId);
    await this.ensureStages(
      this.prisma,
      shopId,
      jobId,
      job.workshopId,
      job.allowedWastagePercent,
    );
    const qc = await this.prisma.karigarJobStage.findUnique({
      where: { jobId_stage: { jobId, stage: KarigarStage.QC } },
    });
    if (!qc) throw new NotFoundException("QC stage not found");
    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      if (dto.decision === "APPROVED") {
        await tx.karigarJobStage.update({
          where: { id: qc.id },
          data: {
            status: "DONE",
            goldOutGrams: qc.goldOutGrams || qc.goldInGrams,
            notes: dto.notes ?? qc.notes,
            photos: dto.photos ?? qc.photos,
            startedAt: qc.startedAt ?? now,
            completedAt: now,
          },
        });
        await tx.karigarJob.update({
          where: { id: jobId },
          data: { currentStage: KarigarStage.QC, status: "Completed" },
        });
      } else if (dto.decision === "REWORK") {
        const backTo = (dto.reworkToStage ?? "FILING") as KarigarStage;
        await tx.karigarJobStage.update({
          where: { id: qc.id },
          data: {
            status: "REWORK",
            reworkCount: { increment: 1 },
            rejectionReason: dto.rejectionReason ?? qc.rejectionReason,
            notes: dto.notes ?? qc.notes,
            photos: dto.photos ?? qc.photos,
          },
        });
        await tx.karigarJobStage.update({
          where: { jobId_stage: { jobId, stage: backTo } },
          data: { status: "IN_PROGRESS", startedAt: now, completedAt: null },
        });
        await tx.karigarJob.update({
          where: { id: jobId },
          data: { currentStage: backTo, status: "Rework" },
        });
      } else {
        await tx.karigarJobStage.update({
          where: { id: qc.id },
          data: {
            status: "REJECTED",
            rejectionReason: dto.rejectionReason ?? "Rejected at QC",
            notes: dto.notes ?? qc.notes,
            photos: dto.photos ?? qc.photos,
            completedAt: now,
          },
        });
        await tx.karigarJob.update({
          where: { id: jobId },
          data: { status: "REJECTED", currentStage: KarigarStage.QC },
        });
      }
    });
    return this.getJob(shopId, jobId);
  }

  async receiveFg(shopId: string, jobId: string, dto: ReceiveKarigarFgDto) {
    await this.requireWorkshopShop(shopId);
    const job = await this.prisma.karigarJob.findFirst({
      where: { id: jobId, shopId },
      include: { stages: true, trees: true },
    });
    if (!job) throw new NotFoundException("Job not found");
    const weight = finishedGramsForReceive(job);
    if (weight <= 0) {
      throw new BadRequestException(
        "No finished weight to receive. Complete the casting tree or QC first.",
      );
    }
    const jewelleryType = this.parseJewelleryType(dto.jewelleryType);
    const nameEn = dto.nameEn?.trim() || job.product;
    if (job.inventoryItemId) {
      const item = await this.prisma.inventoryItem.update({
        where: { id: job.inventoryItemId },
        data: {
          nameEn,
          jewelleryType,
          totalWeightGrams: weight,
          grossWeightGrams: weight,
          images: job.photos ?? [],
        },
      });
      return { job: await this.getJob(shopId, jobId), inventoryItem: item };
    }
    await this.planLimits.checkProductLimit(shopId);
    let sku =
      dto.sku?.trim() ||
      `WO-${job.id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 10)}-${Date.now()
        .toString(36)
        .toUpperCase()}`;
    const skuTaken = await this.prisma.inventoryItem.findFirst({
      where: { shopId, sku },
    });
    if (skuTaken) sku = `${sku}-${Math.floor(Math.random() * 900 + 100)}`;

    const metalKey = job.metalKey || "goldGrains24k";
    const isGold = !metalKey.toLowerCase().includes("silver") && !metalKey.toLowerCase().includes("platinum");
    const purity = job.purity ? parseInt(job.purity, 10) || 24 : 24;

    const result = await this.prisma.$transaction(async (tx) => {
      const item = await tx.inventoryItem.create({
        data: {
          shopId,
          sku,
          nameEn,
          jewelleryType,
          buildMethod: "METHOD_A",
          composition: {
            method: "METHOD_A",
            preciousMetal: isGold ? "GOLD" : metalKey.toUpperCase(),
            purity,
            metalColor: job.metalColor ?? "YELLOW",
            eligibleForHallmark: true,
            labels: [job.metalKey ?? "Solid Gold"],
          },
          totalWeightGrams: weight,
          grossWeightGrams: weight,
          metalValueNpr: 0,
          makingChargeNpr: 0,
          gemstoneValueNpr: 0,
          taxNpr: 0,
          totalPriceNpr: 0,
          images: job.photos ?? [],
          status: InventoryStatus.AVAILABLE,
          stockQuantity: job.qty || 1,
        },
      });
      await tx.karigarJob.update({
        where: { id: jobId },
        data: { inventoryItemId: item.id },
      });
      return item;
    });
    return { job: await this.getJob(shopId, jobId), inventoryItem: result };
  }

  private parseDueAt(value?: string | null): Date | null {
    if (value == null || value === "") return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException("Invalid due date");
    }
    return date;
  }

  private parseJewelleryType(raw?: string): JewelleryType {
    if (!raw) return JewelleryType.OTHER;
    const upper = raw.toUpperCase() as JewelleryType;
    if (!Object.values(JewelleryType).includes(upper)) {
      return JewelleryType.OTHER;
    }
    return upper;
  }

  private toTowerJob(job: {
    id: string;
    product: string;
    artisan: string;
    status: string;
    dueAt: Date | null;
    currentStage: KarigarStage | null;
    inventoryItemId: string | null;
    allowedWastagePercent: number;
    stages: Array<{
      stage: KarigarStage;
      status: string;
      goldInGrams: number;
      goldOutGrams: number;
      scrapGrams: number;
      dustGrams: number;
      allowedWastagePercent: number;
      reworkCount: number;
      completedAt?: Date | null;
    }>;
    trees: Array<{
      issuedGrams: number;
      finishedGrams: number;
      sprueButtonGrams: number;
      recoverableGrams: number;
      allowedWastagePercent: number;
    }>;
  }): TowerJobInput {
    return {
      id: job.id,
      product: job.product,
      artisan: job.artisan,
      status: job.status,
      dueAt: job.dueAt,
      currentStage: (job.currentStage as KarigarStageCode | null) ?? null,
      inventoryItemId: job.inventoryItemId,
      allowedWastagePercent: job.allowedWastagePercent,
      stages: job.stages.map((stage) => ({
        ...stage,
        stage: stage.stage as KarigarStageCode,
        completedAt: stage.completedAt ?? null,
      })),
      trees: job.trees,
    };
  }

  private async requireJob(shopId: string, jobId: string) {
    const job = await this.prisma.karigarJob.findFirst({
      where: { id: jobId, shopId },
    });
    if (!job) throw new NotFoundException("Job not found");
    return job;
  }

  private parseStage(stage: string): KarigarStage {
    const upper = stage.toUpperCase() as KarigarStage;
    if (!KARIGAR_STAGES.includes(upper as KarigarStageCode)) {
      throw new BadRequestException(`Unknown stage ${stage}`);
    }
    return upper;
  }

  private async ensureStages(
    db: Prisma.TransactionClient | PrismaService,
    shopId: string,
    jobId: string,
    workshopId: string | null | undefined,
    allowedPercent?: number,
  ) {
    const existing = await db.karigarJobStage.findMany({ where: { jobId } });
    const have = new Set(existing.map((row) => row.stage));
    const missing = KARIGAR_STAGES.filter(
      (stage) => !have.has(stage as KarigarStage),
    );
    if (missing.length === 0) return;
    await db.karigarJobStage.createMany({
      data: missing.map((stage) => ({
        shopId,
        jobId,
        workshopId: workshopId ?? null,
        stage: stage as KarigarStage,
        allowedWastagePercent: allowedPercent ?? 1,
      })),
    });
  }

  private async adjustVault(
    db: Prisma.TransactionClient | PrismaService,
    shopId: string,
    metalKey: string,
    delta: number,
  ) {
    const row = await db.karigarVaultReserve.findUnique({
      where: { shopId_materialKey: { shopId, materialKey: metalKey } },
    });
    const next = (row?.quantity ?? 0) + delta;
    if (next < -0.0005) {
      throw new BadRequestException("Insufficient vault reserve for this metal");
    }
    await db.karigarVaultReserve.upsert({
      where: { shopId_materialKey: { shopId, materialKey: metalKey } },
      create: {
        shopId,
        materialKey: metalKey,
        quantity: Math.max(0, next),
        label: BUILT_IN_VAULT[metalKey] ?? metalKey,
      },
      update: { quantity: Math.max(0, next) },
    });
  }

  private async syncJobStatus(
    shopId: string,
    jobId: string,
    departments: KarigarStageCode[] = [...KARIGAR_STAGES],
  ) {
    const stages = await this.prisma.karigarJobStage.findMany({
      where: { shopId, jobId },
    });
    const done = new Set(
      stages.filter((s) => s.status === "DONE").map((s) => s.stage),
    );
    let status = "Casting";
    if (done.has(KarigarStage.QC)) status = "Completed";
    else if (done.has(KarigarStage.FINAL_POLISH)) status = "Final Polishing";
    else if (done.has(KarigarStage.POLISHING)) status = "Polishing";
    else if (done.has(KarigarStage.SETTING)) status = "Stone Setting";
    else if (done.has(KarigarStage.FILING)) status = "Filing & Assembly";
    const steps = {
      casting: done.has(KarigarStage.CASTING),
      filing: done.has(KarigarStage.FILING),
      setting: done.has(KarigarStage.SETTING),
      polishing: done.has(KarigarStage.POLISHING),
      hallmark: done.has(KarigarStage.QC),
    };
    let currentStage: KarigarStage = (departments[0] ?? KarigarStage.CASTING) as KarigarStage;
    for (const stage of departments) {
      currentStage = stage as KarigarStage;
      if (!done.has(stage as KarigarStage)) break;
    }
    await this.prisma.karigarJob.update({
      where: { id: jobId },
      data: { status, steps, currentStage },
    });
  }

  private serializeJob(job: {
    id: string;
    product: string;
    artisan: string;
    workshopId: string | null;
    grossWeight: number;
    metalKey: string;
    allowedWastagePercent: number;
    status: string;
    steps: Prisma.JsonValue | null;
    updatedAt: Date;
    walkInCustomerId?: string | null;
    shopQuoteId?: string | null;
    inventoryItemId?: string | null;
    dueAt?: Date | null;
    priority?: string;
    qty?: number;
    sizeLabel?: string | null;
    purity?: string | null;
    metalColor?: string | null;
    photos?: string[];
    notes?: string | null;
    bom?: Prisma.JsonValue | null;
    currentStage?: KarigarStage | null;
    stages?: Array<{
      id: string;
      stage: KarigarStage;
      goldInGrams: number;
      goldOutGrams: number;
      scrapGrams: number;
      dustGrams: number;
      allowedWastagePercent: number;
      status: string;
      workshopId: string | null;
      notes?: string | null;
      photos?: string[];
      reworkCount?: number;
      rejectionReason?: string | null;
      startedAt?: Date | null;
      completedAt?: Date | null;
    }>;
    trees?: Array<{
      id: string;
      label: string;
      metalKey: string;
      purity: string;
      issuedGrams: number;
      finishedGrams: number;
      sprueButtonGrams: number;
      recoverableGrams: number;
      allowedWastagePercent: number;
      status: string;
      lines: Array<{ id: string; label: string; weightGrams: number }>;
    }>;
    movements?: Array<{
      id: string;
      type: KarigarMovementType;
      weightGrams: number;
      stage: KarigarStage | null;
      createdAt: Date;
      note: string | null;
    }>;
  }) {
    const stages = (job.stages ?? []).map((stage) => ({
      ...stage,
      goldLoss: stageGoldLoss({
        goldInGrams: stage.goldInGrams,
        goldOutGrams: stage.goldOutGrams,
        scrapGrams: stage.scrapGrams,
        dustGrams: stage.dustGrams,
        allowedPercent: stage.allowedWastagePercent,
      }),
    }));
    const trees = (job.trees ?? []).map((tree) => ({
      ...tree,
      goldLoss: computeGoldLoss({
        issuedGrams: tree.issuedGrams,
        finishedGrams: tree.finishedGrams,
        sprueButtonGrams: tree.sprueButtonGrams,
        recoverableGrams: tree.recoverableGrams,
        allowedPercent: tree.allowedWastagePercent,
      }),
    }));
    const issued = trees.reduce((s, t) => s + t.issuedGrams, 0) || job.grossWeight;
    const finished = trees.reduce((s, t) => s + t.finishedGrams, 0);
    const sprue = trees.reduce((s, t) => s + t.sprueButtonGrams, 0);
    const recoverable = trees.reduce((s, t) => s + t.recoverableGrams, 0);
    const jobLoss =
      trees.length > 0
        ? computeGoldLoss({
            issuedGrams: issued,
            finishedGrams: finished,
            sprueButtonGrams: sprue,
            recoverableGrams: recoverable,
            allowedPercent: job.allowedWastagePercent,
          })
        : stageGoldLoss({
            goldInGrams: stages.reduce((s, st) => s + st.goldInGrams, 0),
            goldOutGrams: stages.reduce((s, st) => Math.max(s, st.goldOutGrams), 0),
            scrapGrams: stages.reduce((s, st) => s + st.scrapGrams, 0),
            dustGrams: stages.reduce((s, st) => s + st.dustGrams, 0),
            allowedPercent: job.allowedWastagePercent,
          });
    const steps = (job.steps as Record<string, boolean> | null) ?? {
      casting: false,
      filing: false,
      setting: false,
      polishing: false,
      hallmark: false,
    };
    return {
      id: job.id,
      product: job.product,
      artisan: job.artisan,
      workshopId: job.workshopId,
      grossWeight: job.grossWeight,
      metalKey: job.metalKey,
      allowedWastagePercent: job.allowedWastagePercent,
      status: job.status,
      steps,
      updatedAt: job.updatedAt.toISOString(),
      walkInCustomerId: job.walkInCustomerId ?? null,
      shopQuoteId: job.shopQuoteId ?? null,
      inventoryItemId: job.inventoryItemId ?? null,
      dueAt: job.dueAt ? job.dueAt.toISOString() : null,
      priority: job.priority ?? "NORMAL",
      qty: job.qty ?? 1,
      sizeLabel: job.sizeLabel ?? null,
      purity: job.purity ?? null,
      metalColor: job.metalColor ?? null,
      photos: job.photos ?? [],
      notes: job.notes ?? null,
      bom: job.bom ?? null,
      currentStage: job.currentStage ?? null,
      stages,
      trees,
      movements: job.movements ?? [],
      goldLoss: jobLoss,
    };
  }

  private aggregateWorkshopMovements(
    movements: Array<{
      workshopId: string | null;
      type: KarigarMovementType;
      weightGrams: number;
    }>,
  ) {
    const map = new Map<
      string,
      { issued: number; returned: number; finished: number; sprue: number; recoverable: number }
    >();
    for (const m of movements) {
      if (!m.workshopId) continue;
      const row = map.get(m.workshopId) ?? {
        issued: 0,
        returned: 0,
        finished: 0,
        sprue: 0,
        recoverable: 0,
      };
      if (m.type === "ISSUE") row.issued += m.weightGrams;
      if (m.type === "RETURN_FINISHED") {
        row.returned += m.weightGrams;
        row.finished += m.weightGrams;
      }
      if (m.type === "RETURN_SPRUE") {
        row.returned += m.weightGrams;
        row.sprue += m.weightGrams;
      }
      if (m.type === "SCRAP" || m.type === "DUST") {
        row.returned += m.weightGrams;
        row.recoverable += m.weightGrams;
      }
      map.set(m.workshopId, row);
    }
    return map;
  }

  private buildGoldLossReport(
    jobs: Array<{
      id: string;
      product: string;
      artisan: string;
      workshopId: string | null;
      allowedWastagePercent: number;
      stages?: Array<{
        stage: KarigarStage;
        goldInGrams: number;
        goldOutGrams: number;
        scrapGrams: number;
        dustGrams: number;
        allowedWastagePercent: number;
      }>;
      trees?: Array<{
        id: string;
        label: string;
        issuedGrams: number;
        finishedGrams: number;
        sprueButtonGrams: number;
        recoverableGrams: number;
        allowedWastagePercent: number;
      }>;
    }>,
    workshops: Array<{ id: string; artisan: string; name: string; wastageLimit: number }>,
  ) {
    const jobRows = jobs.map((job) => {
      const serialized = this.serializeJob({
        ...job,
        grossWeight: 0,
        metalKey: "goldGrains24k",
        status: "",
        steps: null,
        updatedAt: new Date(),
      } as Parameters<KarigarService["serializeJob"]>[0]);
      return {
        jobId: job.id,
        product: job.product,
        artisan: job.artisan,
        workshopId: job.workshopId,
        goldLoss: serialized.goldLoss,
        trees: serialized.trees,
        stages: serialized.stages,
      };
    });
    const treeRows = jobRows.flatMap((row) =>
      (row.trees ?? []).map((tree) => ({
        jobId: row.jobId,
        product: row.product,
        treeId: tree.id,
        label: tree.label,
        goldLoss: tree.goldLoss,
      })),
    );
    const karigarRows = workshops.map((w) => {
      const theirs = jobRows.filter((j) => j.workshopId === w.id);
      const issued = theirs.reduce((s, j) => s + j.goldLoss.issued, 0);
      const finished = theirs.reduce((s, j) => s + j.goldLoss.finished, 0);
      const sprue = theirs.reduce((s, j) => s + j.goldLoss.sprueButton, 0);
      const recoverable = theirs.reduce((s, j) => s + j.goldLoss.recoverable, 0);
      return {
        workshopId: w.id,
        name: w.name,
        artisan: w.artisan,
        goldLoss: computeGoldLoss({
          issuedGrams: issued,
          finishedGrams: finished,
          sprueButtonGrams: sprue,
          recoverableGrams: recoverable,
          allowedPercent: w.wastageLimit,
        }),
      };
    });
    return { jobs: jobRows, karigars: karigarRows, trees: treeRows };
  }
}
