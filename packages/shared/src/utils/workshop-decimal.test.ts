import { describe, expect, it } from "vitest";
import {
  GOLD_SCALE_QUANTUM_GRAMS,
  STONE_SCALE_QUANTUM_GRAMS,
  WORKSHOP_GOLD_995_MATERIAL_KEY,
  WORKSHOP_GOLD_995_PURITY,
  assertBalancedMicrograms,
  assertPositiveQuantumGrams,
  gramsToMicrograms,
  isQuantumMultiple,
  microgramsToGrams,
  sumMicrograms,
  WorkshopDecimalError,
} from "./workshop-decimal";

describe("workshop decimal grams", () => {
  it("keeps Gold 995 distinct from 24K/999 vault gold", () => {
    expect(WORKSHOP_GOLD_995_MATERIAL_KEY).toBe("goldGrains995");
    expect(WORKSHOP_GOLD_995_MATERIAL_KEY).not.toBe("goldGrains24k");
    expect(WORKSHOP_GOLD_995_PURITY).toBe("0.995");
  });

  it("round-trips decimal gram strings without Float", () => {
    expect(microgramsToGrams(gramsToMicrograms("100.25"))).toBe("100.250000");
    expect(microgramsToGrams(gramsToMicrograms("0.01"))).toBe("0.010000");
    expect(microgramsToGrams(gramsToMicrograms("0.001"))).toBe("0.001000");
  });

  it("accepts Gold Scale multiples of 0.01 g", () => {
    expect(GOLD_SCALE_QUANTUM_GRAMS).toBe("0.01");
    expect(isQuantumMultiple("100.25", "GOLD")).toBe(true);
    expect(isQuantumMultiple("0.01", "GOLD")).toBe(true);
    expect(() => assertPositiveQuantumGrams("100.25", "GOLD")).not.toThrow();
  });

  it("rejects Gold Scale weights that are not 0.01 g multiples", () => {
    expect(isQuantumMultiple("100.251", "GOLD")).toBe(false);
    expect(isQuantumMultiple("100.255", "GOLD")).toBe(false);
    expect(() => assertPositiveQuantumGrams("100.251", "GOLD")).toThrow(
      WorkshopDecimalError,
    );
  });

  it("accepts Stone Scale multiples of 0.001 g", () => {
    expect(STONE_SCALE_QUANTUM_GRAMS).toBe("0.001");
    expect(isQuantumMultiple("1.234", "STONE")).toBe(true);
    expect(isQuantumMultiple("1.2345", "STONE")).toBe(false);
  });

  it("rejects zero and negative physical weights", () => {
    expect(() => assertPositiveQuantumGrams("0", "GOLD")).toThrow(
      /greater than zero/,
    );
    expect(() => assertPositiveQuantumGrams("-0.01", "GOLD")).toThrow(
      /greater than zero/,
    );
  });

  it("rejects scientific notation and extra precision", () => {
    expect(() => gramsToMicrograms("1e-2")).toThrow(WorkshopDecimalError);
    expect(() => gramsToMicrograms("1.2345678")).toThrow(WorkshopDecimalError);
  });

  it("requires journal signed lines to sum to zero", () => {
    expect(() =>
      assertBalancedMicrograms(["-100.25", "100.25"]),
    ).not.toThrow();
    expect(() => assertBalancedMicrograms(["-100.25", "100.24"])).toThrow(
      /sum to 0/,
    );
    expect(
      sumMicrograms([
        gramsToMicrograms("-100.25"),
        gramsToMicrograms("100.25"),
      ]),
    ).toBe(0n);
  });
});
