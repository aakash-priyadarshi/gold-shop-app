import { BadRequestException, Injectable } from "@nestjs/common";
import {
  Prisma,
  WorkshopMetalAccountKey,
  WorkshopMetalJournalReferenceType,
  WorkshopMetalJournalStatus,
  WorkshopScaleCaptureMethod,
  WorkshopScalePurpose,
  WorkshopAccountBucket,
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
  accountKey?: WorkshopMetalAccountKey;
  accountId?: string;
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
  replacementForId?: string;
  processRunId?: string | null;
  transferId?: string | null;
  recoveryContainerId?: string | null;
  recoveryEventId?: string | null;
  batchChildId?: string | null;
  scalePurpose?: WorkshopScalePurpose;
  /** Only for a supervisor classification derived from already-posted account balance. */
  derivedClassification?: boolean;
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
      if (amount.abs().gte("100000000000000")) {
        throw new BadRequestException("Metal journal grams exceed Decimal(20,6) capacity");
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
    const hash = createHash("sha256").update(`${shopId}:workshop-metal:${key}`).digest("hex");
    return `wmacct_${hash.slice(0, 24)}`;
  }

  serializeGrams(value: Prisma.Decimal.Value): string {
    return this.grams(value).toFixed(6);
  }

  private matchesReplay(entry: any, input: PostWorkshopMetalJournalInput): boolean {
    const signature = (line: WorkshopMetalLineInput) =>
      `${line.accountId ?? line.accountKey}:${this.serializeGrams(line.debitGrams || 0)}:${this.serializeGrams(line.creditGrams || 0)}`;
    const persisted = (entry.lines ?? []).map((line: any) => signature({
      accountId: line.account?.systemKey ? undefined : line.accountId,
      accountKey: line.account?.systemKey ?? undefined,
      debitGrams: line.debitGrams,
      creditGrams: line.creditGrams,
    })).sort();
    return entry.status === WorkshopMetalJournalStatus.POSTED &&
      entry.shopId === input.shopId &&
      entry.referenceType === input.referenceType &&
      entry.referenceId === input.referenceId &&
      entry.idempotencyKey === input.idempotencyKey &&
      entry.materialKey === (input.materialKey ?? WORKSHOP_GOLD_995_MATERIAL_KEY) &&
      entry.weightGrams.toFixed(6) === this.serializeGrams(input.weightGrams) &&
      entry.scaleReadingId === (input.scaleReadingId ?? null) &&
      entry.treeId === (input.treeId ?? null) &&
      entry.processRunId === (input.processRunId ?? null) &&
      entry.transferId === (input.transferId ?? null) &&
      entry.reversalOfId === (input.reversalOfId ?? null) &&
      entry.replacementForId === (input.replacementForId ?? null) &&
      JSON.stringify(persisted) === JSON.stringify(input.lines.map(signature).sort());
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
      if (account.systemKey) byKey.set(account.systemKey, account.id);
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
            bucket: account.systemKey === WorkshopMetalAccountKey.GOLD995_VAULT
              ? WorkshopAccountBucket.VAULT
              : account.systemKey === WorkshopMetalAccountKey.OPENING_EQUITY
                ? WorkshopAccountBucket.OPENING_EQUITY
                : WorkshopAccountBucket.WIP,
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
            bucket: account.systemKey === WorkshopMetalAccountKey.GOLD995_VAULT
              ? WorkshopAccountBucket.VAULT
              : account.systemKey === WorkshopMetalAccountKey.OPENING_EQUITY
                ? WorkshopAccountBucket.OPENING_EQUITY
                : WorkshopAccountBucket.WIP,
            scopeId: "",
            balanceGrams: new Prisma.Decimal(0),
            isSystem: true,
            isActive: true,
          },
        }),
      ),
    );
    for (const account of created) {
      if (account.systemKey) byKey.set(account.systemKey, account.id);
    }
    return byKey;
  }

  async ensureAccount(
    tx: Prisma.TransactionClient,
    shopId: string,
    materialKey: string,
    bucket: WorkshopAccountBucket,
    scopeId = "",
  ) {
    if (!materialKey.trim() || scopeId.length > 100) {
      throw new BadRequestException("Invalid workshop account identity");
    }
    const material = await tx.workshopMaterial.findUnique({
      where: { shopId_key: { shopId, key: materialKey } },
    });
    const resolvedMaterial = material ?? (materialKey === WORKSHOP_GOLD_995_MATERIAL_KEY
      ? await tx.workshopMaterial.upsert({
        where: { shopId_key: { shopId, key: materialKey } }, update: {},
        create: { shopId, key: materialKey, name: "Gold 995", kind: "GOLD", scalePurpose: "GOLD", theoreticalPurity: new Prisma.Decimal(WORKSHOP_GOLD_995_PURITY) },
      })
      : null);
    if (!resolvedMaterial?.isActive) throw new BadRequestException("Workshop material is not active");
    const hash = createHash("sha256")
      .update(`${shopId}:${materialKey}:${bucket}:${scopeId}`)
      .digest("hex");
    return tx.workshopMetalAccount.upsert({
      where: { shopId_materialKey_bucket_scopeId: { shopId, materialKey, bucket, scopeId } },
      update: {},
      create: {
        id: `wmacct_${hash.slice(0, 24)}`,
        shopId,
        code: `W${hash.slice(0, 23)}`,
        name: `${resolvedMaterial.name} · ${bucket}${scopeId ? ` · ${scopeId}` : ""}`,
        materialKey,
        purity: resolvedMaterial.theoreticalPurity,
        bucket,
        scopeId,
        balanceGrams: new Prisma.Decimal(0),
        isSystem: true,
      },
    });
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
      if (!this.matchesReplay(existingByReference, input)) throw new BadRequestException("Source reference was already posted with different movement details");
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
      if (!this.matchesReplay(existingByKey, input)) throw new BadRequestException("Metal journal idempotency key is associated with different movement details");
      return { entry: existingByKey, idempotent: true };
    }

    if (input.scaleReadingId) {
      const existingByReading = await tx.workshopMetalJournal.findUnique({
        where: { scaleReadingId: input.scaleReadingId },
        include: { lines: { include: { account: true } } },
      });
      if (existingByReading) {
        if (this.matchesReplay(existingByReading, input)) {
          return { entry: existingByReading, idempotent: true };
        }
        throw new BadRequestException("Scale reading has already been used for another movement");
      }
    }

    const accounts = input.lines.some((line) => line.accountKey)
      ? await this.ensureDefaultAccounts(tx, input.shopId)
      : new Map<WorkshopMetalAccountKey, string>();
    const dynamicIds = input.lines.flatMap((line) => line.accountId ? [line.accountId] : []);
    const dynamicAccounts = dynamicIds.length
      ? await tx.workshopMetalAccount.findMany({ where: { shopId: input.shopId, id: { in: dynamicIds }, isActive: true } })
      : [];
    const dynamicById = new Map(dynamicAccounts.map((account) => [account.id, account]));
    const materialKey = input.materialKey ?? WORKSHOP_GOLD_995_MATERIAL_KEY;
    const headerGrams = this.grams(input.weightGrams);
    if (headerGrams.lte(0)) {
      throw new BadRequestException("Metal journal weight must be positive");
    }
    if (!input.derivedClassification) {
      try {
        assertPositiveQuantumGrams(headerGrams.toFixed(6), input.scalePurpose ?? "GOLD");
      } catch (err) {
        throw new BadRequestException(
          err instanceof Error ? err.message : "Invalid scale weight",
        );
      }
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
      const accountId = line.accountKey ? accounts.get(line.accountKey) : line.accountId;
      if (!accountId) {
        throw new BadRequestException("Missing workshop material account");
      }
      if (line.accountId && !dynamicById.has(line.accountId)) {
        throw new BadRequestException("Workshop material account is not active in this shop");
      }
      debitTotal = debitTotal.plus(debit);
      creditTotal = creditTotal.plus(credit);
      signed.push(debit.gt(0) ? debit.toFixed(6) : `-${credit.toFixed(6)}`);
      return {
        accountId,
        accountKey: line.accountKey,
        bucket: line.accountKey === WorkshopMetalAccountKey.OPENING_EQUITY
          ? WorkshopAccountBucket.OPENING_EQUITY
          : dynamicById.get(accountId)?.bucket,
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
      { id: string; systemKey: WorkshopMetalAccountKey | null; balanceGrams: Prisma.Decimal }[]
    >`SELECT "id", "systemKey", "balanceGrams"
      FROM "WorkshopMetalAccount"
      WHERE "shopId" = ${input.shopId}
      ORDER BY "id"
      FOR UPDATE`;
    const lockedById = new Map(locked.map((row) => [row.id, row]));

    const nextBalances = new Map<string, Prisma.Decimal>();
    for (const line of lines) {
      const row = lockedById.get(line.accountId);
      if (!row) {
        throw new BadRequestException("Workshop material account is not locked");
      }
      const current = nextBalances.get(line.accountId) ?? this.grams(row.balanceGrams);
      const equity = line.bucket === WorkshopAccountBucket.OPENING_EQUITY;
      const next = equity
        ? current.plus(line.creditGrams).minus(line.debitGrams)
        : current.plus(line.debitGrams).minus(line.creditGrams);
      // An over-weight transfer receipt records its unresolved source as a
      // negative, transfer-scoped variance. No stock is silently created.
      const unresolvedTransferExcess = input.referenceType === WorkshopMetalJournalReferenceType.TRANSFER_RECEIPT &&
        !!input.transferId && !!input.scaleReadingId && line.bucket === WorkshopAccountBucket.TRANSFER_VARIANCE &&
        line.creditGrams.gt(0);
      if (next.lt(0) && !unresolvedTransferExcess) {
        throw new BadRequestException(
          `Insufficient ${line.accountKey ?? line.accountId} balance for this material movement`,
        );
      }
      nextBalances.set(line.accountId, next);
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
        replacementForId: input.replacementForId,
        processRunId: input.processRunId ?? null,
        transferId: input.transferId ?? null,
        recoveryContainerId: input.recoveryContainerId ?? null,
        recoveryEventId: input.recoveryEventId ?? null,
        batchChildId: input.batchChildId ?? null,
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

    for (const [accountId, balance] of nextBalances) {
      const key = lines.find((line) => line.accountId === accountId)?.accountKey;
      await tx.workshopMetalAccount.update({
        where: key
          ? { shopId_systemKey: { shopId: input.shopId, systemKey: key } }
          : { id: accountId },
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
      purity: entry.materialKey === WORKSHOP_GOLD_995_MATERIAL_KEY ? WORKSHOP_GOLD_995_PURITY : null,
      jobId: entry.jobId,
      treeId: entry.treeId,
      weighingSessionId: entry.weighingSessionId,
      scaleReadingId: entry.scaleReadingId,
      actorUserId: entry.actorUserId,
      captureMethod: entry.captureMethod,
      reversalOfId: entry.reversalOfId,
      replacementForId: entry.replacementForId,
      processRunId: entry.processRunId,
      transferId: entry.transferId,
      recoveryContainerId: entry.recoveryContainerId,
      recoveryEventId: entry.recoveryEventId,
      batchChildId: entry.batchChildId,
      idempotent,
      postedAt: entry.postedAt,
      lines: (entry.lines ?? []).map((line: any) => ({
        id: line.id,
        accountId: line.accountId,
        accountKey: line.account?.systemKey,
        bucket: line.account?.bucket,
        materialKey: line.account?.materialKey,
        scopeId: line.account?.scopeId,
        debitGrams: this.serializeGrams(line.debitGrams),
        creditGrams: this.serializeGrams(line.creditGrams),
        description: line.description,
      })),
    };
  }
}
