import { unwrapShopSettings, extractPriceConversion } from "../shop-settings";

describe("unwrapShopSettings", () => {
  it("reads country from the nested shop object returned by the settings API", () => {
    const shop = unwrapShopSettings({
      data: {
        shop: { id: "s1", country: "US", currency: "USD" },
        user: { id: "u1" },
      },
    });
    expect(shop.country).toBe("US");
    expect(shop.currency).toBe("USD");
  });

  it("accepts an already-unwrapped { shop, user } payload", () => {
    const shop = unwrapShopSettings({
      shop: { id: "s1", country: "US" },
      user: { id: "u1" },
    });
    expect(shop.country).toBe("US");
  });

  it("accepts a flat shop object", () => {
    expect(unwrapShopSettings({ country: "GB", currency: "GBP" }).country).toBe(
      "GB",
    );
  });

  it("does not treat a missing country as Nepal — caller decides the fallback", () => {
    expect(unwrapShopSettings({ shop: { user: {} }, user: {} }).country).toBeUndefined();
  });
});

describe("extractPriceConversion", () => {
  it("reads conversion metadata from a settings save response", () => {
    expect(
      extractPriceConversion({
        id: "s1",
        currency: "USD",
        priceConversion: { fromCurrency: "INR", toCurrency: "USD", rate: 0.012 },
      }),
    ).toEqual({ fromCurrency: "INR", toCurrency: "USD", rate: 0.012 });
  });

  it("unwraps axios { data } wrappers", () => {
    expect(
      extractPriceConversion({
        data: {
          priceConversion: { fromCurrency: "NPR", toCurrency: "INR", rate: 1.6 },
        },
      })?.fromCurrency,
    ).toBe("NPR");
  });

  it("returns null when prices were not converted", () => {
    expect(extractPriceConversion({ id: "s1", currency: "USD" })).toBeNull();
  });
});
