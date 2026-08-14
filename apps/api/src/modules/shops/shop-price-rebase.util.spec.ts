import {
  fromCurrencyOfLastRebase,
  isShopMoneyCurrency,
  previousCurrencyFromAudit,
  rebaseAlreadyApplied,
  scaleShopMoney,
} from "./shop-price-rebase.util";

describe("shop-price-rebase.util", () => {
  describe("scaleShopMoney", () => {
    it("converts INR magnitudes into USD at ~83.5", () => {
      expect(scaleShopMoney(3000, 1 / 83.5)).toBe(35.93);
    });

    it("keeps null/undefined", () => {
      expect(scaleShopMoney(null, 0.012)).toBeNull();
      expect(scaleShopMoney(undefined, 0.012)).toBeUndefined();
    });

    it("leaves non-finite amounts unchanged", () => {
      expect(scaleShopMoney(Number.NaN, 2)).toBeNaN();
    });

    it("identity rate is a no-op besides rounding", () => {
      expect(scaleShopMoney(199.999, 1)).toBe(200);
    });
  });

  describe("currency helpers", () => {
    it("accepts supported shop currencies", () => {
      expect(isShopMoneyCurrency("INR")).toBe(true);
      expect(isShopMoneyCurrency("AUD")).toBe(false);
    });

    it("reads previous currency from a settings audit snapshot", () => {
      expect(previousCurrencyFromAudit({ currency: "INR" }, "USD")).toBe("INR");
      expect(previousCurrencyFromAudit({ currency: "USD" }, "USD")).toBeNull();
    });

    it("skips a second rebase into the same currency", () => {
      expect(
        rebaseAlreadyApplied({ fromCurrency: "INR", toCurrency: "USD" }, "USD"),
      ).toBe(true);
      expect(
        rebaseAlreadyApplied({ fromCurrency: "INR", toCurrency: "USD" }, "INR"),
      ).toBe(false);
    });

    it("uses last rebase target as the stored pricing currency", () => {
      expect(fromCurrencyOfLastRebase({ toCurrency: "INR" })).toBe("INR");
    });
  });
});
