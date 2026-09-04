import { describe, expect, it } from "vitest";
import {
  AI_CREDITS_BILLING_PATH,
  AI_CREDIT_COSTS,
  AI_VARIATION_BATCH_SIZE,
  AI_VARIATION_BATCH_TTL_SEC,
  formatAiCredits,
  hasEnoughAiCredits,
  toCreditNumber,
  variationBatchRedisKey,
  variationBatchModelRedisKey,
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

  it("treats null and NaN balances as zero", () => {
    expect(toCreditNumber(null)).toBe(0);
    expect(toCreditNumber(undefined)).toBe(0);
    expect(toCreditNumber("nope")).toBe(0);
  });

  it("keys the prepaid 5-pack in Redis per user", () => {
    expect(variationBatchRedisKey("user-1")).toBe("ai:varbatch:user-1");
    expect(variationBatchModelRedisKey("user-1")).toBe(
      "ai:varbatch:user-1:model",
    );
    expect(AI_VARIATION_BATCH_SIZE).toBe(5);
    expect(AI_VARIATION_BATCH_TTL_SEC).toBe(1800);
    expect(AI_CREDITS_BILLING_PATH).toContain("tab=credits");
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
    expect(hasEnoughAiCredits(4.99, AI_CREDIT_COSTS.DESIGN_VARIATIONS)).toBe(
      false,
    );
    expect(hasEnoughAiCredits(5, AI_CREDIT_COSTS.DESIGN_VARIATIONS)).toBe(true);
  });
});
