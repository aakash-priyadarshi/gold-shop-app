import { invoiceTaxCategoryAliases, matchTaxRuleCategory } from "./tax-category-aliases";

describe("invoiceTaxCategoryAliases", () => {
  it("maps GOLD_METAL onto seeded PRECIOUS_METAL rules", () => {
    const aliases = invoiceTaxCategoryAliases("GOLD_METAL");
    expect(aliases).toContain("PRECIOUS_METAL");
    expect(matchTaxRuleCategory("GOLD_METAL", "PRECIOUS_METAL")).toBe(true);
  });

  it("maps GOLD_MAKING onto seeded MAKING_CHARGE rules", () => {
    expect(matchTaxRuleCategory("GOLD_MAKING", "MAKING_CHARGE")).toBe(true);
    expect(matchTaxRuleCategory("GOLD_MAKING", "MAKING")).toBe(true);
  });

  it("does not treat metal as gemstone", () => {
    expect(matchTaxRuleCategory("GOLD_METAL", "GEMSTONE")).toBe(false);
  });
});
