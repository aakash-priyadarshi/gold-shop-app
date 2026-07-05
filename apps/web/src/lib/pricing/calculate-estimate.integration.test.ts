/**
 * Integration Test: Tax Engine with Pricing Calculator
 *
 * Tests the calculateEstimate function which combines metal cost,
 * making charges, gemstone costs, and tax calculation into a single
 * estimate for jewellery items.
 */

import { describe, test, expect } from "vitest";
import { calculateEstimate, type EstimateRequest } from "./calculate-estimate";

describe("Pricing Integration — Nepal Gold Jewellery with Gemstones", () => {
  const request: EstimateRequest = {
    buildMethod: "METHOD_A",
    jewelleryType: "Gold Ring with Diamond",
    country: "NP",
    currency: "NPR",
    methodA: {
      metal: "GOLD_22K",
      weightGrams: 5,
    },
    gemstones: [
      {
        stoneType: "DIAMOND_NATURAL",
        shape: "ROUND",
        sizeValue: "1.0",
        sizeUnit: "CARAT",
        count: 1,
      },
    ],
    marketRates: {
      metals: {
        GOLD_22K: 6000,
      },
    },
  };

  test("should calculate metal cost = 5g × 6000/g = 30000", () => {
    const estimate = calculateEstimate(request);
    expect(estimate.metalCost).toBe(30000);
  });

  test("should return a valid status", () => {
    const estimate = calculateEstimate(request);
    expect(estimate.status).toBeTruthy();
  });

  test("should have a positive total", () => {
    const estimate = calculateEstimate(request);
    expect(estimate.total).toBeGreaterThan(0);
  });

  test("should have subtotal >= metal cost", () => {
    const estimate = calculateEstimate(request);
    expect(estimate.subtotal).toBeGreaterThanOrEqual(estimate.metalCost);
  });

  test("should have tax amount (Skill Promotion Fee + VAT on stones)", () => {
    const estimate = calculateEstimate(request);
    expect(estimate.taxAmount).toBeGreaterThanOrEqual(0);
  });

  test("should have line items", () => {
    const estimate = calculateEstimate(request);
    expect(estimate.lineItems).toBeDefined();
    expect(estimate.lineItems.length).toBeGreaterThan(0);
  });
});

describe("Pricing Integration — India Gold Jewellery (GST)", () => {
  const request: EstimateRequest = {
    buildMethod: "METHOD_A",
    jewelleryType: "Gold Bracelet",
    country: "IN",
    currency: "INR",
    methodA: {
      metal: "GOLD_24K",
      weightGrams: 10,
    },
    marketRates: {
      metals: {
        GOLD_24K: 80000,
      },
    },
  };

  test("should calculate metal cost = 10g × 80000/g = 800000", () => {
    const estimate = calculateEstimate(request);
    expect(estimate.metalCost).toBe(800000);
  });

  test("should have positive total", () => {
    const estimate = calculateEstimate(request);
    expect(estimate.total).toBeGreaterThan(0);
  });
});

describe("Pricing Integration — Nepal Non-Jewellery (Method C)", () => {
  const request: EstimateRequest = {
    buildMethod: "METHOD_C",
    jewelleryType: "Metal Decorative Piece",
    country: "NP",
    currency: "NPR",
    methodC: {
      baseMetal: "COPPER",
      weightGrams: 100,
      platingType: "GOLD",
      platingTier: "STANDARD",
    },
    marketRates: {
      metals: {
        COPPER: 100,
      },
    },
  };

  test("should calculate base metal cost = 100g × 100/g = 10000", () => {
    const estimate = calculateEstimate(request);
    expect(estimate.baseMetalCost).toBe(10000);
  });

  test("should have a valid total", () => {
    const estimate = calculateEstimate(request);
    expect(estimate.total).toBeGreaterThan(0);
  });
});
