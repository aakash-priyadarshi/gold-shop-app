/**
 * Live Market Rates — Autofill Calculation Tests
 *
 * Tests the core calculation logic used by the invoice create page's
 * "Live" autofill button: cost = weight(g) × rate per gram.
 *
 * The actual UI logic lives in the invoice page component, but the
 * mathematical formula is tested here in isolation.
 */

import { toGrams, fromGrams, type WeightUnit } from "@gold-shop/shared";

describe("Live Rates Autofill — Core Calculation", () => {
  // Simulates the autofillMetalCost function from the invoice page
  function calculateMetalCost(
    displayWeight: number,
    unit: WeightUnit,
    ratePerGram: number,
  ): number {
    const weightGrams = toGrams(displayWeight, unit);
    return weightGrams * ratePerGram;
  }

  describe("Gram input", () => {
    test("10g gold at NPR 6000/g = NPR 60000", () => {
      expect(calculateMetalCost(10, "GRAM", 6000)).toBe(60000);
    });

    test("0g → 0 cost", () => {
      expect(calculateMetalCost(0, "GRAM", 6000)).toBe(0);
    });

    test("fractional weight: 10.5g at 5500/g = 57750", () => {
      expect(calculateMetalCost(10.5, "GRAM", 5500)).toBe(57750);
    });
  });

  describe("Tola input (Nepal default)", () => {
    test("1 tola at NPR 6000/g = NPR 69982.8", () => {
      const cost = calculateMetalCost(1, "TOLA", 6000);
      expect(cost).toBeCloseTo(69982.8, 1);
    });

    test("5 tola at NPR 7000/g = NPR 408233", () => {
      const cost = calculateMetalCost(5, "TOLA", 7000);
      expect(cost).toBeCloseTo(408233, 0);
    });

    test("2.5 tola at NPR 5500/g", () => {
      const cost = calculateMetalCost(2.5, "TOLA", 5500);
      const expectedGrams = 2.5 * 11.6638;
      expect(cost).toBeCloseTo(expectedGrams * 5500, 1);
    });
  });

  describe("Laal input (Nepal local unit)", () => {
    test("100 laal = 1 tola at NPR 6000/g", () => {
      const cost100Laal = calculateMetalCost(100, "LAAL", 6000);
      const cost1Tola = calculateMetalCost(1, "TOLA", 6000);
      expect(cost100Laal).toBeCloseTo(cost1Tola, 1);
    });
  });

  describe("Ounce input (US default)", () => {
    test("1 troy ounce at $2000/g = $62207", () => {
      const cost = calculateMetalCost(1, "OUNCE", 2000);
      expect(cost).toBeCloseTo(62207, 0);
    });
  });

  describe("Edge cases", () => {
    test("zero rate → zero cost", () => {
      expect(calculateMetalCost(10, "GRAM", 0)).toBe(0);
    });

    test("negative weight should produce negative cost (validation is UI-side)", () => {
      expect(calculateMetalCost(-5, "GRAM", 1000)).toBe(-5000);
    });

    test("very small weight: 0.1g at 6000/g = 600", () => {
      expect(calculateMetalCost(0.1, "GRAM", 6000)).toBeCloseTo(600, 1);
    });

    test("very large weight: 1000g (1kg) at 6000/g = 6,000,000", () => {
      expect(calculateMetalCost(1000, "GRAM", 6000)).toBe(6000000);
    });
  });

  describe("Rate per gram derivation from market data", () => {
    // Simulates the readMetalRate function from the invoice page
    function readMetalRate(data: any, codes: string[]): number {
      const metals = data?.metals;
      if (Array.isArray(metals)) {
        const match = metals.find((m: any) => codes.includes(m.code));
        return Number(match?.ratePerGram ?? match?.rate ?? 0);
      }
      if (metals && typeof metals === "object") {
        for (const code of codes) {
          const value = metals[code];
          if (typeof value === "number") return value;
          if (value && typeof value === "object")
            return Number(value.ratePerGram ?? value.rate ?? 0);
        }
      }
      return 0;
    }

    test("reads rate from array format", () => {
      const data = {
        metals: [
          { code: "GOLD_24K", ratePerGram: 6000 },
          { code: "SILVER_999", ratePerGram: 75 },
        ],
      };
      expect(readMetalRate(data, ["GOLD_24K", "XAU", "GOLD"])).toBe(6000);
      expect(readMetalRate(data, ["SILVER_999", "XAG", "SILVER"])).toBe(75);
    });

    test("reads rate from object format", () => {
      const data = {
        metals: {
          GOLD_24K: { ratePerGram: 6500 },
          SILVER: 80,
        },
      };
      expect(readMetalRate(data, ["GOLD_24K", "XAU"])).toBe(6500);
      expect(readMetalRate(data, ["SILVER", "XAG"])).toBe(80);
    });

    test("falls back through multiple codes", () => {
      const data = { metals: { XAU: 6200 } };
      expect(readMetalRate(data, ["GOLD_24K", "XAU", "GOLD"])).toBe(6200);
    });

    test("returns 0 when no match", () => {
      const data = { metals: [{ code: "OTHER", ratePerGram: 100 }] };
      expect(readMetalRate(data, ["GOLD_24K"])).toBe(0);
    });

    test("returns 0 when metals is undefined", () => {
      expect(readMetalRate({}, ["GOLD_24K"])).toBe(0);
      expect(readMetalRate(null, ["GOLD_24K"])).toBe(0);
    });

    test("derives 22K from 24K when 22K not available", () => {
      const rate24k = 6000;
      const rate22k = rate24k * (22 / 24);
      expect(rate22k).toBeCloseTo(5500, 1);
    });

    test("derives 18K from 24K when 18K not available", () => {
      const rate24k = 6000;
      const rate18k = rate24k * (18 / 24);
      expect(rate18k).toBe(4500);
    });
  });

  describe("Display conversion (grams → display unit)", () => {
    test("100g displayed in tola = 8.574 tola", () => {
      const display = fromGrams(100, "TOLA");
      expect(display).toBeCloseTo(8.5735, 3);
    });

    test("100g displayed in grams = 100", () => {
      expect(fromGrams(100, "GRAM")).toBe(100);
    });

    test("round-trip: display → grams → display", () => {
      const original = 2.5;
      const grams = toGrams(original, "TOLA");
      const back = fromGrams(grams, "TOLA");
      expect(back).toBeCloseTo(original, 4);
    });
  });
});
