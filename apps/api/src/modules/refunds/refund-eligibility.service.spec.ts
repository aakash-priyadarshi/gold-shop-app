import { RefundEligibilityService } from "./refund-eligibility.service";

/**
 * Unit tests for the refund eligibility policy engine.
 *
 * The service is pure (no DB / IO) so it is exercised directly. Policy under
 * test:
 *  - Order must be DELIVERED and within the 7-day return window.
 *  - Precious metals (gold / silver and their purities) are refundable.
 *  - Diamonds / gemstones / pearls are NOT refundable.
 *  - Mixed products refund only the metal portion, unless a non-refundable
 *    material is dominant (> 50%), which voids eligibility entirely.
 */
describe("RefundEligibilityService", () => {
  let service: RefundEligibilityService;

  // A creation date safely inside the 7-day window.
  const recent = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000);

  beforeEach(() => {
    service = new RefundEligibilityService();
  });

  const base = {
    orderType: "INVENTORY",
    totalNpr: 100000,
    status: "DELIVERED",
    createdAt: recent,
    productSnapshot: { composition: "GOLD_22K" } as any,
  };

  describe("gating rules", () => {
    it("rejects orders that are not delivered", () => {
      const result = service.checkEligibility({ ...base, status: "SHIPPED" });
      expect(result.eligible).toBe(false);
      expect(result.refundableAmount).toBe(0);
      expect(result.reason).toMatch(/delivered/i);
    });

    it("rejects orders past the 7-day return window", () => {
      const old = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
      const result = service.checkEligibility({ ...base, createdAt: old });
      expect(result.eligible).toBe(false);
      expect(result.reason).toMatch(/window/i);
    });

    it("allows an order exactly on the boundary (7 days)", () => {
      const boundary = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const result = service.checkEligibility({
        ...base,
        createdAt: boundary,
      });
      expect(result.eligible).toBe(true);
    });

    it("rejects when product composition is missing", () => {
      const result = service.checkEligibility({
        ...base,
        productSnapshot: {},
      });
      expect(result.eligible).toBe(false);
      expect(result.reason).toMatch(/composition not available/i);
    });
  });

  describe("string composition", () => {
    it("grants a full refund for a refundable metal", () => {
      const result = service.checkEligibility({
        ...base,
        productSnapshot: { composition: "GOLD_22K" },
      });
      expect(result.eligible).toBe(true);
      expect(result.refundableAmount).toBe(100000);
      expect(result.metalPercentage).toBe(100);
    });

    it("is case-insensitive on the material code", () => {
      const result = service.checkEligibility({
        ...base,
        productSnapshot: { composition: "silver_925" },
      });
      expect(result.eligible).toBe(true);
      expect(result.refundableAmount).toBe(100000);
    });

    it("denies refunds for non-refundable materials", () => {
      const result = service.checkEligibility({
        ...base,
        productSnapshot: { composition: "DIAMOND" },
      });
      expect(result.eligible).toBe(false);
      expect(result.reason).toMatch(/not eligible/i);
    });

    it("denies refunds for materials with no defined policy", () => {
      const result = service.checkEligibility({
        ...base,
        productSnapshot: { composition: "TITANIUM" },
      });
      expect(result.eligible).toBe(false);
      expect(result.reason).toMatch(/policy not defined/i);
    });
  });

  describe("object composition with material breakdown", () => {
    it("grants a partial refund proportional to the metal content", () => {
      const result = service.checkEligibility({
        ...base,
        totalNpr: 100000,
        productSnapshot: {
          composition: {
            materials: [
              { type: "GOLD_22K", percentage: 70 },
              { type: "DIAMOND", percentage: 30 },
            ],
          },
        },
      });
      expect(result.eligible).toBe(true);
      // 70% of 100000 is refundable (gold portion only)
      expect(result.refundableAmount).toBe(70000);
      expect(result.metalPercentage).toBe(70);
    });

    it("denies the refund when a non-refundable material is dominant (>50%)", () => {
      const result = service.checkEligibility({
        ...base,
        productSnapshot: {
          composition: {
            materials: [
              { type: "DIAMOND", percentage: 60 },
              { type: "GOLD_22K", percentage: 40 },
            ],
          },
        },
      });
      expect(result.eligible).toBe(false);
      expect(result.reason).toMatch(/predominantly DIAMOND/i);
    });

    it("denies the refund when there are no refundable materials", () => {
      const result = service.checkEligibility({
        ...base,
        productSnapshot: {
          composition: {
            materials: [{ type: "PEARL", percentage: 40 }],
          },
        },
      });
      expect(result.eligible).toBe(false);
      expect(result.reason).toMatch(/no refundable materials/i);
    });

    it("supports the alternate `material` key and rounds the amount", () => {
      const result = service.checkEligibility({
        ...base,
        totalNpr: 99999,
        productSnapshot: {
          composition: {
            materials: [
              { material: "GOLD_18K", percentage: 33 },
              { material: "GEMSTONE", percentage: 10 },
            ],
          },
        },
      });
      expect(result.eligible).toBe(true);
      // 33% of 99999 = 32999.67 → rounded
      expect(result.refundableAmount).toBe(Math.round(99999 * 0.33));
      expect(result.metalPercentage).toBe(33);
    });
  });

  it("denies the refund when composition shape is unrecognised", () => {
    const result = service.checkEligibility({
      ...base,
      productSnapshot: { composition: { unexpected: true } },
    });
    expect(result.eligible).toBe(false);
    expect(result.reason).toMatch(/unable to determine/i);
  });
});
