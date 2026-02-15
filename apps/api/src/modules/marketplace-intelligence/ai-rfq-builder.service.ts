import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../common/redis';
import { AiRfqBuilderDto, AiRfqBuilderResponse } from './dto/rfq-builder.dto';

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
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
  private readonly apiKey: string;
  private readonly CACHE_PREFIX = 'ai:rfq:';
  private readonly CACHE_TTL = 3600; // 1 hour for similar queries

  // Valid enum values from schema
  private readonly JEWELLERY_TYPES = [
    'RING', 'NECKLACE', 'BRACELET', 'BANGLE', 'EARRING', 'PENDANT',
    'CHAIN', 'ANKLET', 'BROOCH', 'TIE_PIN', 'CUFFLINKS', 'NOSE_PIN',
    'MANGALSUTRA', 'MAANG_TIKKA', 'OTHER',
  ];

  private readonly BUILD_METHODS = ['METHOD_A', 'METHOD_B', 'METHOD_C', 'METHOD_D'];

  private readonly WEIGHT_CATEGORIES = ['LIGHT', 'MEDIUM', 'HEAVY'];

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private redisService: RedisService,
  ) {
    this.apiKey = this.configService.get<string>('GEMINI_API_KEY') || '';
  }

  /**
   * Convert natural language to structured RFQ data
   */
  async buildRfqFromDescription(dto: AiRfqBuilderDto): Promise<AiRfqBuilderResponse> {
    // Check cache for similar queries
    const cacheKey = `${this.CACHE_PREFIX}${this.hashQuery(dto.description)}`;
    try {
      const cached = await this.redisService.get(cacheKey);
      if (cached) {
        this.logger.log('Returning cached RFQ builder result');
        return JSON.parse(cached);
      }
    } catch {}

    // Get market context if we have enough data
    const marketContext = await this.getMarketContext(dto);

    try {
      const result = await this.callGemini(dto, marketContext);

      // Cache the result
      try {
        await this.redisService.set(cacheKey, JSON.stringify(result), this.CACHE_TTL);
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
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 1024,
          responseMimeType: 'application/json',
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      throw new Error('Empty response from Gemini');
    }

    const parsed = JSON.parse(text);
    return this.validateAndNormalize(parsed);
  }

  private buildPrompt(dto: AiRfqBuilderDto, marketContext: string): string {
    return `You are a jewellery expert assistant for an online marketplace. Convert the customer's natural language description into a structured RFQ (Request for Quote) specification.

Customer Description: "${dto.description}"
${dto.budgetHint ? `Budget Hint: "${dto.budgetHint}"` : ''}
${dto.occasion ? `Occasion: "${dto.occasion}"` : ''}
${dto.preferredMetal ? `Preferred Metal: "${dto.preferredMetal}"` : ''}
${dto.marketRegion ? `Market Region: ${dto.marketRegion}` : ''}

${marketContext}

Respond with a JSON object matching this exact structure:
{
  "jewelleryType": one of [${this.JEWELLERY_TYPES.join(', ')}],
  "buildMethod": one of [${this.BUILD_METHODS.join(', ')}] (METHOD_A=Handcrafted, METHOD_B=Cast/Die-struck, METHOD_C=CAD/3D Printed, METHOD_D=Assembly/Stone Setting),
  "composition": {
    "primary": { "material": "GOLD_22K|GOLD_18K|GOLD_14K|SILVER_925|PLATINUM_950", "percentage": 100 }
  },
  "weightCategory": one of [${this.WEIGHT_CATEGORIES.join(', ')}] or null,
  "estimatedWeight": number in grams or null,
  "surfaceFinish": "HIGH_POLISH|MATTE|BRUSHED|SATIN|HAMMERED" or null,
  "budgetMinNpr": number or null (in NPR),
  "budgetMaxNpr": number or null (in NPR),
  "specialInstructions": string summarizing any special requests,
  "gemstones": [{ "stoneType": "DIAMOND_NATURAL|RUBY|SAPPHIRE|EMERALD|...", "shape": "ROUND|OVAL|PRINCESS|...", "count": number, "settingStyle": "PRONG|BEZEL|PAVE|..." }] or [],
  "confidence": number 0-100 (how confident you are in this interpretation),
  "reasoning": string explaining your choices,
  "suggestions": string[] (helpful tips for the customer)
}

Important rules:
- If the description is vague, make reasonable assumptions and explain them in "reasoning"
- Budget conversions: 1 USD ≈ 133 NPR, 1 INR ≈ 1.6 NPR, 1 AED ≈ 36 NPR, 1 GBP ≈ 170 NPR
- For "gold ring" without karat, default to 22K in NP/IN markets, 18K in western markets
- For custom/handmade requests, use METHOD_A. For standard designs, use METHOD_B
- Weight categories: LIGHT (<5g), MEDIUM (5-15g), HEAVY (>15g) for rings; scale accordingly for other types`;
  }

  private async getMarketContext(dto: AiRfqBuilderDto): Promise<string> {
    try {
      const insights = await this.prisma.rfqOrderInsight.aggregate({
        where: { orderCompleted: true },
        _count: { id: true },
      });

      if (insights._count.id < 10) {
        return 'Note: Limited market data available. Use general jewellery knowledge.';
      }

      // Get price ranges for the likely jewellery type
      const priceData = await this.prisma.rfqOrderInsight.aggregate({
        where: { orderCompleted: true },
        _avg: { avgOfferPrice: true, avgMakingChargePct: true, avgEstimatedDays: true },
        _min: { minOfferPrice: true },
        _max: { maxOfferPrice: true },
      });

      return `Market context (based on ${insights._count.id} completed orders):
- Average offer price: NPR ${Math.round(priceData._avg.avgOfferPrice || 0).toLocaleString()}
- Price range: NPR ${Math.round(priceData._min.minOfferPrice || 0).toLocaleString()} - ${Math.round(priceData._max.maxOfferPrice || 0).toLocaleString()}
- Average making charge: ${(priceData._avg.avgMakingChargePct || 10).toFixed(1)}%
- Average delivery: ${Math.round(priceData._avg.avgEstimatedDays || 14)} days`;
    } catch {
      return '';
    }
  }

  private validateAndNormalize(parsed: any): AiRfqBuilderResponse {
    // Ensure valid enum values
    const jewelleryType = this.JEWELLERY_TYPES.includes(parsed.jewelleryType)
      ? parsed.jewelleryType
      : 'OTHER';

    const buildMethod = this.BUILD_METHODS.includes(parsed.buildMethod)
      ? parsed.buildMethod
      : 'METHOD_B';

    const weightCategory =
      parsed.weightCategory && this.WEIGHT_CATEGORIES.includes(parsed.weightCategory)
        ? parsed.weightCategory
        : undefined;

    return {
      jewelleryType,
      buildMethod,
      composition: parsed.composition || { primary: { material: 'GOLD_22K', percentage: 100 } },
      weightCategory,
      estimatedWeight: parsed.estimatedWeight || undefined,
      surfaceFinish: parsed.surfaceFinish || undefined,
      budgetMinNpr: parsed.budgetMinNpr || undefined,
      budgetMaxNpr: parsed.budgetMaxNpr || undefined,
      specialInstructions: parsed.specialInstructions || '',
      gemstones: Array.isArray(parsed.gemstones) ? parsed.gemstones : [],
      confidence: Math.max(0, Math.min(100, parsed.confidence || 50)),
      reasoning: parsed.reasoning || 'Generated from your description',
      suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
    };
  }

  /**
   * Fallback rule-based parser when Gemini is unavailable
   */
  private fallbackParse(dto: AiRfqBuilderDto): AiRfqBuilderResponse {
    const desc = dto.description.toLowerCase();

    // Detect jewellery type
    let jewelleryType = 'OTHER';
    const typeMap: Record<string, string> = {
      ring: 'RING', necklace: 'NECKLACE', bracelet: 'BRACELET',
      bangle: 'BANGLE', earring: 'EARRING', pendant: 'PENDANT',
      chain: 'CHAIN', anklet: 'ANKLET', brooch: 'BROOCH',
      'nose pin': 'NOSE_PIN', mangalsutra: 'MANGALSUTRA',
    };
    for (const [keyword, type] of Object.entries(typeMap)) {
      if (desc.includes(keyword)) {
        jewelleryType = type;
        break;
      }
    }

    // Detect metal
    let material = 'GOLD_22K';
    if (desc.includes('silver') || desc.includes('925')) material = 'SILVER_925';
    else if (desc.includes('platinum')) material = 'PLATINUM_950';
    else if (desc.includes('18k') || desc.includes('18 karat')) material = 'GOLD_18K';
    else if (desc.includes('14k') || desc.includes('14 karat')) material = 'GOLD_14K';
    else if (desc.includes('24k') || desc.includes('24 karat')) material = 'GOLD_24K';

    // Detect method
    let buildMethod = 'METHOD_B';
    if (desc.includes('handmade') || desc.includes('handcraft') || desc.includes('custom')) {
      buildMethod = 'METHOD_A';
    } else if (desc.includes('3d') || desc.includes('cad') || desc.includes('modern')) {
      buildMethod = 'METHOD_C';
    }

    // Detect gemstones
    const gemstones: any[] = [];
    const gemMap: Record<string, string> = {
      diamond: 'DIAMOND_NATURAL', ruby: 'RUBY', sapphire: 'SAPPHIRE',
      emerald: 'EMERALD', pearl: 'PEARL', amethyst: 'AMETHYST',
    };
    for (const [keyword, stoneType] of Object.entries(gemMap)) {
      if (desc.includes(keyword)) {
        gemstones.push({ stoneType, shape: 'ROUND', count: 1, settingStyle: 'PRONG' });
      }
    }

    // Parse budget
    let budgetMinNpr: number | undefined;
    let budgetMaxNpr: number | undefined;
    const budgetMatch = dto.budgetHint?.match(/(\d[\d,]*)/g);
    if (budgetMatch) {
      const nums = budgetMatch.map((n) => parseInt(n.replace(/,/g, '')));
      if (nums.length >= 2) {
        budgetMinNpr = Math.min(...nums);
        budgetMaxNpr = Math.max(...nums);
      } else if (nums.length === 1) {
        budgetMinNpr = Math.round(nums[0] * 0.8);
        budgetMaxNpr = Math.round(nums[0] * 1.2);
      }
    }

    return {
      jewelleryType,
      buildMethod,
      composition: { primary: { material, percentage: 100 } },
      weightCategory: undefined,
      surfaceFinish: 'HIGH_POLISH',
      budgetMinNpr,
      budgetMaxNpr,
      specialInstructions: dto.description,
      gemstones,
      confidence: 30, // Low confidence for fallback
      reasoning: 'Parsed using keyword matching (AI was unavailable). Please review and adjust the details.',
      suggestions: [
        'Review the detected jewellery type and correct if needed',
        'Specify exact weight if you have a preference',
        'Add reference images for better results',
      ],
    };
  }

  private hashQuery(query: string): string {
    // Simple hash for cache key
    let hash = 0;
    const normalized = query.toLowerCase().trim();
    for (let i = 0; i < normalized.length; i++) {
      const char = normalized.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
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
    const region = dto.marketRegion || 'NP';

    // Estimate metal cost based on composition
    const metalType = dto.composition?.primary?.material || 'GOLD_22K';
    const purityMultiplier = this.getPurityMultiplier(metalType);
    const estimatedWeight = dto.targetWeightG || this.getDefaultWeight(dto.jewelleryType);

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
        issues.push(`Budget (NPR ${budget.toLocaleString()}) is below the metal cost alone (NPR ${Math.round(metalCost).toLocaleString()})`);
        suggestions.push('Consider a lower karat gold (18K vs 22K saves ~18%)');
        suggestions.push('Consider silver as an alternative (NPR 80-120/gram vs gold)');
      } else {
        issues.push(`Budget (NPR ${budget.toLocaleString()}) is ${Math.round(((totalEstimate - budget) / totalEstimate) * 100)}% below estimated total`);
        suggestions.push(`Reduce weight by ${Math.round(((totalEstimate - budget) / totalEstimate) * estimatedWeight)}g to fit budget`);
      }

      if (estimatedWeight > 10) {
        suggestions.push('Lighter designs can significantly reduce cost');
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

    const score = budget <= 0
      ? 50
      : Math.max(0, Math.min(100, Math.round((budget / totalEstimate) * 100)));

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
        where: { metalCode: 'GOLD_24K', country: 'NP' },
        orderBy: { validFrom: 'desc' },
      });
      if (rate) return rate.ratePerGram;

      // Fallback to snapshot
      const snapshot = await this.prisma.marketRateSnapshot.findFirst({
        where: { region: 'NP' },
        orderBy: { updatedAt: 'desc' },
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
      'GOLD_24K': 1.0,
      'GOLD_22K': 22 / 24,
      'GOLD_18K': 18 / 24,
      'GOLD_14K': 14 / 24,
      'GOLD_10K': 10 / 24,
      'SILVER_999': 0.008, // Silver is ~1/125 of gold price
      'SILVER_925': 0.0074,
      'PLATINUM_950': 0.35, // Platinum ~35% of gold 
      'PLATINUM_900': 0.33,
    };
    return multipliers[metalType] || 1.0;
  }

  private getDefaultWeight(jewelleryType: string): number {
    const defaults: Record<string, number> = {
      'RING': 5,
      'NECKLACE': 15,
      'BRACELET': 10,
      'BANGLE': 15,
      'EARRING': 4,
      'PENDANT': 5,
      'CHAIN': 10,
      'ANKLET': 8,
      'NOSE_PIN': 1,
      'MANGALSUTRA': 12,
    };
    return defaults[jewelleryType] || 8;
  }

  private async getAverageMakingCharge(jewelleryType: string): Promise<number | null> {
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
      'NP': 0.13, // 13% VAT in Nepal
      'IN': 0.03, // 3% GST in India for gold
      'AE': 0.05, // 5% VAT in UAE
      'UK': 0.20, // 20% VAT in UK
      'EU': 0.19, // ~19% VAT average in EU
      'US': 0.08, // ~8% avg sales tax in US
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
    const cacheKey = `${this.CACHE_PREFIX}tooltips:${category || 'all'}`;
    try {
      const cached = await this.redisService.get(cacheKey);
      if (cached) return JSON.parse(cached);
    } catch {}

    // Pre-defined tooltips (generated with AI understanding, stored as static)
    const tooltips: Record<string, Record<string, string>> = {
      materials: {
        'GOLD_24K': '99.9% pure gold. Very soft — best for coins and bars, not daily-wear jewellery. Brightest yellow color.',
        'GOLD_22K': '91.7% pure gold. The standard in Nepal and India. Good balance of purity and durability. Rich yellow.',
        'GOLD_18K': '75% pure gold. Popular worldwide. More durable than 22K, slightly paler yellow. Great for gem-set pieces.',
        'GOLD_14K': '58.3% pure gold. Very durable and affordable. Popular in US and Europe. Rose and white variants common.',
        'SILVER_925': 'Sterling Silver — 92.5% pure silver. Affordable and versatile. May tarnish over time. Rhodium plating helps.',
        'PLATINUM_950': '95% pure platinum. Extremely durable and hypoallergenic. Naturally white. 60% denser than gold.',
      },
      buildMethods: {
        'METHOD_A': 'Handcrafted by artisans using traditional tools. Each piece is unique with subtle variations. Best for intricate ethnic designs.',
        'METHOD_B': 'Cast or die-struck from a master mold. Consistent quality and finish. Ideal for standard designs with fine detail.',
        'METHOD_C': 'Designed with CAD software and 3D printed, then cast in metal. Perfect precision and complex geometries. Modern approach.',
        'METHOD_D': 'Assembled from components with stone setting. Ideal for gem-heavy pieces. Combines machine and hand techniques.',
      },
      processes: {
        'making_charge': 'The labour cost of creating your jewellery. Covers design, crafting, finishing, and quality checks. Typically 8-15% of metal cost.',
        'booking_fee': 'A secure advance payment (usually 20%) that reserves your order. Fully applied to total cost. Refundable if seller cancels.',
        'hallmark': 'Official government stamp certifying the purity of gold/silver. In India, BIS hallmark is mandatory. In Nepal, look for NBS hallmark.',
        'cad_approval': 'A 3D digital preview of your jewellery before production. You can request changes at this stage at no extra cost.',
        'quality_check': 'Final inspection of weight, purity, finish, and gemstone setting before shipping. Ensures the piece matches your specifications.',
      },
      gemstones: {
        'DIAMOND_NATURAL': 'Mined from earth. Graded by 4Cs: Cut, Color, Clarity, Carat. Brilliant sparkle and hardness (10 on Mohs scale).',
        'DIAMOND_LAB': 'Grown in a lab with identical properties to natural diamonds. 30-50% cheaper. Eco-friendly alternative.',
        'MOISSANITE': 'Silicon carbide crystal. Nearly as hard as diamond (9.25 Mohs). More sparkle than diamond. Excellent budget alternative.',
        'RUBY': 'Red corundum. Second hardest gemstone (9 Mohs). "Pigeon blood red" is most valued. Symbol of passion and protection.',
        'SAPPHIRE': 'Blue corundum (comes in all colors except red). 9 Mohs hardness. Kashmir blue is most prized. Symbol of wisdom.',
        'EMERALD': 'Green beryl. 7.5-8 Mohs. Inclusions ("jardin") are expected and can add character. Symbol of rebirth and love.',
      },
    };

    const result = category ? (tooltips[category] || {}) : 
      Object.values(tooltips).reduce((all, cat) => ({ ...all, ...cat }), {});

    try {
      await this.redisService.set(cacheKey, JSON.stringify(result), 86400); // Cache for 24h
    } catch {}

    return result;
  }
}
