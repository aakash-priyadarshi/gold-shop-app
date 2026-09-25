import { Prisma } from "@prisma/client";
import { WorkshopCatalogService } from "./workshop-catalog.service";

describe("WorkshopCatalogService alloy recommendations", () => {
  const recipe = {
    id: "recipe-1", targetFineGoldFraction: new Prisma.Decimal("0.916667"),
    alloyFineGoldFraction: new Prisma.Decimal("0"),
  };
  const prisma = { workshopAlloyRecipe: { findFirst: jest.fn() } } as any;
  const service = new WorkshopCatalogService(prisma);

  beforeEach(() => prisma.workshopAlloyRecipe.findFirst.mockResolvedValue(recipe));

  it.each([
    ["22K", "0.916667", "469.850000", "40.150000"],
    ["21K", "0.875000", "448.490000", "61.510000"],
    ["18K", "0.750000", "384.420000", "125.580000"],
  ])("recommends %s Gold 995 and alloy at Gold Scale quantum", async (_label, fineGold, gold, alloy) => {
    prisma.workshopAlloyRecipe.findFirst.mockResolvedValue({ ...recipe, targetFineGoldFraction: new Prisma.Decimal(fineGold) });
    const recommendation = await service.recommend("shop-1", "recipe-1", "510.00");
    expect(recommendation.recommendedGold995Grams).toBe(gold);
    expect(recommendation.recommendedMasterAlloyGrams).toBe(alloy);
    expect(recommendation.referenceOnly).toBe(true);
  });

  it("accounts for fine gold already present in the alloy", async () => {
    prisma.workshopAlloyRecipe.findFirst.mockResolvedValue({ ...recipe, alloyFineGoldFraction: new Prisma.Decimal("0.10") });
    const recommendation = await service.recommend("shop-1", "recipe-1", "510.00");
    expect(recommendation.recommendedGold995Grams).toBe("465.360000");
    expect(recommendation.recommendedMasterAlloyGrams).toBe("44.640000");
  });

  it("versions and deactivates a recipe using its trimmed name", async () => {
    const tx = {
      workshopAlloyRecipe: {
        findFirst: jest.fn().mockResolvedValue({ version: 2 }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        create: jest.fn().mockResolvedValue({ id: "recipe-3", name: "22K", version: 3 }),
      },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
    };
    const setupPrisma = {
      workshopMaterial: { findMany: jest.fn().mockResolvedValue([{ key: "masterAlloy", scalePurpose: "GOLD" }]) },
      $transaction: (fn: (client: typeof tx) => Promise<unknown>) => fn(tx),
    } as any;
    const setup = new WorkshopCatalogService(setupPrisma);
    await setup.createRecipe("shop-1", "owner-1", {
      name: " 22K ", targetFineGoldFraction: "0.916667", alloyFineGoldFraction: "0",
      components: [{ materialKey: "masterAlloy", fraction: "1" }],
    } as any);
    expect(tx.workshopAlloyRecipe.findFirst).toHaveBeenCalledWith({ where: { shopId: "shop-1", name: "22K" }, orderBy: { version: "desc" } });
    expect(tx.workshopAlloyRecipe.updateMany).toHaveBeenCalledWith({ where: { shopId: "shop-1", name: "22K", isActive: true }, data: { isActive: false } });
    expect(tx.workshopAlloyRecipe.create).toHaveBeenCalledWith({ data: expect.objectContaining({ name: "22K", version: 3 }) });
  });
});

describe("WorkshopCatalogService material creation and GOLD vs GOLD_995 consistency", () => {
  it("creates Gold 995 through the actual UI/API payload with kind=GOLD and theoreticalPurity=0.995000", async () => {
    const tx = {
      workshopMaterial: {
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: "mat-995", ...data })),
      },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
    };
    const prisma = {
      $transaction: (fn: any) => fn(tx),
    } as any;
    const service = new WorkshopCatalogService(prisma);

    const payload = {
      name: "Gold 995 Bullion",
      key: "gold_995_bullion",
      kind: "GOLD",
      scalePurpose: "GOLD" as const,
      theoreticalPurity: "0.995000",
      composition: { Gold: "99.5" },
    };

    const result = await service.createMaterial("shop-1", "user-1", payload);

    expect(result.kind).toBe("GOLD");
    expect(result.key).toBe("gold_995_bullion");
    expect(result.scalePurpose).toBe("GOLD");
    expect(result.theoreticalPurity?.toFixed(6)).toBe("0.995000");
    expect(tx.workshopMaterial.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        shopId: "shop-1",
        key: "gold_995_bullion",
        name: "Gold 995 Bullion",
        kind: "GOLD",
        scalePurpose: "GOLD",
        theoreticalPurity: new Prisma.Decimal("0.995000"),
      }),
    });
    expect(tx.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "WORKSHOP_MATERIAL_CREATE",
        newValue: expect.objectContaining({
          key: "gold_995_bullion",
          kind: "GOLD",
        }),
      }),
    });
  });

  it("ensures base materials represent Gold 995 with kind=GOLD and key=goldGrains995", async () => {
    const upsertMock = jest.fn().mockResolvedValue({});
    const prisma = {
      workshopMaterial: { upsert: upsertMock },
    } as any;
    const service = new WorkshopCatalogService(prisma);

    await service.ensureBaseMaterials("shop-1");

    expect(upsertMock).toHaveBeenCalledWith(expect.objectContaining({
      where: { shopId_key: { shopId: "shop-1", key: "goldGrains995" } },
      create: expect.objectContaining({
        key: "goldGrains995",
        name: "Gold 995",
        kind: "GOLD",
        scalePurpose: "GOLD",
        theoreticalPurity: new Prisma.Decimal("0.995"),
      }),
    }));
  });
});
