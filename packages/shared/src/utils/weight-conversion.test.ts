/**
 * Weight Conversion Utilities — Comprehensive Test Suite
 *
 * Covers all units (GRAM, KILOGRAM, TOLA, LAAL, OUNCE, POUND),
 * market-specific defaults, formatting, rounding, and edge cases.
 */

import {
  convertWeight,
  fromGrams,
  formatWeight,
  formatWeightFromGrams,
  getDefaultWeightUnit,
  getSupportedWeightUnits,
  isWeightUnitSupported,
  roundWeight,
  toGrams,
  WEIGHT_CONVERSION_FACTORS,
  WEIGHT_UNIT_CONFIG,
} from "../utils/weight-conversion";
import type { WeightUnit } from "../utils/weight-conversion";

describe("Weight Conversion — Constants", () => {
  test("all units have conversion factors", () => {
    const units: WeightUnit[] = [
      "GRAM",
      "KILOGRAM",
      "TOLA",
      "LAAL",
      "OUNCE",
      "POUND",
    ];
    for (const u of units) {
      expect(WEIGHT_CONVERSION_FACTORS[u]).toBeGreaterThan(0);
    }
  });

  test("tola = 11.6638 grams (traditional South Asian)", () => {
    expect(WEIGHT_CONVERSION_FACTORS.TOLA).toBeCloseTo(11.6638, 4);
  });

  test("laal = 1/100 tola = 0.116638 grams (Nepal)", () => {
    expect(WEIGHT_CONVERSION_FACTORS.LAAL).toBeCloseTo(0.116638, 6);
    expect(WEIGHT_CONVERSION_FACTORS.TOLA / 100).toBeCloseTo(
      WEIGHT_CONVERSION_FACTORS.LAAL,
      6,
    );
  });

  test("troy ounce = 31.1035 grams", () => {
    expect(WEIGHT_CONVERSION_FACTORS.OUNCE).toBeCloseTo(31.1035, 4);
  });

  test("kilogram = 1000 grams", () => {
    expect(WEIGHT_CONVERSION_FACTORS.KILOGRAM).toBe(1000);
  });

  test("all units have display config (symbol, name, decimals)", () => {
    const units: WeightUnit[] = [
      "GRAM",
      "KILOGRAM",
      "TOLA",
      "LAAL",
      "OUNCE",
      "POUND",
    ];
    for (const u of units) {
      const cfg = WEIGHT_UNIT_CONFIG[u];
      expect(cfg.symbol).toBeTruthy();
      expect(cfg.displayName).toBeTruthy();
      expect(cfg.displayNamePlural).toBeTruthy();
      expect(cfg.decimals).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("toGrams", () => {
  test("1 gram → 1g", () => {
    expect(toGrams(1, "GRAM")).toBe(1);
  });

  test("1 tola → 11.6638g", () => {
    expect(toGrams(1, "TOLA")).toBeCloseTo(11.6638, 4);
  });

  test("10 tola → 116.638g", () => {
    expect(toGrams(10, "TOLA")).toBeCloseTo(116.638, 3);
  });

  test("1 laal → 0.116638g", () => {
    expect(toGrams(1, "LAAL")).toBeCloseTo(0.116638, 6);
  });

  test("100 laal = 1 tola", () => {
    expect(toGrams(100, "LAAL")).toBeCloseTo(toGrams(1, "TOLA"), 4);
  });

  test("1 kg → 1000g", () => {
    expect(toGrams(1, "KILOGRAM")).toBe(1000);
  });

  test("1 troy ounce → 31.1035g", () => {
    expect(toGrams(1, "OUNCE")).toBeCloseTo(31.1035, 4);
  });

  test("1 pound → 453.59237g", () => {
    expect(toGrams(1, "POUND")).toBeCloseTo(453.59237, 4);
  });

  test("throws on NaN", () => {
    expect(() => toGrams(NaN, "GRAM")).toThrow("Invalid weight value");
  });

  test("throws on non-number", () => {
    expect(() => toGrams("10" as unknown as number, "GRAM")).toThrow(
      "Invalid weight value",
    );
  });

  test("throws on unknown unit", () => {
    expect(() => toGrams(10, "UNKNOWN" as WeightUnit)).toThrow(
      "Unknown weight unit",
    );
  });

  test("0 grams → 0", () => {
    expect(toGrams(0, "GRAM")).toBe(0);
  });

  test("handles fractional tola values (e.g. 1.5 tola)", () => {
    expect(toGrams(1.5, "TOLA")).toBeCloseTo(17.4957, 3);
  });
});

describe("fromGrams", () => {
  test("11.6638g → 1 tola", () => {
    expect(fromGrams(11.6638, "TOLA")).toBeCloseTo(1, 4);
  });

  test("1000g → 1 kg", () => {
    expect(fromGrams(1000, "KILOGRAM")).toBe(1);
  });

  test("31.1035g → 1 ounce", () => {
    expect(fromGrams(31.1035, "OUNCE")).toBeCloseTo(1, 4);
  });

  test("round-trip: grams → tola → grams", () => {
    const original = 100;
    const tola = fromGrams(original, "TOLA");
    const back = toGrams(tola, "TOLA");
    expect(back).toBeCloseTo(original, 2);
  });

  test("round-trip: grams → laal → grams", () => {
    const original = 5;
    const laal = fromGrams(original, "LAAL");
    const back = toGrams(laal, "LAAL");
    expect(back).toBeCloseTo(original, 4);
  });

  test("throws on NaN", () => {
    expect(() => fromGrams(NaN, "GRAM")).toThrow("Invalid weight value");
  });

  test("throws on unknown unit", () => {
    expect(() => fromGrams(10, "FOO" as WeightUnit)).toThrow(
      "Unknown weight unit",
    );
  });
});

describe("convertWeight", () => {
  test("1 tola → 11.6638 grams", () => {
    expect(convertWeight(1, "TOLA", "GRAM")).toBeCloseTo(11.6638, 4);
  });

  test("100 grams → 8.573 tola", () => {
    expect(convertWeight(100, "GRAM", "TOLA")).toBeCloseTo(8.5735, 3);
  });

  test("1 kg → 85.735 tola", () => {
    expect(convertWeight(1, "KILOGRAM", "TOLA")).toBeCloseTo(85.735, 2);
  });

  test("1 tola → 100 laal", () => {
    expect(convertWeight(1, "TOLA", "LAAL")).toBeCloseTo(100, 1);
  });

  test("1 ounce → 2.667 tola", () => {
    expect(convertWeight(1, "OUNCE", "TOLA")).toBeCloseTo(2.6667, 3);
  });

  test("same unit → same value", () => {
    expect(convertWeight(10, "GRAM", "GRAM")).toBe(10);
    expect(convertWeight(5, "TOLA", "TOLA")).toBe(5);
  });
});

describe("formatWeight", () => {
  test("formats grams with symbol", () => {
    expect(formatWeight(10.5, "GRAM")).toBe("10.5 g");
  });

  test("formats tola with symbol", () => {
    expect(formatWeight(2.5, "TOLA")).toBe("2.5 tola");
  });

  test("respects decimals config (tola = 2 decimals)", () => {
    expect(formatWeight(2.567, "TOLA")).toBe("2.57 tola");
  });

  test("hides symbol when showSymbol=false", () => {
    expect(formatWeight(10, "GRAM", { showSymbol: false })).toBe("10");
  });

  test("handles zero", () => {
    expect(formatWeight(0, "GRAM")).toBe("0 g");
  });
});

describe("formatWeightFromGrams", () => {
  test("converts and formats grams → tola", () => {
    // 11.6638g = 1 tola
    const result = formatWeightFromGrams(11.6638, "TOLA");
    expect(result).toContain("tola");
  });

  test("shows grams equivalent when showGramsEquivalent=true", () => {
    const result = formatWeightFromGrams(100, "TOLA", {
      showGramsEquivalent: true,
    });
    expect(result).toContain("~");
    expect(result).toContain("g");
  });

  test("does not show grams equivalent for GRAM unit", () => {
    const result = formatWeightFromGrams(100, "GRAM", {
      showGramsEquivalent: true,
    });
    expect(result).not.toContain("~");
  });
});

describe("roundWeight", () => {
  test("rounds tola to 2 decimals", () => {
    expect(roundWeight(2.567, "TOLA")).toBe(2.57);
  });

  test("rounds gram to 2 decimals", () => {
    expect(roundWeight(10.456, "GRAM")).toBe(10.46);
  });

  test("rounds laal to 1 decimal", () => {
    expect(roundWeight(5.67, "LAAL")).toBe(5.7);
  });

  test("throws on unknown unit", () => {
    expect(() => roundWeight(10, "FOO" as WeightUnit)).toThrow(
      "Unknown weight unit",
    );
  });
});

describe("Market-specific weight units", () => {
  test("Nepal supports GRAM, TOLA, LAAL", () => {
    const units = getSupportedWeightUnits("NP");
    expect(units).toContain("GRAM");
    expect(units).toContain("TOLA");
    expect(units).toContain("LAAL");
  });

  test("India supports GRAM, KILOGRAM, TOLA", () => {
    const units = getSupportedWeightUnits("IN");
    expect(units).toContain("GRAM");
    expect(units).toContain("TOLA");
    expect(units).toContain("KILOGRAM");
  });

  test("US supports GRAM, OUNCE, POUND", () => {
    const units = getSupportedWeightUnits("US");
    expect(units).toContain("OUNCE");
    expect(units).toContain("POUND");
  });

  test("UAE supports GRAM, TOLA, OUNCE", () => {
    const units = getSupportedWeightUnits("AE");
    expect(units).toContain("TOLA");
    expect(units).toContain("OUNCE");
  });

  test("unknown country falls back to US defaults", () => {
    const units = getSupportedWeightUnits("XX");
    expect(units).toContain("OUNCE");
  });

  test("Nepal default = TOLA", () => {
    expect(getDefaultWeightUnit("NP")).toBe("TOLA");
  });

  test("India default = GRAM", () => {
    expect(getDefaultWeightUnit("IN")).toBe("GRAM");
  });

  test("US default = OUNCE", () => {
    expect(getDefaultWeightUnit("US")).toBe("OUNCE");
  });

  test("unknown country default = GRAM", () => {
    expect(getDefaultWeightUnit("XX")).toBe("GRAM");
  });
});

describe("isWeightUnitSupported", () => {
  test("TOLA is supported in Nepal", () => {
    expect(isWeightUnitSupported("TOLA", "NP")).toBe(true);
  });

  test("LAAL is supported in Nepal", () => {
    expect(isWeightUnitSupported("LAAL", "NP")).toBe(true);
  });

  test("LAAL is NOT supported in India", () => {
    expect(isWeightUnitSupported("LAAL", "IN")).toBe(false);
  });

  test("OUNCE is NOT supported in Nepal", () => {
    expect(isWeightUnitSupported("OUNCE", "NP")).toBe(false);
  });

  test("GRAM is supported everywhere", () => {
    expect(isWeightUnitSupported("GRAM", "NP")).toBe(true);
    expect(isWeightUnitSupported("GRAM", "IN")).toBe(true);
    expect(isWeightUnitSupported("GRAM", "US")).toBe(true);
    expect(isWeightUnitSupported("GRAM", "AE")).toBe(true);
  });
});

describe("Real-world jewellery scenarios", () => {
  test("Nepali gold ring: 1 tola 22K gold", () => {
    const tolaWeight = 1;
    const grams = toGrams(tolaWeight, "TOLA");
    expect(grams).toBeCloseTo(11.6638, 3);
    // At NPR 6000/g, cost = 11.6638 * 6000 = 69982.8
    const costAt6000PerGram = grams * 6000;
    expect(costAt6000PerGram).toBeCloseTo(69982.8, 1);
  });

  test("Nepali silver bangle: 5 tola silver", () => {
    const grams = toGrams(5, "TOLA");
    expect(grams).toBeCloseTo(58.319, 2);
  });

  test("Indian gold chain: 20g → display in grams (IN default)", () => {
    const unit = getDefaultWeightUnit("IN");
    expect(unit).toBe("GRAM");
    const display = formatWeightFromGrams(20, unit);
    expect(display).toContain("g");
  });

  test("US gold coin: 1 troy ounce", () => {
    const grams = toGrams(1, "OUNCE");
    expect(grams).toBeCloseTo(31.1035, 3);
    // 1 troy ounce = 2.667 tola
    const inTola = convertWeight(1, "OUNCE", "TOLA");
    expect(inTola).toBeCloseTo(2.667, 2);
  });

  test("Nepali jeweller enters 2.5 tola, system stores in grams", () => {
    const displayValue = 2.5;
    const unit: WeightUnit = "TOLA";
    const storedGrams = toGrams(displayValue, unit);
    expect(storedGrams).toBeCloseTo(29.1595, 3);
    // When displayed again in tola, should show 2.5
    const redisplayed = fromGrams(storedGrams, "TOLA");
    expect(redisplayed).toBeCloseTo(2.5, 2);
  });
});
