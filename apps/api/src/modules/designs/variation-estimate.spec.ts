import {
  applyCostBreakdown,
  asSupportedCountry,
  specToEstimateRequest,
  specToResolverComposition,
} from "./variation-estimate";
import type { DesignVariationSpec } from "./design-variations.service";

const spec = (over: Partial<DesignVariationSpec> = {}): DesignVariationSpec => ({
  id: "var-1",
  title: "Test",
  styleSummary: "s",
  description: "d",
  jewelryType: "RING",
  buildMethod: "METHOD_A",
  metalType: "GOLD_22K",
  estimatedWeight: 4,
  hasGemstones: true,
  primaryStone: "DIAMOND",
  stoneCarat: 0.5,
  stoneCount: 1,
  estimatedCost: {
    metal: 1,
    making: 1,
    gemstones: 1,
    finish: 1,
    total: 4,
    currency: "INR",
  },
  highlights: [],
  ...over,
});

describe("variation-estimate", () => {
  it("maps gold specs to Method A with live-rate metal code", () => {
    const req = specToEstimateRequest(spec(), {
      country: asSupportedCountry("IN"),
      currency: "INR",
      shopId: "shop-1",
    });
    expect(req.buildMethod).toBe("METHOD_A");
    expect(req.methodA?.metal).toBe("GOLD_22K");
    expect(req.methodA?.totalWeightG).toBe(4);
    expect(req.gemstones?.[0]?.stoneType).toBe("DIAMOND");
    expect(req.shopId).toBe("shop-1");
  });

  it("builds resolver composition for shop metal + gemstone rates", () => {
    const composition = specToResolverComposition(
      spec({
        gemstones: [
          {
            stoneType: "RUBY",
            count: 2,
            sizeValue: 0.3,
            sizeUnit: "CARAT",
          },
        ],
      }),
    );
    expect(composition.metalType).toBe("GOLD_22K");
    expect(composition.gemstones[0].type).toBe("RUBY");
    expect(composition.gemstones[0].count).toBe(2);
  });

  it("keeps Gemini costs when live total is zero", () => {
    const original = spec();
    const next = applyCostBreakdown(original, {
      metal: 0,
      making: 0,
      gemstones: 0,
      finish: 0,
      total: 0,
      currency: "INR",
    });
    expect(next.estimatedCost.total).toBe(4);
  });
});
