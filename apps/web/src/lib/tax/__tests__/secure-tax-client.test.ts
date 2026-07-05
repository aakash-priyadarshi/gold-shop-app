/**
 * Secure Tax Client — Tests for tax regime types and formatting
 *
 * Tests the frontend secure tax client which mirrors the backend tax engine
 * types and provides display formatting.
 */

import {
  formatTaxRegime,
  type TaxRegime,
  type TaxableComponentCategory,
  type TaxLineItem,
} from "../secure-tax-client";

describe("formatTaxRegime", () => {
  test("Nepal regime shows FY 2083/84+ label", () => {
    expect(formatTaxRegime("NP_2083_84_PLUS")).toBe("Nepal FY 2083/84+");
  });

  test("India regime shows GST 2024 label", () => {
    expect(formatTaxRegime("IN_GST_2024")).toBe("India GST 2024");
  });

  test("UAE regime shows VAT 2024 label", () => {
    expect(formatTaxRegime("AE_VAT_2024")).toBe("UAE VAT 2024");
  });

  test("UK regime shows VAT 2024 label", () => {
    expect(formatTaxRegime("UK_VAT_2024")).toBe("UK VAT 2024");
  });

  test("EU regime shows VAT 2024 label", () => {
    expect(formatTaxRegime("EU_VAT_2024")).toBe("EU VAT 2024");
  });

  test("US regime shows Sales Tax label", () => {
    expect(formatTaxRegime("US_SALES_TAX")).toBe("US Sales Tax");
  });

  test("unknown regime falls back to the raw string", () => {
    expect(formatTaxRegime("UNKNOWN" as TaxRegime)).toBe("UNKNOWN");
  });

  test("all regimes have display names (no undefined)", () => {
    const regimes: TaxRegime[] = [
      "NP_2083_84_PLUS",
      "IN_GST_2024",
      "AE_VAT_2024",
      "UK_VAT_2024",
      "EU_VAT_2024",
      "US_SALES_TAX",
    ];
    for (const r of regimes) {
      const label = formatTaxRegime(r);
      expect(label).toBeTruthy();
      expect(label).not.toBe(r); // should be a human-readable label, not the code
    }
  });
});

describe("TaxLineItem type", () => {
  test("SKILL_PROMOTION_FEE is a valid tax line item type", () => {
    const item: TaxLineItem = {
      type: "SKILL_PROMOTION_FEE",
      name: "Skill Promotion Fee",
      rate: 0.005,
      baseAmount: 100000,
      taxAmount: 500,
      category: "JEWELLERY",
      description: "0.5% on jewellery sale value",
    };
    expect(item.type).toBe("SKILL_PROMOTION_FEE");
    expect(item.rate).toBe(0.005);
    expect(item.taxAmount).toBe(500);
  });

  test("VAT line item for gemstones", () => {
    const item: TaxLineItem = {
      type: "VAT",
      name: "VAT",
      rate: 0.13,
      baseAmount: 50000,
      taxAmount: 6500,
      category: "GEMSTONE",
      description: "13% on diamonds & gemstones",
    };
    expect(item.type).toBe("VAT");
    expect(item.taxAmount).toBe(6500);
  });

  test("GST line item for India metal", () => {
    const item: TaxLineItem = {
      type: "GST",
      name: "GST on Metal",
      rate: 0.03,
      baseAmount: 100000,
      taxAmount: 3000,
      category: "GOLD",
      description: "3% on precious metal",
    };
    expect(item.type).toBe("GST");
    expect(item.rate).toBe(0.03);
  });
});

describe("TaxableComponentCategory", () => {
  test("all Nepal-relevant categories are valid", () => {
    const categories: TaxableComponentCategory[] = [
      "GOLD_METAL",
      "GOLD_MAKING",
      "SILVER_METAL",
      "SILVER_MAKING",
      "GEMSTONE",
      "DIAMOND",
      "FINISH",
      "PLATING",
    ];
    for (const c of categories) {
      expect(typeof c).toBe("string");
      expect(c.length).toBeGreaterThan(0);
    }
  });
});
