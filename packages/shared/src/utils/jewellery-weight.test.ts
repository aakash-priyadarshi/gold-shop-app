import { describe, expect, it } from "vitest";
import {
  calculateGemstoneCarats,
  calculateGemstoneWeightGrams,
  calculateGrossWeightGrams,
} from "./jewellery-weight";

describe("jewellery weight", () => {
  const composition = {
    gemstones: [
      { type: "DIAMOND", caratWeight: 1.5 },
      { type: "RUBY", caratWeight: 0.75, count: 2 },
    ],
  };

  it("sums every gemstone line and optional count", () => {
    expect(calculateGemstoneCarats(composition)).toBe(3);
    expect(calculateGemstoneWeightGrams(composition)).toBe(0.6);
  });

  it("adds gemstone grams to metal weight", () => {
    expect(calculateGrossWeightGrams(10, composition)).toBe(10.6);
  });

  it("ignores invalid and negative inputs", () => {
    expect(
      calculateGrossWeightGrams("5", {
        gemstones: [
          { caratWeight: -2 },
          { caratWeight: "not-a-number" },
        ],
      }),
    ).toBe(5);
  });
});
