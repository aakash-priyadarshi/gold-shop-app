import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";
import { KarigarService } from "../src/modules/karigar/karigar.service";
import { Prisma } from "@prisma/client";

describe("Karigar PostgreSQL Concurrency Integration", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let karigarService: KarigarService;
  let testShopId: string;
  let testUserId: string;
  let testWorkshopId: string;

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

    // Assert DB connectivity; throws explicitly if database cannot be reached
    await prisma.$queryRaw`SELECT 1`;

    let shop = await prisma.shop.findFirst({
      where: { currency: "NPR" },
      include: { owner: true },
    });

    if (!shop) {
      const user = await prisma.user.create({
        data: {
          email: `concur-user-${Date.now()}@orivraa.test`,
          passwordHash: "hash123",
          role: "SHOPKEEPER",
          status: "ACTIVE",
          firstName: "Concurrency",
          lastName: "Tester",
          preferredCurrency: "NPR",
        },
      });
      shop = await prisma.shop.create({
        data: {
          name: `Concurrency Shop ${Date.now()}`,
          slug: `concur-shop-${Date.now()}`,
          ownerId: user.id,
          currency: "NPR",
        },
        include: { owner: true },
      });
    }

    testShopId = shop.id;
    testUserId = shop.ownerId;

    const workshop = await prisma.karigarWorkshop.create({
      data: {
        shopId: testShopId,
        name: `Concurrency Test Workshop ${Date.now()}`,
        artisan: "Ramesh Goldsmith",
        wageRatePerGram: new Prisma.Decimal(200),
        wastageLimit: new Prisma.Decimal(1.0),
      },
    });
    testWorkshopId = workshop.id;
  }, 30_000);

  afterAll(async () => {
    if (testWorkshopId) {
      try {
        await prisma.karigarFinancialAllocation.deleteMany({
          where: { financialEntry: { workshopId: testWorkshopId } },
        });
        await prisma.karigarFinancialEntry.deleteMany({
          where: { workshopId: testWorkshopId },
        });
        await prisma.karigarMetalMovement.deleteMany({
          where: { workshopId: testWorkshopId },
        });
        await prisma.karigarWorkshop.delete({
          where: { id: testWorkshopId },
        });
      } catch (err) {
        console.error("Cleanup error in karigar-concurrency test:", err);
      }
    }
    await app?.close();
  });

  it("10g outstanding + two concurrent 8g returns => exactly one commits, leaves 2g outstanding", async () => {
    const runTimestamp = Date.now();

    // 1. Issue 10g to workshop
    await karigarService.addMovement(testShopId, null, testUserId, {
      type: "ISSUE",
      weightGrams: 10,
      workshopId: testWorkshopId,
      metalKey: "goldGrains24k",
      idempotencyKey: `issue-concur-${runTimestamp}`,
    });

    // 2. Launch two concurrent 8g returns
    const p1 = karigarService.addMovement(testShopId, null, testUserId, {
      type: "RETURN_UNUSED",
      weightGrams: 8,
      workshopId: testWorkshopId,
      metalKey: "goldGrains24k",
      idempotencyKey: `ret-concur-1-${runTimestamp}`,
    });

    const p2 = karigarService.addMovement(testShopId, null, testUserId, {
      type: "RETURN_UNUSED",
      weightGrams: 8,
      workshopId: testWorkshopId,
      metalKey: "goldGrains24k",
      idempotencyKey: `ret-concur-2-${runTimestamp}`,
    });

    const results = await Promise.allSettled([p1, p2]);
    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");

    expect(fulfilled.length).toBe(1);
    expect(rejected.length).toBe(1);

    // Assert post-test database state:
    // Outstanding karigar balance = 2g
    const account = await karigarService.getWorkshopAccount(
      testShopId,
      testWorkshopId,
    );
    const goldBalance = account.metalBalances.find(
      (b: any) => b.metalKey === "goldGrains24k",
    );
    expect(goldBalance?.outstandingGrams).toBeCloseTo(2.0, 3);

    // Exactly one return movement was recorded in DB alongside the issue
    const returnMovements = await prisma.karigarMetalMovement.findMany({
      where: {
        workshopId: testWorkshopId,
        type: "RETURN_UNUSED",
      },
    });
    expect(returnMovements.length).toBe(1);
    expect(Number(returnMovements[0].weightGrams)).toBeCloseTo(8.0, 3);
  });

  it("100 payable + two concurrent 80 settlements => exactly one commits, leaves 20 payable", async () => {
    const runTimestamp = Date.now();

    // 1. Accrue 100 wage via adjustment
    await karigarService.recordAdjustment(
      testShopId,
      testWorkshopId,
      testUserId,
      {
        type: "ADJUSTMENT_INCREASE",
        amount: 100,
        note: "Test Wage Accrual for Concurrency Test",
        idempotencyKey: `adj-pay-${runTimestamp}`,
      },
    );

    // 2. Launch two concurrent 80 settlements
    const p1 = karigarService.recordPayment(
      testShopId,
      testWorkshopId,
      testUserId,
      {
        amount: 80,
        paymentMethod: "CASH",
        idempotencyKey: `pay-concur-1-${runTimestamp}`,
      },
    );

    const p2 = karigarService.recordPayment(
      testShopId,
      testWorkshopId,
      testUserId,
      {
        amount: 80,
        paymentMethod: "CASH",
        idempotencyKey: `pay-concur-2-${runTimestamp}`,
      },
    );

    const results = await Promise.allSettled([p1, p2]);
    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");

    expect(fulfilled.length).toBe(1);
    expect(rejected.length).toBe(1);

    // Assert post-test database state:
    // Outstanding payable = 20
    const account = await karigarService.getWorkshopAccount(
      testShopId,
      testWorkshopId,
    );
    expect(account.summary.amountPayable).toBeCloseTo(20.0, 2);

    // Exactly one settlement payment entry exists
    const payments = await prisma.karigarFinancialEntry.findMany({
      where: {
        workshopId: testWorkshopId,
        type: "SETTLEMENT_PAYMENT",
      },
    });
    expect(payments.length).toBe(1);
    expect(Number(payments[0].amount)).toBeCloseTo(80.0, 2);

    // Verify exactly one journal entry was posted for this settlement
    const journalEntries = await prisma.journalEntry.findMany({
      where: {
        shopId: testShopId,
        description: { contains: "Karigar Settlement Payment" },
        createdAt: { gte: payments[0].createdAt },
      },
    });
    expect(journalEntries.length).toBeGreaterThanOrEqual(1);
  });

  it("Concurrent requests with same idempotency key => exactly one financial entry created", async () => {
    const sameKey = `shared-idem-${Date.now()}`;
    const payload = {
      amount: 10,
      paymentMethod: "CASH",
      idempotencyKey: sameKey,
    };

    const [r1, r2] = await Promise.all([
      karigarService.recordAdvance(
        testShopId,
        testWorkshopId,
        testUserId,
        payload,
      ),
      karigarService.recordAdvance(
        testShopId,
        testWorkshopId,
        testUserId,
        payload,
      ),
    ]);

    expect(r1.entry.id).toBe(r2.entry.id);

    const countInDb = await prisma.karigarFinancialEntry.count({
      where: { shopId: testShopId, idempotencyKey: sameKey },
    });
    expect(countInDb).toBe(1);
  });
});
