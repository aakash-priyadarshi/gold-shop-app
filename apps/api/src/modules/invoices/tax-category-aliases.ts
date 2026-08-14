import type { TaxableComponent } from "../core/pricing/services/backend-tax-engine.service";

/**
 * Invoice lines use GOLD_METAL / GOLD_MAKING (and silver equivalents).
 * Seeded TaxRuleConfig rows use PRECIOUS_METAL / MAKING_CHARGE — the same
 * names TaxRulesService and tax-rule-sync emit. Match both so DB rules
 * actually apply instead of silently taxing at 0%.
 */
export function invoiceTaxCategoryAliases(
  category: TaxableComponent["category"] | string,
): string[] {
  const aliases = new Set<string>([category]);
  if (category.endsWith("_METAL")) {
    aliases.add("METAL");
    aliases.add("PRECIOUS_METAL");
    aliases.add("GOLD");
  }
  if (category.endsWith("_MAKING")) {
    aliases.add("MAKING");
    aliases.add("MAKING_CHARGE");
    aliases.add("MAKING_CHARGES");
  }
  if (category === "GEMSTONE" || category === "DIAMOND") {
    aliases.add("GEMSTONE");
    aliases.add("GEMSTONES");
    aliases.add("DIAMOND");
  }
  if (category === "FINISH" || category === "PLATING") {
    aliases.add("FINISH");
    aliases.add("PLATING");
    aliases.add("FINISHING");
  }
  return [...aliases];
}

export function matchTaxRuleCategory(
  lineCategory: string,
  ruleCategory: string,
): boolean {
  const rule = ruleCategory.trim().toUpperCase();
  if (rule === "ALL") return true;
  return invoiceTaxCategoryAliases(lineCategory.trim().toUpperCase()).includes(
    rule,
  );
}
