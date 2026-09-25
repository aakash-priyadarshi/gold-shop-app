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
});
