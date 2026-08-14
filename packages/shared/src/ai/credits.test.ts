import { describe, expect, it } from "vitest";
import {
  AI_CREDIT_COSTS,
  formatAiCredits,
  hasEnoughAiCredits,
  toCreditNumber,
} from "./credits";

describe("AI credit math", () => {
  it("rounds to two decimal places", () => {
    expect(toCreditNumber("12.5")).toBe(12.5);
    expect(toCreditNumber(0.2500001)).toBe(0.25);
    expect(toCreditNumber({ toNumber: () => 100 })).toBe(100);
  });

  it("formats whole credits without trailing zeros", () => {
    expect(formatAiCredits(100)).toBe("100");
    expect(formatAiCredits(0.25)).toBe("0.25");
  });

  it("unlocks AI description when balance covers 0.25", () => {
    expect(hasEnoughAiCredits(0.25, AI_CREDIT_COSTS.PRODUCT_DESCRIPTION)).toBe(
      true,
    );
    expect(hasEnoughAiCredits(0.24, AI_CREDIT_COSTS.PRODUCT_DESCRIPTION)).toBe(
      false,
    );
    expect(hasEnoughAiCredits(1, AI_CREDIT_COSTS.DESIGN_IMAGE)).toBe(true);
    expect(AI_CREDIT_COSTS.DESIGN_VARIATIONS).toBe(
      AI_CREDIT_COSTS.DESIGN_IMAGE * 5,
    );
  });
});
