import { Injectable, NotFoundException } from "@nestjs/common";
import {
  GemstoneType,
  JewelleryType,
  MaterialCategory,
  PlatingOption,
} from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";

// Expanded Material definitions matching the spec
const PRECIOUS_METALS = [
  { id: "GOLD_24K", name: "24K Gold (99.9% Pure)", purity: 0.999 },
  { id: "GOLD_22K", name: "22K Gold (91.6% Pure)", purity: 0.916 },
  { id: "GOLD_18K", name: "18K Gold (75% Pure)", purity: 0.75 },
  { id: "GOLD_14K", name: "14K Gold (58.3% Pure)", purity: 0.583 },
  { id: "GOLD_10K", name: "10K Gold (41.7% Pure)", purity: 0.417 },
  { id: "SILVER_999", name: "Fine Silver (99.9% Pure)", purity: 0.999 },
  { id: "SILVER_925", name: "Sterling Silver (92.5% Pure)", purity: 0.925 },
  { id: "PLATINUM_950", name: "Platinum (PT950)", purity: 0.95 },
  { id: "PLATINUM_900", name: "Platinum (PT900)", purity: 0.9 },
  { id: "PALLADIUM_950", name: "Palladium (PD950)", purity: 0.95 },
];

const BASE_METALS = [
  { id: "BRASS", name: "Brass (Copper + Zinc)", density: 8.4 },
  { id: "BRONZE", name: "Bronze (Copper + Tin)", density: 8.8 },
  { id: "COPPER", name: "Copper", density: 8.96 },
  { id: "STAINLESS_STEEL_316L", name: "Stainless Steel 316L", density: 8.0 },
  { id: "TITANIUM", name: "Titanium", density: 4.5 },
  { id: "TUNGSTEN_CARBIDE", name: "Tungsten Carbide", density: 15.6 },
  { id: "COBALT_CHROME", name: "Cobalt Chrome", density: 8.3 },
];

const JEWELLERY_ALLOYS = [
  { id: "COPPER_ALLOY", name: "Copper Alloy", complianceFlags: [] },
  { id: "ZINC_ALLOY", name: "Zinc Alloy", complianceFlags: [] },
  {
    id: "NICKEL_ALLOY",
    name: "Nickel Alloy (Restricted)",
    complianceFlags: ["NICKEL_COMPLIANCE_REQUIRED"],
  },
  { id: "BRASS_ALLOY", name: "Brass Alloy", complianceFlags: [] },
  { id: "BRONZE_ALLOY", name: "Bronze Alloy", complianceFlags: [] },
];

// Surface finishes (non-coating)
const SURFACE_FINISHES = [
  { id: "HIGH_POLISH", name: "High Polish / Mirror Finish" },
  { id: "MATTE", name: "Matte Finish" },
  { id: "BRUSHED", name: "Brushed Finish" },
  { id: "SATIN", name: "Satin Finish" },
  { id: "HAMMERED", name: "Hammered Texture" },
  { id: "SANDBLASTED", name: "Sandblasted Finish" },
  { id: "FLORENTINE", name: "Florentine Finish" },
  { id: "BARK_TEXTURE", name: "Bark Texture" },
  { id: "DIAMOND_CUT", name: "Diamond Cut Finish" },
  { id: "ENGRAVED", name: "Engraved Finish" },
];

// Coatings/Platings
const PLATING_TYPES = [
  { id: "GOLD_PLATING", name: "Gold Plating", requiresSilverBase: false },
  {
    id: "ROSE_GOLD_PLATING",
    name: "Rose Gold Plating",
    requiresSilverBase: false,
  },
  { id: "RHODIUM_PLATING", name: "Rhodium Plating", requiresSilverBase: false },
  { id: "SILVER_PLATING", name: "Silver Plating", requiresSilverBase: false },
  {
    id: "VERMEIL",
    name: "Vermeil (Gold over Sterling Silver)",
    requiresSilverBase: true,
  },
  { id: "PVD_COATING", name: "PVD Coating", requiresSilverBase: false },
];

const PLATING_TIERS = [
  {
    id: "LIGHT",
    name: "Light (0.5-1μm)",
    thicknessRange: "0.5-1 microns",
    durability: "3-6 months",
  },
  {
    id: "STANDARD",
    name: "Standard (1-2.5μm)",
    thicknessRange: "1-2.5 microns",
    durability: "6-12 months",
  },
  {
    id: "PREMIUM",
    name: "Premium (2.5-5μm)",
    thicknessRange: "2.5-5 microns",
    durability: "12-24 months",
  },
];

const GEMSTONE_TYPES = [
  { id: "DIAMOND_NATURAL", name: "Diamond (Natural)", category: "precious" },
  { id: "DIAMOND_LAB", name: "Diamond (Lab-Grown)", category: "precious" },
  { id: "MOISSANITE", name: "Moissanite", category: "alternative" },
  { id: "CUBIC_ZIRCONIA", name: "Cubic Zirconia (CZ)", category: "simulant" },
  { id: "RUBY", name: "Ruby", category: "precious" },
  { id: "SAPPHIRE", name: "Sapphire", category: "precious" },
  { id: "EMERALD", name: "Emerald", category: "precious" },
  { id: "PEARL", name: "Pearl", category: "organic" },
  { id: "AMETHYST", name: "Amethyst", category: "semi-precious" },
  { id: "TOPAZ", name: "Topaz", category: "semi-precious" },
  { id: "GARNET", name: "Garnet", category: "semi-precious" },
  { id: "OPAL", name: "Opal", category: "semi-precious" },
  { id: "TURQUOISE", name: "Turquoise", category: "semi-precious" },
  { id: "AQUAMARINE", name: "Aquamarine", category: "semi-precious" },
  { id: "PERIDOT", name: "Peridot", category: "semi-precious" },
  { id: "CITRINE", name: "Citrine", category: "semi-precious" },
];

const GEMSTONE_SHAPES = [
  { id: "ROUND", name: "Round Brilliant" },
  { id: "OVAL", name: "Oval" },
  { id: "PRINCESS", name: "Princess (Square)" },
  { id: "CUSHION", name: "Cushion" },
  { id: "EMERALD_CUT", name: "Emerald Cut" },
  { id: "MARQUISE", name: "Marquise" },
  { id: "PEAR", name: "Pear" },
  { id: "HEART", name: "Heart" },
  { id: "RADIANT", name: "Radiant" },
  { id: "ASSCHER", name: "Asscher" },
  { id: "BAGUETTE", name: "Baguette" },
  { id: "TRILLION", name: "Trillion" },
  { id: "CABOCHON", name: "Cabochon" },
];

const SETTING_STYLES = [
  {
    id: "PRONG",
    name: "Prong Setting",
    description: "Classic setting with metal claws holding the stone",
  },
  {
    id: "BEZEL",
    name: "Bezel Setting",
    description: "Metal rim surrounding the stone",
  },
  {
    id: "CHANNEL",
    name: "Channel Setting",
    description: "Stones set in a metal channel",
  },
  {
    id: "PAVE",
    name: "Pavé Setting",
    description: "Multiple small stones set closely together",
  },
  {
    id: "FLUSH",
    name: "Flush/Gypsy Setting",
    description: "Stone sits flush with metal surface",
  },
  {
    id: "TENSION",
    name: "Tension Setting",
    description: "Stone held by pressure from band",
  },
  {
    id: "HALO",
    name: "Halo Setting",
    description: "Center stone surrounded by smaller stones",
  },
  {
    id: "CLUSTER",
    name: "Cluster Setting",
    description: "Multiple stones grouped together",
  },
  {
    id: "BAR",
    name: "Bar Setting",
    description: "Metal bars hold stones on sides",
  },
  {
    id: "INVISIBLE",
    name: "Invisible Setting",
    description: "No metal visible between stones",
  },
];

@Injectable()
export class MaterialsService {
  constructor(private prisma: PrismaService) {}

  // Get all precious metals
  getPreciousMetals() {
    return PRECIOUS_METALS;
  }

  // Get all base metals
  getBaseMetals() {
    return BASE_METALS;
  }

  // Get jewellery alloys
  getJewelleryAlloys() {
    return JEWELLERY_ALLOYS;
  }

  // Get surface finishes (non-coating)
  getSurfaceFinishes() {
    return SURFACE_FINISHES;
  }

  // Get all coating/plating types
  getPlatingTypes() {
    return PLATING_TYPES;
  }

  // Get all finish types (combined - legacy compatibility)
  getFinishTypes() {
    return {
      surfaceFinishes: SURFACE_FINISHES,
      platings: PLATING_TYPES,
    };
  }

  // Get all gemstone types
  getGemstones() {
    return GEMSTONE_TYPES;
  }

  // Get gemstone shapes
  getGemstoneShapes() {
    return GEMSTONE_SHAPES;
  }

  // Get setting styles
  getSettingStyles() {
    return SETTING_STYLES;
  }

  // Get plating tiers
  getPlatingTiers() {
    return PLATING_TIERS;
  }

  // Get plating options from database
  async getPlatingOptions() {
    return this.prisma.platingOption.findMany({
      where: { isActive: true },
      orderBy: [{ platingType: "asc" }, { tier: "asc" }],
    });
  }

  // Get jewellery templates
  async getTemplates(jewelleryType?: string) {
    return this.prisma.jewelleryTemplate.findMany({
      where: {
        isActive: true,
        ...(jewelleryType && { jewelleryType: jewelleryType as JewelleryType }),
      },
      include: {
        suggestedGemstones: true,
      },
      orderBy: [{ jewelleryType: "asc" }, { sortOrder: "asc" }],
    });
  }

  // Get single template
  async getTemplate(id: string) {
    const template = await this.prisma.jewelleryTemplate.findUnique({
      where: { id },
      include: {
        suggestedGemstones: true,
      },
    });
    if (!template) {
      throw new NotFoundException("Template not found");
    }
    return template;
  }

  // Get gemstone presets
  async getGemstonePresets(templateId?: string, stoneType?: string) {
    return this.prisma.gemstonePreset.findMany({
      where: {
        isActive: true,
        ...(templateId && { templateId }),
        ...(stoneType && { stoneType: stoneType as GemstoneType }),
      },
      orderBy: { basePriceNpr: "asc" },
    });
  }

  // Get material from database
  async getMaterialDetails(code: string) {
    const material = await this.prisma.material.findUnique({
      where: { code },
    });
    if (!material) {
      throw new NotFoundException("Material not found");
    }
    return material;
  }

  // Get all materials from database
  async getAllMaterials(category?: MaterialCategory) {
    return this.prisma.material.findMany({
      where: {
        isActive: true,
        ...(category && { category }),
      },
      orderBy: { nameEn: "asc" },
    });
  }

  // Get market rates (from database)
  async getMarketRates(country = "NP") {
    return this.prisma.marketRate.findMany({
      where: {
        country,
        OR: [{ validUntil: null }, { validUntil: { gte: new Date() } }],
      },
      orderBy: { validFrom: "desc" },
    });
  }

  // Update market rate (admin only)
  async updateMarketRate(
    metalCode: string,
    ratePerGram: number,
    source: string,
    country = "NP",
  ) {
    // Expire old rates
    await this.prisma.marketRate.updateMany({
      where: {
        metalCode,
        country,
        validUntil: null,
      },
      data: { validUntil: new Date() },
    });

    // Create new rate
    return this.prisma.marketRate.create({
      data: {
        metalCode,
        ratePerGram,
        source,
        country,
        validFrom: new Date(),
        validUntil: null,
      },
    });
  }

  // Get jewellery types
  getJewelleryTypes() {
    return Object.values(JewelleryType).map((type) => ({
      id: type,
      name: type.replace(/_/g, " "),
    }));
  }

  // Get build methods with descriptions
  getBuildMethods() {
    return [
      {
        id: "METHOD_A",
        name: "Solid Precious Metal",
        description: "Pure precious metal construction (e.g., 22K gold ring)",
        allowedMaterials: ["PRECIOUS_METALS"],
        examples: ["22K Gold Ring", "Silver Bangle", "Platinum Chain"],
        label: "Solid Gold/Silver/Platinum",
      },
      {
        id: "METHOD_B",
        name: "Standard Alloy",
        description: "Jewellery alloy (gold with other metals for durability)",
        allowedMaterials: ["PRECIOUS_METALS", "JEWELLERY_ALLOY"],
        examples: ["18K Gold Ring", "14K Gold Chain"],
        label: "Standard Jewellery Alloy",
      },
      {
        id: "METHOD_C",
        name: "Core Metal + Finish",
        description: "Base metal core with precious metal plating/finish",
        allowedMaterials: ["BASE_METALS", "FINISH_COATING"],
        examples: ["Gold Plated Brass Ring", "Rhodium Plated Silver"],
        label: "Not solid gold. Plated/Coated.",
      },
      {
        id: "METHOD_D",
        name: "Multi-Metal Construction",
        description: "Multiple metals combined in specific patterns",
        allowedMaterials: ["PRECIOUS_METALS", "BASE_METALS"],
        patterns: ["TOP_PLATE", "INLAY", "OUTER_SLEEVE", "TWO_TONE_SPLIT"],
        modes: [
          {
            id: "MODE_D1",
            name: "Gold Percentage by Weight",
            description: "Specify the percentage of gold in total weight",
          },
          {
            id: "MODE_D2",
            name: "Target Gold Weight",
            description: "Specify exact gold weight in grams",
          },
          {
            id: "MODE_D3",
            name: "Part Dimensions",
            description: "Specify dimensions of each metal component",
          },
        ],
        label:
          "Multi-metal construction. Not solid gold unless 100% gold selected.",
      },
    ];
  }

  // Get composition rules for validation
  getCompositionRules() {
    return {
      METHOD_A: {
        required: ["preciousMetal", "purity"],
        optional: ["weight"],
      },
      METHOD_B: {
        required: ["primaryMetal", "alloyComposition"],
        optional: ["weight"],
      },
      METHOD_C: {
        required: ["coreMetal"],
        optional: ["weight", "addGoldPlating", "platingType", "platingTier"],
        validation: {
          vermeilRequiresSterlingBase: true,
        },
      },
      METHOD_D: {
        required: ["pattern", "mode", "metalLayers"],
        optional: [
          "goldPercentByWeight",
          "targetGoldWeightG",
          "partDimensions",
        ],
      },
    };
  }

  // Calculate price estimate
  async calculatePriceEstimate(params: {
    metalType: string;
    weightGrams: number;
    buildMethod: string;
    country?: string;
    platingType?: string;
    platingTier?: string;
    gemstones?: Array<{ presetId?: string; count: number }>;
    makingChargePercent?: number;
  }) {
    const {
      metalType,
      weightGrams,
      buildMethod,
      country = "NP",
      platingType,
      platingTier,
      gemstones = [],
      makingChargePercent = 10, // Default making charge — matches platform config
    } = params;

    // Get market rate for metal
    const marketRates = await this.getMarketRates(country);
    const metalRate = marketRates.find((r) => r.metalCode === metalType);

    // Fallback rates if not found
    const fallbackRates: Record<string, number> = {
      GOLD_24K: 11400,
      GOLD_22K: 10700,
      GOLD_18K: 8800,
      GOLD_14K: 6800,
      SILVER_999: 130,
      SILVER_925: 120,
      PLATINUM_950: 4100,
      BRASS: 1.5,
      COPPER: 1.2,
      STAINLESS_STEEL_316L: 0.5,
    };

    const ratePerGram = metalRate?.ratePerGram || fallbackRates[metalType] || 0;

    // Calculate metal cost
    const metalCost = weightGrams * ratePerGram;

    // Calculate making charge
    const makingCharge = metalCost * (makingChargePercent / 100);

    // Calculate plating cost (for METHOD_C)
    let platingCost = 0;
    if (buildMethod === "METHOD_C" && platingType && platingTier) {
      const platingOptions = await this.getPlatingOptions();
      const option = platingOptions.find(
        (p: PlatingOption) =>
          p.platingType === platingType && p.tier === platingTier,
      );
      platingCost = option?.basePriceNpr || 0;
    }

    // Calculate gemstone cost
    let gemstoneCost = 0;
    for (const gem of gemstones) {
      if (gem.presetId) {
        const preset = await this.prisma.gemstonePreset.findUnique({
          where: { id: gem.presetId },
        });
        if (preset) {
          gemstoneCost += preset.basePriceNpr * gem.count;
        }
      }
    }

    // Calculate total
    const subtotal = metalCost + makingCharge + platingCost + gemstoneCost;
    const tax = subtotal * 0.13; // 13% VAT in Nepal
    const total = subtotal + tax;

    return {
      breakdown: {
        metalCost: Math.round(metalCost),
        makingCharge: Math.round(makingCharge),
        platingCost: Math.round(platingCost),
        gemstoneCost: Math.round(gemstoneCost),
        subtotal: Math.round(subtotal),
        tax: Math.round(tax),
        total: Math.round(total),
      },
      rates: {
        metalRatePerGram: ratePerGram,
        makingChargePercent,
        taxPercent: 13,
      },
      estimate: {
        min: Math.round(total * 0.9), // -10% for lower estimates
        max: Math.round(total * 1.15), // +15% for shop variations
      },
      labels:
        buildMethod === "METHOD_C" ? ["Not solid gold. Plated/Coated."] : [],
    };
  }
}
