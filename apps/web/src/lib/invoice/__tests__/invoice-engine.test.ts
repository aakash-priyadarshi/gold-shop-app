import { describe, expect, it } from "vitest";
import {
  applyMakingToLine,
  computeGrandTotal,
  computeSubtotal,
  computeTaxBreakdown,
  emptyLineItem,
  FALLBACK_CATEGORY_TAX_RATES,
  importShopQuote,
  lineItemTotal,
  mapLineItemsToApi,
  validateInvoiceDraft,
} from "../index";

describe("invoice shared engine", () => {
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
});
