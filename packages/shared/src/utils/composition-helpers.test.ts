import { describe, expect, it } from "vitest";
import {
  extractGemstonesFromItem,
  extractMetalTypeFromComposition,
  extractPurityFromComposition,
  getGemstoneDisplayLabel,
  normalizeGemstoneCut,
  normalizeGemstoneType,
  normalizeMetalCode,
  normalizeMetalMarketKey,
} from "./composition-helpers";

describe("composition-helpers", () => {
  describe("normalizeMetalCode", () => {
    it("normalizes standard gold purities", () => {
      expect(normalizeMetalCode("GOLD", "24K")).toBe("GOLD_24K");
      expect(normalizeMetalCode("GOLD", "22K")).toBe("GOLD_22K");
      expect(normalizeMetalCode("GOLD", "18K")).toBe("GOLD_18K");
      expect(normalizeMetalCode("GOLD", "14K")).toBe("GOLD_14K");
      expect(normalizeMetalCode("GOLD", "10K")).toBe("GOLD_10K");
      expect(normalizeMetalCode("GOLD", 22)).toBe("GOLD_22K");
      expect(normalizeMetalCode("GOLD", "916")).toBe("GOLD_22K");
      expect(normalizeMetalCode("GOLD", 0.916)).toBe("GOLD_22K");
    });

    it("normalizes silver purities", () => {
      expect(normalizeMetalCode("SILVER", "999")).toBe("SILVER_999");
      expect(normalizeMetalCode("SILVER", "925")).toBe("SILVER_925");
      expect(normalizeMetalCode("SILVER")).toBe("SILVER_925");
    });

    it("normalizes platinum & palladium codes", () => {
      expect(normalizeMetalCode("PLATINUM", "950")).toBe("PLATINUM_950");
      expect(normalizeMetalCode("PLATINUM", "900")).toBe("PLATINUM_900");
      expect(normalizeMetalCode("PLATINUM_PT950")).toBe("PLATINUM_950");
      expect(normalizeMetalCode("PLATINUM_PT900")).toBe("PLATINUM_900");
      expect(normalizeMetalCode("PALLADIUM", "950")).toBe("PALLADIUM_950");
      expect(normalizeMetalCode("PALLADIUM_PD950")).toBe("PALLADIUM_950");
    });
  });

  describe("normalizeMetalMarketKey", () => {
    it("maps platinum and palladium to standard market rate keys", () => {
      expect(normalizeMetalMarketKey("PLATINUM_950")).toBe("PLATINUM_PT950");
      expect(normalizeMetalMarketKey("PLATINUM_PT950")).toBe("PLATINUM_PT950");
      expect(normalizeMetalMarketKey("PLATINUM_900")).toBe("PLATINUM_PT900");
      expect(normalizeMetalMarketKey("PALLADIUM_950")).toBe("PALLADIUM_PD950");
      expect(normalizeMetalMarketKey("PALLADIUM_PD950")).toBe("PALLADIUM_PD950");
      expect(normalizeMetalMarketKey("GOLD_22K")).toBe("GOLD_22K");
      expect(normalizeMetalMarketKey("SILVER_925")).toBe("SILVER_925");
    });
  });

  describe("extractMetalTypeFromComposition", () => {
    it("extracts from nested baseAlloy object (standard catalog product shape)", () => {
      const comp = {
        baseAlloy: {
          metal: "GOLD",
          purity: "22K",
        },
      };
      expect(extractMetalTypeFromComposition(comp)).toBe("GOLD_22K");
    });

    it("extracts from direct fields", () => {
      expect(extractMetalTypeFromComposition({ preciousMetal: "GOLD", purity: "24K" })).toBe("GOLD_24K");
      expect(extractMetalTypeFromComposition({ metal: "SILVER", purity: "999" })).toBe("SILVER_999");
      expect(extractMetalTypeFromComposition({ metalType: "GOLD_18K" })).toBe("GOLD_18K");
    });
  });

  describe("extractPurityFromComposition", () => {
    it("extracts gold karats (8K-24K) as fractional purity for explicit gold", () => {
      expect(extractPurityFromComposition({ baseAlloy: { metal: "GOLD", purity: "22K" } })).toBeCloseTo(0.916, 3);
      expect(extractPurityFromComposition({ baseAlloy: { metal: "GOLD", purity: "24K" } })).toBeCloseTo(0.999, 3);
      expect(extractPurityFromComposition({ metal: "GOLD", purity: 22 })).toBeCloseTo(0.916, 3);
      expect(extractPurityFromComposition({ preciousMetal: "GOLD", purity: 18 })).toBeCloseTo(0.75, 2);
      expect(extractPurityFromComposition({ metal: "GOLD", purity: 14 })).toBeCloseTo(0.585, 3);
      expect(extractPurityFromComposition({ metal: "GOLD", purity: 24 })).toBeCloseTo(0.999, 3);
      expect(extractPurityFromComposition({ purityPercent: 91.6 })).toBeCloseTo(0.916, 3);
    });

    it("does not treat numeric purity 8-24 as gold karats for non-gold or unspecified metals", () => {
      expect(extractPurityFromComposition({ metal: "SILVER", purity: 20 })).toBeCloseTo(0.20, 2);
      expect(extractPurityFromComposition({ baseAlloy: { metal: "PLATINUM", purity: 18 } })).toBeCloseTo(0.18, 2);
      expect(extractPurityFromComposition({ metal: "SILVER", purity: 92.5 })).toBeCloseTo(0.925, 3);
      expect(extractPurityFromComposition({ purity: 22 })).toBeCloseTo(0.22, 2);
    });
  });

  describe("gemstone helpers", () => {
    it("normalizes gemstone types and labels", () => {
      expect(normalizeGemstoneType("")).toBe("");
      expect(normalizeGemstoneType(null)).toBe("");
      expect(normalizeGemstoneType("Diamond")).toBe("DIAMOND");
      expect(normalizeGemstoneType("diamond")).toBe("DIAMOND");
      expect(normalizeGemstoneType("DIAMOND")).toBe("DIAMOND");
      expect(normalizeGemstoneType("ruby")).toBe("RUBY");
      expect(getGemstoneDisplayLabel("DIAMOND")).toBe("Diamond");
      expect(getGemstoneDisplayLabel("RUBY")).toBe("Ruby");
      expect(getGemstoneDisplayLabel("")).toBe("");
    });

    it("normalizes gemstone cuts", () => {
      expect(normalizeGemstoneCut("Round")).toBe("Round Brilliant");
      expect(normalizeGemstoneCut("round brilliant")).toBe("Round Brilliant");
      expect(normalizeGemstoneCut("Emerald Cut")).toBe("Emerald");
      expect(normalizeGemstoneCut("Princess")).toBe("Princess");
    });

    it("extracts gemstones recursively from SET items with quality, origin, count, and sizeMm", () => {
      const setItem = {
        jewelleryType: "SET",
        nameEn: "Bridal Set",
        setComponents: [
          {
            componentItem: {
              sku: "NECK-1",
              nameEn: "Necklace",
              composition: {
                gemstones: [
                  {
                    type: "DIAMOND",
                    cut: "Round",
                    caratWeight: 1.5,
                    clarity: "VVS1",
                    color: "D",
                    quality: "AAA",
                    origin: "NATURAL",
                    sizeMm: 6.5,
                    count: 1,
                    valueNpr: 150000,
                  },
                ],
              },
            },
          },
          {
            componentItem: {
              sku: "EAR-1",
              nameEn: "Earrings",
              composition: {
                gemstones: [
                  {
                    type: "RUBY",
                    cut: "Oval",
                    caratWeight: 0.8,
                    quality: "AA",
                    origin: "NATURAL",
                    count: 2,
                    valueNpr: 40000,
                  },
                ],
              },
            },
          },
        ],
      };

      const extracted = extractGemstonesFromItem(setItem);
      expect(extracted).toHaveLength(2);
      expect(extracted[0].type).toBe("DIAMOND");
      expect(extracted[0].cut).toBe("Round Brilliant");
      expect(extracted[0].caratWeight).toBe("1.5");
      expect(extracted[0].clarity).toBe("VVS1");
      expect(extracted[0].color).toBe("D");
      expect(extracted[0].quality).toBe("AAA");
      expect(extracted[0].origin).toBe("NATURAL");
      expect(extracted[0].sizeMm).toBe(6.5);
      expect(extracted[0].count).toBe(1);
      expect(extracted[0].cost).toBe("150000");
      expect(extracted[0].sourceItemLabel).toBe("Necklace");

      expect(extracted[1].type).toBe("RUBY");
      expect(extracted[1].cut).toBe("Oval");
      expect(extracted[1].quality).toBe("AA");
      expect(extracted[1].count).toBe(2);
      expect(extracted[1].cost).toBe("40000");
      expect(extracted[1].sourceItemLabel).toBe("Earrings");
    });

    it("uses OTHER as fallback type for generic gemstoneValueNpr", () => {
      const item = {
        nameEn: "Solitaire",
        sku: "SOL-1",
        gemstoneValueNpr: 50000,
      };
      const extracted = extractGemstonesFromItem(item);
      expect(extracted).toHaveLength(1);
      expect(extracted[0].type).toBe("OTHER");
      expect(extracted[0].cost).toBe("50000");
    });
  });
});
