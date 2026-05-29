import { roundMoney, sumMoney } from "./money";

describe("money utils", () => {
  describe("roundMoney", () => {
    it("rounds to 2 decimal places", () => {
      expect(roundMoney(1.005)).toBe(1.01);
      expect(roundMoney(2.675)).toBe(2.68);
      expect(roundMoney(1234.5 * 0.13)).toBe(160.49);
    });

    it("eliminates float representation drift", () => {
      expect(roundMoney(0.1 + 0.2)).toBe(0.3);
      expect(0.1 + 0.2).not.toBe(0.3); // sanity: the raw arithmetic is wrong
    });

    it("leaves already-clean values untouched", () => {
      expect(roundMoney(100)).toBe(100);
      expect(roundMoney(99.99)).toBe(99.99);
      expect(roundMoney(0)).toBe(0);
    });

    it("handles negative amounts symmetrically", () => {
      expect(roundMoney(-2.675)).toBe(-2.68);
      expect(roundMoney(-0.1 - 0.2)).toBe(-0.3);
    });

    it("returns 0 for non-finite input", () => {
      expect(roundMoney(NaN)).toBe(0);
      expect(roundMoney(Infinity)).toBe(0);
    });
  });

  describe("sumMoney", () => {
    it("sums and rounds a list of amounts", () => {
      expect(sumMoney([0.1, 0.2])).toBe(0.3);
      expect(sumMoney([10.1, 20.2, 30.3])).toBe(60.6);
    });

    it("ignores non-numeric entries gracefully", () => {
      expect(sumMoney([10, NaN as unknown as number, 5])).toBe(15);
    });

    it("returns 0 for an empty list", () => {
      expect(sumMoney([])).toBe(0);
    });
  });
});
