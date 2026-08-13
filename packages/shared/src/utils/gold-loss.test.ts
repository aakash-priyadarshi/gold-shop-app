import { describe, expect, it } from "vitest";
import { computeGoldLoss, roundGrams, stageGoldLoss } from "./gold-loss";

describe("computeGoldLoss", () => {
  it("reconciles a 1kg casting tree with allowed 1%", () => {
    const result = computeGoldLoss({
      issuedGrams: 1000,
      finishedGrams: 920,
      sprueButtonGrams: 50,
      recoverableGrams: 20,
      allowedPercent: 1,
    });
    expect(result.accounted).toBe(990);
    expect(result.actualLoss).toBe(10);
    expect(result.allowedLoss).toBe(10);
    expect(result.unexplained).toBe(0);
  });

  it("flags unexplained loss above the allowed percent", () => {
    const result = computeGoldLoss({
      issuedGrams: 1000,
      finishedGrams: 900,
      sprueButtonGrams: 40,
      recoverableGrams: 10,
      allowedPercent: 1,
    });
    expect(result.actualLoss).toBe(50);
    expect(result.allowedLoss).toBe(10);
    expect(result.unexplained).toBe(40);
  });

  it("does not credit extra recovery as negative unexplained", () => {
    const result = computeGoldLoss({
      issuedGrams: 100,
      finishedGrams: 99,
      sprueButtonGrams: 1,
      recoverableGrams: 2,
      allowedPercent: 1,
    });
    expect(result.actualLoss).toBe(-2);
    expect(result.unexplained).toBe(0);
  });
});

describe("stageGoldLoss", () => {
  it("treats scrap plus dust as recoverable", () => {
    const result = stageGoldLoss({
      goldInGrams: 100,
      goldOutGrams: 96,
      scrapGrams: 2,
      dustGrams: 1,
      allowedPercent: 1,
    });
    expect(result.recoverable).toBe(3);
    expect(result.actualLoss).toBe(1);
    expect(result.unexplained).toBe(0);
  });
});

describe("roundGrams", () => {
  it("rounds to milligrams", () => {
    expect(roundGrams(1.23456)).toBe(1.235);
    expect(roundGrams(Number.NaN)).toBe(0);
  });
});
