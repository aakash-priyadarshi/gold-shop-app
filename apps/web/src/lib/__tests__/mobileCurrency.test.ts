import { afterEach, describe, expect, it } from "vitest";
import { getMobileMarketParams, getShopMarketParams } from "../mobileCurrency";

function setGeoCookie(country: string) {
  document.cookie = `orivraa_geo_country=${country}`;
}

afterEach(() => {
  document.cookie = "orivraa_geo_country=; expires=Thu, 01 Jan 1970 00:00:00 GMT";
});

describe("getShopMarketParams", () => {
  it("returns null until the shop country exists, even with a US geo cookie", () => {
    setGeoCookie("US");
    expect(getShopMarketParams(null)).toBeNull();
    expect(getShopMarketParams({})).toBeNull();
    expect(getMobileMarketParams(undefined)).toBeNull();
  });

  it("uses the shop country and currency instead of visitor geo", () => {
    setGeoCookie("US");
    expect(getShopMarketParams({ country: "IN", currency: "INR" })).toEqual({
      country: "IN",
      currency: "INR",
    });
    expect(getMobileMarketParams({ country: "IN" })).toEqual({
      country: "IN",
      currency: "INR",
    });
  });
});
