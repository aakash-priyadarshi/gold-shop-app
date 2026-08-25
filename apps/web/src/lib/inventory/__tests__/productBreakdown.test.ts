import { describe, expect, it } from "vitest";
import {
  buildProductBreakdown,
  hasPricingBreakdown,
  parseMetalFromComposition,
  parseProductGemstones,
} from "../productBreakdown";

describe("parseMetalFromComposition", () => {
  it("reads baseAlloy metal and purity", () => {
    expect(
      parseMetalFromComposition({
        baseAlloy: { metal: "GOLD", purity: "22K" },
      }),
    ).toEqual({ metalType: "GOLD", purity: "22K" });
  });

  it("falls back to top-level fields and metalPurity", () => {
    expect(
      parseMetalFromComposition({ metal: "SILVER", purity: "925" }, "18K"),
    ).toEqual({ metalType: "SILVER", purity: "925" });
    expect(parseMetalFromComposition({}, "18K")).toEqual({
      metalType: "",
      purity: "18K",
    });
  });
});

describe("parseProductGemstones", () => {
  it("prefers direct gemstones when non-empty", () => {
    const gems = parseProductGemstones({
      composition: {
        gemstones: [
          {
            type: "Ignored",
            valueNpr: 1,
          },
        ],
      },
      gemstones: [
        {
          type: "Diamond",
          shape: "Oval",
          cut: "Oval",
          caratWeight: 0.5,
          color: "G",
          clarity: "VS1",
          lab: "GIA",
          certNumber: "2141438171",
          valueNpr: 25000,
        },
      ],
    });
    expect(gems).toHaveLength(1);
    expect(gems[0]).toMatchObject({
      type: "Diamond",
      shape: "Oval",
      cut: "Oval",
      caratWeight: 0.5,
      color: "G",
      clarity: "VS1",
      lab: "GIA",
      certNumber: "2141438171",
      valueNpr: 25000,
    });
  });

  it("falls back to composition.gemstones when direct gemstones is empty or absent", () => {
    const gems = parseProductGemstones({
      composition: {
        gemstones: [
          {
            type: "Ruby",
            shape: "Round",
            cut: "Round",
            caratWeight: 1.0,
            valueNpr: 15000,
          },
        ],
      },
      gemstones: [],
    });
    expect(gems).toHaveLength(1);
    expect(gems[0]).toMatchObject({
      type: "Ruby",
      shape: "Round",
      cut: "Round",
      caratWeight: 1.0,
      valueNpr: 15000,
    });
  });

  it("skips rows without a type", () => {
    expect(
      parseProductGemstones({
        composition: { gemstones: [{ cut: "Round", valueNpr: 10 }] },
      }),
    ).toEqual([]);
  });
});

describe("buildProductBreakdown", () => {
  it("splits metal, making, gems, tax and wastage for customer display", () => {
    const breakdown = buildProductBreakdown({
      composition: {
        baseAlloy: { metal: "GOLD", purity: "22K" },
        gemstones: [
          { type: "Ruby", caratWeight: 1.2, valueNpr: 8000 },
          { type: "Diamond", caratWeight: 0.3, valueNpr: 12000 },
        ],
      },
      totalWeightGrams: 11.66,
      metalValueNpr: 100000,
      makingChargeNpr: 15000,
      wastagePercent: 4,
      gemstoneValueNpr: 20000,
      taxNpr: 500,
      totalPriceNpr: 135500,
    });

    expect(breakdown.metalType).toBe("GOLD");
    expect(breakdown.purity).toBe("22K");
    expect(breakdown.weightGrams).toBe(11.66);
    expect(breakdown.gemstoneCarats).toBe(1.5);
    expect(breakdown.gemstoneWeightGrams).toBe(0.3);
    expect(breakdown.grossWeightGrams).toBe(11.96);
    expect(breakdown.metalValue).toBe(100000);
    expect(breakdown.makingCharge).toBe(15000);
    expect(breakdown.wastagePercent).toBe(4);
    expect(breakdown.wastageAmount).toBe(4000);
    expect(breakdown.gemstoneValue).toBe(20000);
    expect(breakdown.gemstones).toHaveLength(2);
    expect(breakdown.tax).toBe(500);
    expect(breakdown.catalogTotal).toBe(135500);
    expect(breakdown.estimatedBill).toBe(139500);
  });

  it("sums gemstone lines when gemstoneValueNpr is missing", () => {
    const breakdown = buildProductBreakdown({
      composition: {
        gemstones: [{ type: "Emerald", valueNpr: 3000 }],
      },
      metalValueNpr: 10000,
    });
    expect(breakdown.gemstoneValue).toBe(3000);
    expect(breakdown.catalogTotal).toBe(13000);
    expect(breakdown.estimatedBill).toBe(13000);
  });

  it("uses the server-derived gross weight when supplied", () => {
    expect(
      buildProductBreakdown({
        totalWeightGrams: 5,
        grossWeightGrams: 5.25,
        composition: { gemstones: [{ type: "Diamond", caratWeight: 1 }] },
      }).grossWeightGrams,
    ).toBe(5.25);
  });
});

describe("hasPricingBreakdown", () => {
  it("is false when the piece has only a flat total", () => {
    expect(
      hasPricingBreakdown(
        buildProductBreakdown({ totalPriceNpr: 5000 }),
      ),
    ).toBe(false);
  });

  it("is true when wastage or metal is present", () => {
    expect(
      hasPricingBreakdown(
        buildProductBreakdown({ metalValueNpr: 100, wastagePercent: 2 }),
      ),
    ).toBe(true);
  });
});
