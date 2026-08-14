import { describe, expect, it } from "vitest";
import { shouldUsePrepaidVariationSlot } from "./variation-billing";

describe("shouldUsePrepaidVariationSlot", () => {
  it("ignores blank variationOf tokens", () => {
    expect(
      shouldUsePrepaidVariationSlot({
        variationOf: "   ",
        redisAvailable: true,
        prepaidRemaining: 5,
      }),
    ).toBe(false);
  });

  it("bills the wallet for a single image with no variationOf", () => {
    expect(
      shouldUsePrepaidVariationSlot({
        variationOf: undefined,
        redisAvailable: true,
        prepaidRemaining: 5,
      }),
    ).toBe(false);
  });

  it("uses prepaid slots when a 5-pack token remains", () => {
    expect(
      shouldUsePrepaidVariationSlot({
        variationOf: "gold ring",
        redisAvailable: true,
        prepaidRemaining: 5,
      }),
    ).toBe(true);
  });

  it("falls back to wallet when the prepaid pack is exhausted or missing", () => {
    expect(
      shouldUsePrepaidVariationSlot({
        variationOf: "gold ring",
        redisAvailable: true,
        prepaidRemaining: 0,
      }),
    ).toBe(false);
    expect(
      shouldUsePrepaidVariationSlot({
        variationOf: "gold ring",
        redisAvailable: true,
        prepaidRemaining: null,
      }),
    ).toBe(false);
  });

  it("does not double-charge a paid batch if Redis is down", () => {
    expect(
      shouldUsePrepaidVariationSlot({
        variationOf: "gold ring",
        redisAvailable: false,
        prepaidRemaining: null,
      }),
    ).toBe(true);
  });
});
