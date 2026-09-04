import { ConfigService } from "@nestjs/config";
import { DesignVariationsService } from "./design-variations.service";

describe("DesignVariationsService model credit cost", () => {
  it("charges five times the selected per-image model cost", async () => {
    const aiCredits = {
      debitForShopkeeperGeneration: jest.fn().mockResolvedValue({
        skipped: false,
        ledgerEntry: {},
        balanceAfter: 85,
      }),
      refundCredits: jest.fn(),
    };
    const redis = { set: jest.fn(), get: jest.fn(), isAvailable: jest.fn() };
    const service = new DesignVariationsService(
      { get: jest.fn().mockReturnValue("") } as unknown as ConfigService,
      redis as never,
      {} as never,
      aiCredits as never,
      {} as never,
      {} as never,
      {} as never,
    );
    const spec = {
      id: "variation-1",
      title: "Ring",
      styleSummary: "Classic",
      description: "A classic ring",
      jewelryType: "RING",
      buildMethod: "METHOD_A",
      metalType: "GOLD_22K",
      estimatedWeight: 3,
      hasGemstones: false,
      estimatedCost: {
        metal: 1,
        making: 1,
        gemstones: 0,
        finish: 0,
        total: 2,
        currency: "INR",
      },
      highlights: [],
    };
    jest
      .spyOn(service as never, "callGeminiForSpecs" as never)
      .mockResolvedValue([spec] as never);
    jest
      .spyOn(service as never, "applyLiveCosts" as never)
      .mockResolvedValue([spec] as never);

    await service.generateSpecsOnly(
      "user-1",
      { prompt: "A classic gold ring", model: "imagen-ultra" },
      { shopId: "shop-1" },
    );

    expect(aiCredits.debitForShopkeeperGeneration).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 15 }),
    );
  });
});
