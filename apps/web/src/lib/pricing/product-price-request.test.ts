import { describe, expect, it } from "vitest";
import {
  buildProductGemstonePricingRequest,
  buildProductMetalPricingComposition,
} from "./product-price-request";

describe("buildProductMetalPricingComposition", () => {
  it("normalizes selected purity and converts one tola to grams before resolving", () => {
    expect(buildProductMetalPricingComposition({
      metalType: "GOLD", purity: "18K", enteredWeight: 1, weightUnit: "tola",
    })).toEqual({ metalType: "GOLD_18K", purity: "18K", metalWeightG: 11.6638 });
  });

  it("keeps gram weights unchanged and supports palladium purity", () => {
    expect(buildProductMetalPricingComposition({
      metalType: "PALLADIUM", purity: "500", enteredWeight: 2.5, weightUnit: "gram",
    })).toEqual({ metalType: "PALLADIUM_500", purity: "500", metalWeightG: 2.5 });
  });

  it("sends canonical diamond pricing inputs without turning clarity into quality", () => {
    expect(buildProductGemstonePricingRequest("shop-1", {
      type: "DIAMOND_LAB", origin: "LAB", caratWeight: 1,
      clarity: "VVS1", qualityTier: "PREMIUM", count: 2,
    })).toEqual({
      shopId: "shop-1", stoneType: "DIAMOND", origin: "LAB", caratWeight: 1,
      sizeMm: undefined, qualityTier: "PREMIUM", count: 2,
    });
  });

  it("requires a millimetre size for a non-diamond suggestion", () => {
    expect(() => buildProductGemstonePricingRequest("shop-1", {
      type: "RUBY", qualityTier: "STANDARD",
    })).toThrow("Size in mm is required");
  });
});
