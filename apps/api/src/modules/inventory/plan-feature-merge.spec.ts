import { mergePlanFeatures } from "../../../prisma/seeds/plan-feature-merge";

describe("mergePlanFeatures", () => {
  it("writes new managed flags onto an existing plan row", () => {
    expect(
      mergePlanFeatures(
        { marketplace: true, aiDesignGeneration: true },
        { aiDesignGeneration: true, aiImageEnhancement: true },
      ),
    ).toEqual({
      marketplace: true,
      aiDesignGeneration: true,
      aiImageEnhancement: true,
    });
  });

  it("lets seeded values win without dropping extra custom flags", () => {
    expect(
      mergePlanFeatures(
        { customBranding: false, shopAddon: true, aiImageEnhancement: false },
        { customBranding: true, aiImageEnhancement: true },
      ),
    ).toEqual({
      customBranding: true,
      shopAddon: true,
      aiImageEnhancement: true,
    });
  });
});
