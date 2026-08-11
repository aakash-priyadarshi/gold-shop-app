import { describe, expect, it } from "vitest";
import {
  calculateLineWastage,
  getWastageFormulaText,
  resolveWastageRule,
} from "./wastage";

describe("resolveWastageRule", () => {
  it("enables weight % for Sri Lanka by default", () => {
    const rule = resolveWastageRule("LK");
    expect(rule.mode).toBe("WEIGHT_PERCENT");
    expect(rule.percent).toBe(6);
    expect(rule.source).toBe("country");
  });

  it("disables wastage for US by default", () => {
    const rule = resolveWastageRule("US");
    expect(rule.mode).toBe("DISABLED");
    expect(rule.percent).toBe(0);
  });

  it("maps GB to UK disabled default", () => {
    const rule = resolveWastageRule("GB");
    expect(rule.market).toBe("UK");
    expect(rule.mode).toBe("DISABLED");
  });

  it("lets shop force weight % with custom percent", () => {
    const rule = resolveWastageRule("US", {
      billingWastageMode: "WEIGHT_PERCENT",
      billingWastagePercent: 8,
    });
    expect(rule.mode).toBe("WEIGHT_PERCENT");
    expect(rule.percent).toBe(8);
    expect(rule.source).toBe("shop");
  });

  it("lets shop disable even in LK", () => {
    const rule = resolveWastageRule("LK", {
      billingWastageMode: "DISABLED",
    });
    expect(rule.mode).toBe("DISABLED");
  });

  it("AUTO with shop percent override keeps country mode", () => {
    const rule = resolveWastageRule("IN", {
      billingWastageMode: "AUTO",
      billingWastagePercent: 7,
    });
    expect(rule.mode).toBe("WEIGHT_PERCENT");
    expect(rule.percent).toBe(7);
    expect(rule.source).toBe("shop");
  });
});

describe("calculateLineWastage", () => {
  it("calculates weight-based wastage", () => {
    const result = calculateLineWastage(
      { metalCost: 10000, metalWeightG: 10 },
      { mode: "WEIGHT_PERCENT", percent: 5, label: "Wastage" },
    );
    expect(result.wastageWeightG).toBe(0.5);
    expect(result.ratePerGram).toBe(1000);
    expect(result.wastageCost).toBe(500);
    expect(result.billableWeightG).toBe(10.5);
    expect(result.fellBackToValuePercent).toBe(false);
  });

  it("calculates metal-value wastage", () => {
    const result = calculateLineWastage(
      { metalCost: 10000 },
      { mode: "METAL_VALUE_PERCENT", percent: 5, label: "Wastage" },
    );
    expect(result.wastageCost).toBe(500);
    expect(result.mode).toBe("METAL_VALUE_PERCENT");
  });

  it("falls back to value % when weight missing", () => {
    const result = calculateLineWastage(
      { metalCost: 8000 },
      { mode: "WEIGHT_PERCENT", percent: 10, label: "Wastage" },
    );
    expect(result.fellBackToValuePercent).toBe(true);
    expect(result.wastageCost).toBe(800);
  });

  it("returns zero when disabled", () => {
    const result = calculateLineWastage(
      { metalCost: 10000, metalWeightG: 10 },
      { mode: "DISABLED", percent: 5, label: "Wastage" },
    );
    expect(result.wastageCost).toBe(0);
  });

  it("honours per-line percent override", () => {
    const result = calculateLineWastage(
      { metalCost: 10000, metalWeightG: 10, wastagePercent: 10 },
      { mode: "WEIGHT_PERCENT", percent: 5, label: "Wastage" },
    );
    expect(result.wastageCost).toBe(1000);
    expect(result.percent).toBe(10);
  });
});

describe("getWastageFormulaText", () => {
  it("includes weight formula steps", () => {
    const text = getWastageFormulaText("WEIGHT_PERCENT");
    expect(text).toContain("Wastage grams");
    expect(text).toContain("Rate per gram");
  });
});
