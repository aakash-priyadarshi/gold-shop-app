import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { JournalReferenceType } from "@prisma/client";
import { randomUUID } from "crypto";
import { AppModule } from "../src/app.module";
import { KarigarService } from "../src/modules/karigar/karigar.service";
import { PrismaService } from "../src/prisma/prisma.service";

describe("Karigar PostgreSQL Concurrency Integration", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let karigarService: KarigarService;
  let testShopId: string;
  let testUserId: string;
  let testWorkshopId: string;

  const fixtureIds = {
    userId: "",
    shopId: "",
    workshopIds: new Set<string>(),
    jobIds: new Set<string>(),
    financialEntryIds: new Set<string>(),
    metalMovementIds: new Set<string>(),
    journalEntryIds: new Set<string>(),
    ledgerAccountIds: new Set<string>(),
  };

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

    prisma = app.get(PrismaService);
    karigarService = app.get(KarigarService);
    await prisma.$queryRaw`SELECT 1`;

    const suffix = randomUUID();
    const user = await prisma.user.create({
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

    const shop = await prisma.shop.create({
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

    const workshop = await prisma.karigarWorkshop.create({
      data: {
        id: `e2e-karigar-workshop-${suffix}`,
        shopId: shop.id,
        name: "Disposable Concurrency Workshop",
        artisan: "E2E Goldsmith",
        wageRatePerGram: 100,
        wastageLimit: 1,
      },
    });
    fixtureIds.workshopIds.add(workshop.id);
    testWorkshopId = workshop.id;

    await prisma.karigarVaultReserve.create({
      data: {
        shopId: testShopId,
        materialKey: "goldGrains24k",
        label: "Gold Grains (24K)",
        quantity: 10,
      },
    });
  }, 30_000);

  afterAll(async () => {
    let cleanupError: unknown;
    try {
      if (fixtureIds.shopId) {
        await prisma.$transaction(async (tx) => {
          const [journals, accounts] = await Promise.all([
            tx.journalEntry.findMany({
              where: { shopId: fixtureIds.shopId },
              select: { id: true },
            }),
            tx.ledgerAccount.findMany({
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

          const [financialEntries, metalMovements] = await Promise.all([
            tx.karigarFinancialEntry.findMany({
              where: { shopId: fixtureIds.shopId },
              select: { id: true },
            }),
            tx.karigarMetalMovement.findMany({
              where: { shopId: fixtureIds.shopId },
              select: { id: true },
            }),
          ]);
          financialEntries.forEach((entry) =>
            fixtureIds.financialEntryIds.add(entry.id),
          );
          metalMovements.forEach((movement) =>
            fixtureIds.metalMovementIds.add(movement.id),
          );

          await tx.karigarFinancialAllocation.deleteMany({
            where: { shopId: fixtureIds.shopId },
          });
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
        fixtureIds: {
          userId: fixtureIds.userId,
          shopId: fixtureIds.shopId,
          workshopIds: [...fixtureIds.workshopIds],
          jobIds: [...fixtureIds.jobIds],
          financialEntryIds: [...fixtureIds.financialEntryIds],
          metalMovementIds: [...fixtureIds.metalMovementIds],
          journalEntryIds: [...fixtureIds.journalEntryIds],
          ledgerAccountIds: [...fixtureIds.ledgerAccountIds],
        },
      });
    }

    try {
      await app?.close();
    } catch (error) {
      cleanupError ??= error;
      console.error("Karigar concurrency app shutdown failed", { error });
    }

    if (cleanupError) throw cleanupError;
  });

  it("10g outstanding + two different-key 8g returns commits exactly once", async () => {
    const suffix = randomUUID();
    const returnKeys = [`return-a-${suffix}`, `return-b-${suffix}`];

    await karigarService.addMovement(testShopId, null, testUserId, {
      type: "ISSUE",
      weightGrams: 10,
      workshopId: testWorkshopId,
      metalKey: "goldGrains24k",
      idempotencyKey: `issue-${suffix}`,
    });

    const results = await Promise.allSettled(
      returnKeys.map((idempotencyKey) =>
        karigarService.recordMetalReturn(
          testShopId,
          testWorkshopId,
          testUserId,
          {
            type: "RETURN_UNUSED",
            weightGrams: 8,
            metalKey: "goldGrains24k",
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
      karigarService.getWorkshopAccount(testShopId, testWorkshopId),
      prisma.karigarMetalMovement.findMany({
        where: {
          shopId: testShopId,
          workshopId: testWorkshopId,
          idempotencyKey: { in: returnKeys },
        },
      }),
      prisma.karigarVaultReserve.findUnique({
        where: {
          shopId_materialKey: {
            shopId: testShopId,
            materialKey: "goldGrains24k",
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
        (balance) => balance.metalKey === "goldGrains24k",
      )?.outstandingGrams,
    ).toBe(2);
    expect(vault?.quantity).toBe(8);
  });

  it("100 payable + two different-key 80 settlements commits exactly once", async () => {
    const suffix = randomUUID();
    await karigarService.recordAdjustment(
      testShopId,
      testWorkshopId,
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
        karigarService.recordPayment(testShopId, testWorkshopId, testUserId, {
          amount: 80,
          paymentMethod: "CASH",
          idempotencyKey,
        }),
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
        workshopId: testWorkshopId,
        type: "SETTLEMENT_PAYMENT",
        idempotencyKey: { in: paymentKeys },
      },
    });
    payments.forEach((entry) => fixtureIds.financialEntryIds.add(entry.id));
    expect(payments).toHaveLength(1);
    expect(Number(payments[0].amount)).toBe(80);

    const [account, journals] = await Promise.all([
      karigarService.getWorkshopAccount(testShopId, testWorkshopId),
      prisma.journalEntry.findMany({
        where: {
          shopId: testShopId,
          referenceType: JournalReferenceType.KARIGAR_SETTLEMENT_PAYMENT,
          referenceId: payments[0].id,
        },
      }),
    ]);
    journals.forEach((journal) => fixtureIds.journalEntryIds.add(journal.id));
    expect(account.summary.amountPayable).toBe(20);
    expect(journals).toHaveLength(1);
  });

  it("same-key payment replays one financial entry, allocation set, and GL journal", async () => {
    const suffix = randomUUID();
    const jobId = `e2e-karigar-payment-job-${suffix}`;
    fixtureIds.jobIds.add(jobId);
    await prisma.karigarJob.create({
      data: {
        id: jobId,
        shopId: testShopId,
        workshopId: testWorkshopId,
        product: "Same-key payment fixture",
        artisan: "E2E Goldsmith",
        grossWeight: 1,
      },
    });

    await karigarService.addMovement(testShopId, jobId, testUserId, {
      type: "ISSUE",
      weightGrams: 1,
      workshopId: testWorkshopId,
      metalKey: "goldGrains24k",
      stage: "CASTING",
      idempotencyKey: `payment-issue-${suffix}`,
    });
    await karigarService.addMovement(testShopId, jobId, testUserId, {
      type: "RETURN_FINISHED",
      weightGrams: 1,
      workshopId: testWorkshopId,
      metalKey: "goldGrains24k",
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
        testWorkshopId,
        testUserId,
        payload,
      ),
      karigarService.recordPayment(
        testShopId,
        testWorkshopId,
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
    journals.forEach((journal) => fixtureIds.journalEntryIds.add(journal.id));
    expect(allocations).toHaveLength(1);
    expect(Number(allocations[0].amount)).toBe(50);
    expect(allocations[0].jobId).toBe(jobId);
    expect(journals).toHaveLength(1);
  });

  it("same-key RETURN_UNUSED replays one movement and mutates physical state once", async () => {
    const suffix = randomUUID();
    await karigarService.addMovement(testShopId, null, testUserId, {
      type: "ISSUE",
      weightGrams: 8,
      workshopId: testWorkshopId,
      metalKey: "goldGrains24k",
      idempotencyKey: `same-return-issue-${suffix}`,
    });

    const [accountBefore, vaultBefore] = await Promise.all([
      karigarService.getWorkshopAccount(testShopId, testWorkshopId),
      prisma.karigarVaultReserve.findUnique({
        where: {
          shopId_materialKey: {
            shopId: testShopId,
            materialKey: "goldGrains24k",
          },
        },
      }),
    ]);
    const outstandingBefore = accountBefore.metalBalances.find(
      (balance) => balance.metalKey === "goldGrains24k",
    )?.outstandingGrams;
    const idempotencyKey = `same-return-${suffix}`;
    const payload = {
      type: "RETURN_UNUSED" as const,
      weightGrams: 8,
      metalKey: "goldGrains24k",
      idempotencyKey,
    };

    await Promise.all([
      karigarService.recordMetalReturn(
        testShopId,
        testWorkshopId,
        testUserId,
        payload,
      ),
      karigarService.recordMetalReturn(
        testShopId,
        testWorkshopId,
        testUserId,
        payload,
      ),
    ]);

    const [accountAfter, vaultAfter, movements] = await Promise.all([
      karigarService.getWorkshopAccount(testShopId, testWorkshopId),
      prisma.karigarVaultReserve.findUnique({
        where: {
          shopId_materialKey: {
            shopId: testShopId,
            materialKey: "goldGrains24k",
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
      (balance) => balance.metalKey === "goldGrains24k",
    )?.outstandingGrams;

    expect(movements).toHaveLength(1);
    expect(movements[0].type).toBe("RETURN_UNUSED");
    expect(Number(vaultAfter?.quantity)).toBe(
      Number(vaultBefore?.quantity) + 8,
    );
    expect(outstandingAfter).toBe(Number(outstandingBefore) - 8);
  });
});
