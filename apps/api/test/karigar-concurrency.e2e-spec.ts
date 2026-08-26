import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { CurrencyCode, JournalReferenceType } from "@prisma/client";
import { randomUUID } from "crypto";
import { AppModule } from "../src/app.module";
import { AccountingService } from "../src/modules/accounting/accounting.service";
import { KarigarService } from "../src/modules/karigar/karigar.service";
import { PrismaService } from "../src/prisma/prisma.service";

const SCENARIO_TIMEOUT_MS = 45_000;
const DIAGNOSTIC_TIMEOUT_MS = 5_000;

type ScenarioFixture = {
  workshopId: string;
  metalKey: string;
};

const delay = (milliseconds: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

describe("Karigar PostgreSQL Concurrency Integration", () => {
  let app: INestApplication | undefined;
  let prisma: PrismaService | undefined;
  let karigarService: KarigarService;
  let testShopId: string;
  let testUserId: string;

  const fixtureIds = {
    userId: "",
    shopId: "",
    workshopIds: new Set<string>(),
    jobIds: new Set<string>(),
    financialEntryIds: new Set<string>(),
    metalMovementIds: new Set<string>(),
    journalEntryIds: new Set<string>(),
    ledgerAccountIds: new Set<string>(),
    vaultReserveIds: new Set<string>(),
  };

  const fixtureSummary = () => ({
    userId: fixtureIds.userId,
    shopId: fixtureIds.shopId,
    workshopIds: [...fixtureIds.workshopIds],
    jobIds: [...fixtureIds.jobIds],
    financialEntryIds: [...fixtureIds.financialEntryIds],
    metalMovementIds: [...fixtureIds.metalMovementIds],
    journalEntryIds: [...fixtureIds.journalEntryIds],
    ledgerAccountIds: [...fixtureIds.ledgerAccountIds],
    vaultReserveIds: [...fixtureIds.vaultReserveIds],
  });

  async function logPostgresDiagnostics(scenario: string) {
    if (!prisma) {
      console.error(
        "Karigar concurrency diagnostics skipped: Prisma is unavailable",
        {
          scenario,
        },
      );
      return;
    }

    try {
      const diagnostics = Promise.all([
        prisma.$queryRaw<
          Array<{
            pid: number;
            state: string | null;
            wait_event_type: string | null;
            wait_event: string | null;
            backend_type: string;
            query_age_seconds: number | null;
          }>
        >`
          SELECT
            pid,
            state,
            wait_event_type,
            wait_event,
            backend_type,
            EXTRACT(EPOCH FROM (clock_timestamp() - query_start)) AS query_age_seconds
          FROM pg_stat_activity
          WHERE datname = current_database()
          ORDER BY query_start NULLS LAST
        `,
        prisma.$queryRaw<
          Array<{
            pid: number;
            locktype: string;
            mode: string;
            granted: boolean;
            relation_name: string | null;
          }>
        >`
          SELECT
            locks.pid,
            locks.locktype,
            locks.mode,
            locks.granted,
            relations.relname AS relation_name
          FROM pg_locks AS locks
          LEFT JOIN pg_class AS relations ON relations.oid = locks.relation
          WHERE locks.pid <> pg_backend_pid()
          ORDER BY locks.pid, locks.granted, locks.locktype, locks.mode
        `,
      ]);
      const [activity, locks] = await Promise.race([
        diagnostics,
        delay(DIAGNOSTIC_TIMEOUT_MS).then(() => {
          throw new Error("PostgreSQL diagnostics timed out");
        }),
      ]);
      console.error("Karigar concurrency PostgreSQL diagnostics", {
        scenario,
        activity,
        locks,
      });
    } catch (error) {
      console.error("Karigar concurrency diagnostics failed", {
        scenario,
        error: error instanceof Error ? error.message : error,
      });
    }
  }

  async function runScenario<T>(name: string, scenario: () => Promise<T>) {
    const startedAt = Date.now();
    console.info(`Karigar concurrency scenario started: ${name}`);
    let timer: NodeJS.Timeout | undefined;
    try {
      return await new Promise<T>((resolve, reject) => {
        timer = setTimeout(() => {
          void logPostgresDiagnostics(name).finally(() => {
            reject(
              new Error(
                `Karigar concurrency scenario timed out after ${SCENARIO_TIMEOUT_MS}ms: ${name}`,
              ),
            );
          });
        }, SCENARIO_TIMEOUT_MS);
        Promise.resolve().then(scenario).then(resolve, reject);
      });
    } finally {
      if (timer) clearTimeout(timer);
      console.info("Karigar concurrency scenario finished", {
        name,
        elapsedMs: Date.now() - startedAt,
      });
    }
  }

  async function createScenarioFixture(
    name: string,
    vaultQuantity: number,
  ): Promise<ScenarioFixture> {
    if (!prisma) throw new Error("Prisma was not initialized");

    const suffix = randomUUID();
    const workshop = await prisma.karigarWorkshop.create({
      data: {
        id: `e2e-karigar-${name}-${suffix}`,
        shopId: testShopId,
        name: `Disposable ${name} Workshop`,
        artisan: "E2E Goldsmith",
        wageRatePerGram: 100,
        wastageLimit: 1,
      },
    });
    const metalKey = `e2e-gold-${suffix}`;
    const reserve = await prisma.karigarVaultReserve.create({
      data: {
        shopId: testShopId,
        materialKey: metalKey,
        label: `Disposable ${name} Gold`,
        quantity: vaultQuantity,
      },
    });
    fixtureIds.workshopIds.add(workshop.id);
    fixtureIds.vaultReserveIds.add(reserve.id);
    console.info("Karigar concurrency fixture created", {
      name,
      workshopId: workshop.id,
      metalKey,
      vaultQuantity,
    });
    return { workshopId: workshop.id, metalKey };
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix("api");
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();

    const prismaService = app.get<PrismaService>(PrismaService);
    prisma = prismaService;
    karigarService = app.get(KarigarService);
    await prismaService.$queryRaw`SELECT 1`;

    const suffix = randomUUID();
    const user = await prismaService.user.create({
      data: {
        email: `karigar-concurrency-${suffix}@orivraa.test`,
        passwordHash: "test-password-hash",
        role: "SHOPKEEPER",
        status: "ACTIVE",
        firstName: "Karigar",
        lastName: "Concurrency",
        preferredCountry: "NP",
        preferredCurrency: "NPR",
        twoFactorBackupCodes: [],
      },
    });
    fixtureIds.userId = user.id;
    testUserId = user.id;

    const shop = await prismaService.shop.create({
      data: {
        userId: user.id,
        shopName: `Karigar Concurrency ${suffix}`,
        slug: `karigar-concurrency-${suffix}`,
        country: "NP",
        city: "Kathmandu",
        address: "Disposable E2E Fixture",
        contactPhone: "9800000000",
        currency: "NPR",
        supportedJewelleryTypes: [],
        supportedMethods: [],
        supportedMaterials: [],
        supportedGemstones: [],
        supportedFinishes: [],
        supportedAlloys: [],
        supportedBaseMetals: [],
        supportedPlatingTypes: [],
      },
    });
    fixtureIds.shopId = shop.id;
    testShopId = shop.id;
  }, 30_000);

  afterAll(async () => {
    let cleanupError: unknown;
    try {
      if (prisma && fixtureIds.shopId) {
        await prisma.$transaction(async (tx) => {
          const [journals, accounts, financialEntries, metalMovements] =
            await Promise.all([
              tx.journalEntry.findMany({
                where: { shopId: fixtureIds.shopId },
                select: { id: true },
              }),
              tx.ledgerAccount.findMany({
                where: { shopId: fixtureIds.shopId },
                select: { id: true },
              }),
              tx.karigarFinancialEntry.findMany({
                where: { shopId: fixtureIds.shopId },
                select: { id: true },
              }),
              tx.karigarMetalMovement.findMany({
                where: { shopId: fixtureIds.shopId },
                select: { id: true },
              }),
            ]);
          journals.forEach((journal) =>
            fixtureIds.journalEntryIds.add(journal.id),
          );
          accounts.forEach((account) =>
            fixtureIds.ledgerAccountIds.add(account.id),
          );
          financialEntries.forEach((entry) =>
            fixtureIds.financialEntryIds.add(entry.id),
          );
          metalMovements.forEach((movement) =>
            fixtureIds.metalMovementIds.add(movement.id),
          );

          await tx.karigarFinancialAllocation.deleteMany({
            where: { shopId: fixtureIds.shopId },
          });
          // Posted GL rows are trigger-protected. Replica role skips those
          // user triggers for this transaction only so the disposable shop
          // can be torn down without creating compensating reversals.
          await tx.$executeRawUnsafe(
            "SET LOCAL session_replication_role = replica",
          );
          await tx.journalLine.deleteMany({
            where: {
              journalEntryId: { in: journals.map((journal) => journal.id) },
            },
          });
          await tx.journalEntry.deleteMany({
            where: { shopId: fixtureIds.shopId },
          });
          await tx.karigarFinancialEntry.deleteMany({
            where: { shopId: fixtureIds.shopId },
          });
          await tx.karigarMetalMovement.deleteMany({
            where: { shopId: fixtureIds.shopId },
          });
          await tx.karigarJobStage.deleteMany({
            where: { shopId: fixtureIds.shopId },
          });
          await tx.karigarJob.deleteMany({
            where: { shopId: fixtureIds.shopId },
          });
          await tx.karigarWorkshop.deleteMany({
            where: { shopId: fixtureIds.shopId },
          });
          await tx.ledgerAccount.deleteMany({
            where: { shopId: fixtureIds.shopId },
          });
          await tx.karigarVaultReserve.deleteMany({
            where: { shopId: fixtureIds.shopId },
          });
          await tx.shop.delete({ where: { id: fixtureIds.shopId } });
          await tx.user.delete({ where: { id: fixtureIds.userId } });
        });
      }
    } catch (error) {
      cleanupError = error;
      console.error("Karigar concurrency fixture cleanup failed", {
        error,
        fixtureIds: fixtureSummary(),
      });
    }

    try {
      await app?.close();
    } catch (error) {
      cleanupError ??= error;
      console.error("Karigar concurrency app shutdown failed", { error });
    }

    if (cleanupError) throw cleanupError;
  }, 30_000);

  it(
    "10g outstanding + two different-key 8g returns commits exactly once",
    async () =>
      runScenario("different-key-unused-return", async () => {
        if (!prisma) throw new Error("Prisma was not initialized");
        const fixture = await createScenarioFixture("unused-return", 10);
        const suffix = randomUUID();
        const returnKeys = [`return-a-${suffix}`, `return-b-${suffix}`];

        await karigarService.addMovement(testShopId, null, testUserId, {
          type: "ISSUE",
          weightGrams: 10,
          workshopId: fixture.workshopId,
          metalKey: fixture.metalKey,
          idempotencyKey: `issue-${suffix}`,
        });

        const results = await Promise.allSettled(
          returnKeys.map((idempotencyKey) =>
            karigarService.recordMetalReturn(
              testShopId,
              fixture.workshopId,
              testUserId,
              {
                type: "RETURN_UNUSED",
                weightGrams: 8,
                metalKey: fixture.metalKey,
                idempotencyKey,
              },
            ),
          ),
        );
        expect(
          results.filter((result) => result.status === "fulfilled"),
        ).toHaveLength(1);
        expect(
          results.filter((result) => result.status === "rejected"),
        ).toHaveLength(1);

        const [account, movements, vault] = await Promise.all([
          karigarService.getWorkshopAccount(testShopId, fixture.workshopId),
          prisma.karigarMetalMovement.findMany({
            where: {
              shopId: testShopId,
              workshopId: fixture.workshopId,
              idempotencyKey: { in: returnKeys },
            },
          }),
          prisma.karigarVaultReserve.findUnique({
            where: {
              shopId_materialKey: {
                shopId: testShopId,
                materialKey: fixture.metalKey,
              },
            },
          }),
        ]);
        movements.forEach((movement) =>
          fixtureIds.metalMovementIds.add(movement.id),
        );
        expect(movements).toHaveLength(1);
        expect(Number(movements[0].weightGrams)).toBe(8);
        expect(
          account.metalBalances.find(
            (balance) => balance.metalKey === fixture.metalKey,
          )?.outstandingGrams,
        ).toBe(2);
        expect(vault?.quantity).toBe(8);
      }),
    SCENARIO_TIMEOUT_MS + 5_000,
  );

  it(
    "100 payable + two different-key 80 settlements commits exactly once",
    async () =>
      runScenario("different-key-settlement", async () => {
        if (!prisma) throw new Error("Prisma was not initialized");
        const fixture = await createScenarioFixture("settlement", 0);
        const suffix = randomUUID();
        await karigarService.recordAdjustment(
          testShopId,
          fixture.workshopId,
          testUserId,
          {
            type: "ADJUSTMENT_INCREASE",
            amount: 100,
            note: "Concurrency payable fixture",
            idempotencyKey: `adjustment-${suffix}`,
          },
        );
        const paymentKeys = [`payment-a-${suffix}`, `payment-b-${suffix}`];

        const results = await Promise.allSettled(
          paymentKeys.map((idempotencyKey) =>
            karigarService.recordPayment(
              testShopId,
              fixture.workshopId,
              testUserId,
              {
                amount: 80,
                paymentMethod: "CASH",
                idempotencyKey,
              },
            ),
          ),
        );
        expect(
          results.filter((result) => result.status === "fulfilled"),
        ).toHaveLength(1);
        expect(
          results.filter((result) => result.status === "rejected"),
        ).toHaveLength(1);

        const payments = await prisma.karigarFinancialEntry.findMany({
          where: {
            shopId: testShopId,
            workshopId: fixture.workshopId,
            type: "SETTLEMENT_PAYMENT",
            idempotencyKey: { in: paymentKeys },
          },
        });
        payments.forEach((entry) => fixtureIds.financialEntryIds.add(entry.id));
        expect(payments).toHaveLength(1);
        expect(Number(payments[0].amount)).toBe(80);

        const [account, journals] = await Promise.all([
          karigarService.getWorkshopAccount(testShopId, fixture.workshopId),
          prisma.journalEntry.findMany({
            where: {
              shopId: testShopId,
              referenceType: JournalReferenceType.KARIGAR_SETTLEMENT_PAYMENT,
              referenceId: payments[0].id,
            },
          }),
        ]);
        journals.forEach((journal) =>
          fixtureIds.journalEntryIds.add(journal.id),
        );
        expect(account.summary.amountPayable).toBe(20);
        expect(journals).toHaveLength(1);
      }),
    SCENARIO_TIMEOUT_MS + 5_000,
  );

  it(
    "same-key payment replays one financial entry, allocation set, and GL journal",
    async () =>
      runScenario("same-key-payment", async () => {
        if (!prisma) throw new Error("Prisma was not initialized");
        const fixture = await createScenarioFixture("same-payment", 1);
        const suffix = randomUUID();
        const jobId = `e2e-karigar-payment-job-${suffix}`;
        fixtureIds.jobIds.add(jobId);
        await prisma.karigarJob.create({
          data: {
            id: jobId,
            shopId: testShopId,
            workshopId: fixture.workshopId,
            product: "Same-key payment fixture",
            artisan: "E2E Goldsmith",
            grossWeight: 1,
          },
        });

        await karigarService.addMovement(testShopId, jobId, testUserId, {
          type: "ISSUE",
          weightGrams: 1,
          workshopId: fixture.workshopId,
          metalKey: fixture.metalKey,
          stage: "CASTING",
          idempotencyKey: `payment-issue-${suffix}`,
        });
        await karigarService.addMovement(testShopId, jobId, testUserId, {
          type: "RETURN_FINISHED",
          weightGrams: 1,
          workshopId: fixture.workshopId,
          metalKey: fixture.metalKey,
          stage: "CASTING",
          idempotencyKey: `payment-finish-${suffix}`,
        });

        const idempotencyKey = `same-payment-${suffix}`;
        const payload = {
          amount: 50,
          paymentMethod: "CASH",
          idempotencyKey,
          allocations: [{ jobId, amount: 50 }],
        };
        const [first, second] = await Promise.all([
          karigarService.recordPayment(
            testShopId,
            fixture.workshopId,
            testUserId,
            payload,
          ),
          karigarService.recordPayment(
            testShopId,
            fixture.workshopId,
            testUserId,
            payload,
          ),
        ]);
        expect(first.entry.id).toBe(second.entry.id);

        const entries = await prisma.karigarFinancialEntry.findMany({
          where: { shopId: testShopId, idempotencyKey },
        });
        entries.forEach((entry) => fixtureIds.financialEntryIds.add(entry.id));
        expect(entries).toHaveLength(1);

        const [allocations, journals] = await Promise.all([
          prisma.karigarFinancialAllocation.findMany({
            where: { shopId: testShopId, financialEntryId: entries[0].id },
          }),
          prisma.journalEntry.findMany({
            where: {
              shopId: testShopId,
              referenceType: JournalReferenceType.KARIGAR_SETTLEMENT_PAYMENT,
              referenceId: entries[0].id,
            },
          }),
        ]);
        journals.forEach((journal) =>
          fixtureIds.journalEntryIds.add(journal.id),
        );
        expect(allocations).toHaveLength(1);
        expect(Number(allocations[0].amount)).toBe(50);
        expect(allocations[0].jobId).toBe(jobId);
        expect(journals).toHaveLength(1);
      }),
    SCENARIO_TIMEOUT_MS + 5_000,
  );

  it(
    "same-key RETURN_UNUSED replays one movement and mutates physical state once",
    async () =>
      runScenario("same-key-unused-return", async () => {
        if (!prisma) throw new Error("Prisma was not initialized");
        const fixture = await createScenarioFixture("same-unused-return", 8);
        const suffix = randomUUID();
        await karigarService.addMovement(testShopId, null, testUserId, {
          type: "ISSUE",
          weightGrams: 8,
          workshopId: fixture.workshopId,
          metalKey: fixture.metalKey,
          idempotencyKey: `same-return-issue-${suffix}`,
        });

        const [accountBefore, vaultBefore] = await Promise.all([
          karigarService.getWorkshopAccount(testShopId, fixture.workshopId),
          prisma.karigarVaultReserve.findUnique({
            where: {
              shopId_materialKey: {
                shopId: testShopId,
                materialKey: fixture.metalKey,
              },
            },
          }),
        ]);
        const outstandingBefore = accountBefore.metalBalances.find(
          (balance) => balance.metalKey === fixture.metalKey,
        )?.outstandingGrams;
        const idempotencyKey = `same-return-${suffix}`;
        const payload = {
          type: "RETURN_UNUSED" as const,
          weightGrams: 8,
          metalKey: fixture.metalKey,
          idempotencyKey,
        };

        await Promise.all([
          karigarService.recordMetalReturn(
            testShopId,
            fixture.workshopId,
            testUserId,
            payload,
          ),
          karigarService.recordMetalReturn(
            testShopId,
            fixture.workshopId,
            testUserId,
            payload,
          ),
        ]);

        const [accountAfter, vaultAfter, movements] = await Promise.all([
          karigarService.getWorkshopAccount(testShopId, fixture.workshopId),
          prisma.karigarVaultReserve.findUnique({
            where: {
              shopId_materialKey: {
                shopId: testShopId,
                materialKey: fixture.metalKey,
              },
            },
          }),
          prisma.karigarMetalMovement.findMany({
            where: { shopId: testShopId, idempotencyKey },
          }),
        ]);
        movements.forEach((movement) =>
          fixtureIds.metalMovementIds.add(movement.id),
        );
        const outstandingAfter = accountAfter.metalBalances.find(
          (balance) => balance.metalKey === fixture.metalKey,
        )?.outstandingGrams;

        expect(movements).toHaveLength(1);
        expect(movements[0]).toMatchObject({
          workshopId: fixture.workshopId,
          metalKey: fixture.metalKey,
          type: "RETURN_UNUSED",
        });
        expect(Number(vaultAfter?.quantity)).toBe(
          Number(vaultBefore?.quantity) + 8,
        );
        expect(outstandingAfter).toBe(Number(outstandingBefore) - 8);
      }),
    SCENARIO_TIMEOUT_MS + 5_000,
  );

  it(
    "rejects a stale monetary preflight after a concurrent currency rebase transaction",
    async () =>
      runScenario("currency-rebase-lock", async () => {
        if (!prisma || !app) throw new Error("Prisma was not initialized");
        const fixture = await createScenarioFixture("currency-rebase", 0);
        let rebaseReady!: () => void;
        let releaseRebase!: () => void;
        const rebaseIsReady = new Promise<void>((resolve) => {
          rebaseReady = resolve;
        });
        const releaseRebaseCommit = new Promise<void>((resolve) => {
          releaseRebase = resolve;
        });
        const rebaseTransaction = prisma.$transaction(async (tx) => {
          await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`shop-price-rebase:${testShopId}`}))`;
          await tx.shop.update({
            where: { id: testShopId },
            data: { currency: CurrencyCode.INR },
          });
          rebaseReady();
          await releaseRebaseCommit;
        });

        await rebaseIsReady;
        const accounting = app.get<AccountingService>(AccountingService);
        const originalPrepare = accounting.prepareMonetaryContext.bind(accounting);
        let preflightPrepared!: () => void;
        const preflightIsPrepared = new Promise<void>((resolve) => {
          preflightPrepared = resolve;
        });
        const prepareSpy = jest
          .spyOn(accounting, "prepareMonetaryContext")
          .mockImplementation(async (...args) => {
            preflightPrepared();
            return originalPrepare(...args);
          });
        const idempotencyKey = `currency-rebase-${randomUUID()}`;

        try {
          const adjustment = karigarService.recordAdjustment(
            testShopId,
            fixture.workshopId,
            testUserId,
            {
              type: "ADJUSTMENT_INCREASE",
              amount: 1,
              note: "Currency rebase race fixture",
              idempotencyKey,
            },
          );
          await preflightIsPrepared;

          await expect(
            Promise.race([
              adjustment.then(() => "completed"),
              delay(150).then(() => "blocked"),
            ]),
          ).resolves.toBe("blocked");

          releaseRebase();
          await rebaseTransaction;
          await expect(adjustment).rejects.toThrow(
            "Shop currency changed while the ledger operation was being prepared",
          );
          await expect(
            prisma.karigarFinancialEntry.count({
              where: { shopId: testShopId, workshopId: fixture.workshopId },
            }),
          ).resolves.toBe(0);
        } finally {
          releaseRebase();
          await rebaseTransaction.catch((error) => {
            console.error("Karigar currency-rebase fixture transaction failed", {
              error,
              fixtureIds: fixtureSummary(),
            });
          });
          prepareSpy.mockRestore();
          await prisma.shop.update({
            where: { id: testShopId },
            data: { currency: CurrencyCode.NPR },
          });
        }
      }),
    SCENARIO_TIMEOUT_MS + 5_000,
  );
});
