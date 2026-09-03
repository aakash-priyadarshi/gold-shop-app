import { describe, expect, it } from "vitest";
import {
  formatRatePerGram,
  isLiveMarketCache,
  parseMarketRatesPayload,
  readMetalRate,
} from "../market-rates";

describe("parseMarketRatesPayload", () => {
  it("reads object metals and nested axios/Nest wrappers", () => {
    const parsed = parseMarketRatesPayload({
      data: {
        metals: { GOLD_24K: 14515.47, GOLD_22K: 13305.85, SILVER_999: 168.2 },
        currency: "INR",
        cache: "hit",
        updatedAt: "2026-09-03T10:00:00.000Z",
        fx: { rate: 94.95 },
      },
    });
    expect(parsed?.currency).toBe("INR");
    expect(parsed?.metals.GOLD_24K).toBe(14515.47);
    expect(parsed?.cache).toBe("hit");
    expect(parsed?.fx?.rate).toBe(94.95);
  });

  it("reads legacy array metals", () => {
    const parsed = parseMarketRatesPayload({
      metals: [
        { code: "GOLD_24K", ratePerGram: 14515.47 },
        { code: "XAG", ratePerGram: 168.2 },
      ],
      currency: "INR",
      cache: "stale",
    });
    expect(readMetalRate(parsed, ["GOLD_24K"])).toBe(14515.47);
    expect(parsed?.metals.SILVER_999).toBe(168.2);
    expect(parsed?.cache).toBe("stale");
  });
});

describe("isLiveMarketCache", () => {
  it("treats hit/miss/fresh as live and stale/fallback as cached", () => {
    expect(isLiveMarketCache("hit")).toBe(true);
    expect(isLiveMarketCache("miss")).toBe(true);
    expect(isLiveMarketCache("fresh")).toBe(true);
    expect(isLiveMarketCache("stale")).toBe(false);
    expect(isLiveMarketCache("fallback")).toBe(false);
  });
});

describe("formatRatePerGram", () => {
  it("keeps two decimal places and does not integer-round", () => {
    expect(formatRatePerGram(14515.47)).toContain("515.47");
    expect(formatRatePerGram(0)).toBe("—");
  });
});
