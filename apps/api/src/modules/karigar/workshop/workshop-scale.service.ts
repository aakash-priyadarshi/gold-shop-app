import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  Prisma,
  WorkshopLedgerVersion,
  WorkshopMetalAccountKey,
  WorkshopMetalJournalReferenceType,
  WorkshopScaleCaptureMethod,
  WorkshopScalePurpose,
  WorkshopWeighingSessionStatus,
} from "@prisma/client";
import { createHash } from "crypto";
import {
  GOLD_SCALE_QUANTUM_GRAMS,
  WORKSHOP_GOLD_995_MATERIAL_KEY,
  WORKSHOP_GOLD_995_PURITY,
  assertPositiveQuantumGrams,
  type NormalizedScaleReading,
} from "@gold-shop/shared";
import { PrismaService } from "../../../prisma/prisma.service";
import { WorkshopMetalJournalService } from "./workshop-metal-journal.service";
import { SCALE_PRECISION_GRAMS, SESSION_TTL_MS } from "./workshop-metal.types";
import {
  CaptureWeighingSessionDto,
  ConfirmWeighingSessionDto,
  CreateWeighingSessionDto,
} from "./dto/workshop-weighing.dto";

/** Accept a reading sampled immediately before session creation, but never stale/future data. */
const READING_CLOCK_SKEW_MS = 2 * 60 * 1000;

@Injectable()
export class WorkshopScaleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly metalJournal: WorkshopMetalJournalService,
  ) {}

  private simulatorAllowed(shopId: string): boolean {
    return (
      process.env.NODE_ENV === "development" ||
      process.env.NODE_ENV === "test" ||
      (process.env.WORKSHOP_SIMULATOR_SHOP_IDS ?? "")
        .split(",")
        .some((id) => id.trim() === shopId)
    );
  }

  private requireSimulatorAllowed(shopId: string): void {
    if (!this.simulatorAllowed(shopId)) {
      throw new ForbiddenException("Gold Scale simulator is not enabled for this shop");
    }
  }

  private isUniqueConstraint(error: unknown): boolean {
    return (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "P2002"
    );
  }

  private fingerprint(reading: {
    deviceId: string;
    weightGrams: string;
    stable: boolean;
    sequence?: number | null;
    rawFrame?: string | null;
  }): string {
    return createHash("sha256")
      .update(
        JSON.stringify({
          deviceId: reading.deviceId,
          weightGrams: reading.weightGrams,
          stable: reading.stable,
          sequence: reading.sequence ?? null,
          rawFrame: reading.rawFrame ?? null,
        }),
      )
      .digest("hex");
  }

  private serializeReading(reading: any) {
    return {
      id: reading.id,
      deviceId: reading.deviceId,
      sessionId: reading.sessionId,
      purpose: reading.purpose,
      weightGrams: this.metalJournal.serializeGrams(reading.weightGrams),
      unit: reading.unit,
      precisionGrams: this.metalJournal.serializeGrams(reading.precisionGrams),
      stable: reading.stable,
      sequence: reading.sequence,
      rawFrame: reading.rawFrame,
      readingAt: reading.readingAt,
      capturedAt: reading.capturedAt,
      captureMethod: reading.captureMethod,
      actorUserId: reading.actorUserId,
    };
  }

  private serializeSession(session: any) {
    return {
      id: session.id,
      status: session.status,
      treeId: session.treeId,
      jobId: session.jobId,
      materialKey: session.materialKey,
      requiredPurpose: session.requiredPurpose,
      captureMethod: session.captureMethod,
      deviceId: session.deviceId,
      actorUserId: session.actorUserId,
      expiresAt: session.expiresAt,
      reading: session.reading ? this.serializeReading(session.reading) : null,
    };
  }

  async requireTraceableShop(shopId: string) {
    const shop = await this.prisma.shop.findUnique({
      where: { id: shopId },
      select: { id: true, workshopMode: true, workshopLedgerVersion: true },
    });
    if (!shop) throw new NotFoundException("Shop not found");
    if (!shop.workshopMode) {
      throw new BadRequestException(
        "Gold 995 scale posting requires Workshop Mode to be enabled",
      );
    }
    if (shop.workshopLedgerVersion !== WorkshopLedgerVersion.TRACEABLE) {
      throw new BadRequestException(
        "Gold 995 scale posting requires TRACEABLE workshop ledger mode",
      );
    }
    return shop;
  }

  async listAccounts(shopId: string) {
    await this.requireTraceableShop(shopId);
    await this.prisma.$transaction((tx) =>
      this.metalJournal.ensureDefaultAccounts(tx, shopId),
    );
    const accounts = await this.prisma.workshopMetalAccount.findMany({
      where: { shopId },
      orderBy: { code: "asc" },
    });
    return {
      materialKey: WORKSHOP_GOLD_995_MATERIAL_KEY,
      purity: WORKSHOP_GOLD_995_PURITY,
      simulatorAllowed: this.simulatorAllowed(shopId),
      note: "Gold 995 is not goldGrains24k / 24K 0.999 vault gold",
      accounts: accounts.map((account) => ({
        id: account.id,
        code: account.code,
        name: account.name,
        systemKey: account.systemKey,
        materialKey: account.materialKey,
        purity: this.metalJournal.serializeGrams(account.purity),
        balanceGrams: this.metalJournal.serializeGrams(account.balanceGrams),
      })),
    };
  }

  async ensureGoldSimulatorDevice(shopId: string) {
    await this.requireTraceableShop(shopId);
    this.requireSimulatorAllowed(shopId);
    const name = "Gold Scale simulator";
    const device = await this.prisma.workshopScaleDevice.upsert({
      where: { shopId_name: { shopId, name } },
      update: {
        purpose: WorkshopScalePurpose.GOLD,
        adapterKind: "SIMULATOR",
        precisionGrams: new Prisma.Decimal(GOLD_SCALE_QUANTUM_GRAMS),
        isActive: true,
      },
      create: {
        shopId,
        name,
        purpose: WorkshopScalePurpose.GOLD,
        adapterKind: "SIMULATOR",
        precisionGrams: new Prisma.Decimal(GOLD_SCALE_QUANTUM_GRAMS),
      },
    });
    return {
      id: device.id,
      name: device.name,
      purpose: device.purpose,
      adapterKind: device.adapterKind,
      precisionGrams: GOLD_SCALE_QUANTUM_GRAMS,
    };
  }

  async createSession(
    shopId: string,
    userId: string | undefined,
    dto: CreateWeighingSessionDto,
  ) {
    await this.requireTraceableShop(shopId);
    return this.prisma.$transaction(async (tx) => {
      // Serialize first use of a legacy tree with legacy metal movements.
      const locked = await tx.$queryRaw<{ id: string }[]>`
        SELECT "id" FROM "KarigarCastingTree"
        WHERE "id" = ${dto.treeId} AND "shopId" = ${shopId}
        FOR UPDATE`;
      if (!locked.length) throw new NotFoundException("Casting tree not found");
      const tree = await tx.karigarCastingTree.findFirst({
        where: { id: dto.treeId, shopId },
        include: {
          job: { select: { id: true, status: true } },
          movements: { select: { id: true }, take: 1 },
          workshopMetalJournals: { select: { id: true }, take: 1 },
        },
      });
      if (!tree) throw new NotFoundException("Casting tree not found");
      if (dto.jobId && dto.jobId !== tree.jobId) {
        throw new BadRequestException("Job does not own this casting tree");
      }
      if (tree.job.status === "CANCELLED") {
        throw new BadRequestException(
          "Cancelled jobs are archived and cannot resume production",
        );
      }
      const hasLegacyHistory =
        (tree.movements?.length ?? 0) > 0 ||
        (new Prisma.Decimal(tree.issuedGrams || 0).gt(0) &&
          (tree.workshopMetalJournals?.length ?? 0) === 0);
      if (
        hasLegacyHistory ||
        (tree.metalKey !== WORKSHOP_GOLD_995_MATERIAL_KEY &&
          (tree.workshopMetalJournals?.length ?? 0) > 0)
      ) {
        throw new BadRequestException(
          "A tree with legacy metal history cannot be switched to the Gold 995 traceable journal",
        );
      }

      const device = await tx.workshopScaleDevice.findFirst({
        where: { id: dto.deviceId, shopId, isActive: true },
      });
      if (!device) throw new NotFoundException("Scale device not found");
      if (device.purpose !== WorkshopScalePurpose.GOLD) {
        throw new BadRequestException("This session requires a Gold Scale");
      }
      if (
        !new Prisma.Decimal(device.precisionGrams).eq(
          new Prisma.Decimal(GOLD_SCALE_QUANTUM_GRAMS),
        )
      ) {
        throw new BadRequestException(
          "Gold Scale device must be configured with 0.01 g precision",
        );
      }
      const captureMethod =
        device.adapterKind === "SIMULATOR"
          ? WorkshopScaleCaptureMethod.SIMULATOR
          : WorkshopScaleCaptureMethod.DEVICE;
      if (captureMethod === WorkshopScaleCaptureMethod.SIMULATOR) {
        this.requireSimulatorAllowed(shopId);
      }

      if (tree.metalKey !== WORKSHOP_GOLD_995_MATERIAL_KEY) {
        await tx.karigarCastingTree.update({
          where: { id: tree.id },
          data: { metalKey: WORKSHOP_GOLD_995_MATERIAL_KEY, purity: "995" },
        });
      }
      const session = await tx.workshopWeighingSession.create({
        data: {
          shopId,
          deviceId: device.id,
          jobId: tree.jobId,
          treeId: tree.id,
          materialKey: WORKSHOP_GOLD_995_MATERIAL_KEY,
          requiredPurpose: WorkshopScalePurpose.GOLD,
          status: WorkshopWeighingSessionStatus.OPEN,
          captureMethod,
          actorUserId: userId ?? null,
          expiresAt: new Date(Date.now() + SESSION_TTL_MS),
        },
        include: { reading: true },
      });
      return this.serializeSession(session);
    });
  }

  async capture(
    shopId: string,
    userId: string | undefined,
    sessionId: string,
    dto: CaptureWeighingSessionDto,
  ) {
    await this.requireTraceableShop(shopId);
    const readingAt = dto.reading.readingAt
      ? new Date(dto.reading.readingAt)
      : new Date();
    if (Number.isNaN(readingAt.getTime())) {
      throw new BadRequestException("Invalid reading timestamp");
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const lockedRows = await tx.$queryRaw<{ id: string }[]>`
        SELECT "id" FROM "WorkshopWeighingSession"
        WHERE "id" = ${sessionId} AND "shopId" = ${shopId}
        FOR UPDATE`;
      if (!lockedRows.length) {
        throw new NotFoundException("Weighing session not found");
      }

      const session = await tx.workshopWeighingSession.findFirst({
        where: { id: sessionId, shopId },
        include: { reading: true, tree: true },
      });
      if (!session) throw new NotFoundException("Weighing session not found");
      if (session.status === WorkshopWeighingSessionStatus.POSTED) {
        throw new ConflictException("Weighing session already posted");
      }
      if (session.status === WorkshopWeighingSessionStatus.CANCELLED) {
        throw new BadRequestException("Weighing session is cancelled");
      }
      if (session.status === WorkshopWeighingSessionStatus.EXPIRED) {
        throw new BadRequestException("Weighing session expired");
      }
      if (session.expiresAt.getTime() < Date.now()) {
        await tx.workshopWeighingSession.update({
          where: { id: session.id },
          data: { status: WorkshopWeighingSessionStatus.EXPIRED },
        });
        return { expired: true as const };
      }

      const device = await tx.workshopScaleDevice.findFirst({
        where: { id: dto.deviceId, shopId, isActive: true },
      });
      if (!device) throw new NotFoundException("Scale device not found");
      if (
        device.adapterKind === "SIMULATOR" ||
        session.captureMethod === WorkshopScaleCaptureMethod.SIMULATOR
      ) {
        this.requireSimulatorAllowed(shopId);
      }
      if (session.deviceId !== device.id) {
        throw new BadRequestException(
          "Scale device does not match the device bound to this weighing session",
        );
      }
      if (device.purpose !== session.requiredPurpose) {
        throw new BadRequestException(
          `Scale purpose ${device.purpose} does not match required ${session.requiredPurpose}`,
        );
      }
      if (device.purpose !== WorkshopScalePurpose.GOLD) {
        throw new BadRequestException("This slice only accepts Gold Scale readings");
      }
      if (
        !new Prisma.Decimal(device.precisionGrams).eq(
          new Prisma.Decimal(GOLD_SCALE_QUANTUM_GRAMS),
        )
      ) {
        throw new BadRequestException(
          "Gold Scale device must be configured with 0.01 g precision",
        );
      }

      const sessionCreatedAt =
        session.createdAt instanceof Date
          ? session.createdAt.getTime()
          : readingAt.getTime();
      if (
        readingAt.getTime() < sessionCreatedAt - READING_CLOCK_SKEW_MS ||
        readingAt.getTime() > Date.now() + READING_CLOCK_SKEW_MS
      ) {
        throw new BadRequestException(
          "Scale reading timestamp is outside the allowed capture window",
        );
      }

      if (dto.reading.stable !== true) {
        throw new BadRequestException("Scale reading is not stable");
      }
      if (dto.reading.unit !== "g") {
        throw new BadRequestException("Workshop scale readings must be in grams");
      }
      try {
        assertPositiveQuantumGrams(dto.reading.weightGrams, "GOLD");
      } catch (err) {
        throw new BadRequestException(
          err instanceof Error ? err.message : "Invalid Gold Scale weight",
        );
      }

      const normalized: NormalizedScaleReading = {
        purpose: "GOLD",
        weightGrams: dto.reading.weightGrams,
        unit: "g",
        precisionGrams: SCALE_PRECISION_GRAMS.GOLD,
        stable: true,
        sequence: dto.reading.sequence,
        rawFrame: dto.reading.rawFrame ?? "",
        readingAt: readingAt.toISOString(),
        adapterKind: device.adapterKind as NormalizedScaleReading["adapterKind"],
      };

      const fp = this.fingerprint({
        deviceId: device.id,
        weightGrams: this.metalJournal.serializeGrams(normalized.weightGrams),
        stable: true,
        sequence: normalized.sequence,
        rawFrame: normalized.rawFrame || null,
      });

      if (session.reading) {
        const existingFp = this.fingerprint({
          deviceId: session.reading.deviceId,
          weightGrams: this.metalJournal.serializeGrams(session.reading.weightGrams),
          stable: session.reading.stable,
          sequence: session.reading.sequence,
          rawFrame: session.reading.rawFrame,
        });
        if (existingFp === fp) {
          return {
            session: this.serializeSession({ ...session, reading: session.reading }),
            reading: this.serializeReading(session.reading),
            idempotent: true,
          };
        }
        throw new ConflictException(
          "Weighing session already has a different captured reading",
        );
      }

      const captureMethod =
        device.adapterKind === "SIMULATOR"
          ? WorkshopScaleCaptureMethod.SIMULATOR
          : WorkshopScaleCaptureMethod.DEVICE;
      let stored: any;
      try {
        stored = await tx.workshopScaleReading.create({
          data: {
            shopId,
            deviceId: device.id,
            sessionId: session.id,
            purpose: WorkshopScalePurpose.GOLD,
            weightGrams: this.metalJournal.grams(normalized.weightGrams),
            unit: "g",
            precisionGrams: this.metalJournal.grams(GOLD_SCALE_QUANTUM_GRAMS),
            stable: true,
            sequence: normalized.sequence,
            rawFrame: normalized.rawFrame || null,
            readingAt,
            captureMethod,
            actorUserId: userId ?? null,
          },
        });
      } catch (error) {
        if (this.isUniqueConstraint(error)) {
          throw new ConflictException(
            "This scale reading sequence has already been captured for the device",
          );
        }
        throw error;
      }
      const updated = await tx.workshopWeighingSession.update({
        where: { id: session.id },
        data: {
          status: WorkshopWeighingSessionStatus.STABLE_CAPTURED,
          deviceId: device.id,
          captureMethod,
          actorUserId: userId ?? session.actorUserId,
        },
        include: { reading: true },
      });
      return {
        session: this.serializeSession(updated),
        reading: this.serializeReading(stored),
        idempotent: false,
      };
    });
    if ("expired" in result) {
      throw new BadRequestException("Weighing session expired");
    }
    return result;
  }

  async confirm(
    shopId: string,
    userId: string | undefined,
    sessionId: string,
    dto: ConfirmWeighingSessionDto,
  ) {
    await this.requireTraceableShop(shopId);
    if ("weightGrams" in (dto as object)) {
      throw new BadRequestException("Confirm must not include a weight field");
    }
    const idempotencyKey =
      dto.idempotencyKey?.trim() || `workshop-gold995-issue:${dto.readingId}`;

    const result = await this.prisma.$transaction(async (tx) => {
      const lockedRows = await tx.$queryRaw<{ id: string }[]>`
        SELECT "id" FROM "WorkshopWeighingSession"
        WHERE "id" = ${sessionId} AND "shopId" = ${shopId}
        FOR UPDATE`;
      if (!lockedRows.length) {
        throw new NotFoundException("Weighing session not found");
      }
      const session = await tx.workshopWeighingSession.findFirst({
        where: { id: sessionId, shopId },
        include: { reading: true, tree: true, journal: { include: { lines: { include: { account: true } } } } },
      });
      if (!session) throw new NotFoundException("Weighing session not found");
      if (session.status === WorkshopWeighingSessionStatus.CANCELLED) {
        throw new BadRequestException("Weighing session is cancelled");
      }
      if (session.status === WorkshopWeighingSessionStatus.EXPIRED) {
        throw new BadRequestException("Weighing session expired");
      }
      if (
        session.expiresAt.getTime() < Date.now() &&
        session.status !== WorkshopWeighingSessionStatus.POSTED
      ) {
        await tx.workshopWeighingSession.update({
          where: { id: session.id },
          data: { status: WorkshopWeighingSessionStatus.EXPIRED },
        });
        return { expired: true as const };
      }
      if (
        session.status !== WorkshopWeighingSessionStatus.STABLE_CAPTURED &&
        session.status !== WorkshopWeighingSessionStatus.POSTED
      ) {
        throw new BadRequestException(
          "Capture a stable scale reading before confirming",
        );
      }
      if (!session.reading) {
        throw new BadRequestException("Capture a stable scale reading before confirming");
      }
      if (session.reading.id !== dto.readingId) {
        throw new BadRequestException("readingId does not belong to this weighing session");
      }
      if (session.reading.stable !== true) {
        throw new BadRequestException("Scale reading is not stable");
      }
      if (
        session.reading.purpose !== WorkshopScalePurpose.GOLD ||
        session.reading.unit !== "g" ||
        !new Prisma.Decimal(session.reading.precisionGrams).eq(
          new Prisma.Decimal(GOLD_SCALE_QUANTUM_GRAMS),
        ) ||
        session.reading.deviceId !== session.deviceId ||
        session.reading.captureMethod !== session.captureMethod ||
        session.reading.sequence < 1
      ) {
        throw new BadRequestException(
          "Captured reading no longer satisfies the Gold Scale session requirements",
        );
      }
      try {
        assertPositiveQuantumGrams(
          this.metalJournal.serializeGrams(session.reading.weightGrams),
          "GOLD",
        );
      } catch (error) {
        throw new BadRequestException(
          error instanceof Error ? error.message : "Invalid captured Gold Scale reading",
        );
      }
      if (session.journal) {
        if (session.status !== WorkshopWeighingSessionStatus.POSTED) {
          await tx.workshopWeighingSession.update({
            where: { id: session.id },
            data: { status: WorkshopWeighingSessionStatus.POSTED },
          });
        }
        return {
          entry: session.journal,
          idempotent: true,
          treeIssuedGrams: session.tree.issuedGrams,
        };
      }

      if (
        session.captureMethod === WorkshopScaleCaptureMethod.SIMULATOR ||
        session.reading.captureMethod === WorkshopScaleCaptureMethod.SIMULATOR
      ) {
        this.requireSimulatorAllowed(shopId);
      }

      const weight = this.metalJournal.serializeGrams(session.reading.weightGrams);
      const posted = await this.metalJournal.postEntry(tx, {
        shopId,
        referenceType: WorkshopMetalJournalReferenceType.GOLD995_ISSUE_TO_TREE,
        referenceId: session.reading.id,
        idempotencyKey,
        description: `Gold 995 issue ${weight} g to tree ${session.tree.label}`,
        transactionDate: new Date(),
        weightGrams: weight,
        materialKey: WORKSHOP_GOLD_995_MATERIAL_KEY,
        jobId: session.jobId,
        treeId: session.treeId,
        weighingSessionId: session.id,
        scaleReadingId: session.reading.id,
        actorUserId: userId ?? session.actorUserId,
        captureMethod: session.reading.captureMethod,
        metadata: {
          deviceId: session.reading.deviceId,
          scalePurpose: session.reading.purpose,
          sequence: session.reading.sequence,
          rawFrame: session.reading.rawFrame,
        },
        lines: [
          {
            accountKey: WorkshopMetalAccountKey.CASTING_TREE_WIP,
            debitGrams: weight,
            description: "Casting tree WIP",
          },
          {
            accountKey: WorkshopMetalAccountKey.GOLD995_VAULT,
            creditGrams: weight,
            description: "Gold 995 vault issue",
          },
        ],
      });

      const treeLock = await tx.$queryRaw<{ id: string; issuedGrams: number }[]>`
        SELECT "id", "issuedGrams" FROM "KarigarCastingTree"
        WHERE "id" = ${session.treeId} AND "shopId" = ${shopId}
        FOR UPDATE`;
      if (!treeLock.length) {
        throw new NotFoundException("Casting tree not found");
      }
      const nextIssued = new Prisma.Decimal(treeLock[0].issuedGrams || 0).plus(
        this.metalJournal.grams(weight),
      );
      if (!posted.idempotent) {
        await tx.karigarCastingTree.update({
          where: { id: session.treeId },
          data: {
            issuedGrams: nextIssued.toNumber(),
            metalKey: WORKSHOP_GOLD_995_MATERIAL_KEY,
            purity: "995",
          },
        });
      }
      await tx.workshopWeighingSession.update({
        where: { id: session.id },
        data: { status: WorkshopWeighingSessionStatus.POSTED },
      });

      return {
        entry: posted.entry,
        idempotent: posted.idempotent,
        treeIssuedGrams: posted.idempotent
          ? treeLock[0].issuedGrams
          : nextIssued.toNumber(),
      };
    });

    if ("expired" in result) {
      throw new BadRequestException("Weighing session expired");
    }
    return {
      journal: this.metalJournal.serializeEntry(result.entry, result.idempotent),
      treeIssuedGrams: result.treeIssuedGrams,
      dualWrittenToKarigarMetalMovement: false,
    };
  }

  async getSession(shopId: string, sessionId: string) {
    await this.requireTraceableShop(shopId);
    const session = await this.prisma.workshopWeighingSession.findFirst({
      where: { id: sessionId, shopId },
      include: { reading: true },
    });
    if (!session) throw new NotFoundException("Weighing session not found");
    return this.serializeSession(session);
  }
}
