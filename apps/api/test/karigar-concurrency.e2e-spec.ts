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
  let isDbAvailable = false;

  beforeAll(async () => {
    try {
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

      // Check DB connectivity
      await prisma.$queryRaw`SELECT 1`;
      isDbAvailable = true;

      // Seed a temporary shop and workshop for concurrency tests
      const shop = await prisma.shop.findFirst();
      if (shop) {
        testShopId = shop.id;
        const user = await prisma.user.findFirst({ where: { shopId: shop.id } });
        testUserId = user ? user.id : "test-user-system";

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
      }
    } catch {
      isDbAvailable = false;
    }
  }, 30_000);

  afterAll(async () => {
    if (isDbAvailable && testWorkshopId) {
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
      } catch {}
    }
    await app?.close();
  });

  it("10g outstanding + two concurrent 8g returns => exactly one commits", async () => {
    if (!isDbAvailable || !testWorkshopId) {
      console.warn("Database not available for live PostgreSQL concurrency test; skipping.");
      return;
    }

    // 1. Issue 10g to workshop
    await karigarService.addMovement(testShopId, null, testUserId, {
      type: "ISSUE",
      weightGrams: 10,
      workshopId: testWorkshopId,
      metalKey: "goldGrains24k",
      idempotencyKey: `issue-concur-${Date.now()}`,
    });

    // 2. Launch two concurrent 8g returns
    const p1 = karigarService.addMovement(testShopId, null, testUserId, {
      type: "RETURN_UNUSED",
      weightGrams: 8,
      workshopId: testWorkshopId,
      metalKey: "goldGrains24k",
      idempotencyKey: `ret-concur-1-${Date.now()}`,
    });

    const p2 = karigarService.addMovement(testShopId, null, testUserId, {
      type: "RETURN_UNUSED",
      weightGrams: 8,
      workshopId: testWorkshopId,
      metalKey: "goldGrains24k",
      idempotencyKey: `ret-concur-2-${Date.now()}`,
    });

    const results = await Promise.allSettled([p1, p2]);
    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");

    expect(fulfilled.length).toBe(1);
    expect(rejected.length).toBe(1);
  });

  it("100 payable + two concurrent 80 settlements => exactly one commits", async () => {
    if (!isDbAvailable || !testWorkshopId) {
      console.warn("Database not available for live PostgreSQL concurrency test; skipping.");
      return;
    }

    // Accrue 100 wage via adjustment or return
    await karigarService.recordAdjustment(testShopId, testWorkshopId, testUserId, {
      type: "ADJUSTMENT_INCREASE",
      amount: 100,
      note: "Test Payable Accrual",
      idempotencyKey: `adj-pay-${Date.now()}`,
    });

    const p1 = karigarService.recordPayment(testShopId, testWorkshopId, testUserId, {
      amount: 80,
      paymentMethod: "CASH",
      idempotencyKey: `pay-concur-1-${Date.now()}`,
    });

    const p2 = karigarService.recordPayment(testShopId, testWorkshopId, testUserId, {
      amount: 80,
      paymentMethod: "CASH",
      idempotencyKey: `pay-concur-2-${Date.now()}`,
    });

    const results = await Promise.allSettled([p1, p2]);
    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");

    expect(fulfilled.length).toBe(1);
    expect(rejected.length).toBe(1);
  });

  it("Concurrent requests with same idempotency key => exactly one financial entry created", async () => {
    if (!isDbAvailable || !testWorkshopId) {
      console.warn("Database not available for live PostgreSQL concurrency test; skipping.");
      return;
    }

    const sameKey = `shared-idem-${Date.now()}`;
    const payload = {
      amount: 10,
      paymentMethod: "CASH",
      idempotencyKey: sameKey,
    };

    const [r1, r2] = await Promise.all([
      karigarService.recordAdvance(testShopId, testWorkshopId, testUserId, payload),
      karigarService.recordAdvance(testShopId, testWorkshopId, testUserId, payload),
    ]);

    expect(r1.entry.id).toBe(r2.entry.id);

    const countInDb = await prisma.karigarFinancialEntry.count({
      where: { shopId: testShopId, idempotencyKey: sameKey },
    });
    expect(countInDb).toBe(1);
  });
});
