import { describe, expect, it } from "vitest";
import type { CountryTaxConfig } from "../index";
import {
  applyMakingToLine,
  computeGrandTotal,
  computeDiscountAmount,
  computeSubtotal,
  computeTaxBreakdown,
  buildMetalPartsFromCatalogItem,
  calcMetalCostFromParts,
  emptyLineItem,
  FALLBACK_CATEGORY_TAX_RATES,
  importCatalogItem,
  importShopQuote,
  lineItemTotal,
  mapLineItemsToApi,
  roundMoney2,
  validateInvoiceDraft,
  withLiveGemstonePrice,
} from "../index";

describe("invoice shared engine", () => {
  it("preserves cents for live gemstone pricing and recomputed SET discounts", () => {
    expect(roundMoney2(1234.56)).toBe(1234.56);
    expect(computeDiscountAmount(1234.56, "PERCENT", 10)).toBe(123.46);
    expect(computeDiscountAmount(1234.56, "FIXED", 0.5)).toBe(0.5);
    expect(computeDiscountAmount(1234.56, "FIXED", 2000)).toBe(1234.56);
  });

  it("calculates line total with metal + making + gems", () => {
    const line = emptyLineItem();
    line.label = "22K Ring";
    line.metalType = "GOLD_22K";
    line.metalWeightG = "11.6638";
    line.metalCost = "100000";
    line.makingCost = "15000";
    line.gemstones = [
      {
        type: "Diamond",
        cut: "",
        clarity: "",
        caratWeight: "0.1",
        color: "",
        cost: "5000",
      },
    ];
    expect(lineItemTotal(line)).toBe(120000);
  });

  it("applies making percent on metal+gems", () => {
    const line = emptyLineItem();
    line.metalCost = "100000";
    line.gemstones = [
      {
        type: "Ruby",
        cut: "",
        clarity: "",
        caratWeight: "",
        color: "",
        cost: "10000",
      },
    ];
    const next = applyMakingToLine(line, "PERCENT", 15);
    expect(next.makingCost).toBe("16500");
  });

  it("rejects flat-only lines without breakdown", () => {
    const line = emptyLineItem();
    line.label = "Ring";
    // Simulate someone only putting amount via makingCost=0 metalCost=0 but somehow total
    // Our lineItemTotal would be 0 — need metal/making for priced line
    line.metalCost = "0";
    line.makingCost = "0";
    // Force a priced flat line by hacking category only — validation checks breakdown
    const fake = { ...line, metalCost: "", makingCost: "" };
    // lineItemTotal is 0 so validate requires priced lines
    const result = validateInvoiceDraft({
      customerName: "Aakash",
      lineItems: [{ ...fake, metalCost: "0", makingCost: "5000", label: "Ring" }],
    });
    // makingCost > 0 counts as breakdown — OK
    expect(result.ok).toBe(true);

    const flatOnly = validateInvoiceDraft({
      customerName: "Aakash",
      lineItems: [
        {
          ...emptyLineItem(),
          label: "Flat bill",
          metalCost: "",
          makingCost: "",
          // quantity 1 with no costs — not priced
        },
      ],
    });
    expect(flatOnly.ok).toBe(false);
  });

  it("maps rich lines to API with wastage", () => {
    const line = emptyLineItem();
    line.label = "Necklace";
    line.category = "NECKLACE";
    line.metalType = "GOLD_22K";
    line.metalWeightG = "20";
    line.metalCost = "200000";
    line.makingCost = "20000";
    line.wastagePercent = "5";
    line.wastageCost = "10000";
    const api = mapLineItemsToApi(
      [line],
      5,
      { mode: "WEIGHT_PERCENT", label: "Wastage" },
    );
    expect(api).toHaveLength(1);
    expect(api[0].metalCost).toBe(200000);
    expect(api[0].makingCost).toBe(20000);
    expect(api[0].wastageCost).toBe(10000);
    expect(api[0].amount).toBe(230000);
  });

  it("keeps the full immutable gemstone specification in the invoice payload", () => {
    const line = emptyLineItem();
    line.label = "Lab diamond ring";
    line.metalCost = "100000";
    line.gemstones = [{
      type: "DIAMOND",
      origin: "LAB",
      cut: "Round Brilliant",
      caratWeight: "1",
      sizeMm: 6.5,
      color: "D",
      clarity: "VVS1",
      qualityTier: "PREMIUM",
      cutGrade: "Excellent",
      gradingLab: "IGI",
      certNumber: "IGI-123",
      reportUrl: "https://example.com/report",
      count: 1,
      cost: "50000",
    }];

    const [api] = mapLineItemsToApi([line], 0, { mode: "DISABLED", label: "None" } as any);
    expect(api.gemstones).toEqual([expect.objectContaining({
      type: "DIAMOND", origin: "LAB", color: "D", clarity: "VVS1",
      gradingLab: "IGI", certNumber: "IGI-123", cost: 50000,
    })]);
    expect(api.details).toContain("Color D");
    expect(api.details).toContain("Clarity VVS1");
  });

  it("keeps all catalog gemstone metadata when live pricing changes only its cost", () => {
    const source = {
      type: "DIAMOND",
      origin: "LAB",
      cut: "Round Brilliant",
      caratWeight: 1,
      sizeMm: 6.5,
      color: "D",
      clarity: "VVS1",
      qualityTier: "PREMIUM",
      cutGrade: "Excellent",
      gradingLab: "IGI",
      certNumber: "IGI-123",
      reportUrl: "https://example.com/report",
      reportDate: "2026-08-25",
      count: 2,
      cost: 50000,
    };

    const repriced = withLiveGemstonePrice(source, 1234.56);
    expect(repriced).toMatchObject({
      ...source,
      caratWeight: "1",
      cost: "1234.56",
    });
  });

  it("computes NP tax breakdown for metal + making + wastage", () => {
    const line = emptyLineItem();
    line.label = "Ring";
    line.metalCost = "100000";
    line.makingCost = "10000";
    line.wastageCost = "5000";
    line.wastagePercent = "5";
    line.metalWeightG = "10";
    const tax = computeTaxBreakdown({
      lineItems: [line],
      countryTax: FALLBACK_CATEGORY_TAX_RATES.NP,
      makingChargeAmount: 0,
      invoiceWastagePct: 5,
      wastageRule: { mode: "WEIGHT_PERCENT", label: "Wastage" },
    });
    // 0.5% on metal+making+wastage skill fee style rates in fallback
    expect(tax.metalTax).toBe(500);
    expect(tax.makingTax).toBe(50);
    expect(tax.wastageTax).toBe(25);
    expect(tax.totalTax).toBe(575);
  });

  it("imports shop quote into rich line", () => {
    const result = importShopQuote({
      id: "quote-1",
      jewelleryType: "RING",
      metalType: "GOLD_22K",
      targetTotalWeightG: 11.66,
      metalCostNpr: 95000,
      makingChargeNpr: 12000,
      wastagePercent: 4,
      walkInCustomer: { name: "Sita", phone: "9800000000", id: "wc-1" },
    });
    expect(result.shopQuoteId).toBe("quote-1");
    expect(result.customer.name).toBe("Sita");
    expect(result.line.source).toBe("QUOTE");
    expect(result.line.metalCost).toBe("95000");
    expect(parseFloat(result.line.wastageCost || "0")).toBeGreaterThan(0);
  });

  it("imports catalog item with stored metal/gem values and composition gems", () => {
    const result = importCatalogItem({
      item: {
        id: "inv-1",
        nameEn: "22K Ring",
        jewelleryType: "RING",
        metalValueNpr: 120000,
        makingChargeNpr: 15000,
        gemstoneValueNpr: 8000,
        composition: {
          preciousMetal: "GOLD",
          purity: "22K",
          gemstones: [
            {
              type: "Ruby",
              caratWeight: 0.5,
              cost: 8000,
            },
          ],
        },
        totalWeightGrams: 11.66,
      },
      existingLines: [],
      shopWastagePercent: 5,
    });
    expect("error" in result).toBe(false);
    if ("error" in result) return;
    expect(result.line.metalCost).toBe("120000");
    expect(result.line.makingCost).toBe("15000");
    expect(result.line.gemstones).toHaveLength(1);
    expect(result.line.gemstones[0].type).toBe("RUBY");
    expect(parseFloat(result.line.wastageCost || "0")).toBeGreaterThan(0);
  });

  it("imports shop quote pricing aliases from estimatedTotal", () => {
    const result = importShopQuote({
      id: "q2",
      title: "Custom bangle",
      estimatedTotal: {
        metalCost: 200000,
        makingCharge: 25000,
        gemstoneCost: 10000,
        wastagePercent: 3,
      },
      customer: { firstName: "Ram", lastName: "Shah", phone: "9811111111" },
    });
    expect(result.line.label).toBe("Custom bangle");
    expect(result.line.metalCost).toBe("200000");
    expect(result.line.makingCost).toBe("25000");
    expect(result.line.gemstones[0].cost).toBe("10000");
    expect(result.customer.name).toBe("Ram Shah");
  });

  it("computes grand total", () => {
    expect(
      computeGrandTotal({
        subtotal: computeSubtotal([
          { ...emptyLineItem(), metalCost: "100", makingCost: "20", label: "x" },
        ]),
        makingChargeAmount: 0,
        wastageTotal: 10,
        taxTotal: 5,
        discountAmount: 15,
      }),
    ).toBe(120);
  });

  it("imports SET catalog item with multi-piece gemstones and set discount", () => {
    const setCatalogItem = {
      id: "set-1",
      nameEn: "Royal Bridal Set",
      jewelleryType: "SET",
      metalValueNpr: 200000,
      makingChargeNpr: 30000,
      setDiscountType: "PERCENT",
      setDiscountValue: 10,
      setComponents: [
        {
          componentItem: {
            id: "comp-1",
            nameEn: "Necklace",
            sku: "NECK-01",
            totalWeightGrams: 20,
            composition: {
              baseAlloy: { metal: "GOLD", purity: "22K" },
              gemstones: [
                {
                  type: "DIAMOND",
                  cut: "Round Brilliant",
                  clarity: "VVS1",
                  caratWeight: 1.2,
                  color: "E",
                  valueNpr: 120000,
                },
              ],
            },
          },
        },
        {
          componentItem: {
            id: "comp-2",
            nameEn: "Earrings",
            sku: "EAR-01",
            totalWeightGrams: 10,
            composition: {
              baseAlloy: { metal: "GOLD", purity: "22K" },
              gemstones: [
                {
                  type: "EMERALD",
                  cut: "Emerald",
                  clarity: "VS1",
                  caratWeight: 0.8,
                  valueNpr: 40000,
                },
              ],
            },
          },
        },
      ],
    };

    const result = importCatalogItem({
      item: setCatalogItem,
      existingLines: [],
    });

    expect("error" in result).toBe(false);
    if ("error" in result) return;

    expect(result.line.isSet).toBe(true);
    expect(result.line.setDiscountType).toBe("PERCENT");
    expect(result.line.setDiscountValue).toBe(10);
    // Extracted 2 gemstones from components with full configuration
    expect(result.line.gemstones).toHaveLength(2);
    expect(result.line.gemstones[0].type).toBe("DIAMOND");
    expect(result.line.gemstones[0].cut).toBe("Round Brilliant");
    expect(result.line.gemstones[0].clarity).toBe("VVS1");
    expect(result.line.gemstones[0].caratWeight).toBe("1.2");
    expect(result.line.gemstones[0].cost).toBe("120000");

    expect(result.line.gemstones[1].type).toBe("EMERALD");
    expect(result.line.gemstones[1].cut).toBe("Emerald");
    expect(result.line.gemstones[1].cost).toBe("40000");

    // Metal: 200,000 + Making: 30,000 + Gems: 160,000 = 390,000 raw total
    // 10% discount = 39,000
    expect(result.line.setDiscountAmount).toBe(39000);

    // lineItemTotal should deduct the 39,000 discount: 390,000 - 39,000 = 351,000
    expect(lineItemTotal(result.line)).toBe(351000);
  });

  it.each([
    ["PALLADIUM", "950", "PALLADIUM_950", "PALLADIUM_PD950", 6000],
    ["PALLADIUM", "500", "PALLADIUM_500", "PALLADIUM_PD500", 4000],
    ["PLATINUM", "950", "PLATINUM_950", "PLATINUM_PT950", 8000],
    ["PLATINUM", "900", "PLATINUM_900", "PLATINUM_PT900", 7500],
  ])(
    "uses the same normalized live rate for catalog import and manual repricing: %s_%s",
    (metal, purity, code, marketKey, rate) => {
      const item = {
        id: `${metal}-${purity}`,
        nameEn: `${metal} ${purity} Band`,
        jewelleryType: "RING",
        totalWeightGrams: 4,
        composition: { baseAlloy: { metal, purity } },
      };
      const marketRates = { metals: { [marketKey]: rate } };

      const catalog = importCatalogItem({
        item,
        existingLines: [],
        marketRates,
      });
      expect("error" in catalog).toBe(false);
      if ("error" in catalog) return;

      // The dashboard's manual/live-reprice path now calls these same helpers.
      const manual = calcMetalCostFromParts(
        buildMetalPartsFromCatalogItem(item),
        null,
        marketRates,
      );
      expect(catalog.line.metalType).toBe(code);
      expect(catalog.line.metalCost).toBe(String(rate * 4));
      expect(manual.missing).toEqual([]);
      expect(manual.cost).toBe(rate * 4);
      expect(Number(catalog.line.metalCost)).toBe(manual.cost);
    },
  );

  it("preserves rich gemstone metadata fields on catalog item import", () => {
    const itemWithGems = {
      id: "ruby-ring",
      nameEn: "Ruby Solitaire",
      jewelleryType: "RING",
      totalWeightGrams: 4,
      composition: {
        baseAlloy: { metal: "GOLD", purity: "18K" },
        gemstones: [
          {
            type: "RUBY",
            cut: "Oval",
            clarity: "VVS",
            caratWeight: 2.5,
            quality: "AAA",
            origin: "BURMA",
            sizeMm: 8.5,
            count: 1,
            cutGrade: "EXCELLENT",
            lab: "GIA",
            certNumber: "GIA-123456",
            reportUrl: "https://gia.edu/cert/123456",
            valueNpr: 150000,
          },
        ],
      },
    };

    const result = importCatalogItem({
      item: itemWithGems,
      existingLines: [],
    });

    expect("error" in result).toBe(false);
    if ("error" in result) return;
    expect(result.line.gemstones).toHaveLength(1);
    const gem = result.line.gemstones[0];
    expect(gem.type).toBe("RUBY");
    expect(gem.quality).toBe("AAA");
    expect(gem.origin).toBe("BURMA");
    expect(gem.sizeMm).toBe(8.5);
    expect(gem.count).toBe(1);
    expect(gem.cutGrade).toBe("EXCELLENT");
    expect(gem.lab).toBe("GIA");
    expect(gem.certNumber).toBe("GIA-123456");
    expect(gem.cost).toBe("150000");
  });

  it("matches the dashboard SET tax preview: discounts eligible components but not wastage", () => {
    const setLine = emptyLineItem();
    setLine.label = "Bridal Set";
    setLine.category = "SET";
    setLine.quantity = 1;
    setLine.metalCost = "100000";
    setLine.makingCost = "20000";
    setLine.gemstones = [
      {
        type: "DIAMOND",
        cut: "",
        clarity: "",
        caratWeight: "",
        color: "",
        cost: "30000",
      },
    ];
    setLine.wastageCost = "10000";
    // 10% SET discount on (100k + 20k + 30k) = 15,000 discount => eligible total 135,000
    setLine.setDiscountAmount = 15000;

    const countryTax: CountryTaxConfig = {
      taxType: "GST",
      taxName: "IN_GST_2024",
      defaultRate: 0.03,
      rates: {
        PRECIOUS_METAL: 0.03, // 3% on metal & wastage
        MAKING_CHARGE: 0.05, // 5% on making
        GEMSTONE: 0.07, // 7% on gemstones
        FINISH: 0.03,
      },
    };

    const breakdown = computeTaxBreakdown({
      lineItems: [setLine],
      countryTax,
      makingChargeAmount: 0,
      invoiceWastagePct: 0,
      wastageRule: { mode: "DISABLED", label: "Wastage" },
    });

    // Eligible base: 150,000. Target: 135,000. Scale: 0.9.
    // Metal base: 100,000 × 0.9 = 90,000 => 3% tax = 2,700
    // Making base: 20,000 × 0.9 = 18,000 => 5% tax = 900
    // Gemstone base: 30,000 × 0.9 = 27,000 => 7% tax = 1,890
    // Wastage base: 10,000 (undiscounted) => 3% tax = 300
    // Total tax: 2,700 + 900 + 1,890 + 300 = 5,790
    expect(breakdown.metalTax).toBe(2700);
    expect(breakdown.makingTax).toBe(900);
    expect(breakdown.gemstoneTax).toBe(1890);
    expect(breakdown.wastageTax).toBe(300);
    expect(breakdown.totalTax).toBe(5790);
  });
});
