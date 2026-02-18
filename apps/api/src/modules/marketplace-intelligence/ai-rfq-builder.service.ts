import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { RedisService } from "../../common/redis";
import { PrismaService } from "../../prisma/prisma.service";
import { AiRfqBuilderDto, AiRfqBuilderResponse } from "./dto/rfq-builder.dto";

/**
 * AI RFQ Builder Service
 *
 * Uses Google Gemini Flash to convert natural language descriptions
 * into structured RFQ form data. Falls back to templates when AI is unavailable.
 *
 * Cost: ~$0 with free tier (15 RPM, 1M tokens/day)
 */
@Injectable()
export class AiRfqBuilderService {
  private readonly logger = new Logger(AiRfqBuilderService.name);
  private readonly GEMINI_API_URL =
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";
  private readonly apiKey: string;
  private readonly CACHE_PREFIX = "ai:rfq:";
  private readonly CACHE_TTL = 3600; // 1 hour for similar queries
  private readonly GUEST_RATE_LIMIT_PREFIX = "ai:guest:";
  private readonly GUEST_RATE_LIMIT = 5; // 5 requests per hour for guests
  private readonly GUEST_RATE_TTL = 3600; // 1 hour window

  // Valid enum values from schema
  private readonly JEWELLERY_TYPES = [
    "RING",
    "NECKLACE",
    "BRACELET",
    "BANGLE",
    "EARRING",
    "PENDANT",
    "CHAIN",
    "ANKLET",
    "BROOCH",
    "TIE_PIN",
    "CUFFLINKS",
    "NOSE_PIN",
    "MANGALSUTRA",
    "MAANG_TIKKA",
    "OTHER",
  ];

  private readonly BUILD_METHODS = [
    "METHOD_A",
    "METHOD_B",
    "METHOD_C",
    "METHOD_D",
  ];

  private readonly WEIGHT_CATEGORIES = ["LIGHT", "MEDIUM", "HEAVY"];

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private redisService: RedisService,
  ) {
    this.apiKey = this.configService.get<string>("GEMINI_API_KEY") || "";
  }

  /**
   * Check and enforce rate limit for guest (unauthenticated) users.
   * Returns true if request is allowed, false if rate limited.
   */
  async checkGuestRateLimit(ip: string): Promise<boolean> {
    const key = `${this.GUEST_RATE_LIMIT_PREFIX}${ip}`;
    try {
      const current = await this.redisService.get(key);
      const count = current ? parseInt(current) : 0;

      if (count >= this.GUEST_RATE_LIMIT) {
        return false;
      }

      // Increment and set TTL on first request
      if (count === 0) {
        await this.redisService.set(key, "1", this.GUEST_RATE_TTL);
      } else {
        await this.redisService.set(
          key,
          String(count + 1),
          this.GUEST_RATE_TTL,
        );
      }
      return true;
    } catch {
      // If Redis is down, allow the request (fail open)
      return true;
    }
  }

  /**
   * Convert natural language to structured RFQ data
   */
  async buildRfqFromDescription(
    dto: AiRfqBuilderDto,
  ): Promise<AiRfqBuilderResponse> {
    // Check cache for similar queries
    const cacheKey = `${this.CACHE_PREFIX}${this.hashQuery(dto.description)}`;
    try {
      const cached = await this.redisService.get(cacheKey);
      if (cached) {
        this.logger.log("Returning cached RFQ builder result");
        return JSON.parse(cached);
      }
    } catch {}

    // Get market context if we have enough data
    const marketContext = await this.getMarketContext(dto);

    try {
      const result = await this.callGemini(dto, marketContext);

      // Cache the result
      try {
        await this.redisService.set(
          cacheKey,
          JSON.stringify(result),
          this.CACHE_TTL,
        );
      } catch {}

      return result;
    } catch (error) {
      this.logger.error(`Gemini RFQ builder failed: ${error.message}`);
      // Fallback to rule-based parsing
      return this.fallbackParse(dto);
    }
  }

  private async callGemini(
    dto: AiRfqBuilderDto,
    marketContext: string,
  ): Promise<AiRfqBuilderResponse> {
    const prompt = this.buildPrompt(dto, marketContext);

    const response = await fetch(`${this.GEMINI_API_URL}?key=${this.apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 1024,
          responseMimeType: "application/json",
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      throw new Error("Empty response from Gemini");
    }

    const parsed = JSON.parse(text);
    return this.validateAndNormalize(parsed);
  }

  private buildPrompt(dto: AiRfqBuilderDto, marketContext: string): string {
    return `You are a friendly jewellery expert assistant for an online marketplace. Your job is to convert the customer's natural language description into a structured RFQ (Request for Quote) specification.

CRITICAL: Assume the customer is a complete beginner who gives very vague input. You MUST fill ALL fields with sensible defaults even if the customer only says something like "I want a bracelet" or "gold ring". Never leave weight, build method, or sub-options empty.

Customer Description: "${dto.description}"
${dto.budgetHint ? `Budget Hint: "${dto.budgetHint}"` : ""}
${dto.occasion ? `Occasion: "${dto.occasion}"` : ""}
${dto.preferredMetal ? `Preferred Metal: "${dto.preferredMetal}"` : ""}
${dto.marketRegion ? `Market Region: ${dto.marketRegion}` : ""}

${marketContext}

IMPORTANT: The form has 4 Build Methods with SPECIFIC metal configuration rules:

**METHOD_A (Solid Pure Precious Metal)** - Only for PURE metals with NO alloying:
  - Valid metals: GOLD_24K, SILVER_999, PLATINUM_PT950, PLATINUM_PT900, PALLADIUM_PD950, PALLADIUM_PD500
  - Use ONLY when customer explicitly requests pure/24K gold, fine silver, or platinum

**METHOD_B (Precious Metal Alloy)** - For gold alloys (22K, 18K, 14K, 10K) and sterling silver:
  - baseMetal: "GOLD" or "SILVER"
  - karat (for GOLD only): "22K", "18K", "14K", "10K"
  - alloyFamily (for GOLD only): "YELLOW_GOLD", "WHITE_GOLD", "ROSE_GOLD", "GREEN_GOLD"
  - DEFAULT choice for most jewellery requests. 22K gold = METHOD_B, not METHOD_A.

**METHOD_C (Base Metal + Plating)** - Fashion/costume jewellery:
  - baseMetal: "BRASS", "COPPER", "BRONZE", "STAINLESS_STEEL_316L", "TITANIUM"
  - platingType: "GOLD_PLATED", "ROSE_GOLD_PLATED", "RHODIUM_PLATED", "SILVER_PLATED", "PVD_GOLD", "VERMEIL", etc.
  - platingTier: "ECONOMY", "STANDARD", "PREMIUM"
  - Use for budget/fashion jewellery, gold-plated items, stainless steel

**METHOD_D (Italian Machine Made)** - ONLY for: CHAIN, NECKLACE, BRACELET, BANGLE, ANKLET
  - purity: "22K", "18K", "14K", "SILVER_925"
  - chainStyle: "ROPE", "FIGARO", "CURB", "BOX", "SNAKE", "SINGAPORE", "FRANCO", "WHEAT", "MARINER", "HERRINGBONE", "BYZANTINE", "HOLLOW_BANGLE", "LASER_CUT", "MACHINE_WOVEN"
  - Use ONLY when customer requests machine-made chains/necklaces/bracelets

**WEIGHT DEFAULTS** — When the customer does NOT specify weight, you MUST use the average/typical weight for that jewellery type:
  - RING: avg 3g (women's 1-3g, men's 4-7g)
  - NECKLACE: avg 12g (simple chains 5-10g, with pendant 10-20g, statement 30g+)
  - BRACELET: avg 10g (delicate 5-8g, tennis 10-15g, chunky 15-25g)
  - EARRING: avg 3g per pair (studs 0.5-2g, hoops 1-3g, statement 4-8g)
  - PENDANT: avg 4g (small 1-3g, medium 3-6g, large 8-15g, excludes chain)
  - BANGLE: avg 15g (thin 8-12g, medium 15-20g, broad 25-40g)
  - CHAIN: avg 12g (18" light 5-10g, 24" medium 15-25g)
  - ANKLET: avg 5g (simple 2-4g, with charms 5-10g)
  - BROOCH: avg 10g (small 5-8g, medium 10-15g, elaborate 15-25g)
  - TIE_PIN: avg 5g (simple 3-5g, decorative 5-8g)
  - CUFFLINKS: avg 8g per pair (simple 5-8g, ornate 10-15g)
  - NOSE_PIN: avg 0.5g (studs 0.3-0.5g, rings 0.5-1g, decorative up to 2g)
  - MANGALSUTRA: avg 15g (short 10-15g, medium 15-20g, traditional 25-40g)
  - MAANG_TIKKA: avg 5g (simple 3-5g, medium 5-8g, bridal 8-15g)
  ALWAYS set estimatedWeight and weightCategory even when the customer doesn't mention weight!

Respond with a JSON object matching this exact structure:
{
  "jewelleryType": one of [${this.JEWELLERY_TYPES.join(", ")}],
  "buildMethod": one of [${this.BUILD_METHODS.join(", ")}],
  "composition": {
    "primary": { "material": "GOLD_22K|GOLD_18K|GOLD_14K|GOLD_24K|SILVER_925|SILVER_999|PLATINUM_PT950", "percentage": 100 }
  },
  "methodBConfig": { "baseMetal": "GOLD"|"SILVER", "karat": "22K"|"18K"|"14K"|"10K", "alloyFamily": "YELLOW_GOLD"|"WHITE_GOLD"|"ROSE_GOLD"|"GREEN_GOLD" } or null,
  "methodCConfig": { "baseMetal": "BRASS"|"COPPER"|"BRONZE"|"STAINLESS_STEEL_316L", "platingType": "GOLD_PLATED"|"ROSE_GOLD_PLATED"|"RHODIUM_PLATED", "platingTier": "STANDARD" } or null,
  "methodDConfig": { "purity": "22K"|"18K"|"14K"|"SILVER_925", "chainStyle": "ROPE"|"FIGARO"|"CURB"|"BOX"|"SNAKE"|etc. } or null,
  "weightCategory": one of [${this.WEIGHT_CATEGORIES.join(", ")}] — ALWAYS fill this, never null,
  "estimatedWeight": number in grams — ALWAYS fill this, never null (use the defaults above),
  "surfaceFinish": "HIGH_POLISH"|"MATTE"|"BRUSHED"|"SATIN"|"HAMMERED"|"SANDBLASTED"|"FLORENTINE"|"DIAMOND_CUT"|"ENGRAVED" — default "HIGH_POLISH",
  "budgetMinNpr": number or null (in NPR),
  "budgetMaxNpr": number or null (in NPR),
  "description": string describing the design/appearance the customer wants,
  "specialInstructions": string summarizing any special requests (engraving, sizing, packaging, etc.),
  "deadline": "YYYY-MM-DD" date string or null (if customer mentions when they need it),
  "gemstones": [{ "stoneType": "DIAMOND_NATURAL|RUBY|SAPPHIRE|EMERALD|PEARL|AMETHYST|TOPAZ|GARNET|OPAL|TURQUOISE|CZ", "shape": "ROUND|OVAL|PRINCESS|CUSHION|PEAR|MARQUISE|EMERALD_CUT|HEART|ASSCHER|RADIANT|BAGUETTE", "count": number, "settingStyle": "PRONG|BEZEL|PAVE|CHANNEL|TENSION|FLUSH|HALO|CLUSTER|BAR|INVISIBLE", "color": "string or null", "clarity": "string or null", "sizeValue": "string mm or null" }] or [],
  "confidence": number 0-100,
  "reasoning": string explaining your choices AND any assumptions (internal, not shown to user),
  "conversationalMessage": string — A FRIENDLY, conversational message to the user explaining what you filled and why. Write as if you're chatting with a friend. Examples: "It looks like you want a silver bracelet! Since you didn't mention a weight, I've set it to 10g which is the average for bracelets. I went with Sterling Silver (925) and a high polish finish. Feel free to adjust anything!" or "Got it — a gold ring! I've selected 22K yellow gold at 3g (typical for women's rings) with a polished finish. You might want to add your budget so sellers can give you accurate quotes.",
  "suggestions": string[],
  "missingInfo": string[]
}

CRITICAL RULES:
1. **Method Selection Logic**:
   - Customer says "gold ring" / "22K necklace" / "18K bracelet" → METHOD_B (these are alloys)
   - Customer says "pure gold" / "24 karat" → METHOD_A
   - Customer says "gold plated" / "fashion" / "budget" / "stainless steel" → METHOD_C
   - Customer says "machine made chain" / "Italian chain" / "rope chain" → METHOD_D (only for chain/necklace/bracelet/bangle/anklet)
   - Default: METHOD_B with GOLD baseMetal and 22K karat for NP/IN markets, 18K for western

2. **When buildMethod is METHOD_B**: MUST include methodBConfig with baseMetal, karat (for gold), and alloyFamily
   - Default alloyFamily to "YELLOW_GOLD" unless rose gold/white gold is mentioned
   - For silver → baseMetal: "SILVER", no karat needed

3. **When buildMethod is METHOD_D**: MUST include methodDConfig AND jewelleryType must be CHAIN/NECKLACE/BRACELET/BANGLE/ANKLET

4. **ALWAYS FILL EVERYTHING**: Even for vague inputs like "ring" or "bracelet":
   - ALWAYS choose a buildMethod and fill its sub-config (methodBConfig/methodCConfig/methodDConfig)
   - ALWAYS fill estimatedWeight using the defaults above
   - ALWAYS fill weightCategory (LIGHT/MEDIUM/HEAVY)
   - ALWAYS fill surfaceFinish (default HIGH_POLISH)
   - ALWAYS fill a description based on what you understand
   - Confidence can be low (15-30) for vague inputs, but still fill all fields

5. **Gibberish handling**: If the input is complete nonsense, set confidence 5-10 and jewelleryType="OTHER", but STILL fill defaults

6. **conversationalMessage RULES**:
   - Write as if you're casually talking to the user, like a helpful friend
   - Mention what you selected and WHY (especially for assumed defaults)
   - If you assumed the weight, explain: "since you didn't mention weight, I set it to Xg — that's typical for [type]"
   - If you assumed the metal, explain: "I went with [metal] since that's the most popular choice"
   - Keep it 2-4 sentences. Warm, helpful, not robotic
   - Do NOT mention confidence percentages or technical terms like "METHOD_B"
   - Use friendly names: "precious metal alloy" → "22K gold", "METHOD_B" → just describe the metal

7. **Always provide methodBConfig when buildMethod=METHOD_B, even if defaulting**

Budget conversions: 1 USD ≈ 133 NPR, 1 INR ≈ 1.6 NPR, 1 AED ≈ 36 NPR, 1 GBP ≈ 170 NPR
For "gold ring" without karat, default to 22K in NP/IN markets, 18K in western markets.
Weight categories: LIGHT (<5g), MEDIUM (5-15g), HEAVY (>15g) for rings; scale accordingly.`;
  }

  private async getMarketContext(dto: AiRfqBuilderDto): Promise<string> {
    try {
      const insights = await this.prisma.rfqOrderInsight.aggregate({
        where: { orderCompleted: true },
        _count: { id: true },
      });

      if (insights._count.id < 10) {
        return "Note: Limited market data available. Use general jewellery knowledge.";
      }

      // Get price ranges for the likely jewellery type
      const priceData = await this.prisma.rfqOrderInsight.aggregate({
        where: { orderCompleted: true },
        _avg: {
          avgOfferPrice: true,
          avgMakingChargePct: true,
          avgEstimatedDays: true,
        },
        _min: { minOfferPrice: true },
        _max: { maxOfferPrice: true },
      });

      return `Market context (based on ${insights._count.id} completed orders):
- Average offer price: NPR ${Math.round(priceData._avg.avgOfferPrice || 0).toLocaleString()}
- Price range: NPR ${Math.round(priceData._min.minOfferPrice || 0).toLocaleString()} - ${Math.round(priceData._max.maxOfferPrice || 0).toLocaleString()}
- Average making charge: ${(priceData._avg.avgMakingChargePct || 10).toFixed(1)}%
- Average delivery: ${Math.round(priceData._avg.avgEstimatedDays || 14)} days`;
    } catch {
      return "";
    }
  }

  private validateAndNormalize(parsed: any): AiRfqBuilderResponse {
    // Ensure valid enum values
    const jewelleryType = this.JEWELLERY_TYPES.includes(parsed.jewelleryType)
      ? parsed.jewelleryType
      : "OTHER";

    const buildMethod = this.BUILD_METHODS.includes(parsed.buildMethod)
      ? parsed.buildMethod
      : "METHOD_B";

    const weightCategory =
      parsed.weightCategory &&
      this.WEIGHT_CATEGORIES.includes(parsed.weightCategory)
        ? parsed.weightCategory
        : undefined;

    return {
      jewelleryType,
      buildMethod,
      composition: parsed.composition || {
        primary: { material: "GOLD_22K", percentage: 100 },
      },
      methodBConfig: parsed.methodBConfig || undefined,
      methodCConfig: parsed.methodCConfig || undefined,
      methodDConfig: parsed.methodDConfig || undefined,
      weightCategory,
      estimatedWeight: parsed.estimatedWeight || undefined,
      surfaceFinish: parsed.surfaceFinish || "HIGH_POLISH",
      budgetMinNpr: parsed.budgetMinNpr || undefined,
      budgetMaxNpr: parsed.budgetMaxNpr || undefined,
      description: parsed.description || "",
      specialInstructions: parsed.specialInstructions || "",
      deadline: parsed.deadline || undefined,
      gemstones: Array.isArray(parsed.gemstones) ? parsed.gemstones : [],
      confidence: Math.max(0, Math.min(100, parsed.confidence || 50)),
      reasoning: parsed.reasoning || "Generated from your description",
      conversationalMessage:
        parsed.conversationalMessage ||
        `I've filled in the form based on your description. Feel free to adjust anything!`,
      suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
      missingInfo: Array.isArray(parsed.missingInfo) ? parsed.missingInfo : [],
    };
  }

  /**
   * Fallback rule-based parser when Gemini is unavailable.
   * Handles ambiguous/incomplete/gibberish inputs gracefully.
   */
  private fallbackParse(dto: AiRfqBuilderDto): AiRfqBuilderResponse {
    const desc = dto.description.toLowerCase().trim();
    const missingInfo: string[] = [];

    // Detect if input is gibberish or non-jewellery
    const hasJewelleryKeyword =
      /ring|necklace|bracelet|bangle|earring|pendant|chain|anklet|brooch|nose|mangalsutra|gold|silver|platinum|diamond|ruby|sapphire|emerald|pearl|jewel|ornament|wedding|engagement|bridal/i.test(
        desc,
      );
    const isTooShort = desc.length < 5;
    const isGibberish =
      !hasJewelleryKeyword && !/[aeiou]{1,}/i.test(desc.replace(/\s/g, ""));

    if (isGibberish || (isTooShort && !hasJewelleryKeyword)) {
      return {
        jewelleryType: "OTHER",
        buildMethod: "METHOD_B",
        composition: { primary: { material: "GOLD_22K", percentage: 100 } },
        methodBConfig: {
          baseMetal: "GOLD",
          karat: "22K",
          alloyFamily: "YELLOW_GOLD",
        },
        description: "",
        specialInstructions: dto.description,
        gemstones: [],
        confidence: 5,
        reasoning:
          "I couldn't identify a jewellery request from your description. Please describe what kind of jewellery you'd like to create.",
        conversationalMessage:
          'Hmm, I couldn\'t quite understand what you\'re looking for. Could you describe the jewellery you want? For example, try something like "I want a gold ring" or "silver bracelet for daily wear".',
        suggestions: [
          "Try: 'I want a gold ring for my wedding'",
          "Try: '22K gold necklace around 15 grams, budget 50-80K'",
          "Describe the type, metal, weight, and any gemstones you want",
        ],
        missingInfo: ["jewellery description"],
      };
    }

    // Detect jewellery type
    let jewelleryType = "OTHER";
    const typeMap: Record<string, string> = {
      ring: "RING",
      necklace: "NECKLACE",
      bracelet: "BRACELET",
      bangle: "BANGLE",
      earring: "EARRING",
      pendant: "PENDANT",
      chain: "CHAIN",
      anklet: "ANKLET",
      brooch: "BROOCH",
      "nose pin": "NOSE_PIN",
      mangalsutra: "MANGALSUTRA",
    };
    for (const [keyword, type] of Object.entries(typeMap)) {
      if (desc.includes(keyword)) {
        jewelleryType = type;
        break;
      }
    }
    if (jewelleryType === "OTHER") {
      missingInfo.push("specific jewellery type (ring, necklace, etc.)");
    }

    // Detect metal
    let material = "GOLD_22K";
    if (desc.includes("silver") || desc.includes("925"))
      material = "SILVER_925";
    else if (desc.includes("platinum")) material = "PLATINUM_PT950";
    else if (desc.includes("18k") || desc.includes("18 karat"))
      material = "GOLD_18K";
    else if (desc.includes("14k") || desc.includes("14 karat"))
      material = "GOLD_14K";
    else if (desc.includes("24k") || desc.includes("24 karat"))
      material = "GOLD_24K";
    else if (!desc.includes("gold")) {
      missingInfo.push("metal type (gold, silver, platinum)");
    }

    // Detect method
    let buildMethod = "METHOD_B";
    const METHOD_D_TYPES = [
      "CHAIN",
      "NECKLACE",
      "BRACELET",
      "BANGLE",
      "ANKLET",
    ];
    if (material === "GOLD_24K" || material === "PLATINUM_PT950") {
      buildMethod = "METHOD_A";
    } else if (
      desc.includes("gold plated") ||
      desc.includes("fashion") ||
      desc.includes("stainless") ||
      desc.includes("brass")
    ) {
      buildMethod = "METHOD_C";
    } else if (
      (desc.includes("machine") || desc.includes("italian")) &&
      METHOD_D_TYPES.includes(jewelleryType)
    ) {
      buildMethod = "METHOD_D";
    }

    // Build method-specific configs
    let methodBConfig: any = undefined;
    let methodCConfig: any = undefined;
    let methodDConfig: any = undefined;

    if (buildMethod === "METHOD_B") {
      // Parse material into baseMetal + karat
      if (material.startsWith("GOLD_")) {
        const karat = material.replace("GOLD_", "");
        let alloyFamily = "YELLOW_GOLD";
        if (desc.includes("rose") || desc.includes("pink"))
          alloyFamily = "ROSE_GOLD";
        else if (desc.includes("white")) alloyFamily = "WHITE_GOLD";
        methodBConfig = { baseMetal: "GOLD", karat, alloyFamily };
      } else if (material === "SILVER_925") {
        methodBConfig = { baseMetal: "SILVER" };
      }
    } else if (buildMethod === "METHOD_C") {
      const baseMetal = desc.includes("stainless")
        ? "STAINLESS_STEEL_316L"
        : "BRASS";
      methodCConfig = {
        baseMetal,
        platingType: "GOLD_PLATED",
        platingTier: "STANDARD",
      };
    } else if (buildMethod === "METHOD_D") {
      const purity = material.includes("SILVER")
        ? "SILVER_925"
        : material.replace("GOLD_", "") || "22K";
      methodDConfig = { purity, chainStyle: "ROPE" };
    }

    // Detect gemstones
    const gemstones: any[] = [];
    const gemMap: Record<string, string> = {
      diamond: "DIAMOND_NATURAL",
      ruby: "RUBY",
      sapphire: "SAPPHIRE",
      emerald: "EMERALD",
      pearl: "PEARL",
      amethyst: "AMETHYST",
    };
    for (const [keyword, stoneType] of Object.entries(gemMap)) {
      if (desc.includes(keyword)) {
        gemstones.push({
          stoneType,
          shape: "ROUND",
          count: 1,
          settingStyle: "PRONG",
        });
      }
    }

    // Parse budget
    let budgetMinNpr: number | undefined;
    let budgetMaxNpr: number | undefined;
    const budgetMatch = dto.budgetHint?.match(/(\d[\d,]*)/g);
    if (budgetMatch) {
      const nums = budgetMatch.map((n) => parseInt(n.replace(/,/g, "")));
      if (nums.length >= 2) {
        budgetMinNpr = Math.min(...nums);
        budgetMaxNpr = Math.max(...nums);
      } else if (nums.length === 1) {
        budgetMinNpr = Math.round(nums[0] * 0.8);
        budgetMaxNpr = Math.round(nums[0] * 1.2);
      }
    } else {
      missingInfo.push("budget range");
    }

    // Check for weight/occasion
    const hasExplicitWeight = /\d+\s*(g|gram|gm)/i.test(desc);
    if (!hasExplicitWeight) {
      missingInfo.push("preferred weight in grams");
    }
    if (
      !/wedding|engagement|gift|daily|party|festival|puja|birthday|anniversary/i.test(
        desc,
      )
    ) {
      missingInfo.push("occasion (wedding, daily wear, gift, etc.)");
    }

    // Always set weight — use default for the jewellery type if not specified
    const defaultWeight = this.getDefaultWeight(jewelleryType);
    let estimatedWeight = defaultWeight;
    if (hasExplicitWeight) {
      const weightMatch = desc.match(/(\d+(?:\.\d+)?)\s*(g|gram|gm)/i);
      if (weightMatch) estimatedWeight = parseFloat(weightMatch[1]);
    }
    const weightCategory =
      estimatedWeight < 5
        ? "LIGHT"
        : estimatedWeight <= 15
          ? "MEDIUM"
          : "HEAVY";

    // Determine confidence based on completeness
    const detectedCount = [
      jewelleryType !== "OTHER",
      material !== "GOLD_22K" || desc.includes("gold"),
      budgetMinNpr !== undefined,
      gemstones.length > 0,
    ].filter(Boolean).length;
    const confidence = Math.max(15, Math.min(55, detectedCount * 15));

    const suggestions: string[] = [];
    if (missingInfo.length > 0) {
      suggestions.push(
        `For better results, add: ${missingInfo.slice(0, 3).join(", ")}`,
      );
    }
    suggestions.push("Review the detected fields and adjust if needed");
    if (!budgetMinNpr) {
      suggestions.push(
        "Adding a budget range helps sellers give accurate quotes",
      );
    }

    // Build conversational message
    const typeName =
      jewelleryType !== "OTHER"
        ? jewelleryType.toLowerCase().replace("_", " ")
        : "jewellery piece";
    const metalName = material.replace(/_/g, " ").toLowerCase();
    let conversationalMessage = `Got it — a ${metalName} ${typeName}! `;
    if (!hasExplicitWeight) {
      conversationalMessage += `Since you didn't mention a weight, I've set it to ${estimatedWeight}g which is typical for ${typeName}s. `;
    }
    conversationalMessage += `I went with a polished finish. You can adjust any of these details below!`;

    return {
      jewelleryType,
      buildMethod,
      composition: { primary: { material, percentage: 100 } },
      methodBConfig,
      methodCConfig,
      methodDConfig,
      weightCategory,
      estimatedWeight,
      surfaceFinish: "HIGH_POLISH",
      budgetMinNpr,
      budgetMaxNpr,
      description: dto.description,
      specialInstructions: "",
      gemstones,
      confidence,
      reasoning:
        missingInfo.length > 0
          ? `Parsed using keyword matching (AI was unavailable). I assumed ${material.replace("_", " ")} and ${buildMethod === "METHOD_A" ? "handcrafted" : "standard casting"} method. Missing details: ${missingInfo.join(", ")}.`
          : `Parsed using keyword matching (AI was unavailable). Detected ${jewelleryType.toLowerCase()} in ${material.replace("_", " ")}.`,
      conversationalMessage,
      suggestions,
      missingInfo,
    };
  }

  private hashQuery(query: string): string {
    // Simple hash for cache key
    let hash = 0;
    const normalized = query.toLowerCase().trim();
    for (let i = 0; i < normalized.length; i++) {
      const char = normalized.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }

  // ═══════════════════════════════════════
  // BUDGET FEASIBILITY CHECKER
  // ═══════════════════════════════════════

  /**
   * Check if a budget is feasible for the requested jewellery
   */
  async checkFeasibility(dto: {
    jewelleryType: string;
    buildMethod: string;
    composition?: Record<string, any>;
    targetWeightG?: number;
    budgetNpr?: number;
    marketRegion?: string;
  }): Promise<any> {
    // Get current gold rate
    const goldRate = await this.getCurrentGoldRate();
    const region = dto.marketRegion || "NP";

    // Estimate metal cost based on composition
    const metalType = dto.composition?.primary?.material || "GOLD_22K";
    const purityMultiplier = this.getPurityMultiplier(metalType);
    const estimatedWeight =
      dto.targetWeightG || this.getDefaultWeight(dto.jewelleryType);

    const metalCost = goldRate * purityMultiplier * estimatedWeight;

    // Estimate making charge (use market average or default)
    const marketAvg = await this.getAverageMakingCharge(dto.jewelleryType);
    const makingChargePct = marketAvg || 10;
    const makingCharge = metalCost * (makingChargePct / 100);

    // Estimate gemstone cost (if applicable)
    let gemstoneCost = 0;
    // Simple estimate: gemstones add 20-50% on top for gemstone-heavy pieces

    // Estimate tax (varies by region)
    const taxRate = this.getTaxRate(region);
    const subtotal = metalCost + makingCharge + gemstoneCost;
    const tax = subtotal * taxRate;
    const totalEstimate = subtotal + tax;

    const budget = dto.budgetNpr || 0;
    const feasible = budget <= 0 || budget >= totalEstimate * 0.8; // 20% tolerance

    const issues: string[] = [];
    const suggestions: string[] = [];

    if (budget > 0 && budget < totalEstimate) {
      if (budget < metalCost) {
        issues.push(
          `Budget (NPR ${budget.toLocaleString()}) is below the metal cost alone (NPR ${Math.round(metalCost).toLocaleString()})`,
        );
        suggestions.push("Consider a lower karat gold (18K vs 22K saves ~18%)");
        suggestions.push(
          "Consider silver as an alternative (NPR 80-120/gram vs gold)",
        );
      } else {
        issues.push(
          `Budget (NPR ${budget.toLocaleString()}) is ${Math.round(((totalEstimate - budget) / totalEstimate) * 100)}% below estimated total`,
        );
        suggestions.push(
          `Reduce weight by ${Math.round(((totalEstimate - budget) / totalEstimate) * estimatedWeight)}g to fit budget`,
        );
      }

      if (estimatedWeight > 10) {
        suggestions.push("Lighter designs can significantly reduce cost");
      }
    }

    // Add market context
    let marketContext: string | undefined;
    const priceData = await this.prisma.rfqOrderInsight.aggregate({
      where: {
        rfqJewelleryType: dto.jewelleryType,
        orderCompleted: true,
      },
      _avg: { avgOfferPrice: true },
      _count: { id: true },
    });

    if (priceData._count.id >= 5) {
      marketContext = `Average price for similar ${dto.jewelleryType.toLowerCase()} items: NPR ${Math.round(priceData._avg.avgOfferPrice || 0).toLocaleString()} (based on ${priceData._count.id} orders)`;
    }

    const score =
      budget <= 0
        ? 50
        : Math.max(
            0,
            Math.min(100, Math.round((budget / totalEstimate) * 100)),
          );

    return {
      feasible,
      score,
      breakdown: {
        metalCostEstimate: Math.round(metalCost),
        makingChargeEstimate: Math.round(makingCharge),
        gemstoneCostEstimate: Math.round(gemstoneCost),
        taxEstimate: Math.round(tax),
        totalEstimate: Math.round(totalEstimate),
      },
      assumptions: {
        goldRatePerGram: goldRate,
        metalType,
        purityMultiplier,
        estimatedWeightG: estimatedWeight,
        makingChargePct,
        taxRate: taxRate * 100,
      },
      issues,
      suggestions,
      marketContext,
    };
  }

  private async getCurrentGoldRate(): Promise<number> {
    try {
      // Try to get from market rates
      const rate = await this.prisma.marketRate.findFirst({
        where: { metalCode: "GOLD_24K", country: "NP" },
        orderBy: { validFrom: "desc" },
      });
      if (rate) return rate.ratePerGram;

      // Fallback to snapshot
      const snapshot = await this.prisma.marketRateSnapshot.findFirst({
        where: { region: "NP" },
        orderBy: { updatedAt: "desc" },
      });
      if (snapshot) {
        const payload = snapshot.payloadJson as any;
        if (payload?.goldRatePerGram) return payload.goldRatePerGram;
      }
    } catch {}

    // Default fallback: ~NPR 12,500/gram for 24K (typical 2024 rate)
    return 12500;
  }

  private getPurityMultiplier(metalType: string): number {
    const multipliers: Record<string, number> = {
      GOLD_24K: 1.0,
      GOLD_22K: 22 / 24,
      GOLD_18K: 18 / 24,
      GOLD_14K: 14 / 24,
      GOLD_10K: 10 / 24,
      SILVER_999: 0.008, // Silver is ~1/125 of gold price
      SILVER_925: 0.0074,
      PLATINUM_950: 0.35, // Platinum ~35% of gold
      PLATINUM_900: 0.33,
    };
    return multipliers[metalType] || 1.0;
  }

  private getDefaultWeight(jewelleryType: string): number {
    const defaults: Record<string, number> = {
      RING: 5,
      NECKLACE: 15,
      BRACELET: 10,
      BANGLE: 15,
      EARRING: 4,
      PENDANT: 5,
      CHAIN: 10,
      ANKLET: 8,
      NOSE_PIN: 1,
      MANGALSUTRA: 12,
    };
    return defaults[jewelleryType] || 8;
  }

  private async getAverageMakingCharge(
    jewelleryType: string,
  ): Promise<number | null> {
    const data = await this.prisma.rfqOrderInsight.aggregate({
      where: {
        rfqJewelleryType: jewelleryType,
        orderCompleted: true,
        avgMakingChargePct: { not: null },
      },
      _avg: { avgMakingChargePct: true },
      _count: { id: true },
    });

    return data._count.id >= 5 ? data._avg.avgMakingChargePct : null;
  }

  private getTaxRate(region: string): number {
    const rates: Record<string, number> = {
      NP: 0.13, // 13% VAT in Nepal
      IN: 0.03, // 3% GST in India for gold
      AE: 0.05, // 5% VAT in UAE
      UK: 0.2, // 20% VAT in UK
      EU: 0.19, // ~19% VAT average in EU
      US: 0.08, // ~8% avg sales tax in US
    };
    return rates[region] || 0.13;
  }

  // ═══════════════════════════════════════
  // AI TOOLTIPS (Pre-generated)
  // ═══════════════════════════════════════

  /**
   * Get AI-generated tooltips for UI elements
   * These are generated once and cached for long periods
   */
  async getTooltips(category?: string): Promise<Record<string, string>> {
    const cacheKey = `${this.CACHE_PREFIX}tooltips:${category || "all"}`;
    try {
      const cached = await this.redisService.get(cacheKey);
      if (cached) return JSON.parse(cached);
    } catch {}

    // Pre-defined tooltips (generated with AI understanding, stored as static)
    const tooltips: Record<string, Record<string, string>> = {
      materials: {
        GOLD_24K:
          "99.9% pure gold. Very soft — best for coins and bars, not daily-wear jewellery. Brightest yellow color.",
        GOLD_22K:
          "91.7% pure gold. The standard in Nepal and India. Good balance of purity and durability. Rich yellow.",
        GOLD_18K:
          "75% pure gold. Popular worldwide. More durable than 22K, slightly paler yellow. Great for gem-set pieces.",
        GOLD_14K:
          "58.3% pure gold. Very durable and affordable. Popular in US and Europe. Rose and white variants common.",
        SILVER_925:
          "Sterling Silver — 92.5% pure silver. Affordable and versatile. May tarnish over time. Rhodium plating helps.",
        PLATINUM_950:
          "95% pure platinum. Extremely durable and hypoallergenic. Naturally white. 60% denser than gold.",
      },
      buildMethods: {
        METHOD_A:
          "Solid Pure Precious Metal — made entirely from a single high-purity metal (24K gold, fine silver 999, platinum). No alloys or plating. Ideal for investment pieces, coins, and simple bangles.",
        METHOD_B:
          "Precious Metal Alloy — gold or silver mixed with other metals for durability (22K, 18K, 14K, 10K gold or 925 sterling silver). The standard for most wearable jewellery. Stronger and available in rose/white variants.",
        METHOD_C:
          "Base Metal + Plating — core made from brass, copper, or stainless steel, then plated with gold, rhodium, or silver. Most affordable option. Great for fashion jewellery and trend pieces.",
        METHOD_D:
          "Italian Machine Made — precision chains, necklaces, and bracelets produced on Italian link-forming machines. Consistent quality, lightweight, and elegant. Only available for chain-style jewellery.",
      },
      processes: {
        making_charge:
          "The labour cost of creating your jewellery. Covers design, crafting, finishing, and quality checks. Typically 8-15% of metal cost.",
        booking_fee:
          "A secure advance payment (usually 20%) that reserves your order. Fully applied to total cost. Refundable if seller cancels.",
        hallmark:
          "Official government stamp certifying the purity of gold/silver. In India, BIS hallmark is mandatory. In Nepal, look for NBS hallmark.",
        cad_approval:
          "A 3D digital preview of your jewellery before production. You can request changes at this stage at no extra cost.",
        quality_check:
          "Final inspection of weight, purity, finish, and gemstone setting before shipping. Ensures the piece matches your specifications.",
      },
      gemstones: {
        DIAMOND_NATURAL:
          "Mined from earth. Graded by 4Cs: Cut, Color, Clarity, Carat. Brilliant sparkle and hardness (10 on Mohs scale).",
        DIAMOND_LAB:
          "Grown in a lab with identical properties to natural diamonds. 30-50% cheaper. Eco-friendly alternative.",
        MOISSANITE:
          "Silicon carbide crystal. Nearly as hard as diamond (9.25 Mohs). More sparkle than diamond. Excellent budget alternative.",
        RUBY: 'Red corundum. Second hardest gemstone (9 Mohs). "Pigeon blood red" is most valued. Symbol of passion and protection.',
        SAPPHIRE:
          "Blue corundum (comes in all colors except red). 9 Mohs hardness. Kashmir blue is most prized. Symbol of wisdom.",
        EMERALD:
          'Green beryl. 7.5-8 Mohs. Inclusions ("jardin") are expected and can add character. Symbol of rebirth and love.',
      },
    };

    const result = category
      ? tooltips[category] || {}
      : Object.values(tooltips).reduce((all, cat) => ({ ...all, ...cat }), {});

    try {
      await this.redisService.set(cacheKey, JSON.stringify(result), 86400); // Cache for 24h
    } catch {}

    return result;
  }
}
