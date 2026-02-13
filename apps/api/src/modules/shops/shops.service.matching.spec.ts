/**
 * Seller Matching Tests — Soft Matching / Feature Scoring
 *
 * Comprehensive test suite for the seller matching system.
 * The matching system uses SOFT matching: all active & verified shops in the
 * customer's country are fetched, then each shop is scored on feature support.
 *
 * Tests cover:
 * 1. Basic matching & country filtering (WHERE clause)
 * 2. Feature scoring (jewelleryType, buildMethod, material, alloy, baseMetal, plating)
 * 3. Match labels (Full Match / Partial Match / Ask Seller)
 * 4. Location scoring (city/state/country/other tiers)
 * 5. Grouping (location groups + match quality groups)
 * 6. Pricing enrichment (metal rates, making charges, defaults)
 * 7. Material family expansion (GOLD → GOLD_24K, GOLD_22K, etc.)
 * 8. Alloy / Base Metal / Plating scoring for Methods B, C, D
 * 9. Edge cases, pagination, diagnostics
 */

import { Test, TestingModule } from "@nestjs/testing";
import { RedisService } from "../../common";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { PlatformConfigService } from "../platform-config/platform-config.service";
import { ContentModerationService } from "./content-moderation.service";
import { ShopsService } from "./shops.service";

// ═══════════════════════════════════════════
// MOCK SHOP DATA
// ═══════════════════════════════════════════

function makeShop(overrides: Partial<any> = {}) {
  return {
    id: overrides.id || "shop-1",
    shopName: overrides.shopName || "Test Shop",
    shopNameNe: null,
    isActive: overrides.isActive ?? true,
    isVerified: overrides.isVerified ?? true,
    country: overrides.country || "IN",
    state: overrides.state || null,
    city: overrides.city || null,
    address: "Some address",
    contactPhone: "+91-1234567890",
    whatsappNumber: null,
    makingChargePercent: overrides.makingChargePercent ?? 10,
    codEnabled: false,
    sellerTier: "STANDARD",
    supportedJewelleryTypes: overrides.supportedJewelleryTypes || ["RING"],
    supportedMethods: overrides.supportedMethods || ["METHOD_A"],
    supportedMaterials: overrides.supportedMaterials || [],
    supportedFinishes: overrides.supportedFinishes || [],
    supportedAlloys: overrides.supportedAlloys || [],
    supportedBaseMetals: overrides.supportedBaseMetals || [],
    supportedPlatingTypes: overrides.supportedPlatingTypes || [],
    metalRates: overrides.metalRates || [],
    finishPricing: [],
    ratings: overrides.ratings || [],
    user: { id: "user-1", firstName: "Test", lastName: "User" },
    _count: { ratings: overrides.ratings?.length || 0 },
    badges: [],
    performance: null,
  };
}

// ═══════════════════════════════════════════
// MOCK SERVICES
// ═══════════════════════════════════════════

const mockPrismaShop = {
  count: jest.fn(),
  findMany: jest.fn(),
  findUnique: jest.fn(),
  findFirst: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
};

const mockPrisma: Record<string, any> = {
  shop: mockPrismaShop,
  user: { findUnique: jest.fn(), update: jest.fn() },
  shopMetalRate: { createMany: jest.fn(), deleteMany: jest.fn() },
  shopFinishPricing: { createMany: jest.fn(), deleteMany: jest.fn() },
  shopBadge: { findMany: jest.fn() },
  shopPerformance: { findUnique: jest.fn() },
  auditLog: { create: jest.fn() },
  $transaction: jest.fn((fn: (prisma: any) => any) => fn(mockPrisma)),
};

const mockAuditService = { log: jest.fn() };
const mockRedisService = { get: jest.fn(), set: jest.fn(), del: jest.fn() };
const mockConfigService = { getConfig: jest.fn() };
const mockModerationService = {
  moderateText: jest.fn(),
  moderateImage: jest.fn(),
};

// ═══════════════════════════════════════════
// TEST SUITE
// ═══════════════════════════════════════════

describe("ShopsService - Seller Matching", () => {
  let service: ShopsService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShopsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditService, useValue: mockAuditService },
        { provide: RedisService, useValue: mockRedisService },
        { provide: PlatformConfigService, useValue: mockConfigService },
        { provide: ContentModerationService, useValue: mockModerationService },
      ],
    }).compile();

    service = module.get<ShopsService>(ShopsService);

    // Default mock: 2 count calls (totalShops + activeAndVerified)
    mockPrismaShop.count
      .mockResolvedValueOnce(4) // totalShops (no args)
      .mockResolvedValueOnce(4); // activeAndVerified
  });

  // ─── Basic Matching ──────────────────────────────

  describe("Basic Matching", () => {
    it("should return a seller that matches jewelleryType, buildMethod, and country", async () => {
      const shop = makeShop({
        id: "shop-india",
        shopName: "Indian Jewellers",
        country: "IN",
        supportedJewelleryTypes: ["RING", "NECKLACE"],
        supportedMethods: ["METHOD_A", "METHOD_B"],
      });

      mockPrismaShop.findMany.mockResolvedValue([shop]);

      const result = await service.findMatchingSellers({
        jewelleryType: "RING",
        buildMethod: "METHOD_A",
        estimatedWeight: 5,
        customerCountry: "IN",
      });

      expect(result.sellers).toHaveLength(1);
      expect(result.sellers[0].shopName).toBe("Indian Jewellers");
      expect(result.sellers[0].locationMatch).toBe("same_country");
    });

    it("should return 0 sellers when no shops match the country", async () => {
      mockPrismaShop.findMany.mockResolvedValue([]);

      const result = await service.findMatchingSellers({
        jewelleryType: "RING",
        buildMethod: "METHOD_A",
        estimatedWeight: 5,
        customerCountry: "US",
      });

      expect(result.sellers).toHaveLength(0);
      expect(result.stats.totalMatching).toBe(0);
    });

    it("should match shops with empty supportedJewelleryTypes (supports all)", async () => {
      const shop = makeShop({
        id: "shop-all",
        shopName: "Universal Shop",
        country: "IN",
        supportedJewelleryTypes: [], // empty = supports all
        supportedMethods: [], // empty = supports all
      });

      mockPrismaShop.findMany.mockResolvedValue([shop]);

      const result = await service.findMatchingSellers({
        jewelleryType: "BROOCH",
        buildMethod: "METHOD_D",
        estimatedWeight: 3,
        customerCountry: "IN",
      });

      expect(result.sellers).toHaveLength(1);
      // Empty arrays = supports all → full match
      expect(result.sellers[0].isFullMatch).toBe(true);
      expect(result.sellers[0].matchLabel).toBe("Full Match");
    });

    it("should still return sellers that don't support the jewellery type (soft matching)", async () => {
      const shop = makeShop({
        id: "shop-ring-only",
        country: "IN",
        supportedJewelleryTypes: ["RING"], // only rings
        supportedMethods: ["METHOD_A"],
      });

      mockPrismaShop.findMany.mockResolvedValue([shop]);

      const result = await service.findMatchingSellers({
        jewelleryType: "NECKLACE", // customer wants necklace
        buildMethod: "METHOD_A",
        estimatedWeight: 5,
        customerCountry: "IN",
      });

      // Soft matching: still returned, but not a full match
      expect(result.sellers).toHaveLength(1);
      expect(result.sellers[0].isFullMatch).toBe(false);
      expect(result.sellers[0].unsupportedFeatures).toContain(
        "jewelleryType:NECKLACE",
      );
    });
  });

  // ─── Country Filtering ───────────────────────────

  describe("Country Filtering", () => {
    it("should filter by country in WHERE clause when includeInternational=false", async () => {
      mockPrismaShop.findMany.mockResolvedValue([]);

      await service.findMatchingSellers({
        jewelleryType: "RING",
        buildMethod: "METHOD_A",
        estimatedWeight: 5,
        customerCountry: "IN",
        includeInternational: false,
      });

      const whereArg = mockPrismaShop.findMany.mock.calls[0][0].where;
      expect(whereArg.isActive).toBe(true);
      expect(whereArg.isVerified).toBe(true);
      expect(whereArg.country).toBeDefined();
      expect(whereArg.country.equals).toBe("IN");
      expect(whereArg.country.mode).toBe("insensitive");
    });

    it("should include shops from all countries when includeInternational=true", async () => {
      const nepalShop = makeShop({
        id: "shop-np",
        shopName: "Nepal Jewellers",
        country: "NP",
      });
      const indiaShop = makeShop({
        id: "shop-in",
        shopName: "India Jewellers",
        country: "IN",
      });

      mockPrismaShop.findMany.mockResolvedValue([nepalShop, indiaShop]);

      const result = await service.findMatchingSellers({
        jewelleryType: "RING",
        buildMethod: "METHOD_A",
        estimatedWeight: 5,
        customerCountry: "IN",
        includeInternational: true,
      });

      expect(result.sellers).toHaveLength(2);

      // Verify the where clause does NOT include country filter
      const whereArg = mockPrismaShop.findMany.mock.calls[0][0].where;
      expect(whereArg.country).toBeUndefined();
    });

    it("should default customerCountry to IN when not specified", async () => {
      mockPrismaShop.findMany.mockResolvedValue([]);

      await service.findMatchingSellers({
        jewelleryType: "RING",
        buildMethod: "METHOD_A",
        estimatedWeight: 5,
        // customerCountry not specified — defaults to "IN"
      });

      const whereArg = mockPrismaShop.findMany.mock.calls[0][0].where;
      expect(whereArg.country).toBeDefined();
      expect(whereArg.country.equals).toBe("IN");
    });

    it("should use case-insensitive country matching", async () => {
      mockPrismaShop.findMany.mockResolvedValue([]);

      await service.findMatchingSellers({
        jewelleryType: "RING",
        buildMethod: "METHOD_A",
        estimatedWeight: 5,
        customerCountry: "in", // lowercase
      });

      const whereArg = mockPrismaShop.findMany.mock.calls[0][0].where;
      expect(whereArg.country.mode).toBe("insensitive");
    });

    it("should NOT have jewelleryType or buildMethod in WHERE (soft matching)", async () => {
      mockPrismaShop.findMany.mockResolvedValue([]);

      await service.findMatchingSellers({
        jewelleryType: "RING",
        buildMethod: "METHOD_A",
        estimatedWeight: 5,
        customerCountry: "IN",
      });

      const whereArg = mockPrismaShop.findMany.mock.calls[0][0].where;
      // Soft matching: only isActive, isVerified, and country in WHERE
      expect(whereArg.isActive).toBe(true);
      expect(whereArg.isVerified).toBe(true);
      expect(whereArg.country).toBeDefined();
      // No AND array, no jewelleryType/buildMethod/material filters
      expect(whereArg.AND).toBeUndefined();
      expect(whereArg.supportedJewelleryTypes).toBeUndefined();
      expect(whereArg.supportedMethods).toBeUndefined();
      expect(whereArg.supportedMaterials).toBeUndefined();
    });
  });

  // ─── Feature Scoring ─────────────────────────────

  describe("Feature Scoring", () => {
    it("should give full score when all features match", async () => {
      const shop = makeShop({
        country: "IN",
        supportedJewelleryTypes: ["RING"],
        supportedMethods: ["METHOD_A"],
        supportedMaterials: ["GOLD_22K"],
      });

      mockPrismaShop.findMany.mockResolvedValue([shop]);

      const result = await service.findMatchingSellers({
        jewelleryType: "RING",
        buildMethod: "METHOD_A",
        metalType: "GOLD_22K",
        estimatedWeight: 5,
        customerCountry: "IN",
      });

      const seller = result.sellers[0];
      expect(seller.isFullMatch).toBe(true);
      expect(seller.matchLabel).toBe("Full Match");
      expect(seller.unsupportedFeatures).toHaveLength(0);
      // jewelleryType(1) + buildMethod(1) + material(1) + alloy(0.5) + baseMetal(0.5) + plating(0.5) = 4.5
      // alloy/baseMetal/plating are not requested → default OK → they get points
      expect(seller.featureScore).toBeGreaterThanOrEqual(4);
    });

    it("should deduct score for unsupported jewellery type", async () => {
      const shop = makeShop({
        country: "IN",
        supportedJewelleryTypes: ["NECKLACE"], // doesn't support RING
        supportedMethods: ["METHOD_A"],
      });

      mockPrismaShop.findMany.mockResolvedValue([shop]);

      const result = await service.findMatchingSellers({
        jewelleryType: "RING",
        buildMethod: "METHOD_A",
        estimatedWeight: 5,
        customerCountry: "IN",
      });

      const seller = result.sellers[0];
      expect(seller.isFullMatch).toBe(false);
      expect(seller.unsupportedFeatures).toContain("jewelleryType:RING");
    });

    it("should deduct score for unsupported build method", async () => {
      const shop = makeShop({
        country: "IN",
        supportedJewelleryTypes: ["RING"],
        supportedMethods: ["METHOD_A"], // doesn't support METHOD_B
      });

      mockPrismaShop.findMany.mockResolvedValue([shop]);

      const result = await service.findMatchingSellers({
        jewelleryType: "RING",
        buildMethod: "METHOD_B",
        estimatedWeight: 5,
        customerCountry: "IN",
      });

      const seller = result.sellers[0];
      expect(seller.isFullMatch).toBe(false);
      expect(seller.unsupportedFeatures).toContain("buildMethod:METHOD_B");
    });

    it("should deduct score for unsupported material", async () => {
      const shop = makeShop({
        country: "IN",
        supportedMaterials: ["SILVER_999"], // doesn't support GOLD_22K
      });

      mockPrismaShop.findMany.mockResolvedValue([shop]);

      const result = await service.findMatchingSellers({
        jewelleryType: "RING",
        buildMethod: "METHOD_A",
        metalType: "GOLD_22K",
        estimatedWeight: 5,
        customerCountry: "IN",
      });

      const seller = result.sellers[0];
      expect(seller.isFullMatch).toBe(false);
      expect(seller.unsupportedFeatures).toContain("material:GOLD_22K");
    });

    it("should label as 'Partial Match' when 1-2 features unsupported", async () => {
      const shop = makeShop({
        country: "IN",
        supportedJewelleryTypes: ["NECKLACE"], // miss 1: jewelleryType
        supportedMethods: ["METHOD_A"],
      });

      mockPrismaShop.findMany.mockResolvedValue([shop]);

      const result = await service.findMatchingSellers({
        jewelleryType: "RING",
        buildMethod: "METHOD_A",
        estimatedWeight: 5,
        customerCountry: "IN",
      });

      expect(result.sellers[0].matchLabel).toBe("Partial Match");
    });

    it("should label as 'Ask Seller' when >2 features unsupported", async () => {
      const shop = makeShop({
        country: "IN",
        supportedJewelleryTypes: ["NECKLACE"], // miss: jewelleryType
        supportedMethods: ["METHOD_B"], // miss: buildMethod
        supportedMaterials: ["PLATINUM_950"], // miss: material
      });

      mockPrismaShop.findMany.mockResolvedValue([shop]);

      const result = await service.findMatchingSellers({
        jewelleryType: "RING",
        buildMethod: "METHOD_A",
        metalType: "GOLD_22K",
        estimatedWeight: 5,
        customerCountry: "IN",
      });

      expect(result.sellers[0].matchLabel).toBe("Ask Seller");
      expect(result.sellers[0].unsupportedFeatures.length).toBeGreaterThan(2);
    });

    it("should rank full match sellers above partial match", async () => {
      const fullMatchShop = makeShop({
        id: "full",
        country: "IN",
        supportedJewelleryTypes: ["RING"],
        supportedMethods: ["METHOD_A"],
      });
      const partialMatchShop = makeShop({
        id: "partial",
        country: "IN",
        supportedJewelleryTypes: ["NECKLACE"], // misses jewelleryType
        supportedMethods: ["METHOD_A"],
      });

      mockPrismaShop.findMany.mockResolvedValue([
        partialMatchShop,
        fullMatchShop,
      ]);

      const result = await service.findMatchingSellers({
        jewelleryType: "RING",
        buildMethod: "METHOD_A",
        estimatedWeight: 5,
        customerCountry: "IN",
      });

      // Full match should come first regardless of input order
      expect(result.sellers[0].id).toBe("full");
      expect(result.sellers[0].isFullMatch).toBe(true);
      expect(result.sellers[1].id).toBe("partial");
      expect(result.sellers[1].isFullMatch).toBe(false);
    });

    it("should treat empty supportedMaterials as supports-all (full score)", async () => {
      const shop = makeShop({
        country: "IN",
        supportedMaterials: [], // empty = supports all
      });

      mockPrismaShop.findMany.mockResolvedValue([shop]);

      const result = await service.findMatchingSellers({
        jewelleryType: "RING",
        buildMethod: "METHOD_A",
        metalType: "GOLD_22K",
        estimatedWeight: 5,
        customerCountry: "IN",
      });

      // Material should be OK (empty = supports all)
      expect(result.sellers[0].unsupportedFeatures).not.toContain(
        "material:GOLD_22K",
      );
    });
  });

  // ─── Alloy / Base Metal / Plating Scoring ────────

  describe("Alloy / Base Metal / Plating Scoring", () => {
    it("should score alloy match for Method B", async () => {
      const shop = makeShop({
        country: "IN",
        supportedMethods: ["METHOD_B"],
        supportedAlloys: ["GOLD_18K", "GOLD_14K"],
      });

      mockPrismaShop.findMany.mockResolvedValue([shop]);

      const result = await service.findMatchingSellers({
        jewelleryType: "RING",
        buildMethod: "METHOD_B",
        alloyType: "GOLD_18K",
        estimatedWeight: 5,
        customerCountry: "IN",
      });

      expect(result.sellers[0].unsupportedFeatures).not.toContain(
        "alloy:GOLD_18K",
      );
    });

    it("should flag unsupported alloy for Method B", async () => {
      const shop = makeShop({
        country: "IN",
        supportedMethods: ["METHOD_B"],
        supportedAlloys: ["GOLD_14K"], // only 14K
      });

      mockPrismaShop.findMany.mockResolvedValue([shop]);

      const result = await service.findMatchingSellers({
        jewelleryType: "RING",
        buildMethod: "METHOD_B",
        alloyType: "GOLD_18K", // customer wants 18K
        estimatedWeight: 5,
        customerCountry: "IN",
      });

      expect(result.sellers[0].unsupportedFeatures).toContain("alloy:GOLD_18K");
    });

    it("should score base metal match for Method C", async () => {
      const shop = makeShop({
        country: "IN",
        supportedMethods: ["METHOD_C"],
        supportedBaseMetals: ["BRASS", "COPPER"],
      });

      mockPrismaShop.findMany.mockResolvedValue([shop]);

      const result = await service.findMatchingSellers({
        jewelleryType: "RING",
        buildMethod: "METHOD_C",
        baseMetal: "BRASS",
        estimatedWeight: 5,
        customerCountry: "IN",
      });

      expect(result.sellers[0].unsupportedFeatures).not.toContain(
        "baseMetal:BRASS",
      );
    });

    it("should flag unsupported base metal for Method C", async () => {
      const shop = makeShop({
        country: "IN",
        supportedMethods: ["METHOD_C"],
        supportedBaseMetals: ["COPPER"], // no BRASS
      });

      mockPrismaShop.findMany.mockResolvedValue([shop]);

      const result = await service.findMatchingSellers({
        jewelleryType: "RING",
        buildMethod: "METHOD_C",
        baseMetal: "BRASS",
        estimatedWeight: 5,
        customerCountry: "IN",
      });

      expect(result.sellers[0].unsupportedFeatures).toContain(
        "baseMetal:BRASS",
      );
    });

    it("should score plating type match for Method C", async () => {
      const shop = makeShop({
        country: "IN",
        supportedMethods: ["METHOD_C"],
        supportedPlatingTypes: ["GOLD_PLATING", "RHODIUM_PLATING"],
      });

      mockPrismaShop.findMany.mockResolvedValue([shop]);

      const result = await service.findMatchingSellers({
        jewelleryType: "RING",
        buildMethod: "METHOD_C",
        platingType: "GOLD_PLATING",
        estimatedWeight: 5,
        customerCountry: "IN",
      });

      expect(result.sellers[0].unsupportedFeatures).not.toContain(
        "platingType:GOLD_PLATING",
      );
    });

    it("should flag unsupported plating for Method C", async () => {
      const shop = makeShop({
        country: "IN",
        supportedMethods: ["METHOD_C"],
        supportedPlatingTypes: ["RHODIUM_PLATING"], // no GOLD_PLATING
      });

      mockPrismaShop.findMany.mockResolvedValue([shop]);

      const result = await service.findMatchingSellers({
        jewelleryType: "RING",
        buildMethod: "METHOD_C",
        platingType: "GOLD_PLATING",
        estimatedWeight: 5,
        customerCountry: "IN",
      });

      expect(result.sellers[0].unsupportedFeatures).toContain(
        "platingType:GOLD_PLATING",
      );
    });

    it("should treat empty supportedAlloys as supports-all", async () => {
      const shop = makeShop({
        country: "IN",
        supportedMethods: ["METHOD_B"],
        supportedAlloys: [], // empty = supports all
      });

      mockPrismaShop.findMany.mockResolvedValue([shop]);

      const result = await service.findMatchingSellers({
        jewelleryType: "RING",
        buildMethod: "METHOD_B",
        alloyType: "GOLD_18K",
        estimatedWeight: 5,
        customerCountry: "IN",
      });

      expect(result.sellers[0].unsupportedFeatures).not.toContain(
        "alloy:GOLD_18K",
      );
    });
  });

  // ─── Material Family Expansion ───────────────────

  describe("Material Family Expansion", () => {
    it("should match GOLD base metal to any gold purity variant", async () => {
      const shop = makeShop({
        country: "IN",
        supportedMaterials: ["GOLD_18K"], // has 18K
      });

      mockPrismaShop.findMany.mockResolvedValue([shop]);

      const result = await service.findMatchingSellers({
        jewelleryType: "RING",
        buildMethod: "METHOD_B",
        metalType: "GOLD", // base metal
        estimatedWeight: 2,
        customerCountry: "IN",
      });

      // Should match because GOLD expands to include GOLD_18K
      expect(result.sellers[0].unsupportedFeatures).not.toContain(
        "material:GOLD",
      );
    });

    it("should NOT match GOLD base metal when shop only has SILVER", async () => {
      const shop = makeShop({
        country: "IN",
        supportedMaterials: ["SILVER_999"], // no gold variants
      });

      mockPrismaShop.findMany.mockResolvedValue([shop]);

      const result = await service.findMatchingSellers({
        jewelleryType: "RING",
        buildMethod: "METHOD_B",
        metalType: "GOLD",
        estimatedWeight: 2,
        customerCountry: "IN",
      });

      expect(result.sellers[0].unsupportedFeatures).toContain("material:GOLD");
    });

    it("should match SILVER base metal to silver variants", async () => {
      const shop = makeShop({
        country: "IN",
        supportedMaterials: ["SILVER_925"],
      });

      mockPrismaShop.findMany.mockResolvedValue([shop]);

      const result = await service.findMatchingSellers({
        jewelleryType: "RING",
        buildMethod: "METHOD_B",
        metalType: "SILVER",
        estimatedWeight: 2,
        customerCountry: "IN",
      });

      expect(result.sellers[0].unsupportedFeatures).not.toContain(
        "material:SILVER",
      );
    });

    it("should match specific purity directly", async () => {
      const shop = makeShop({
        country: "IN",
        supportedMaterials: ["GOLD_22K"],
      });

      mockPrismaShop.findMany.mockResolvedValue([shop]);

      const result = await service.findMatchingSellers({
        jewelleryType: "RING",
        buildMethod: "METHOD_A",
        metalType: "GOLD_22K",
        estimatedWeight: 5,
        customerCountry: "IN",
      });

      expect(result.sellers[0].unsupportedFeatures).not.toContain(
        "material:GOLD_22K",
      );
    });
  });

  // ─── Match Groups ────────────────────────────────

  describe("Match Groups", () => {
    it("should populate matchGroups with correct counts", async () => {
      const shops = [
        makeShop({
          id: "full1",
          country: "IN",
          supportedJewelleryTypes: ["RING"],
          supportedMethods: ["METHOD_A"],
        }),
        makeShop({
          id: "partial1",
          country: "IN",
          supportedJewelleryTypes: ["NECKLACE"], // partial: misses jewelleryType
          supportedMethods: ["METHOD_A"],
        }),
        makeShop({
          id: "ask1",
          country: "IN",
          supportedJewelleryTypes: ["NECKLACE"], // miss
          supportedMethods: ["METHOD_B"], // miss
          supportedMaterials: ["PLATINUM_950"], // miss
        }),
      ];

      mockPrismaShop.findMany.mockResolvedValue(shops);

      const result = await service.findMatchingSellers({
        jewelleryType: "RING",
        buildMethod: "METHOD_A",
        metalType: "GOLD_22K",
        estimatedWeight: 5,
        customerCountry: "IN",
      });

      expect(result.matchGroups.fullMatch.count).toBe(1);
      expect(result.matchGroups.fullMatch.sellerIds).toContain("full1");
      expect(result.matchGroups.partialMatch.count).toBe(1);
      expect(result.matchGroups.partialMatch.sellerIds).toContain("partial1");
      expect(result.matchGroups.askSeller.count).toBe(1);
      expect(result.matchGroups.askSeller.sellerIds).toContain("ask1");
    });

    it("should include stats for match quality counts", async () => {
      const shop = makeShop({ country: "IN" });
      mockPrismaShop.findMany.mockResolvedValue([shop]);

      const result = await service.findMatchingSellers({
        jewelleryType: "RING",
        buildMethod: "METHOD_A",
        estimatedWeight: 5,
        customerCountry: "IN",
      });

      expect(result.stats.fullMatchCount).toBeDefined();
      expect(result.stats.partialMatchCount).toBeDefined();
      expect(result.stats.askSellerCount).toBeDefined();
    });
  });

  // ─── Location Scoring ────────────────────────────

  describe("Location Scoring", () => {
    it("should score 3 for same city", async () => {
      const shop = makeShop({
        country: "IN",
        state: "Bihar",
        city: "Patna",
      });

      mockPrismaShop.findMany.mockResolvedValue([shop]);

      const result = await service.findMatchingSellers({
        jewelleryType: "RING",
        buildMethod: "METHOD_A",
        estimatedWeight: 5,
        customerCountry: "IN",
        customerState: "Bihar",
        customerCity: "Patna",
      });

      expect(result.sellers[0].locationScore).toBe(3);
      expect(result.sellers[0].locationMatch).toBe("same_city");
    });

    it("should score 2 for same state different city", async () => {
      const shop = makeShop({
        country: "IN",
        state: "Bihar",
        city: "Gaya",
      });

      mockPrismaShop.findMany.mockResolvedValue([shop]);

      const result = await service.findMatchingSellers({
        jewelleryType: "RING",
        buildMethod: "METHOD_A",
        estimatedWeight: 5,
        customerCountry: "IN",
        customerState: "Bihar",
        customerCity: "Patna",
      });

      expect(result.sellers[0].locationScore).toBe(2);
      expect(result.sellers[0].locationMatch).toBe("same_state");
    });

    it("should score 1 for same country different state", async () => {
      const shop = makeShop({
        country: "IN",
        state: "Maharashtra",
        city: "Mumbai",
      });

      mockPrismaShop.findMany.mockResolvedValue([shop]);

      const result = await service.findMatchingSellers({
        jewelleryType: "RING",
        buildMethod: "METHOD_A",
        estimatedWeight: 5,
        customerCountry: "IN",
        customerState: "Bihar",
        customerCity: "Patna",
      });

      expect(result.sellers[0].locationScore).toBe(1);
      expect(result.sellers[0].locationMatch).toBe("same_country");
    });

    it("should score 0 for international sellers", async () => {
      const shop = makeShop({
        country: "NP",
        state: "Bagmati",
        city: "Kathmandu",
      });

      mockPrismaShop.findMany.mockResolvedValue([shop]);

      const result = await service.findMatchingSellers({
        jewelleryType: "RING",
        buildMethod: "METHOD_A",
        estimatedWeight: 5,
        customerCountry: "IN",
        customerState: "Bihar",
        customerCity: "Patna",
        includeInternational: true,
      });

      expect(result.sellers[0].locationScore).toBe(0);
      expect(result.sellers[0].locationMatch).toBe("other");
    });

    it("should handle case-insensitive city/state comparison", async () => {
      const shop = makeShop({
        country: "IN",
        state: "bihar", // lowercase
        city: "PATNA", // uppercase
      });

      mockPrismaShop.findMany.mockResolvedValue([shop]);

      const result = await service.findMatchingSellers({
        jewelleryType: "RING",
        buildMethod: "METHOD_A",
        estimatedWeight: 5,
        customerCountry: "IN",
        customerState: "Bihar", // mixed case
        customerCity: "patna", // lowercase
      });

      expect(result.sellers[0].locationScore).toBe(3); // same city match
    });
  });

  // ─── Grouping & Sorting ──────────────────────────

  describe("Grouping & Sorting", () => {
    it("should group sellers into correct location tiers", async () => {
      const shops = [
        makeShop({ id: "s1", country: "IN", state: "Bihar", city: "Patna" }),
        makeShop({ id: "s2", country: "IN", state: "Bihar", city: "Gaya" }),
        makeShop({
          id: "s3",
          country: "IN",
          state: "Maharashtra",
          city: "Mumbai",
        }),
        makeShop({
          id: "s4",
          country: "NP",
          state: "Bagmati",
          city: "Kathmandu",
        }),
      ];

      mockPrismaShop.findMany.mockResolvedValue(shops);

      const result = await service.findMatchingSellers({
        jewelleryType: "RING",
        buildMethod: "METHOD_A",
        estimatedWeight: 5,
        customerCountry: "IN",
        customerState: "Bihar",
        customerCity: "Patna",
        includeInternational: true,
      });

      expect(result.groups.nearYou.count).toBe(1); // Patna
      expect(result.groups.sameState.count).toBe(1); // Gaya (Bihar)
      expect(result.groups.sameCountry.count).toBe(1); // Mumbai (IN)
      expect(result.groups.international.count).toBe(1); // Kathmandu (NP)
    });

    it("should order sellers: full match first, then by location score", async () => {
      const shops = [
        makeShop({
          id: "intl",
          country: "NP",
          shopName: "Nepal Shop",
        }),
        makeShop({
          id: "city",
          country: "IN",
          state: "Bihar",
          city: "Patna",
          shopName: "City Shop",
        }),
        makeShop({
          id: "country",
          country: "IN",
          state: "Maharashtra",
          shopName: "Country Shop",
        }),
        makeShop({
          id: "state",
          country: "IN",
          state: "Bihar",
          city: "Gaya",
          shopName: "State Shop",
        }),
      ];

      mockPrismaShop.findMany.mockResolvedValue(shops);

      const result = await service.findMatchingSellers({
        jewelleryType: "RING",
        buildMethod: "METHOD_A",
        estimatedWeight: 5,
        customerCountry: "IN",
        customerState: "Bihar",
        customerCity: "Patna",
        includeInternational: true,
      });

      // All are full matches, so sorted by location: city(3) > state(2) > country(1) > intl(0)
      expect(result.sellers[0].id).toBe("city");
      expect(result.sellers[1].id).toBe("state");
      expect(result.sellers[2].id).toBe("country");
      expect(result.sellers[3].id).toBe("intl");
    });
  });

  // ─── Pricing Enrichment ──────────────────────────

  describe("Pricing Enrichment", () => {
    it("should use shop custom rate when available", async () => {
      const shop = makeShop({
        country: "IN",
        metalRates: [{ metalType: "GOLD_22K", ratePerGramNpr: 10000 }],
        makingChargePercent: 12,
      });

      mockPrismaShop.findMany.mockResolvedValue([shop]);

      const result = await service.findMatchingSellers({
        jewelleryType: "RING",
        buildMethod: "METHOD_A",
        metalType: "GOLD_22K",
        estimatedWeight: 5,
        customerCountry: "IN",
      });

      const seller = result.sellers[0];
      // materialCost = 10000 * 5 = 50000
      // makingCharge = 50000 * 0.12 = 6000
      // total = 56000
      expect(seller.materialCost).toBe(50000);
      expect(seller.makingCharge).toBe(6000);
      expect(seller.estimatedPrice).toBe(56000);
      expect(seller.hasCustomRate).toBe(true);
    });

    it("should use default rate (8500) when shop has no custom rate", async () => {
      const shop = makeShop({
        country: "IN",
        metalRates: [], // no custom rates
        makingChargePercent: 10,
      });

      mockPrismaShop.findMany.mockResolvedValue([shop]);

      const result = await service.findMatchingSellers({
        jewelleryType: "RING",
        buildMethod: "METHOD_A",
        metalType: "GOLD_22K",
        estimatedWeight: 5,
        customerCountry: "IN",
      });

      const seller = result.sellers[0];
      // materialCost = 8500 * 5 = 42500
      // makingCharge = 42500 * 0.10 = 4250
      // total = 46750
      expect(seller.materialCost).toBe(42500);
      expect(seller.makingCharge).toBe(4250);
      expect(seller.estimatedPrice).toBe(46750);
      expect(seller.hasCustomRate).toBe(false);
    });

    it("should default makingChargePercent to 10 when not set", async () => {
      const shop = makeShop({
        country: "IN",
        makingChargePercent: null, // not set
      });

      mockPrismaShop.findMany.mockResolvedValue([shop]);

      const result = await service.findMatchingSellers({
        jewelleryType: "RING",
        buildMethod: "METHOD_A",
        estimatedWeight: 5,
        customerCountry: "IN",
      });

      expect(result.sellers[0].makingChargePercent).toBe(10);
    });
  });

  // ─── Diagnostics ─────────────────────────────────

  describe("Diagnostics", () => {
    it("should include diagnostics in the response", async () => {
      mockPrismaShop.findMany.mockResolvedValue([]);

      const result = await service.findMatchingSellers({
        jewelleryType: "RING",
        buildMethod: "METHOD_A",
        estimatedWeight: 5,
        customerCountry: "US",
      });

      expect(result.diagnostics).toBeDefined();
      expect(result.diagnostics.totalShops).toBe(4);
      expect(result.diagnostics.activeAndVerified).toBe(4);
      expect(result.diagnostics.customerCountry).toBe("US");
      expect(result.diagnostics.includeInternational).toBe(false);
      expect(result.diagnostics.filtersApplied.jewelleryType).toBe("RING");
      expect(result.diagnostics.filtersApplied.buildMethod).toBe("METHOD_A");
    });

    it("should report fetchedForScoring count", async () => {
      const shops = [
        makeShop({ country: "US" }),
        makeShop({ id: "s2", country: "US" }),
      ];
      mockPrismaShop.findMany.mockResolvedValue(shops);

      const result = await service.findMatchingSellers({
        jewelleryType: "RING",
        buildMethod: "METHOD_A",
        estimatedWeight: 5,
        customerCountry: "US",
      });

      expect(result.diagnostics.fetchedForScoring).toBe(2);
    });

    it("should include alloy/baseMetal/plating in filtersApplied", async () => {
      mockPrismaShop.findMany.mockResolvedValue([]);

      const result = await service.findMatchingSellers({
        jewelleryType: "RING",
        buildMethod: "METHOD_B",
        alloyType: "GOLD_18K",
        estimatedWeight: 5,
        customerCountry: "IN",
      });

      expect(result.diagnostics.filtersApplied.alloyType).toBe("GOLD_18K");
    });
  });

  // ─── Pagination ──────────────────────────────────

  describe("Pagination", () => {
    it("should paginate results correctly", async () => {
      const shops = Array.from({ length: 5 }, (_, i) =>
        makeShop({ id: `shop-${i}`, shopName: `Shop ${i}`, country: "IN" }),
      );

      mockPrismaShop.findMany.mockResolvedValue(shops);

      const result = await service.findMatchingSellers({
        jewelleryType: "RING",
        buildMethod: "METHOD_A",
        estimatedWeight: 5,
        customerCountry: "IN",
        page: 1,
        pageSize: 2,
      });

      expect(result.sellers).toHaveLength(2);
      expect(result.meta.totalCount).toBe(5);
      expect(result.meta.totalPages).toBe(3);
      expect(result.meta.page).toBe(1);
    });

    it("should return correct items for page 2", async () => {
      const shops = Array.from({ length: 5 }, (_, i) =>
        makeShop({ id: `shop-${i}`, shopName: `Shop ${i}`, country: "IN" }),
      );

      mockPrismaShop.findMany.mockResolvedValue(shops);

      const result = await service.findMatchingSellers({
        jewelleryType: "RING",
        buildMethod: "METHOD_A",
        estimatedWeight: 5,
        customerCountry: "IN",
        page: 2,
        pageSize: 2,
      });

      expect(result.sellers).toHaveLength(2);
      expect(result.sellers[0].id).toBe("shop-2");
      expect(result.sellers[1].id).toBe("shop-3");
    });
  });

  // ─── Rating Filter ───────────────────────────────

  describe("Rating Filter", () => {
    it("should filter out sellers below minRating", async () => {
      const shops = [
        makeShop({
          id: "good",
          country: "IN",
          ratings: [{ overall: 4.5 }, { overall: 4.8 }],
        }),
        makeShop({
          id: "bad",
          country: "IN",
          ratings: [{ overall: 2.0 }, { overall: 2.5 }],
        }),
      ];
      // Fix _count for ratings
      shops[0]._count = { ratings: 2 };
      shops[1]._count = { ratings: 2 };

      mockPrismaShop.findMany.mockResolvedValue(shops);

      const result = await service.findMatchingSellers({
        jewelleryType: "RING",
        buildMethod: "METHOD_A",
        estimatedWeight: 5,
        customerCountry: "IN",
        minRating: 4.0,
      });

      expect(result.sellers).toHaveLength(1);
      expect(result.sellers[0].id).toBe("good");
    });
  });

  // ─── Max Price Filter ────────────────────────────

  describe("Max Price Filter", () => {
    it("should filter out sellers above maxPrice", async () => {
      const cheapShop = makeShop({
        id: "cheap",
        country: "IN",
        metalRates: [{ metalType: "SILVER_999", ratePerGramNpr: 100 }],
        makingChargePercent: 10,
      });
      const expensiveShop = makeShop({
        id: "expensive",
        country: "IN",
        metalRates: [{ metalType: "SILVER_999", ratePerGramNpr: 50000 }],
        makingChargePercent: 20,
      });

      mockPrismaShop.findMany.mockResolvedValue([cheapShop, expensiveShop]);

      const result = await service.findMatchingSellers({
        jewelleryType: "RING",
        buildMethod: "METHOD_A",
        metalType: "SILVER_999",
        estimatedWeight: 5,
        customerCountry: "IN",
        maxPrice: 1000,
      });

      expect(result.sellers).toHaveLength(1);
      expect(result.sellers[0].id).toBe("cheap");
    });
  });

  // ─── Edge Cases ──────────────────────────────────

  describe("Edge Cases", () => {
    it("should handle zero shops in database gracefully", async () => {
      // Override mocks for empty DB
      mockPrismaShop.count.mockReset();
      mockPrismaShop.count
        .mockResolvedValueOnce(0) // totalShops
        .mockResolvedValueOnce(0); // activeAndVerified
      mockPrismaShop.findMany.mockResolvedValue([]);

      const result = await service.findMatchingSellers({
        jewelleryType: "RING",
        buildMethod: "METHOD_A",
        estimatedWeight: 5,
      });

      expect(result.sellers).toHaveLength(0);
      expect(result.diagnostics.totalShops).toBe(0);
      expect(result.stats.avgPrice).toBe(0);
      expect(result.stats.minPrice).toBe(0);
      expect(result.stats.maxPrice).toBe(0);
    });

    it("should handle shops with null state/city", async () => {
      const shop = makeShop({
        country: "IN",
        state: null,
        city: null,
      });

      mockPrismaShop.findMany.mockResolvedValue([shop]);

      const result = await service.findMatchingSellers({
        jewelleryType: "RING",
        buildMethod: "METHOD_A",
        estimatedWeight: 5,
        customerCountry: "IN",
        customerState: "Bihar",
        customerCity: "Patna",
      });

      // Should still match (same country) but score 1, not 2 or 3
      expect(result.sellers[0].locationScore).toBe(1);
      expect(result.sellers[0].locationMatch).toBe("same_country");
    });

    it("should calculate correct stats with multiple sellers", async () => {
      const shops = [
        makeShop({
          id: "s1",
          country: "IN",
          metalRates: [{ metalType: "GOLD_22K", ratePerGramNpr: 10000 }],
          makingChargePercent: 10,
        }),
        makeShop({
          id: "s2",
          country: "IN",
          metalRates: [{ metalType: "GOLD_22K", ratePerGramNpr: 12000 }],
          makingChargePercent: 15,
        }),
      ];

      mockPrismaShop.findMany.mockResolvedValue(shops);

      const result = await service.findMatchingSellers({
        jewelleryType: "RING",
        buildMethod: "METHOD_A",
        metalType: "GOLD_22K",
        estimatedWeight: 5,
        customerCountry: "IN",
      });

      // s1: 10000*5 + 10000*5*0.10 = 55000
      // s2: 12000*5 + 12000*5*0.15 = 69000
      expect(result.stats.minPrice).toBe(55000);
      expect(result.stats.maxPrice).toBe(69000);
      expect(result.stats.avgPrice).toBe(62000); // (55000+69000)/2
    });

    it("should handle shops missing supportedAlloys field gracefully", async () => {
      // Simulates shops from before the schema migration
      const shop = makeShop({ country: "IN" });
      delete shop.supportedAlloys;
      delete shop.supportedBaseMetals;
      delete shop.supportedPlatingTypes;

      mockPrismaShop.findMany.mockResolvedValue([shop]);

      const result = await service.findMatchingSellers({
        jewelleryType: "RING",
        buildMethod: "METHOD_B",
        alloyType: "GOLD_18K",
        estimatedWeight: 5,
        customerCountry: "IN",
      });

      // Should not crash — undefined arrays treated as empty (supports all)
      expect(result.sellers).toHaveLength(1);
    });
  });
});
