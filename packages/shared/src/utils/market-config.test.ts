import { describe, expect, it } from "vitest";
import { resolveShopCurrency } from "./market-config";

describe("resolveShopCurrency", () => {
  it("uses market default when stored currency does not match country", () => {
    expect(
      resolveShopCurrency({ country: "IN", currency: "NPR" }),
    ).toBe("INR");
  });

  it("keeps explicit currency when valid for the market", () => {
    expect(
      resolveShopCurrency({ country: "IN", currency: "USD" }),
    ).toBe("USD");
  });

  it("resolves Sri Lanka to LKR", () => {
    expect(resolveShopCurrency({ country: "LK" })).toBe("LKR");
  });

  it("resolves Nepal to NPR", () => {
    expect(resolveShopCurrency({ country: "NP", currency: "NPR" })).toBe(
      "NPR",
    );
  });

  it("maps GB to GBP via UK market", () => {
    expect(resolveShopCurrency({ country: "GB" })).toBe("GBP");
  });
});
