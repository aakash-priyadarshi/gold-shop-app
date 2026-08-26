import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  CurrencyCode,
  KarigarMovementType,
  KarigarStage,
  JewelleryType,
  InventoryStatus,
  Prisma,
} from "@prisma/client";
import { createHash } from "crypto";
import {
  KARIGAR_STAGES,
  computeGoldLoss,
  stageGoldLoss,
  isReturnMovementType,
  type KarigarStageCode,
} from "@gold-shop/shared";
import { PrismaService } from "../../prisma/prisma.service";
import { ShopPriceRebaseService } from "../shops/shop-price-rebase.service";
import { PlanLimitsService } from "../core/subscriptions/plan-limits.service";
import { AccountingService } from "../accounting/accounting.service";
import type { MonetaryContext } from "../accounting/accounting.types";
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
  RecordKarigarPaymentDto,
  RecordKarigarAdvanceDto,
  RecordKarigarAdjustmentDto,
  RecordKarigarMetalReturnDto,
  KarigarStatementQueryDto,
} from "./dto/karigar-account.dto";
import {
  issueRequiresWorkshop,
  wageForFinishedReturn,
  computeFinancialSummary,
  computeMetalBalances,
  validatePaymentAmount,
  validateMetalReturn,
  roundMoney,
} from "./karigar-ledger";
import {
  buildWorkshopTower,
  finishedGramsForReceive,
  nextDepartment,
  resolveDepartments,
  type TowerJobInput,
} from "./karigar-workshop";

function computeSha256(payload: object | string): string {
  const str = typeof payload === "string" ? payload : JSON.stringify(payload);
  return createHash("sha256").update(str).digest("hex");
}

function roundGrams(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 1000) / 1000;
}

const BUILT_IN_VAULT: Record<string, string> = {
  goldGrains24k: "Gold Grains (24K)",
  goldBars24k: "Gold Cast Bars (24K)",
  silverBullion999: "Silver Bullion (999)",
};

type KarigarMonetaryPreflight = {
  currency: CurrencyCode;
  operationContext: MonetaryContext;
  openingBalanceContexts: Map<string, MonetaryContext>;
};

@Injectable()
export class KarigarService {
  constructor(
    private prisma: PrismaService,
    private priceRebase: ShopPriceRebaseService,
    private planLimits: PlanLimitsService,
    private accounting: AccountingService,
  ) {}

  async getSnapshot(shopId: string) {
    if (!shopId) {
      return { vaultReserves: {}, workshops: [], jobs: [], customMaterials: [] };
    }
    await this.priceRebase.ensureShopPricesMatchCurrency(shopId);

    const [
      shop,
      workshops,
      jobs,
      reserves,
      movementGroups,
      financialGroups,
      stageUnusedMovements,
    ] =
      await Promise.all([
        this.prisma.shop.findUnique({
          where: { id: shopId },
          select: { currency: true },
        }),
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
        this.prisma.karigarMetalMovement.groupBy({
          by: ["workshopId", "type"],
          where: { shopId, workshopId: { not: null } },
          _sum: { weightGrams: true },
        }),
        this.prisma.karigarFinancialEntry.groupBy({
          by: ["workshopId", "type", "currency"],
          where: { shopId },
          _sum: { amount: true },
        }),
        this.prisma.karigarMetalMovement.findMany({
          where: {
            shopId,
            jobId: { not: null },
            type: "RETURN_UNUSED",
          },
          select: {
            jobId: true,
            stage: true,
            type: true,
            weightGrams: true,
          },
        }),
      ]);

    const currentCurrency = shop?.currency ?? "NPR";
    for (const fg of financialGroups) {
      if (fg.currency !== currentCurrency) {
        throw new ConflictException(
          `Karigar snapshot contains financial entries in currency ${fg.currency} that differs from current shop currency ${currentCurrency}. Currency rebase must be migrated immutably.`,
        );
      }
    }

    const unusedReturnsByJob = new Map<
      string,
      Array<{
        type: KarigarMovementType;
        weightGrams: number;
        stage: KarigarStage | null;
      }>
    >();
    for (const movement of stageUnusedMovements) {
      if (!movement.jobId) continue;
      const returns = unusedReturnsByJob.get(movement.jobId) ?? [];
      returns.push(movement);
      unusedReturnsByJob.set(movement.jobId, returns);
    }

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

    const byWorkshop = new Map<
      string,
      {
        issued: number;
        returned: number;
        finished: number;
        sprue: number;
        recoverable: number;
        unused: number;
      }
    >();

    for (const mg of movementGroups) {
      if (!mg.workshopId) continue;
      const row = byWorkshop.get(mg.workshopId) ?? {
        issued: 0,
        returned: 0,
        finished: 0,
        sprue: 0,
        recoverable: 0,
        unused: 0,
      };
      const wt = mg._sum.weightGrams ?? 0;
      if (mg.type === "ISSUE") row.issued += wt;
      if (mg.type === "RETURN_FINISHED") {
        row.returned += wt;
        row.finished += wt;
      }
      if (mg.type === "RETURN_UNUSED") {
        row.returned += wt;
        row.unused += wt;
      }
      if (mg.type === "RETURN_SPRUE") {
        row.returned += wt;
        row.sprue += wt;
      }
      if (mg.type === "SCRAP" || mg.type === "DUST") {
        row.returned += wt;
        row.recoverable += wt;
      }
      byWorkshop.set(mg.workshopId, row);
    }

    const entriesByWorkshop = new Map<string, Array<{ type: string; amount: number }>>();
    for (const fg of financialGroups) {
      const list = entriesByWorkshop.get(fg.workshopId) ?? [];
      list.push({ type: fg.type, amount: Number(fg._sum.amount ?? 0) });
      entriesByWorkshop.set(fg.workshopId, list);
    }

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
          returnedUnusedGrams: agg?.unused ?? 0,
          allowedPercent: w.wastageLimit,
        });
        const finSummary = computeFinancialSummary(
          entriesByWorkshop.get(w.id) ?? [],
        );
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
          wageDue: finSummary.amountPayable,
          amountPayable: finSummary.amountPayable,
          advanceBalance: finSummary.advanceBalance,
          netPayable: finSummary.netPayable,
          totalWagesAccrued: finSummary.totalWagesAccrued,
          totalSettlementsPaid: finSummary.totalSettlementsPaid,
          totalAdvances: finSummary.totalAdvances,
          goldLoss: loss,
        };
      }),
      jobs: jobs.map((j) =>
        this.serializeJob({
          ...j,
          stageUnusedReturns: unusedReturnsByJob.get(j.id) ?? [],
        }),
      ),
      customMaterials,
      goldLoss: this.buildGoldLossReport(
        jobs.map((job) => ({
          ...job,
          stageUnusedReturns: unusedReturnsByJob.get(job.id) ?? [],
        })),
        workshops,
      ),
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
        const existingWorkshop = await tx.karigarWorkshop.findUnique({
          where: { id: w.id },
          select: { id: true, shopId: true },
        });
        if (existingWorkshop) {
          if (existingWorkshop.shopId !== shopId) {
            throw new ForbiddenException(
              "Cannot modify workshop belonging to another shop",
            );
          }
          await tx.karigarWorkshop.update({
            where: { id: w.id },
            data: {
              name: w.name,
              artisan: w.artisan,
              location: w.location ?? "Local",
              phone: w.phone ?? null,
              email: w.email ?? null,
              rating: w.rating ?? 5,
              wastageLimit: w.wastageLimit ?? 1,
              wageRatePerGram: w.wageRatePerGram ?? 0,
              // wageDue is derived strictly from financial ledger entries, ignore client payload
            },
          });
        } else {
          await tx.karigarWorkshop.create({
            data: {
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
              wageDue: 0,
            },
          });
        }
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
    const job = await this.requireJob(shopId, jobId);
    this.assertProductionJobActive(job);
    if (dto.status != null || dto.currentStage != null) {
      throw new BadRequestException(
        "Use the workshop stage flow to change a job's production status or current stage",
      );
    }
    if (dto.workshopId !== undefined && dto.workshopId !== job.workshopId) {
      if (dto.workshopId) {
        const targetWorkshop = await this.prisma.karigarWorkshop.findFirst({
          where: { id: dto.workshopId, shopId },
        });
        if (!targetWorkshop) {
          throw new NotFoundException("Target karigar not found in this shop");
        }
      }

      const [movementCount, financialCount, allocationCount, stageProgressCount] =
        await Promise.all([
          this.prisma.karigarMetalMovement.count({ where: { shopId, jobId } }),
          this.prisma.karigarFinancialEntry.count({ where: { shopId, jobId } }),
          this.prisma.karigarFinancialAllocation.count({
            where: { shopId, jobId },
          }),
          this.prisma.karigarJobStage.count({
            where: {
              shopId,
              jobId,
              OR: [
                { goldInGrams: { gt: 0 } },
                { goldOutGrams: { gt: 0 } },
                { status: { not: "PENDING" } },
              ],
            },
          }),
        ]);
      if (
        movementCount > 0 ||
        financialCount > 0 ||
        allocationCount > 0 ||
        stageProgressCount > 0
      ) {
        throw new BadRequestException(
          "Cannot reassign workshop once metal movements, stages, or financial ledger entries exist for this job. Use an explicit workshop transfer workflow.",
        );
      }
    }
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
      },
    });
    return this.getJob(shopId, jobId);
  }

  async deleteJob(shopId: string, jobId: string) {
    await this.requireJob(shopId, jobId);
    await this.prisma.karigarJob.update({
      where: { id: jobId },
      data: { status: "CANCELLED" },
    });
    return { ok: true, status: "CANCELLED" };
  }

  async deleteWorkshop(shopId: string, workshopId: string) {
    const ws = await this.prisma.karigarWorkshop.findFirst({
      where: { id: workshopId, shopId },
    });
    if (!ws) throw new NotFoundException("Karigar not found");
    const [jobCount, financialCount, movementCount] = await Promise.all([
      this.prisma.karigarJob.count({
        where: { shopId, workshopId },
      }),
      this.prisma.karigarFinancialEntry.count({
        where: { shopId, workshopId },
      }),
      this.prisma.karigarMetalMovement.count({
        where: { shopId, workshopId },
      }),
    ]);
    if (jobCount > 0 || financialCount > 0 || movementCount > 0) {
      throw new BadRequestException(
        "Cannot delete workshop with existing job, ledger, or metal movement history. Archive the workshop instead.",
      );
    }
    await this.prisma.karigarWorkshop.delete({ where: { id: workshopId } });
    return { ok: true };
  }

  private async ensureOpeningBalancePosted(
    tx: Prisma.TransactionClient,
    shopId: string,
    workshopId: string,
    openingBalanceContexts: Map<string, MonetaryContext>,
  ) {
    const unposted = await tx.karigarFinancialEntry.findMany({
      where: {
        shopId,
        workshopId,
        type: "OPENING_BALANCE",
      },
      include: { workshop: { select: { artisan: true, name: true } } },
    });
    for (const entry of unposted) {
      const monetary = openingBalanceContexts.get(entry.id);
      if (!monetary) {
        throw new ConflictException(
          "Opening balance changed while monetary context was being prepared. Retry the operation.",
        );
      }
      await this.accounting.postKarigarOpeningBalance(tx, {
        ...monetary,
        shopId,
        financialEntryId: entry.id,
        workshopId: entry.workshopId,
        artisanName: entry.workshop?.artisan || entry.workshop?.name,
        transactionDate: entry.createdAt,
      });
    }
  }

  private async prepareKarigarMonetaryPreflight(
    shopId: string,
    workshopId: string,
    operationAmount?: number,
  ): Promise<KarigarMonetaryPreflight> {
    const [shop, openingBalances] = await Promise.all([
      this.prisma.shop.findUnique({
        where: { id: shopId },
        select: { currency: true },
      }),
      this.prisma.karigarFinancialEntry.findMany({
        where: { shopId, workshopId, type: "OPENING_BALANCE" },
        select: { id: true, amount: true, currency: true },
      }),
    ]);
    if (!shop) throw new NotFoundException("Shop not found");

    const currency = (shop.currency ?? CurrencyCode.NPR) as CurrencyCode;
    const [operationContext, openingBalanceEntries] = await Promise.all([
      this.accounting.prepareMonetaryContext(operationAmount ?? 1, currency),
      Promise.all(
        openingBalances.map(async (entry) =>
          [
            entry.id,
            await this.accounting.prepareMonetaryContext(
              Number(entry.amount),
              entry.currency,
            ),
          ] as const,
        ),
      ),
    ]);

    return {
      currency,
      operationContext,
      openingBalanceContexts: new Map(openingBalanceEntries),
    };
  }

  private assertPreparedShopCurrency(
    preflight: KarigarMonetaryPreflight,
    currentCurrency: CurrencyCode,
  ) {
    if (preflight.currency !== currentCurrency) {
      throw new ConflictException(
        "Shop currency changed while the ledger operation was being prepared. Retry the operation.",
      );
    }
  }

  private monetaryContextFromPreparedQuote(
    amount: number,
    currency: CurrencyCode,
    quote: MonetaryContext,
  ): MonetaryContext {
    const transactionAmount = new Prisma.Decimal(amount).toDecimalPlaces(4);
    const fxRate = new Prisma.Decimal(quote.fxRate).toDecimalPlaces(10);
    if (
      !Number.isFinite(amount) ||
      transactionAmount.lte(0) ||
      quote.transactionCurrency !== currency ||
      !fxRate.isFinite() ||
      fxRate.lte(0) ||
      !quote.fxSource?.trim() ||
      !(quote.fxQuotedAt instanceof Date) ||
      Number.isNaN(quote.fxQuotedAt.getTime())
    ) {
      throw new BadRequestException("Invalid prepared ledger FX quote");
    }

    return {
      transactionCurrency: currency,
      transactionAmount,
      canonicalAmountNpr: transactionAmount.mul(fxRate).toDecimalPlaces(4),
      fxRate,
      fxSource: quote.fxSource,
      fxQuotedAt: quote.fxQuotedAt,
    };
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
    const type = dto.type as KarigarMovementType;
    let job: Awaited<ReturnType<typeof this.requireJob>> | null = null;
    if (jobId) {
      job = await this.requireJob(shopId, jobId);
      if (job.status === "CANCELLED") {
        if (type === "ISSUE") {
          this.assertProductionJobActive(job);
        }
      } else {
        await this.ensureStages(
          this.prisma,
          shopId,
          job.id,
          dto.workshopId ?? job.workshopId,
          job.allowedWastagePercent,
        );
      }
      if (dto.workshopId && job.workshopId && dto.workshopId !== job.workshopId) {
        throw new BadRequestException(
          "Movement workshop must match the assigned job workshop",
        );
      }
    }

    const workshopId = dto.workshopId ?? job?.workshopId ?? null;

    if (type === "RETURN_FINISHED" && !job) {
      throw new BadRequestException(
        "Finished jewellery return requires a specific production job",
      );
    }

    if (type === "ISSUE" && !issueRequiresWorkshop(workshopId)) {
      throw new BadRequestException("Select a karigar before issuing metal");
    }

    let movementFingerprint: string | null = null;
    if (dto.idempotencyKey) {
      movementFingerprint = computeSha256({
        workshopId,
        jobId: job?.id ?? null,
        returnType: type,
        metalKey,
        weightGrams: roundGrams(weight),
        note: dto.note?.trim() || null,
      });
    }

    const monetaryPreflight =
      type === "RETURN_FINISHED" && workshopId
        ? await this.prepareKarigarMonetaryPreflight(shopId, workshopId)
        : null;

    await this.prisma.$transaction(async (tx) => {
      // Row lock on workshop to serialize metal float and financial mutation
      if (workshopId) {
        const lockedRows = await tx.$queryRaw<
          { id: string }[]
        >`SELECT "id" FROM "KarigarWorkshop" WHERE "id" = ${workshopId} AND "shopId" = ${shopId} FOR UPDATE`;
        if (!lockedRows || lockedRows.length === 0) {
          throw new NotFoundException("Karigar not found");
        }
      }

      const lockedShop = monetaryPreflight
        ? await tx.shop.findUnique({
            where: { id: shopId },
            select: { currency: true },
          })
        : null;
      if (monetaryPreflight) {
        if (!lockedShop) throw new NotFoundException("Shop not found");
        this.assertPreparedShopCurrency(
          monetaryPreflight,
          (lockedShop.currency ?? CurrencyCode.NPR) as CurrencyCode,
        );
      }

      // Check Idempotency for metal movement
      if (dto.idempotencyKey && movementFingerprint) {
        const existingMovement = await tx.karigarMetalMovement.findUnique({
          where: {
            shopId_idempotencyKey: {
              shopId,
              idempotencyKey: dto.idempotencyKey,
            },
          },
        });
        if (existingMovement) {
          if (existingMovement.requestFingerprint === movementFingerprint) {
            return; // Exact replay: exit transaction safely
          }
          throw new ConflictException(
            "Idempotency key reused for a different metal movement payload",
          );
        }
      }

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
            idempotencyKey: dto.idempotencyKey ?? null,
            requestFingerprint: movementFingerprint,
            createdBy: userId ?? null,
          },
        });
      } else if (
        type === "RETURN_FINISHED" ||
        type === "RETURN_UNUSED" ||
        type === "RETURN_SPRUE" ||
        type === "SCRAP" ||
        type === "DUST"
      ) {
        if (workshopId) {
          const workshop = await tx.karigarWorkshop.findFirst({
            where: { id: workshopId, shopId },
          });
          if (!workshop) throw new NotFoundException("Karigar not found");

          // Concurrency-safe material outstanding balance check under row lock
          const pastMovements = await tx.karigarMetalMovement.findMany({
            where: { shopId, workshopId, metalKey },
            select: { type: true, weightGrams: true },
          });
          const issued = pastMovements
            .filter((m) => m.type === "ISSUE")
            .reduce((sum, m) => sum + m.weightGrams, 0);
          const returned = pastMovements
            .filter((m) => isReturnMovementType(m.type))
            .reduce((sum, m) => sum + m.weightGrams, 0);
          const currentOutstanding = Math.max(
            0,
            Math.round((issued - returned) * 1000) / 1000,
          );

          const check = validateMetalReturn(weight, currentOutstanding);
          if (!check.valid) {
            throw new BadRequestException(check.reason);
          }

          await this.adjustVault(tx, shopId, metalKey, weight);
          const wage =
            type === "RETURN_FINISHED"
              ? wageForFinishedReturn(weight, workshop.wageRatePerGram)
              : 0;

          await tx.karigarWorkshop.update({
            where: { id: workshop.id },
            data: {
              metalReturned: { increment: weight },
              outstandingBalance: { decrement: weight },
            },
          });

          const movement = await tx.karigarMetalMovement.create({
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
              idempotencyKey: dto.idempotencyKey ?? null,
              requestFingerprint: movementFingerprint,
              createdBy: userId ?? null,
            },
          });

          if (wage > 0) {
            if (!monetaryPreflight || !lockedShop) {
              throw new ConflictException(
                "Missing pre-resolved monetary context for wage accrual",
              );
            }
            const currency = (lockedShop.currency ?? CurrencyCode.NPR) as CurrencyCode;
            await this.ensureOpeningBalancePosted(
              tx,
              shopId,
              workshop.id,
              monetaryPreflight.openingBalanceContexts,
            );
            const entry = await tx.karigarFinancialEntry.create({
              data: {
                shopId,
                workshopId: workshop.id,
                jobId: job?.id ?? null,
                type: "WAGE_ACCRUAL",
                amount: new Prisma.Decimal(roundMoney(wage)),
                currency,
                sourceMovementId: movement.id,
                note:
                  dto.note ?? `Wage accrued for finished return of ${weight}g`,
                createdBy: userId ?? null,
              },
            });

            // Post Wage Accrual to General Ledger
            const monetary = this.monetaryContextFromPreparedQuote(
              roundMoney(wage),
              currency,
              monetaryPreflight.operationContext,
            );
            await this.accounting.postKarigarWageAccrual(tx, {
              ...monetary,
              shopId,
              financialEntryId: entry.id,
              workshopId: workshop.id,
              artisanName: workshop.artisan || workshop.name,
              jobId: job?.id ?? null,
              productName: job?.product ?? null,
              transactionDate: movement.createdAt,
              actorUserId: userId,
            });

            // Real Advance Application: Apply available workshop advances against this new wage accrual
            if (job) {
              const advanceEntries = await tx.karigarFinancialEntry.findMany({
                where: {
                  shopId,
                  workshopId: workshop.id,
                  type: "ADVANCE_PAYMENT",
                },
                include: { allocations: true },
                orderBy: { createdAt: "asc" },
              });

              let wageRemainingToCover = roundMoney(wage);
              for (const advEntry of advanceEntries) {
                if (wageRemainingToCover <= 0) break;
                const consumed = advEntry.allocations.reduce(
                  (sum, a) => sum + Number(a.amount),
                  0,
                );
                const remainingOnAdv = roundMoney(
                  Math.max(0, Number(advEntry.amount) - consumed),
                );
                if (remainingOnAdv > 0) {
                  const allocAmount = roundMoney(
                    Math.min(remainingOnAdv, wageRemainingToCover),
                  );
                  if (allocAmount > 0) {
                    const alloc = await tx.karigarFinancialAllocation.create({
                      data: {
                        shopId,
                        financialEntryId: advEntry.id,
                        jobId: job.id,
                        amount: new Prisma.Decimal(allocAmount),
                      },
                    });
                    const advMonetary = this.monetaryContextFromPreparedQuote(
                      allocAmount,
                      currency,
                      monetaryPreflight.operationContext,
                    );
                    await this.accounting.postKarigarAdvanceApplication(tx, {
                      ...advMonetary,
                      shopId,
                      financialEntryId: advEntry.id,
                      allocationId: alloc.id,
                      workshopId: workshop.id,
                      artisanName: workshop.artisan || workshop.name,
                      jobId: job.id,
                      productName: job.product,
                      transactionDate: movement.createdAt,
                      actorUserId: userId,
                    });
                    wageRemainingToCover = roundMoney(
                      wageRemainingToCover - allocAmount,
                    );
                  }
                }
              }
            }
          }

          const allEntries = await tx.karigarFinancialEntry.findMany({
            where: { shopId, workshopId },
            select: { type: true, amount: true },
          });
          const summary = computeFinancialSummary(allEntries);
          await tx.karigarWorkshop.update({
            where: { id: workshop.id },
            data: { wageDue: summary.amountPayable },
          });
        } else {
          await this.adjustVault(tx, shopId, metalKey, weight);
          await tx.karigarMetalMovement.create({
            data: {
              shopId,
              jobId: job?.id ?? null,
              workshopId: null,
              treeId: dto.treeId ?? null,
              stage: stage ?? null,
              type,
              metalKey,
              weightGrams: weight,
              purity: dto.purity ?? null,
              note: dto.note ?? null,
              lotId: dto.lotId ?? null,
              idempotencyKey: dto.idempotencyKey ?? null,
              requestFingerprint: movementFingerprint,
              createdBy: userId ?? null,
            },
          });
        }
      } else if (type === "TRANSFER") {
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
            idempotencyKey: dto.idempotencyKey ?? null,
            requestFingerprint: movementFingerprint,
            createdBy: userId ?? null,
          },
        });
      } else if (type === "ADJUST") {
        await this.adjustVault(tx, shopId, metalKey, weight);
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
            idempotencyKey: dto.idempotencyKey ?? null,
            requestFingerprint: movementFingerprint,
            createdBy: userId ?? null,
          },
        });
      }
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
    const job = await this.requireJob(shopId, jobId);
    this.assertProductionJobActive(job);
    const stageEnum = this.parseStage(stage);
    const shop = await this.prisma.shop.findUnique({
      where: { id: shopId },
      select: { workshopMode: true, workshopDepartments: true },
    });
    const workshopQc = shop?.workshopMode && stageEnum === KarigarStage.QC;
    if (workshopQc && dto.status != null) {
      throw new BadRequestException(
        "Use Workshop QC inspection to approve, rework, or reject QC",
      );
    }
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
    const done = !workshopQc && (goldOut > 0 || dto.status === "DONE");

    await this.prisma.karigarJobStage.update({
      where: { id: existing.id },
      data: {
        goldInGrams: goldIn,
        goldOutGrams: goldOut,
        scrapGrams: scrap,
        dustGrams: dust,
        allowedWastagePercent: allowed,
        workshopId: dto.workshopId ?? existing.workshopId,
        status:
          workshopQc
            ? existing.status
            : dto.status ?? (done ? "DONE" : existing.status),
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

    const departments = resolveDepartments(shop?.workshopDepartments);
    await this.syncJobStatus(
      shopId,
      jobId,
      shop?.workshopMode ? this.workflowDepartments(departments) : departments,
      !!shop?.workshopMode,
    );
    return this.getJob(shopId, jobId);
  }

  async createTree(shopId: string, jobId: string, dto: CreateCastingTreeDto) {
    const job = await this.requireJob(shopId, jobId);
    this.assertProductionJobActive(job);
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
    const job = await this.requireJob(shopId, jobId);
    this.assertProductionJobActive(job);
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
    const [jobs, workshops, stageUnusedMovements] = await Promise.all([
      this.prisma.karigarJob.findMany({
        where: { shopId, ...(createdAt ? { createdAt } : {}) },
        include: {
          stages: true,
          trees: { include: { lines: true } },
        },
      }),
      this.prisma.karigarWorkshop.findMany({ where: { shopId } }),
      this.prisma.karigarMetalMovement.findMany({
        where: { shopId, jobId: { not: null }, type: "RETURN_UNUSED" },
        select: { jobId: true, type: true, weightGrams: true, stage: true },
      }),
    ]);
    const unusedReturnsByJob = new Map<
      string,
      Array<{
        type: KarigarMovementType;
        weightGrams: number;
        stage: KarigarStage | null;
      }>
    >();
    for (const movement of stageUnusedMovements) {
      if (!movement.jobId) continue;
      const returns = unusedReturnsByJob.get(movement.jobId) ?? [];
      returns.push(movement);
      unusedReturnsByJob.set(movement.jobId, returns);
    }
    return this.buildGoldLossReport(
      jobs.map((job) => ({
        ...job,
        stageUnusedReturns: unusedReturnsByJob.get(job.id) ?? [],
      })),
      workshops,
    );
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
    const [job, stageUnusedReturns] = await Promise.all([
      this.prisma.karigarJob.findFirst({
        where: { id: jobId, shopId },
        include: {
          stages: { orderBy: { createdAt: "asc" } },
          trees: { include: { lines: { orderBy: { sortOrder: "asc" } } } },
          movements: { orderBy: { createdAt: "desc" }, take: 50 },
        },
      }),
      this.prisma.karigarMetalMovement.findMany({
        where: { shopId, jobId, type: "RETURN_UNUSED" },
        select: { type: true, weightGrams: true, stage: true },
      }),
    ]);
    if (!job) throw new NotFoundException("Job not found");
    return this.serializeJob({ ...job, stageUnusedReturns });
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
    const departments = this.workflowDepartments(
      resolveDepartments(shop.workshopDepartments),
    );
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
    const departments = this.workflowDepartments(
      resolveDepartments(shop.workshopDepartments),
    );
    const stageFilter = dept ? this.parseStage(dept) : undefined;
    const [jobs, stageUnusedMovements] = await Promise.all([
      this.prisma.karigarJob.findMany({
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
      }),
      this.prisma.karigarMetalMovement.findMany({
        where: { shopId, jobId: { not: null }, type: "RETURN_UNUSED" },
        select: { jobId: true, type: true, weightGrams: true, stage: true },
      }),
    ]);
    const unusedReturnsByJob = new Map<
      string,
      Array<{
        type: KarigarMovementType;
        weightGrams: number;
        stage: KarigarStage | null;
      }>
    >();
    for (const movement of stageUnusedMovements) {
      if (!movement.jobId) continue;
      const returns = unusedReturnsByJob.get(movement.jobId) ?? [];
      returns.push(movement);
      unusedReturnsByJob.set(movement.jobId, returns);
    }
    return {
      departments,
      dept: stageFilter ?? null,
      jobs: jobs.map((job) =>
        this.serializeJob({
          ...job,
          stageUnusedReturns: unusedReturnsByJob.get(job.id) ?? [],
        }),
      ),
    };
  }

  async advanceFloor(
    shopId: string,
    jobId: string,
    dto: AdvanceKarigarFloorDto,
  ) {
    const shop = await this.requireWorkshopShop(shopId);
    const departments = this.workflowDepartments(
      resolveDepartments(shop.workshopDepartments),
    );
    const job = await this.requireJob(shopId, jobId);
    this.assertProductionJobActive(job);
    const current = (job.currentStage ??
      departments[0] ??
      KarigarStage.CASTING) as KarigarStageCode;
    if (current === KarigarStage.QC) {
      throw new BadRequestException(
        "Use Workshop QC inspection to approve, rework, or reject this job",
      );
    }
    await this.ensureStages(
      this.prisma,
      shopId,
      jobId,
      job.workshopId,
      job.allowedWastagePercent,
    );
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
      if (!next) {
        throw new BadRequestException(
          "Use Workshop QC inspection to complete this job",
        );
      }
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
    });
    await this.syncJobStatus(shopId, jobId, departments, true);
    return this.getJob(shopId, jobId);
  }

  async inspectQc(shopId: string, jobId: string, dto: InspectKarigarQcDto) {
    await this.requireWorkshopShop(shopId);
    const job = await this.requireJob(shopId, jobId);
    this.assertProductionJobActive(job);
    if (job.currentStage !== KarigarStage.QC) {
      throw new BadRequestException(
        "Advance this job to Workshop QC before recording an inspection",
      );
    }
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
            qcApprovedAt: now,
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
            qcApprovedAt: null,
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
            qcApprovedAt: null,
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
    this.assertProductionJobActive(job);
    const qc = job.stages.find((stage) => stage.stage === KarigarStage.QC);
    if (qc?.status !== "DONE" || !qc.qcApprovedAt) {
      throw new BadRequestException(
        "Approve this job in Workshop QC before receiving finished goods",
      );
    }
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
      qcApprovedAt?: Date | null;
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
        qcApprovedAt: stage.qcApprovedAt ?? null,
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

  private assertProductionJobActive(job: { status: string }) {
    if (job.status === "CANCELLED") {
      throw new BadRequestException(
        "Cancelled jobs are archived and cannot resume production",
      );
    }
  }

  private workflowDepartments(
    departments: KarigarStageCode[],
  ): KarigarStageCode[] {
    return [
      ...departments.filter((stage) => stage !== KarigarStage.QC),
      KarigarStage.QC,
    ];
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
    qcRequiresApproval = false,
  ) {
    const job = await this.prisma.karigarJob.findFirst({
      where: { id: jobId, shopId },
      select: { status: true },
    });
    if (!job || job.status === "CANCELLED") return;
    const stages = await this.prisma.karigarJobStage.findMany({
      where: { shopId, jobId },
    });
    const done = new Set(
      stages
        .filter(
          (s) =>
            s.status === "DONE" &&
            (!qcRequiresApproval ||
              s.stage !== KarigarStage.QC ||
              s.qcApprovedAt != null),
        )
        .map((s) => s.stage),
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
    const workflowDepartments = qcRequiresApproval
      ? this.workflowDepartments(departments)
      : departments;
    let currentStage: KarigarStage = (workflowDepartments[0] ??
      KarigarStage.CASTING) as KarigarStage;
    for (const stage of workflowDepartments) {
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
      qcApprovedAt?: Date | null;
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
    stageUnusedReturns?: Array<{
      type: KarigarMovementType;
      weightGrams: number;
      stage: KarigarStage | null;
    }>;
  }) {
    const returnedUnusedByStage = new Map<KarigarStage, number>();
    const unusedReturns =
      job.stageUnusedReturns ??
      (job.movements ?? []).filter((movement) => movement.type === "RETURN_UNUSED");
    let jobReturnedUnusedGrams = 0;
    for (const movement of unusedReturns) {
      jobReturnedUnusedGrams += movement.weightGrams;
      if (movement.stage) {
        returnedUnusedByStage.set(
          movement.stage,
          (returnedUnusedByStage.get(movement.stage) ?? 0) +
            movement.weightGrams,
        );
      }
    }

    const stages = (job.stages ?? []).map((stage) => ({
      ...stage,
      goldLoss: stageGoldLoss({
        goldInGrams: stage.goldInGrams,
        goldOutGrams: stage.goldOutGrams,
        scrapGrams: stage.scrapGrams,
        dustGrams: stage.dustGrams,
        returnedUnusedGrams: returnedUnusedByStage.get(stage.stage) ?? 0,
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
            returnedUnusedGrams: jobReturnedUnusedGrams,
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
      archived: job.status === "CANCELLED",
      readOnly: job.status === "CANCELLED",
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

  async getWorkshopAccount(shopId: string, workshopId: string) {
    const workshop = await this.prisma.karigarWorkshop.findFirst({
      where: { id: workshopId, shopId },
      include: {
        shop: { select: { currency: true } },
      },
    });
    if (!workshop) throw new NotFoundException("Karigar not found");

    const [financialEntries, movements, jobs] = await Promise.all([
      this.prisma.karigarFinancialEntry.findMany({
        where: { shopId, workshopId },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.karigarMetalMovement.findMany({
        where: { shopId, workshopId },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.karigarJob.findMany({
        where: { shopId, workshopId },
        select: { id: true, status: true, dueAt: true },
      }),
    ]);

    const shopCurrency = workshop.shop.currency ?? "NPR";
    for (const e of financialEntries) {
      if (e.currency !== shopCurrency) {
        throw new ConflictException(
          `Karigar account contains historical currency (${e.currency}) that differs from current shop currency (${shopCurrency}). Currency rebase must be migrated immutably.`,
        );
      }
    }

    const financialSummary = computeFinancialSummary(financialEntries);
    const metalBalances = computeMetalBalances(movements);

    const now = new Date();
    let openJobs = 0;
    let overdueJobs = 0;
    let cancelledJobs = 0;

    for (const j of jobs) {
      if (j.status === "CANCELLED") {
        cancelledJobs++;
      } else if (j.status === "Completed") {
        // completed
      } else {
        openJobs++;
        if (j.dueAt && new Date(j.dueAt) < now) {
          overdueJobs++;
        }
      }
    }

    return {
      workshop: {
        id: workshop.id,
        name: workshop.name,
        artisan: workshop.artisan,
        location: workshop.location,
        phone: workshop.phone,
        email: workshop.email,
        rating: workshop.rating,
        wageRatePerGram: workshop.wageRatePerGram,
        wastageLimit: workshop.wastageLimit,
        metalIssued: workshop.metalIssued,
        metalReturned: workshop.metalReturned,
        outstandingBalance: workshop.outstandingBalance,
        wageDue: financialSummary.amountPayable,
      },
      currency: workshop.shop.currency ?? "NPR",
      summary: financialSummary,
      ...financialSummary,
      metalBalances,
      openJobs,
      overdueJobs,
      cancelledJobs,
    };
  }

  async getWorkshopStatement(
    shopId: string,
    workshopId: string,
    query: KarigarStatementQueryDto = {},
  ) {
    const workshop = await this.prisma.karigarWorkshop.findFirst({
      where: { id: workshopId, shopId },
      include: {
        shop: { select: { shopName: true, currency: true } },
      },
    });
    if (!workshop) throw new NotFoundException("Karigar not found");

    let cursorTuple: { createdAt: Date; id: string } | null = null;
    if (query.cursor) {
      if (!query.cursor.startsWith("v1.")) {
        throw new BadRequestException("Invalid pagination cursor format");
      }
      try {
        const raw = query.cursor.slice(3);
        const decoded = Buffer.from(raw, "base64url").toString("utf-8");
        const parsed = JSON.parse(decoded);
        const dt = new Date(parsed.createdAt);
        if (
          !Number.isFinite(dt.getTime()) ||
          typeof parsed.id !== "string" ||
          !parsed.id
        ) {
          throw new Error("Invalid format");
        }
        cursorTuple = { createdAt: dt, id: parsed.id };
      } catch {
        throw new BadRequestException("Invalid pagination cursor");
      }
    }

    const cursorFilter = cursorTuple
      ? {
          OR: [
            { createdAt: { lt: cursorTuple.createdAt } },
            {
              createdAt: cursorTuple.createdAt,
              id: { lt: cursorTuple.id },
            },
          ],
        }
      : {};

    const limit = Math.min(250, Math.max(1, query.limit ?? 50));
    const dateFilter =
      query.from || query.to
        ? {
            ...(query.from ? { gte: new Date(query.from) } : {}),
            ...(query.to ? { lte: new Date(query.to) } : {}),
          }
        : undefined;

    const filter = (query.type ?? "ALL").toUpperCase();
    const queryMetal = filter === "ALL" || filter === "METAL";

    let financialTypeFilter:
      | Prisma.KarigarFinancialEntryWhereInput["type"]
      | undefined = undefined;
    let queryFinancial = true;
    if (filter === "ALL" || filter === "MONEY") {
      financialTypeFilter = undefined;
    } else if (filter === "WAGES" || filter === "WAGE") {
      financialTypeFilter = "WAGE_ACCRUAL";
    } else if (filter === "PAYMENTS" || filter === "PAYMENT") {
      financialTypeFilter = "SETTLEMENT_PAYMENT";
    } else if (filter === "ADVANCES" || filter === "ADVANCE") {
      financialTypeFilter = "ADVANCE_PAYMENT";
    } else if (filter === "ADJUSTMENTS" || filter === "ADJUSTMENT") {
      financialTypeFilter = {
        in: ["ADJUSTMENT_INCREASE", "ADJUSTMENT_DECREASE"],
      };
    } else if (filter === "METAL") {
      queryFinancial = false;
    } else {
      throw new BadRequestException(
        `Unknown statement filter type: ${query.type}`,
      );
    }

    const [movements, entries, jobs, totalMovementsCount, totalEntriesCount] =
      await Promise.all([
        queryMetal
          ? this.prisma.karigarMetalMovement.findMany({
              where: {
                shopId,
                workshopId,
                ...(dateFilter ? { createdAt: dateFilter } : {}),
                ...(query.jobId ? { jobId: query.jobId } : {}),
                ...cursorFilter,
              },
              include: {
                job: { select: { id: true, product: true } },
              },
              orderBy: [{ createdAt: "desc" }, { id: "desc" }],
              take: limit + 1,
            })
          : Promise.resolve([]),
        queryFinancial
          ? this.prisma.karigarFinancialEntry.findMany({
              where: {
                shopId,
                workshopId,
                ...(financialTypeFilter ? { type: financialTypeFilter } : {}),
                ...(dateFilter ? { createdAt: dateFilter } : {}),
                ...(query.jobId
                  ? {
                      OR: [
                        { jobId: query.jobId },
                        { allocations: { some: { jobId: query.jobId } } },
                      ],
                    }
                  : {}),
                ...cursorFilter,
              },
              include: {
                job: { select: { id: true, product: true } },
                allocations: {
                  include: { job: { select: { id: true, product: true } } },
                },
              },
              orderBy: [{ createdAt: "desc" }, { id: "desc" }],
              take: limit + 1,
            })
          : Promise.resolve([]),
        this.prisma.karigarJob.findMany({
          where: { shopId, workshopId },
          select: { id: true, product: true },
        }),
        queryMetal
          ? this.prisma.karigarMetalMovement.count({
              where: {
                shopId,
                workshopId,
                ...(dateFilter ? { createdAt: dateFilter } : {}),
                ...(query.jobId ? { jobId: query.jobId } : {}),
              },
            })
          : Promise.resolve(0),
        queryFinancial
          ? this.prisma.karigarFinancialEntry.count({
              where: {
                shopId,
                workshopId,
                ...(financialTypeFilter ? { type: financialTypeFilter } : {}),
                ...(dateFilter ? { createdAt: dateFilter } : {}),
                ...(query.jobId
                  ? {
                      OR: [
                        { jobId: query.jobId },
                        { allocations: { some: { jobId: query.jobId } } },
                      ],
                    }
                  : {}),
              },
            })
          : Promise.resolve(0),
      ]);

    const jobNameMap = new Map<string, string>();
    for (const j of jobs) jobNameMap.set(j.id, j.product);

    const metalEvents = movements.map((m) => ({
      id: m.id,
      kind: "METAL" as const,
      eventType: m.type,
      jobId: m.jobId,
      jobProduct:
        m.job?.product ?? (m.jobId ? jobNameMap.get(m.jobId) : null) ?? null,
      metalKey: m.metalKey,
      quantity: m.weightGrams,
      purity: m.purity,
      createdAt: m.createdAt.toISOString(),
      note: m.note,
      createdBy: m.createdBy,
    }));

    const moneyEvents = entries.map((e) => ({
      id: e.id,
      kind: "MONEY" as const,
      eventType: e.type,
      jobId: e.jobId,
      jobProduct:
        e.job?.product ?? (e.jobId ? jobNameMap.get(e.jobId) : null) ?? null,
      amount: Number(e.amount),
      currency: e.currency,
      paymentMethod: e.paymentMethod,
      reference: e.reference,
      createdAt: e.createdAt.toISOString(),
      note: e.note,
      createdBy: e.createdBy,
      allocations: (e.allocations ?? []).map((a) => ({
        id: a.id,
        jobId: a.jobId,
        jobProduct: a.job?.product ?? jobNameMap.get(a.jobId) ?? null,
        amount: Number(a.amount),
      })),
    }));

    const combined = [...metalEvents, ...moneyEvents];

    // Deterministic Sort: chronological descending by createdAt, secondary by id
    combined.sort((a, b) => {
      const timeDiff =
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (timeDiff !== 0) return timeDiff;
      return b.id.localeCompare(a.id);
    });

    const hasMore = combined.length > limit;
    const paginated = combined.slice(0, limit);
    let nextCursor: string | null = null;
    if (hasMore && paginated.length > 0) {
      const last = paginated[paginated.length - 1];
      const payload = JSON.stringify({
        createdAt: last.createdAt,
        id: last.id,
      });
      nextCursor = `v1.${Buffer.from(payload).toString("base64url")}`;
    }

    return {
      items: paginated,
      totalCount: totalMovementsCount + totalEntriesCount,
      nextCursor,
      shopName: workshop.shop?.shopName || workshop.name,
      currency: workshop.shop?.currency ?? "NPR",
    };
  }

  async recordPayment(
    shopId: string,
    workshopId: string,
    userId: string | undefined,
    dto: RecordKarigarPaymentDto,
  ) {
    const paymentAmount = roundMoney(dto.amount);
    if (paymentAmount <= 0) {
      throw new BadRequestException("Payment amount must be greater than zero");
    }
    if (!dto.idempotencyKey || !dto.idempotencyKey.trim()) {
      throw new BadRequestException(
        "idempotencyKey is required for payment mutation",
      );
    }
    const monetaryPreflight = await this.prepareKarigarMonetaryPreflight(
      shopId,
      workshopId,
      paymentAmount,
    );

    return this.prisma.$transaction(async (tx) => {
      // 1. Lock workshop row for strict concurrency serialization
      const lockedRows = await tx.$queryRaw<
        { id: string }[]
      >`SELECT "id" FROM "KarigarWorkshop" WHERE "id" = ${workshopId} AND "shopId" = ${shopId} FOR UPDATE`;
      if (!lockedRows || lockedRows.length === 0) {
        throw new NotFoundException("Karigar not found");
      }
      const lockedShop = await tx.shop.findUnique({
        where: { id: shopId },
        select: { currency: true },
      });
      if (!lockedShop) throw new NotFoundException("Shop not found");
      const shopCurrency = (lockedShop.currency ?? CurrencyCode.NPR) as CurrencyCode;
      this.assertPreparedShopCurrency(monetaryPreflight, shopCurrency);

      // 2. Compute canonical request intent fingerprint
      const allocationMode =
        dto.allocations && dto.allocations.length > 0
          ? "EXPLICIT"
          : "AUTO_FIFO";
      let requestedAllocations: { jobId: string; amount: number }[] = [];
      if (allocationMode === "EXPLICIT") {
        const allocMap = new Map<string, number>();
        for (const a of dto.allocations!) {
          if (a.amount <= 0) {
            throw new BadRequestException("Allocation amount must be positive");
          }
          allocMap.set(
            a.jobId,
            roundMoney((allocMap.get(a.jobId) ?? 0) + a.amount),
          );
        }
        requestedAllocations = Array.from(allocMap.entries())
          .map(([jobId, amount]) => ({ jobId, amount }))
          .sort((a, b) => a.jobId.localeCompare(b.jobId));
      }

      const fingerprint = computeSha256({
        workshopId,
        operation: "PAYMENT",
        amount: paymentAmount,
        paymentMethod: dto.paymentMethod ?? "CASH",
        reference: dto.reference?.trim() || null,
        note: dto.note?.trim() || null,
        allocationMode,
        allocations: requestedAllocations,
      });

      // 3. Check Idempotency with canonical SHA-256 fingerprint immediately
      const existing = await tx.karigarFinancialEntry.findUnique({
        where: {
          shopId_idempotencyKey: {
            shopId,
            idempotencyKey: dto.idempotencyKey!,
          },
        },
      });
      if (existing) {
        if (existing.requestFingerprint === fingerprint) {
          const allEntries = await tx.karigarFinancialEntry.findMany({
            where: { shopId, workshopId },
            select: { type: true, amount: true },
          });
          return {
            entry: { ...existing, amount: Number(existing.amount) },
            summary: computeFinancialSummary(allEntries),
          };
        }
        throw new ConflictException(
          "Idempotency key reused for a different payment payload",
        );
      }

      // 4. ONLY IF no existing record, resolve allocations
      const finalAllocations: { jobId: string; amount: number }[] = [];
      if (allocationMode === "EXPLICIT") {
        const jobIds = requestedAllocations.map((a) => a.jobId);
        const jobsFound = await tx.karigarJob.findMany({
          where: { id: { in: jobIds }, shopId, workshopId },
          select: { id: true, product: true },
        });
        if (jobsFound.length !== jobIds.length) {
          throw new BadRequestException(
            "One or more allocated jobs do not exist or belong to a different karigar",
          );
        }

        const [accruals, existingAllocs] = await Promise.all([
          tx.karigarFinancialEntry.findMany({
            where: { shopId, jobId: { in: jobIds }, type: "WAGE_ACCRUAL" },
            select: { jobId: true, amount: true },
          }),
          tx.karigarFinancialAllocation.findMany({
            where: { shopId, jobId: { in: jobIds } },
            select: { jobId: true, amount: true },
          }),
        ]);

        const accruedByJob = new Map<string, number>();
        for (const acc of accruals) {
          if (!acc.jobId) continue;
          accruedByJob.set(
            acc.jobId,
            roundMoney(
              (accruedByJob.get(acc.jobId) ?? 0) + Number(acc.amount),
            ),
          );
        }
        const allocatedByJob = new Map<string, number>();
        for (const al of existingAllocs) {
          allocatedByJob.set(
            al.jobId,
            roundMoney(
              (allocatedByJob.get(al.jobId) ?? 0) + Number(al.amount),
            ),
          );
        }

        let totalAlloc = 0;
        for (const req of requestedAllocations) {
          const accrued = accruedByJob.get(req.jobId) ?? 0;
          const alreadyAlloc = allocatedByJob.get(req.jobId) ?? 0;
          const outstanding = Math.max(0, roundMoney(accrued - alreadyAlloc));
          if (req.amount > outstanding + 0.0001) {
            const j = jobsFound.find((jf) => jf.id === req.jobId);
            throw new BadRequestException(
              `Allocation for job ${j?.product || req.jobId} (${req.amount}) exceeds outstanding wage (${outstanding})`,
            );
          }
          totalAlloc = roundMoney(totalAlloc + req.amount);
          finalAllocations.push({ jobId: req.jobId, amount: req.amount });
        }
        if (totalAlloc > paymentAmount + 0.0001) {
          throw new BadRequestException(
            `Total allocations (${totalAlloc}) cannot exceed payment amount (${paymentAmount})`,
          );
        }
      } else {
        // Automatic FIFO allocation against outstanding job wage accruals
        const [accrualEntries, existingAllocations] = await Promise.all([
          tx.karigarFinancialEntry.findMany({
            where: {
              shopId,
              workshopId,
              type: "WAGE_ACCRUAL",
              jobId: { not: null },
            },
            select: { jobId: true, amount: true, createdAt: true },
            orderBy: { createdAt: "asc" },
          }),
          tx.karigarFinancialAllocation.findMany({
            where: { shopId, job: { workshopId } },
            select: { jobId: true, amount: true },
          }),
        ]);

        const accruedByJob = new Map<string, number>();
        for (const ae of accrualEntries) {
          if (!ae.jobId) continue;
          accruedByJob.set(
            ae.jobId,
            roundMoney((accruedByJob.get(ae.jobId) ?? 0) + Number(ae.amount)),
          );
        }

        const allocatedByJob = new Map<string, number>();
        for (const ea of existingAllocations) {
          allocatedByJob.set(
            ea.jobId,
            roundMoney((allocatedByJob.get(ea.jobId) ?? 0) + Number(ea.amount)),
          );
        }

        let remainingToAllocate = paymentAmount;
        const seenJobs = new Set<string>();
        for (const ae of accrualEntries) {
          if (!ae.jobId || seenJobs.has(ae.jobId)) continue;
          seenJobs.add(ae.jobId);

          const accrued = accruedByJob.get(ae.jobId) ?? 0;
          const allocated = allocatedByJob.get(ae.jobId) ?? 0;
          const outstanding = roundMoney(Math.max(0, accrued - allocated));

          if (outstanding > 0 && remainingToAllocate > 0) {
            const allocAmt = roundMoney(
              Math.min(remainingToAllocate, outstanding),
            );
            if (allocAmt > 0) {
              finalAllocations.push({ jobId: ae.jobId, amount: allocAmt });
              remainingToAllocate = roundMoney(remainingToAllocate - allocAmt);
            }
          }
          if (remainingToAllocate <= 0) break;
        }
      }

      // 5. Workshop & Shop context
      const workshop = await tx.karigarWorkshop.findFirst({
        where: { id: workshopId, shopId },
      });
      if (!workshop) throw new NotFoundException("Karigar not found");

      // 6. Ensure opening balance is posted before settlement
      await this.ensureOpeningBalancePosted(
        tx,
        shopId,
        workshopId,
        monetaryPreflight.openingBalanceContexts,
      );

      // 7. Check current payable
      const existingEntries = await tx.karigarFinancialEntry.findMany({
        where: { shopId, workshopId },
        select: { type: true, amount: true },
      });
      const summary = computeFinancialSummary(existingEntries);
      const val = validatePaymentAmount(paymentAmount, summary.amountPayable);
      if (!val.valid) {
        throw new BadRequestException(val.reason);
      }

      // 7. Create Entry
      const entry = await tx.karigarFinancialEntry.create({
        data: {
          shopId,
          workshopId,
          type: "SETTLEMENT_PAYMENT",
          amount: new Prisma.Decimal(paymentAmount),
          currency: shopCurrency,
          paymentMethod: dto.paymentMethod ?? "CASH",
          reference: dto.reference?.slice(0, 120) ?? null,
          note: dto.note?.slice(0, 1000) ?? null,
          idempotencyKey: dto.idempotencyKey ?? null,
          requestFingerprint: fingerprint,
          createdBy: userId ?? null,
        },
      });

      // 8. Create Allocations
      if (finalAllocations.length > 0) {
        await tx.karigarFinancialAllocation.createMany({
          data: finalAllocations.map((a) => ({
            shopId,
            financialEntryId: entry.id,
            jobId: a.jobId,
            amount: new Prisma.Decimal(a.amount),
          })),
        });
      }

      // 9. Post to General Ledger
      await this.accounting.postKarigarSettlementPayment(tx, {
        ...monetaryPreflight.operationContext,
        shopId,
        financialEntryId: entry.id,
        workshopId: workshop.id,
        artisanName: workshop.artisan || workshop.name,
        method: dto.paymentMethod ?? "CASH",
        reference: dto.reference ?? null,
        transactionDate: entry.createdAt,
        actorUserId: userId,
      });

      // 10. Update workshop wageDue compatibility cache
      const updatedEntries = await tx.karigarFinancialEntry.findMany({
        where: { shopId, workshopId },
        select: { type: true, amount: true },
      });
      const updatedSummary = computeFinancialSummary(updatedEntries);
      await tx.karigarWorkshop.update({
        where: { id: workshopId },
        data: { wageDue: updatedSummary.amountPayable },
      });

      return {
        entry: {
          ...entry,
          amount: Number(entry.amount),
        },
        summary: updatedSummary,
      };
    });
  }

  async recordAdvance(
    shopId: string,
    workshopId: string,
    userId: string | undefined,
    dto: RecordKarigarAdvanceDto,
  ) {
    const advanceAmount = roundMoney(dto.amount);
    if (advanceAmount <= 0) {
      throw new BadRequestException("Advance amount must be greater than zero");
    }
    if (!dto.idempotencyKey || !dto.idempotencyKey.trim()) {
      throw new BadRequestException(
        "idempotencyKey is required for advance mutation",
      );
    }
    const monetaryPreflight = await this.prepareKarigarMonetaryPreflight(
      shopId,
      workshopId,
      advanceAmount,
    );

    return this.prisma.$transaction(async (tx) => {
      // 1. Lock workshop row
      const lockedRows = await tx.$queryRaw<
        { id: string }[]
      >`SELECT "id" FROM "KarigarWorkshop" WHERE "id" = ${workshopId} AND "shopId" = ${shopId} FOR UPDATE`;
      if (!lockedRows || lockedRows.length === 0) {
        throw new NotFoundException("Karigar not found");
      }
      const lockedShop = await tx.shop.findUnique({
        where: { id: shopId },
        select: { currency: true },
      });
      if (!lockedShop) throw new NotFoundException("Shop not found");
      const shopCurrency = (lockedShop.currency ?? CurrencyCode.NPR) as CurrencyCode;
      this.assertPreparedShopCurrency(monetaryPreflight, shopCurrency);

      // 2. Check Idempotency with fingerprint matching
      const fingerprint = computeSha256({
        workshopId,
        operation: "ADVANCE",
        amount: advanceAmount,
        paymentMethod: dto.paymentMethod ?? "CASH",
        reference: dto.reference?.trim() || null,
        note: dto.note?.trim() || null,
      });

      const existing = await tx.karigarFinancialEntry.findUnique({
        where: {
          shopId_idempotencyKey: {
            shopId,
            idempotencyKey: dto.idempotencyKey!,
          },
        },
      });
      if (existing) {
        if (existing.requestFingerprint === fingerprint) {
          const allEntries = await tx.karigarFinancialEntry.findMany({
            where: { shopId, workshopId },
            select: { type: true, amount: true },
          });
          return {
            entry: { ...existing, amount: Number(existing.amount) },
            summary: computeFinancialSummary(allEntries),
          };
        }
        throw new ConflictException(
          "Idempotency key reused for a different advance payload",
        );
      }

      const workshop = await tx.karigarWorkshop.findFirst({
        where: { id: workshopId, shopId },
      });
      if (!workshop) throw new NotFoundException("Karigar not found");

      // 3. Ensure opening balance is posted
      await this.ensureOpeningBalancePosted(
        tx,
        shopId,
        workshopId,
        monetaryPreflight.openingBalanceContexts,
      );

      // 4. Create Financial Entry
      const entry = await tx.karigarFinancialEntry.create({
        data: {
          shopId,
          workshopId,
          type: "ADVANCE_PAYMENT",
          amount: new Prisma.Decimal(advanceAmount),
          currency: shopCurrency,
          paymentMethod: dto.paymentMethod ?? "CASH",
          reference: dto.reference?.slice(0, 120) ?? null,
          note: dto.note?.slice(0, 1000) ?? null,
          idempotencyKey: dto.idempotencyKey ?? null,
          requestFingerprint: fingerprint,
          createdBy: userId ?? null,
        },
      });

      // 5. Post to General Ledger (Dr KARIGAR_ADVANCES, Cr CASH/BANK)
      await this.accounting.postKarigarAdvancePayment(tx, {
        ...monetaryPreflight.operationContext,
        shopId,
        financialEntryId: entry.id,
        workshopId: workshop.id,
        artisanName: workshop.artisan || workshop.name,
        method: dto.paymentMethod ?? "CASH",
        reference: dto.reference ?? null,
        transactionDate: entry.createdAt,
        actorUserId: userId,
      });

      // 6. Real Advance Application: Auto-apply newly recorded advance against outstanding unpaid job wages (FIFO)
      const accrualEntries = await tx.karigarFinancialEntry.findMany({
        where: {
          shopId,
          workshopId,
          type: "WAGE_ACCRUAL",
          jobId: { not: null },
        },
        include: { job: { select: { id: true, product: true } } },
        orderBy: { createdAt: "asc" },
      });
      const existingAllocations =
        await tx.karigarFinancialAllocation.findMany({
          where: { shopId, job: { workshopId } },
          select: { jobId: true, amount: true },
        });
      const allocatedByJob = new Map<string, number>();
      for (const ea of existingAllocations) {
        allocatedByJob.set(
          ea.jobId,
          roundMoney((allocatedByJob.get(ea.jobId) ?? 0) + Number(ea.amount)),
        );
      }
      const accruedByJob = new Map<string, number>();
      for (const ae of accrualEntries) {
        if (!ae.jobId) continue;
        accruedByJob.set(
          ae.jobId,
          roundMoney((accruedByJob.get(ae.jobId) ?? 0) + Number(ae.amount)),
        );
      }

      let advanceRemainingToAllocate = advanceAmount;
      const seenJobs = new Set<string>();
      for (const ae of accrualEntries) {
        if (
          !ae.jobId ||
          seenJobs.has(ae.jobId) ||
          advanceRemainingToAllocate <= 0
        )
          continue;
        seenJobs.add(ae.jobId);
        const accrued = accruedByJob.get(ae.jobId) ?? 0;
        const allocated = allocatedByJob.get(ae.jobId) ?? 0;
        const outstanding = roundMoney(Math.max(0, accrued - allocated));
        if (outstanding > 0) {
          const allocAmt = roundMoney(
            Math.min(advanceRemainingToAllocate, outstanding),
          );
          if (allocAmt > 0) {
            const alloc = await tx.karigarFinancialAllocation.create({
              data: {
                shopId,
                financialEntryId: entry.id,
                jobId: ae.jobId,
                amount: new Prisma.Decimal(allocAmt),
              },
            });
            const advMonetary = this.monetaryContextFromPreparedQuote(
              allocAmt,
              shopCurrency,
              monetaryPreflight.operationContext,
            );
            await this.accounting.postKarigarAdvanceApplication(tx, {
              ...advMonetary,
              shopId,
              financialEntryId: entry.id,
              allocationId: alloc.id,
              workshopId: workshop.id,
              artisanName: workshop.artisan || workshop.name,
              jobId: ae.jobId,
              productName: ae.job?.product ?? null,
              transactionDate: entry.createdAt,
              actorUserId: userId,
            });
            allocatedByJob.set(ae.jobId, roundMoney(allocated + allocAmt));
            advanceRemainingToAllocate = roundMoney(
              advanceRemainingToAllocate - allocAmt,
            );
          }
        }
      }

      // 7. Update workshop wageDue compatibility cache
      const updatedEntries = await tx.karigarFinancialEntry.findMany({
        where: { shopId, workshopId },
        select: { type: true, amount: true },
      });
      const updatedSummary = computeFinancialSummary(updatedEntries);
      await tx.karigarWorkshop.update({
        where: { id: workshopId },
        data: { wageDue: updatedSummary.amountPayable },
      });

      return {
        entry: {
          ...entry,
          amount: Number(entry.amount),
        },
        summary: updatedSummary,
      };
    });
  }

  async recordAdjustment(
    shopId: string,
    workshopId: string,
    userId: string | undefined,
    dto: RecordKarigarAdjustmentDto,
  ) {
    const adjAmount = roundMoney(dto.amount);
    if (adjAmount <= 0) {
      throw new BadRequestException(
        "Adjustment amount must be greater than zero",
      );
    }
    if (!dto.note || !dto.note.trim()) {
      throw new BadRequestException("Adjustment reason note is required");
    }
    if (!dto.idempotencyKey || !dto.idempotencyKey.trim()) {
      throw new BadRequestException(
        "idempotencyKey is required for adjustment mutation",
      );
    }
    if (
      dto.type !== "ADJUSTMENT_INCREASE" &&
      dto.type !== "ADJUSTMENT_DECREASE"
    ) {
      throw new BadRequestException(
        "Invalid adjustment type. Must be ADJUSTMENT_INCREASE or ADJUSTMENT_DECREASE.",
      );
    }
    const monetaryPreflight = await this.prepareKarigarMonetaryPreflight(
      shopId,
      workshopId,
      adjAmount,
    );

    return this.prisma.$transaction(async (tx) => {
      // 1. Lock workshop row
      const lockedRows = await tx.$queryRaw<
        { id: string }[]
      >`SELECT "id" FROM "KarigarWorkshop" WHERE "id" = ${workshopId} AND "shopId" = ${shopId} FOR UPDATE`;
      if (!lockedRows || lockedRows.length === 0) {
        throw new NotFoundException("Karigar not found");
      }
      const lockedShop = await tx.shop.findUnique({
        where: { id: shopId },
        select: { currency: true },
      });
      if (!lockedShop) throw new NotFoundException("Shop not found");
      const shopCurrency = (lockedShop.currency ?? CurrencyCode.NPR) as CurrencyCode;
      this.assertPreparedShopCurrency(monetaryPreflight, shopCurrency);

      // 2. Check Idempotency with fingerprint matching
      const fingerprint = computeSha256({
        workshopId,
        operation: dto.type,
        amount: adjAmount,
        note: dto.note.trim(),
      });

      const existing = await tx.karigarFinancialEntry.findUnique({
        where: {
          shopId_idempotencyKey: {
            shopId,
            idempotencyKey: dto.idempotencyKey!,
          },
        },
      });
      if (existing) {
        if (existing.requestFingerprint === fingerprint) {
          const allEntries = await tx.karigarFinancialEntry.findMany({
            where: { shopId, workshopId },
            select: { type: true, amount: true },
          });
          return {
            entry: { ...existing, amount: Number(existing.amount) },
            summary: computeFinancialSummary(allEntries),
          };
        }
        throw new ConflictException(
          "Idempotency key reused for a different adjustment payload",
        );
      }

      const workshop = await tx.karigarWorkshop.findFirst({
        where: { id: workshopId, shopId },
      });
      if (!workshop) throw new NotFoundException("Karigar not found");

      // 3. Ensure opening balance is posted
      await this.ensureOpeningBalancePosted(
        tx,
        shopId,
        workshopId,
        monetaryPreflight.openingBalanceContexts,
      );

      // 4. Validate adjustment decrease does not exceed current amount payable
      if (dto.type === "ADJUSTMENT_DECREASE") {
        const existingEntries = await tx.karigarFinancialEntry.findMany({
          where: { shopId, workshopId },
          select: { type: true, amount: true },
        });
        const currentSummary = computeFinancialSummary(existingEntries);
        if (adjAmount > currentSummary.amountPayable + 0.0001) {
          throw new BadRequestException(
            `Adjustment decrease (${adjAmount}) cannot exceed current payable (${currentSummary.amountPayable}). Use an advance or recovery workflow for karigar receivables.`,
          );
        }
      }

      const entry = await tx.karigarFinancialEntry.create({
        data: {
          shopId,
          workshopId,
          type: dto.type,
          amount: new Prisma.Decimal(adjAmount),
          currency: shopCurrency,
          note: dto.note.slice(0, 1000),
          idempotencyKey: dto.idempotencyKey ?? null,
          requestFingerprint: fingerprint,
          createdBy: userId ?? null,
        },
      });

      // 4. Post to General Ledger
      await this.accounting.postKarigarAdjustment(tx, {
        ...monetaryPreflight.operationContext,
        shopId,
        financialEntryId: entry.id,
        workshopId: workshop.id,
        artisanName: workshop.artisan || workshop.name,
        type: dto.type,
        note: dto.note,
        transactionDate: entry.createdAt,
        actorUserId: userId,
      });

      const updatedEntries = await tx.karigarFinancialEntry.findMany({
        where: { shopId, workshopId },
        select: { type: true, amount: true },
      });
      const updatedSummary = computeFinancialSummary(updatedEntries);
      await tx.karigarWorkshop.update({
        where: { id: workshopId },
        data: { wageDue: updatedSummary.amountPayable },
      });

      return {
        entry: {
          ...entry,
          amount: Number(entry.amount),
        },
        summary: updatedSummary,
      };
    });
  }

  async recordMetalReturn(
    shopId: string,
    workshopId: string,
    userId: string | undefined,
    dto: RecordKarigarMetalReturnDto,
  ) {
    if (dto.jobId) {
      const job = await this.requireJob(shopId, dto.jobId);
      if (job.workshopId && job.workshopId !== workshopId) {
        throw new BadRequestException(
          "Specified job belongs to a different karigar workshop",
        );
      }
    }

    return this.addMovement(shopId, dto.jobId ?? null, userId, {
      type: dto.type as KarigarMovementType,
      weightGrams: dto.weightGrams,
      metalKey: dto.metalKey,
      workshopId,
      note: dto.note,
      idempotencyKey: dto.idempotencyKey,
    });
  }

  async getJobCostSummary(shopId: string, jobId: string) {
    const job = await this.requireJob(shopId, jobId);
    const [shop, movements, accruals, allocations] = await Promise.all([
      this.prisma.shop.findUnique({
        where: { id: shopId },
        select: { currency: true },
      }),
      this.prisma.karigarMetalMovement.findMany({
        where: { shopId, jobId },
        orderBy: { createdAt: "asc" },
      }),
      this.prisma.karigarFinancialEntry.findMany({
        where: { shopId, jobId, type: "WAGE_ACCRUAL" },
        orderBy: { createdAt: "asc" },
      }),
      this.prisma.karigarFinancialAllocation.findMany({
        where: { shopId, jobId },
        include: {
          financialEntry: {
            select: {
              id: true,
              type: true,
              createdAt: true,
              paymentMethod: true,
              reference: true,
            },
          },
        },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    const metalBalances = computeMetalBalances(movements);
    const wageAccrued = accruals.reduce(
      (sum, e) => sum + Number(e.amount),
      0,
    );
    const advanceAllocated = allocations
      .filter((a) => a.financialEntry.type === "ADVANCE_PAYMENT")
      .reduce((sum, a) => sum + Number(a.amount), 0);
    const settlementAllocated = allocations
      .filter((a) => a.financialEntry.type === "SETTLEMENT_PAYMENT")
      .reduce((sum, a) => sum + Number(a.amount), 0);
    const totalCovered = roundMoney(advanceAllocated + settlementAllocated);
    const wageOutstanding = Math.max(
      0,
      roundMoney(wageAccrued - totalCovered),
    );

    return {
      jobId: job.id,
      product: job.product,
      artisan: job.artisan,
      workshopId: job.workshopId,
      status: job.status,
      currency: shop?.currency ?? "NPR",
      metalBalances,
      wageAccrued: roundMoney(wageAccrued),
      settlementAllocated: roundMoney(settlementAllocated),
      advanceAllocated: roundMoney(advanceAllocated),
      totalCovered,
      wageOutstanding: roundMoney(wageOutstanding),
      accruals: accruals.map((e) => ({
        id: e.id,
        amount: Number(e.amount),
        currency: e.currency,
        note: e.note,
        createdAt: e.createdAt.toISOString(),
        sourceMovementId: e.sourceMovementId,
      })),
      allocations: allocations.map((a) => ({
        id: a.id,
        financialEntryId: a.financialEntryId,
        amount: Number(a.amount),
        createdAt: a.createdAt.toISOString(),
        paymentMethod: a.financialEntry.paymentMethod,
        reference: a.financialEntry.reference,
      })),
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
      {
        issued: number;
        returned: number;
        finished: number;
        sprue: number;
        recoverable: number;
      }
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
      if (m.type === "RETURN_UNUSED") {
        row.returned += m.weightGrams;
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
      stageUnusedReturns?: Array<{
        type: KarigarMovementType;
        weightGrams: number;
        stage: KarigarStage | null;
      }>;
    }>,
    workshops: Array<{
      id: string;
      artisan: string;
      name: string;
      wastageLimit: number;
    }>,
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
      const recoverable = theirs.reduce(
        (s, j) => s + j.goldLoss.recoverable,
        0,
      );
      const returnedUnused = theirs.reduce(
        (s, j) => s + j.goldLoss.returnedUnused,
        0,
      );
      return {
        workshopId: w.id,
        name: w.name,
        artisan: w.artisan,
        goldLoss: computeGoldLoss({
          issuedGrams: issued,
          finishedGrams: finished,
          sprueButtonGrams: sprue,
          recoverableGrams: recoverable,
          returnedUnusedGrams: returnedUnused,
          allowedPercent: w.wastageLimit,
        }),
      };
    });
    return { jobs: jobRows, karigars: karigarRows, trees: treeRows };
  }
}
