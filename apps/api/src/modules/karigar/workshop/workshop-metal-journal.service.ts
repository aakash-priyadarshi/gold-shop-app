import { BadRequestException, Injectable } from "@nestjs/common";
import {
  Prisma,
  WorkshopMetalAccountKey,
  WorkshopMetalJournalReferenceType,
  WorkshopMetalJournalStatus,
  WorkshopScaleCaptureMethod,
} from "@prisma/client";
import { createHash, randomUUID } from "crypto";
import {
  WORKSHOP_GOLD_995_MATERIAL_KEY,
  WORKSHOP_GOLD_995_PURITY,
  assertBalancedMicrograms,
  assertPositiveQuantumGrams,
  gramsToMicrograms,
  microgramsToGrams,
} from "@gold-shop/shared";
import { PrismaService } from "../../../prisma/prisma.service";
import { DEFAULT_WORKSHOP_METAL_ACCOUNTS } from "./workshop-metal.types";

type DbClient = Prisma.TransactionClient | PrismaService;

export type WorkshopMetalLineInput = {
  accountKey: WorkshopMetalAccountKey;
  debitGrams?: string;
  creditGrams?: string;
  description?: string;
};

export type PostWorkshopMetalJournalInput = {
  shopId: string;
  referenceType: WorkshopMetalJournalReferenceType;
  referenceId: string;
  idempotencyKey: string;
  description: string;
  transactionDate: Date;
  weightGrams: string;
  materialKey?: string;
  jobId?: string | null;
  treeId?: string | null;
  weighingSessionId?: string | null;
  scaleReadingId?: string | null;
  actorUserId?: string | null;
  captureMethod?: WorkshopScaleCaptureMethod | null;
  metadata?: Prisma.InputJsonValue;
  reversalOfId?: string;
  lines: WorkshopMetalLineInput[];
};

@Injectable()
export class WorkshopMetalJournalService {
  constructor(private readonly prisma: PrismaService) {}

  grams(value: Prisma.Decimal.Value): Prisma.Decimal {
    try {
      const amount = new Prisma.Decimal(value);
      if (!amount.isFinite()) {
        throw new BadRequestException("Metal journal grams must be finite");
      }
      return new Prisma.Decimal(
        microgramsToGrams(gramsToMicrograms(amount.toFixed(6))),
      );
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      throw new BadRequestException(
        err instanceof Error ? err.message : "Invalid gram amount",
      );
    }
  }

  private accountId(shopId: string, key: WorkshopMetalAccountKey): string {
    const hash = createHash("md5").update(`${shopId}:workshop-metal:${key}`).digest("hex");
    return `wmacct_${hash.slice(0, 24)}`;
  }

  serializeGrams(value: Prisma.Decimal.Value): string {
    return this.grams(value).toFixed(6);
  }

  async ensureDefaultAccounts(
    client: DbClient,
    shopId: string,
  ): Promise<Map<WorkshopMetalAccountKey, string>> {
    const existing = await client.workshopMetalAccount.findMany({
      where: {
        shopId,
        systemKey: { in: DEFAULT_WORKSHOP_METAL_ACCOUNTS.map((a) => a.systemKey) },
      },
      select: { id: true, systemKey: true },
    });
    const byKey = new Map<WorkshopMetalAccountKey, string>();
    for (const account of existing) {
      byKey.set(account.systemKey, account.id);
    }
    const missing = DEFAULT_WORKSHOP_METAL_ACCOUNTS.filter(
      (account) => !byKey.has(account.systemKey),
    );
    if (missing.length === 0) {
      return byKey;
    }
    const created = await Promise.all(
      missing.map((account) =>
        client.workshopMetalAccount.upsert({
          where: {
            shopId_systemKey: { shopId, systemKey: account.systemKey },
          },
          update: {
            code: account.code,
            name: account.name,
            materialKey: account.materialKey,
            purity: new Prisma.Decimal(account.purity),
            isSystem: true,
            isActive: true,
          },
          create: {
            id: this.accountId(shopId, account.systemKey),
            shopId,
            code: account.code,
            name: account.name,
            systemKey: account.systemKey,
            materialKey: account.materialKey,
            purity: new Prisma.Decimal(account.purity),
            balanceGrams: new Prisma.Decimal(0),
            isSystem: true,
            isActive: true,
          },
        }),
      ),
    );
    for (const account of created) {
      byKey.set(account.systemKey, account.id);
    }
    return byKey;
  }

  async postEntry(
    tx: Prisma.TransactionClient,
    input: PostWorkshopMetalJournalInput,
  ): Promise<{ entry: any; idempotent: boolean }> {
    if (input.lines.length < 2) {
      throw new BadRequestException("A metal journal entry requires at least two lines");
    }
    if (!input.idempotencyKey.trim() || !input.referenceId.trim()) {
      throw new BadRequestException(
        "Metal journal reference and idempotency key are required",
      );
    }

    const existingByReference = await tx.workshopMetalJournal.findUnique({
      where: {
        shopId_referenceType_referenceId: {
          shopId: input.shopId,
          referenceType: input.referenceType,
          referenceId: input.referenceId,
        },
      },
      include: { lines: { include: { account: true } } },
    });
    if (existingByReference) {
      if (existingByReference.status !== WorkshopMetalJournalStatus.POSTED) {
        throw new BadRequestException(
          "A draft metal journal already exists for this source event",
        );
      }
      return { entry: existingByReference, idempotent: true };
    }

    const existingByKey = await tx.workshopMetalJournal.findUnique({
      where: {
        shopId_idempotencyKey: {
          shopId: input.shopId,
          idempotencyKey: input.idempotencyKey,
        },
      },
      include: { lines: { include: { account: true } } },
    });
    if (existingByKey) {
      if (
        existingByKey.referenceType !== input.referenceType ||
        existingByKey.referenceId !== input.referenceId
      ) {
        throw new BadRequestException(
          "Metal journal idempotency key is associated with another reference",
        );
      }
      if (existingByKey.status !== WorkshopMetalJournalStatus.POSTED) {
        throw new BadRequestException(
          "A draft metal journal already exists for this idempotency key",
        );
      }
      return { entry: existingByKey, idempotent: true };
    }

    if (input.scaleReadingId) {
      const existingByReading = await tx.workshopMetalJournal.findUnique({
        where: { scaleReadingId: input.scaleReadingId },
        include: { lines: { include: { account: true } } },
      });
      if (existingByReading) {
        return { entry: existingByReading, idempotent: true };
      }
    }

    const accounts = await this.ensureDefaultAccounts(tx, input.shopId);
    const materialKey = input.materialKey ?? WORKSHOP_GOLD_995_MATERIAL_KEY;
    const headerGrams = this.grams(input.weightGrams);
    if (headerGrams.lte(0)) {
      throw new BadRequestException("Metal journal weight must be positive");
    }
    try {
      assertPositiveQuantumGrams(headerGrams.toFixed(6), "GOLD");
    } catch (err) {
      throw new BadRequestException(
        err instanceof Error ? err.message : "Invalid Gold Scale weight",
      );
    }

    let debitTotal = new Prisma.Decimal(0);
    let creditTotal = new Prisma.Decimal(0);
    const signed: string[] = [];
    const lines = input.lines.map((line) => {
      const debit = this.grams(line.debitGrams || 0);
      const credit = this.grams(line.creditGrams || 0);
      if (!((debit.gt(0) && credit.isZero()) || (credit.gt(0) && debit.isZero()))) {
        throw new BadRequestException(
          "Every metal journal line must contain one positive debit or credit",
        );
      }
      const accountId = accounts.get(line.accountKey);
      if (!accountId) {
        throw new BadRequestException(`Missing metal account ${line.accountKey}`);
      }
      debitTotal = debitTotal.plus(debit);
      creditTotal = creditTotal.plus(credit);
      signed.push(debit.gt(0) ? debit.toFixed(6) : `-${credit.toFixed(6)}`);
      return {
        accountId,
        accountKey: line.accountKey,
        description: line.description || null,
        debitGrams: debit,
        creditGrams: credit,
      };
    });

    if (!debitTotal.eq(creditTotal) || !debitTotal.eq(headerGrams)) {
      throw new BadRequestException(
        "Metal journal debits and credits must balance to the header weight",
      );
    }
    try {
      assertBalancedMicrograms(signed);
    } catch (err) {
      throw new BadRequestException(
        err instanceof Error ? err.message : "Metal journal is not balanced",
      );
    }

    const locked = await tx.$queryRaw<
      { id: string; systemKey: WorkshopMetalAccountKey; balanceGrams: Prisma.Decimal }[]
    >`SELECT "id", "systemKey", "balanceGrams"
      FROM "WorkshopMetalAccount"
      WHERE "shopId" = ${input.shopId}
      FOR UPDATE`;
    const lockedByKey = new Map(locked.map((row) => [row.systemKey, row]));

    const nextBalances = new Map<WorkshopMetalAccountKey, Prisma.Decimal>();
    for (const line of lines) {
      const row = lockedByKey.get(line.accountKey);
      if (!row) {
        throw new BadRequestException(`Metal account ${line.accountKey} is not locked`);
      }
      const current = nextBalances.get(line.accountKey) ?? this.grams(row.balanceGrams);
      const equity = line.accountKey === WorkshopMetalAccountKey.OPENING_EQUITY;
      const next = equity
        ? current.plus(line.creditGrams).minus(line.debitGrams)
        : current.plus(line.debitGrams).minus(line.creditGrams);
      if (next.lt(0)) {
        throw new BadRequestException(
          `Insufficient ${line.accountKey} balance for this metal movement`,
        );
      }
      nextBalances.set(line.accountKey, next);
    }

    const id = randomUUID();
    const draft = await tx.workshopMetalJournal.create({
      data: {
        id,
        shopId: input.shopId,
        status: WorkshopMetalJournalStatus.DRAFT,
        entryNumber: `WMJ-${id.replace(/-/g, "").slice(0, 20).toUpperCase()}`,
        referenceType: input.referenceType,
        referenceId: input.referenceId,
        idempotencyKey: input.idempotencyKey,
        description: input.description,
        transactionDate: input.transactionDate,
        weightGrams: headerGrams,
        materialKey,
        jobId: input.jobId ?? null,
        treeId: input.treeId ?? null,
        weighingSessionId: input.weighingSessionId ?? null,
        scaleReadingId: input.scaleReadingId ?? null,
        actorUserId: input.actorUserId ?? null,
        captureMethod: input.captureMethod ?? null,
        reversalOfId: input.reversalOfId,
        metadata: input.metadata,
        lines: {
          create: lines.map((line) => ({
            accountId: line.accountId,
            description: line.description,
            debitGrams: line.debitGrams,
            creditGrams: line.creditGrams,
          })),
        },
      },
    });

    for (const [key, balance] of nextBalances) {
      await tx.workshopMetalAccount.update({
        where: { shopId_systemKey: { shopId: input.shopId, systemKey: key } },
        data: { balanceGrams: balance },
      });
    }

    const entry = await tx.workshopMetalJournal.update({
      where: { id: draft.id },
      data: { status: WorkshopMetalJournalStatus.POSTED },
      include: { lines: { include: { account: true } } },
    });
    return { entry, idempotent: false };
  }

  serializeEntry(entry: any, idempotent: boolean) {
    return {
      id: entry.id,
      entryNumber: entry.entryNumber,
      status: entry.status,
      referenceType: entry.referenceType,
      referenceId: entry.referenceId,
      idempotencyKey: entry.idempotencyKey,
      description: entry.description,
      weightGrams: this.serializeGrams(entry.weightGrams),
      materialKey: entry.materialKey,
      purity: WORKSHOP_GOLD_995_PURITY,
      jobId: entry.jobId,
      treeId: entry.treeId,
      weighingSessionId: entry.weighingSessionId,
      scaleReadingId: entry.scaleReadingId,
      actorUserId: entry.actorUserId,
      captureMethod: entry.captureMethod,
      reversalOfId: entry.reversalOfId,
      idempotent,
      postedAt: entry.postedAt,
      lines: (entry.lines ?? []).map((line: any) => ({
        id: line.id,
        accountId: line.accountId,
        accountKey: line.account?.systemKey,
        debitGrams: this.serializeGrams(line.debitGrams),
        creditGrams: this.serializeGrams(line.creditGrams),
        description: line.description,
      })),
    };
  }
}
