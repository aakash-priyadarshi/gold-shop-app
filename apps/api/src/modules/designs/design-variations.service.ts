import { Injectable, Logger, BadRequestException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHash } from "crypto";
import { RedisService } from "../../common/redis";
import { DesignsService } from "./designs.service";

/**
 * AI Design Variations Service
 *
 * Generates 5 distinct jewellery design variations from a natural-language
 * prompt + budget, using Google Gemini to produce structured specs and
 * the existing DesignsService to render preview images in parallel.
 *
 * Pro+ plan feature (gated by `aiDesignVariations`).
 */

export interface DesignVariationRequest {
  prompt: string;
  budgetMin?: number;
  budgetMax?: number;
  currency?: string;
  jewelryType?: string;
  occasion?: string;
  marketRegion?: string;
}

export interface DesignVariationSpec {
  id: string;
  title: string;
  styleSummary: string;
  description: string;
  jewelryType: string;
  buildMethod: "METHOD_A" | "METHOD_B" | "METHOD_C" | "METHOD_D";
  metalType: string;
  metalColor?: string;
  weightCategory?: "LIGHT" | "MEDIUM" | "HEAVY";
  estimatedWeight: number;
  surfaceFinish?: string;
  hasGemstones: boolean;
  primaryStone?: string;
  stoneCount?: number;
  stoneCarat?: number;
  stoneColor?: string;
  stoneCut?: string;
  settingStyle?: string;
  alloyDetails?: {
    baseMetal?: string;
    karat?: string;
    alloyFamily?: string;
  };
  platingDetails?: {
    baseMetal?: string;
    platingType?: string;
    platingTier?: string;
  };
  italianMachineDetails?: {
    purity?: string;
    chainStyle?: string;
  };
  gemstones?: Array<{
    stoneType?: string;
    shape?: string;
    color?: string;
    clarity?: string;
    cut?: string;
    settingStyle?: string;
    count?: number;
    sizeValue?: number;
    sizeUnit?: string;
  }>;
  estimatedCost: {
    metal: number;
    making: number;
    gemstones: number;
    finish: number;
    total: number;
    currency: string;
  };
  highlights: string[];
  imageUrl?: string;
  designId?: string;
}

export interface DesignVariationsResponse {
  variations: DesignVariationSpec[];
  prompt: string;
  budgetMin?: number;
  budgetMax?: number;
  currency: string;
  cached: boolean;
}

@Injectable()
export class DesignVariationsService {
  private readonly logger = new Logger(DesignVariationsService.name);
  private readonly GEMINI_API_URL =
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";
  private readonly apiKey: string;
  private readonly CACHE_PREFIX = "ai:design-variations:";
  private readonly CACHE_TTL = 60 * 60 * 6; // 6 hours

  constructor(
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
    private readonly designsService: DesignsService,
  ) {
    this.apiKey = this.configService.get<string>("GEMINI_API_KEY") || "";
  }

  async generateVariations(
    userId: string,
    dto: DesignVariationRequest,
  ): Promise<DesignVariationsResponse> {
    if (!dto.prompt || dto.prompt.trim().length < 5) {
      throw new BadRequestException(
        "Please describe what jewellery you would like (at least a few words).",
      );
    }

    const currency = (dto.currency || "INR").toUpperCase();
    const cacheKey = `${this.CACHE_PREFIX}${this.hashRequest({ ...dto, currency })}`;

    // Try cache (specs only — re-attach image URLs from cache too)
    try {
      const cached = await this.redisService.get(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached) as DesignVariationsResponse;
        this.logger.log(`Returning cached variations for prompt hash`);
        return { ...parsed, cached: true };
      }
    } catch {
      /* fall through */
    }

    // 1. Ask Gemini for 5 specs
    const specs = await this.callGeminiForSpecs(dto, currency);

    // 2. Render each variation's image in parallel via DesignsService.
    //    We swallow individual failures — a missing image shouldn't kill the batch.
    const enriched = await Promise.all(
      specs.map(async (spec, idx) => {
        try {
          const result = await this.designsService.createDesign(userId, {
            jewelryType: spec.jewelryType as never,
            buildMethod: spec.buildMethod as never,
            metalType: spec.metalType,
            metalColor: spec.metalColor,
            weightCategory: spec.weightCategory as never,
            estimatedWeight: spec.estimatedWeight,
            surfaceFinish: spec.surfaceFinish,
            hasGemstones: spec.hasGemstones,
            primaryStone: spec.primaryStone,
            stoneCut: spec.stoneCut,
            stoneCarat: spec.stoneCarat,
            stoneColor: spec.stoneColor,
            stoneCount: spec.stoneCount,
            settingStyle: spec.settingStyle,
            alloyDetails: spec.alloyDetails,
            platingDetails: spec.platingDetails,
            italianMachineDetails: spec.italianMachineDetails,
            gemstones: spec.gemstones,
            additionalSpecs: {
              variationOf: dto.prompt,
              variationIndex: idx,
              styleSummary: spec.styleSummary,
              description: spec.description,
            },
            shareToGallery: false,
          });
          return {
            ...spec,
            imageUrl: result.design?.imageUrl,
            designId: result.design?.id,
          };
        } catch (err: unknown) {
          this.logger.warn(
            `Variation ${idx} image generation failed: ${(err as Error).message}`,
          );
          return spec;
        }
      }),
    );

    const response: DesignVariationsResponse = {
      variations: enriched,
      prompt: dto.prompt,
      budgetMin: dto.budgetMin,
      budgetMax: dto.budgetMax,
      currency,
      cached: false,
    };

    try {
      await this.redisService.set(
        cacheKey,
        JSON.stringify(response),
        this.CACHE_TTL,
      );
    } catch {
      /* noop */
    }

    return response;
  }

  private async callGeminiForSpecs(
    dto: DesignVariationRequest,
    currency: string,
  ): Promise<DesignVariationSpec[]> {
    if (!this.apiKey) {
      this.logger.warn("GEMINI_API_KEY missing — returning fallback variations");
      return this.fallbackVariations(dto, currency);
    }

    const prompt = this.buildPrompt(dto, currency);

    try {
      const response = await fetch(
        `${this.GEMINI_API_URL}?key=${this.apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.85,
              maxOutputTokens: 4096,
              responseMimeType: "application/json",
            },
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status}`);
      }

      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error("Empty Gemini response");

      const parsed = JSON.parse(text);
      const arr = Array.isArray(parsed?.variations)
        ? parsed.variations
        : Array.isArray(parsed)
          ? parsed
          : [];

      if (!arr.length) throw new Error("No variations in response");

      return arr.slice(0, 5).map((v: Record<string, unknown>, idx: number) =>
        this.normalizeSpec(v, idx, currency, dto),
      );
    } catch (err: unknown) {
      this.logger.error(
        `Gemini variations call failed: ${(err as Error).message}`,
      );
      return this.fallbackVariations(dto, currency);
    }
  }

  private buildPrompt(
    dto: DesignVariationRequest,
    currency: string,
  ): string {
    const budgetText =
      dto.budgetMin || dto.budgetMax
        ? `Budget: ${dto.budgetMin ?? 0} – ${dto.budgetMax ?? "no upper limit"} ${currency}`
        : "Budget: not specified";

    return `You are a master jewellery designer for a global online marketplace. Produce exactly 5 DISTINCT, beautiful, production-ready jewellery design variations from the customer's description. Each variation must be different in style, material mix, or stone choice — never duplicates.

Customer request: "${dto.prompt}"
${budgetText}
${dto.jewelryType ? `Preferred jewellery type: ${dto.jewelryType}` : ""}
${dto.occasion ? `Occasion: ${dto.occasion}` : ""}
${dto.marketRegion ? `Market region: ${dto.marketRegion}` : ""}

Return STRICT JSON of shape:
{
  "variations": [
    {
      "title": "Short evocative name",
      "styleSummary": "One-sentence elevator pitch",
      "description": "2-3 sentence detailed description suitable for the customer to read",
      "jewelryType": "RING|NECKLACE|BRACELET|BANGLE|EARRING|PENDANT|CHAIN|ANKLET|BROOCH|TIE_PIN|CUFFLINKS|NOSE_PIN|MANGALSUTRA|MAANG_TIKKA|OTHER",
      "buildMethod": "METHOD_A|METHOD_B|METHOD_C|METHOD_D",
      "metalType": "GOLD_24K|GOLD_22K|GOLD_18K|GOLD_14K|GOLD_10K|SILVER_999|SILVER_925|PLATINUM_PT950|...",
      "metalColor": "YELLOW|WHITE|ROSE|GREEN (optional)",
      "weightCategory": "LIGHT|MEDIUM|HEAVY",
      "estimatedWeight": <grams as number>,
      "surfaceFinish": "HIGH_POLISH|MATTE|BRUSHED|SATIN|HAMMERED|SANDBLASTED|DIAMOND_CUT|ENGRAVED|...",
      "hasGemstones": true|false,
      "primaryStone": "DIAMOND|RUBY|EMERALD|SAPPHIRE|... (if applicable)",
      "stoneCount": <number>,
      "stoneCarat": <total carat weight>,
      "stoneColor": "color descriptor",
      "stoneCut": "ROUND|PRINCESS|OVAL|CUSHION|PEAR|EMERALD|MARQUISE|...",
      "settingStyle": "PRONG|BEZEL|PAVE|CHANNEL|HALO|TENSION|...",
      "alloyDetails": { "baseMetal": "GOLD|SILVER", "karat": "22K|18K|14K|10K", "alloyFamily": "YELLOW_GOLD|WHITE_GOLD|ROSE_GOLD|GREEN_GOLD" },
      "platingDetails": { "baseMetal": "BRASS|...", "platingType": "GOLD_PLATED|...", "platingTier": "STANDARD|PREMIUM|ECONOMY" },
      "italianMachineDetails": { "purity": "22K|18K|14K|SILVER_925", "chainStyle": "ROPE|FIGARO|CURB|BOX|..." },
      "gemstones": [{ "stoneType":"DIAMOND","shape":"ROUND","color":"D","clarity":"VS1","cut":"EXCELLENT","settingStyle":"PRONG","count":1,"sizeValue":0.5,"sizeUnit":"CARAT"}],
      "estimatedCost": {
        "metal": <number in ${currency}>,
        "making": <number in ${currency}>,
        "gemstones": <number in ${currency}>,
        "finish": <number in ${currency}>,
        "total": <number in ${currency}>,
        "currency": "${currency}"
      },
      "highlights": ["3-5 short bullet points the customer will love"]
    }
    /* …5 total… */
  ]
}

RULES:
- Only include alloyDetails when buildMethod=METHOD_B; only platingDetails for METHOD_C; only italianMachineDetails for METHOD_D. Omit the others.
- Spread variations across budget: cheapest near the lower bound, premium near the upper bound. If no budget given, range from accessible to luxury.
- Estimated total cost MUST stay within the budget when given. Use realistic 2026 market prices.
- All numeric fields are plain numbers (no currency symbols, no commas).
- jewelryType, buildMethod, metalType, weightCategory, surfaceFinish must be exact enum values (UPPER_SNAKE_CASE).
- Be creative: vary metal colour, stone choice, finish, build method across the 5.
`;
  }

  private normalizeSpec(
    raw: Record<string, unknown>,
    idx: number,
    currency: string,
    dto: DesignVariationRequest,
  ): DesignVariationSpec {
    const num = (v: unknown, fallback = 0): number => {
      const n = typeof v === "number" ? v : parseFloat(String(v));
      return Number.isFinite(n) ? n : fallback;
    };
    const str = (v: unknown): string | undefined =>
      typeof v === "string" && v.trim() ? v.trim() : undefined;

    const cost = (raw.estimatedCost as Record<string, unknown>) || {};
    const metal = num(cost.metal);
    const making = num(cost.making);
    const gems = num(cost.gemstones);
    const finish = num(cost.finish);
    const totalRaw = num(cost.total);
    const total = totalRaw > 0 ? totalRaw : metal + making + gems + finish;

    const buildMethod = (str(raw.buildMethod) ||
      "METHOD_B") as DesignVariationSpec["buildMethod"];

    const spec: DesignVariationSpec = {
      id: `var-${Date.now()}-${idx}`,
      title: str(raw.title) || `Design Variation ${idx + 1}`,
      styleSummary: str(raw.styleSummary) || "",
      description: str(raw.description) || "",
      jewelryType:
        str(raw.jewelryType) || dto.jewelryType?.toUpperCase() || "RING",
      buildMethod,
      metalType: str(raw.metalType) || "GOLD_22K",
      metalColor: str(raw.metalColor),
      weightCategory: (str(raw.weightCategory) ||
        "MEDIUM") as DesignVariationSpec["weightCategory"],
      estimatedWeight: num(raw.estimatedWeight, 5),
      surfaceFinish: str(raw.surfaceFinish),
      hasGemstones: Boolean(raw.hasGemstones),
      primaryStone: str(raw.primaryStone),
      stoneCount: raw.stoneCount != null ? num(raw.stoneCount) : undefined,
      stoneCarat: raw.stoneCarat != null ? num(raw.stoneCarat) : undefined,
      stoneColor: str(raw.stoneColor),
      stoneCut: str(raw.stoneCut),
      settingStyle: str(raw.settingStyle),
      alloyDetails:
        buildMethod === "METHOD_B" && raw.alloyDetails
          ? (raw.alloyDetails as DesignVariationSpec["alloyDetails"])
          : undefined,
      platingDetails:
        buildMethod === "METHOD_C" && raw.platingDetails
          ? (raw.platingDetails as DesignVariationSpec["platingDetails"])
          : undefined,
      italianMachineDetails:
        buildMethod === "METHOD_D" && raw.italianMachineDetails
          ? (raw.italianMachineDetails as DesignVariationSpec["italianMachineDetails"])
          : undefined,
      gemstones: Array.isArray(raw.gemstones)
        ? (raw.gemstones as DesignVariationSpec["gemstones"])
        : undefined,
      estimatedCost: {
        metal,
        making,
        gemstones: gems,
        finish,
        total,
        currency,
      },
      highlights: Array.isArray(raw.highlights)
        ? (raw.highlights as unknown[])
            .map((h) => String(h))
            .filter(Boolean)
            .slice(0, 6)
        : [],
    };

    return spec;
  }

  /** Deterministic non-AI fallback — keeps the UX alive if Gemini is down. */
  private fallbackVariations(
    dto: DesignVariationRequest,
    currency: string,
  ): DesignVariationSpec[] {
    const base = dto.budgetMax || dto.budgetMin || 50000;
    const tiers = [0.4, 0.6, 0.8, 1.0, 1.2];
    const jt = (dto.jewelryType || "RING").toUpperCase();
    return tiers.map((t, i) => ({
      id: `fallback-${Date.now()}-${i}`,
      title: `${jt.charAt(0) + jt.slice(1).toLowerCase()} ${["Classic", "Modern", "Heritage", "Statement", "Premium"][i]}`,
      styleSummary: "Curated suggestion based on your description.",
      description: dto.prompt,
      jewelryType: jt,
      buildMethod: "METHOD_B",
      metalType: i < 2 ? "GOLD_18K" : i < 4 ? "GOLD_22K" : "GOLD_22K",
      metalColor: "YELLOW",
      weightCategory: i < 2 ? "LIGHT" : i < 4 ? "MEDIUM" : "HEAVY",
      estimatedWeight: 3 + i * 1.5,
      surfaceFinish: "HIGH_POLISH",
      hasGemstones: i >= 2,
      primaryStone: i >= 2 ? "DIAMOND" : undefined,
      stoneCount: i >= 2 ? i : undefined,
      alloyDetails: {
        baseMetal: "GOLD",
        karat: i < 2 ? "18K" : "22K",
        alloyFamily: "YELLOW_GOLD",
      },
      estimatedCost: {
        metal: Math.round(base * t * 0.6),
        making: Math.round(base * t * 0.15),
        gemstones: Math.round(base * t * 0.2),
        finish: Math.round(base * t * 0.05),
        total: Math.round(base * t),
        currency,
      },
      highlights: ["Hand-finished", "Hallmark certified", "30-day returns"],
    }));
  }

  private hashRequest(dto: Record<string, unknown>): string {
    return createHash("sha256")
      .update(JSON.stringify(dto))
      .digest("hex")
      .slice(0, 32);
  }
}
