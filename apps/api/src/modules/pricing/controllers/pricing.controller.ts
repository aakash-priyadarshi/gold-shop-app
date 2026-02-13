/**
 * Pricing Controller
 *
 * Endpoints for:
 * - POST /api/pricing/estimate - Full pricing calculation
 * - POST /api/pricing/quick-estimate - Quick metal price estimate
 * - GET /api/pricing/config - Get pricing configuration
 * - GET /api/pricing/rates - Get current spot rates
 * - PATCH /api/pricing/shop-override - Update shop price override
 * - PATCH /api/pricing/market-adjustment - Update market adjustment
 * - PATCH /api/pricing/tax-rule - Update tax rule
 */

import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { PrismaService } from "../../../prisma/prisma.service";
import { FxRatesService } from "../../fx-rates";
import { MarketRegion } from "../../market-rates/types";
import {
  BASE_METAL_CODES,
  FINISH_TIERS,
  FINISH_TYPES,
  GEM_ORIGINS,
  GEM_QUALITY_GRADES,
  PRECIOUS_METAL_CODES,
  PricingRequestDto,
  QuickMetalEstimateDto,
  STONE_TYPES,
  SUPPORTED_COUNTRIES,
  SUPPORTED_CURRENCIES,
  SupportedCurrency,
  UpdateMarketAdjustmentDto,
  UpdateShopOverrideDto,
  UpdateTaxRuleDto,
} from "../dto/pricing-request.dto";
import {
  PricingConfigResponseDto,
  PricingResponseDto,
  QuickMetalEstimateResponseDto,
  SpotRatesResponseDto,
} from "../dto/pricing-response.dto";
import {
  BackendTaxEngineService,
  TaxableComponent,
  TaxCalculationResult,
} from "../services/backend-tax-engine.service";
import {
  CommodityRatesService,
  PURITY_MULTIPLIERS,
} from "../services/commodity-rates.service";
import {
  PricingEngineService,
  SupportedCountry,
} from "../services/pricing-engine.service";
import {
  DEFAULT_TAX_RATES,
  TaxRulesService,
} from "../services/tax-rules.service";

// Country to default currency mapping
const COUNTRY_DEFAULT_CURRENCY: Record<string, SupportedCurrency> = {
  NP: "NPR",
  IN: "INR",
  AE: "AED",
  UK: "GBP",
  EU: "EUR",
  US: "USD",
};

@ApiTags("Pricing")
@Controller("api/pricing")
export class PricingController {
  private readonly logger = new Logger(PricingController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pricingEngineService: PricingEngineService,
    private readonly commodityRatesService: CommodityRatesService,
    private readonly taxRulesService: TaxRulesService,
    private readonly fxRatesService: FxRatesService,
    private readonly backendTaxEngineService: BackendTaxEngineService,
  ) {}

  // ═══════════════════════════════════════════
  // PRICING CALCULATION ENDPOINTS
  // ═══════════════════════════════════════════

  @Post("estimate")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Calculate full pricing estimate",
    description:
      "Calculate comprehensive pricing with materials, taxes, and explainable breakdown",
  })
  @ApiResponse({
    status: 200,
    description: "Pricing calculation result",
    type: PricingResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: "Invalid request parameters",
  })
  async calculateEstimate(
    @Body() request: PricingRequestDto,
  ): Promise<PricingResponseDto> {
    this.logger.log(
      `Calculating estimate: market=${request.marketCountry}, ` +
        `currency=${request.displayCurrency}, method=${request.buildMethod}`,
    );

    const result = await this.pricingEngineService.calculatePrice({
      ...request,
      marketCountry: request.marketCountry as SupportedCountry,
    });

    return result as unknown as PricingResponseDto;
  }

  @Post("quick-estimate")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Quick metal price estimate",
    description: "Get a quick estimate for precious metal pricing only",
  })
  @ApiResponse({
    status: 200,
    description: "Quick estimate result",
    type: QuickMetalEstimateResponseDto,
  })
  async quickEstimate(
    @Body() request: QuickMetalEstimateDto,
  ): Promise<QuickMetalEstimateResponseDto> {
    const region = request.marketCountry as MarketRegion;
    const displayCurrency = request.displayCurrency;
    const marketCurrency = COUNTRY_DEFAULT_CURRENCY[request.marketCountry];

    // Get rates
    const commodityRates = await this.commodityRatesService.getAllRates(
      region,
      marketCurrency,
    );
    const fxSnapshot = await this.fxRatesService.getExtendedFxSnapshot();

    // Find the specific metal rate
    const metalRate = commodityRates.preciousMetals.find(
      (r: any) => r.purityCode === request.metalCode,
    );

    if (!metalRate) {
      throw new Error(`Metal rate not found for ${request.metalCode}`);
    }

    // Get FX rate for display currency
    const usdToDisplay = this.getFxRate(fxSnapshot, displayCurrency);

    // Calculate prices
    const pricePerGramLocal = metalRate.pricePerGramUsd * usdToDisplay;
    const subtotal = Math.round(pricePerGramLocal * request.weightG);
    const makingCharge = Math.round(subtotal * 0.03); // 3%

    // Get tax rate
    const taxRate = DEFAULT_TAX_RATES[region]?.defaultRate || 0.05;
    const tax = Math.round((subtotal + makingCharge) * taxRate);
    const total = subtotal + makingCharge + tax;

    // Get purity multiplier
    const purityMultiplier =
      PURITY_MULTIPLIERS[
        request.metalCode as keyof typeof PURITY_MULTIPLIERS
      ] || 1.0;

    return {
      metalCode: request.metalCode,
      weightG: request.weightG,
      spotPriceUsdOz: metalRate.spotPriceUsdOz,
      pricePerGramUsd: metalRate.pricePerGramUsd,
      pricePerGramLocal,
      subtotal,
      makingCharge,
      tax,
      total,
      currency: displayCurrency,
      purityMultiplier,
      taxRate,
      updatedAt: metalRate.updatedAt,
    };
  }

  // ═══════════════════════════════════════════
  // CONFIGURATION ENDPOINTS
  // ═══════════════════════════════════════════

  @Get("config")
  @ApiOperation({
    summary: "Get pricing configuration",
    description:
      "Get available markets, currencies, metals, and other pricing options",
  })
  @ApiResponse({
    status: 200,
    description: "Pricing configuration",
    type: PricingConfigResponseDto,
  })
  async getConfig(): Promise<PricingConfigResponseDto> {
    // Build markets with default currencies and tax info
    const markets = SUPPORTED_COUNTRIES.map((country) => ({
      country,
      defaultCurrency: COUNTRY_DEFAULT_CURRENCY[country],
      taxType: DEFAULT_TAX_RATES[country as MarketRegion]?.taxType || "VAT",
      taxRate: DEFAULT_TAX_RATES[country as MarketRegion]?.defaultRate || 0,
    }));

    // Build precious metals with purity info
    const preciousMetals = [...PRECIOUS_METAL_CODES].map((code) => {
      const [metalType, purity] = code.split("_");
      return {
        code,
        metalType,
        purityName: purity,
        multiplier:
          PURITY_MULTIPLIERS[code as keyof typeof PURITY_MULTIPLIERS] || 1.0,
      };
    });

    // Build base metals
    const baseMetals = [...BASE_METAL_CODES].map((code) => ({
      code,
      name: code.replace("_", " "),
      isRestricted: code === "NICKEL",
    }));

    // Build finish types
    const finishTypes = [...FINISH_TYPES].map((code) => ({
      code,
      name: code.replace(/_/g, " "),
      tiers: [...FINISH_TIERS],
    }));

    // Build gemstone types
    const gemstoneTypes = [...STONE_TYPES].map((code) => ({
      code,
      name: code.replace(/_/g, " "),
      availableGrades: [...GEM_QUALITY_GRADES],
      availableOrigins: code.includes("DIAMOND")
        ? [...GEM_ORIGINS]
        : ["NATURAL"],
    }));

    // Build methods
    const buildMethods = [
      {
        code: "METHOD_A",
        name: "Solid Precious Metal",
        description:
          "Pure precious metal construction (gold, silver, platinum, palladium)",
      },
      {
        code: "METHOD_B",
        name: "Base Metal/Alloy",
        description:
          "Base metal or alloy construction (brass, bronze, copper, etc.)",
      },
      {
        code: "METHOD_C",
        name: "Core + Finish",
        description: "Base metal core with precious metal plating or finish",
      },
      {
        code: "METHOD_D",
        name: "Multi-Metal",
        description:
          "Mixed construction with multiple metals (e.g., gold with brass accents)",
      },
    ];

    return {
      markets,
      currencies: [...SUPPORTED_CURRENCIES],
      buildMethods,
      preciousMetals,
      baseMetals,
      finishTypes,
      gemstoneTypes,
    };
  }

  @Get("rates")
  @ApiOperation({
    summary: "Get current spot rates",
    description: "Get current precious metal spot prices and FX rates",
  })
  @ApiQuery({
    name: "market",
    required: false,
    enum: SUPPORTED_COUNTRIES,
    description: "Market region for rates",
  })
  @ApiResponse({
    status: 200,
    description: "Current rates",
    type: SpotRatesResponseDto,
  })
  async getRates(
    @Query("market") market?: string,
  ): Promise<SpotRatesResponseDto> {
    const region = (market || "NP") as MarketRegion;
    const marketCurrency = COUNTRY_DEFAULT_CURRENCY[region] || "NPR";

    // Get commodity rates
    const commodityRates = await this.commodityRatesService.getAllRates(
      region,
      marketCurrency,
    );

    // Get FX snapshot
    const fxSnapshot = await this.fxRatesService.getExtendedFxSnapshot();

    // Build precious metals response
    const preciousMetals = commodityRates.preciousMetals.map((r: any) => ({
      metal: r.metalCode,
      purity: r.purityCode,
      spotPriceUsdOz: r.spotPriceUsdOz,
      pricePerGramUsd: r.pricePerGramUsd,
      updatedAt: r.updatedAt,
      source: r.source,
    }));

    // Build FX rates response
    const fxRates = SUPPORTED_CURRENCIES.map((currency) => {
      if (currency === "USD") {
        return {
          currency,
          rate: 1.0,
          updatedAt: new Date().toISOString(),
          source: "static",
        };
      }

      const rateKey = `USD_${currency}` as keyof typeof fxSnapshot;
      const rateData = fxSnapshot[rateKey] as any;

      return {
        currency,
        rate: rateData?.rate || this.getDefaultFxRate(currency),
        updatedAt: rateData?.updatedAt || new Date().toISOString(),
        source: rateData?.source || "fallback",
      };
    });

    // Build base metals response
    const baseMetals = commodityRates.baseMetals.map((r: any) => ({
      metal: r.metalCode,
      pricePerGramUsd: r.pricePerGramUsd,
      source: r.source,
    }));

    return {
      preciousMetals,
      fxRates,
      baseMetals,
    };
  }

  // ═══════════════════════════════════════════
  // ADMIN CONFIGURATION ENDPOINTS
  // ═══════════════════════════════════════════

  @Patch("shop-override")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Update shop price override",
    description: "Create or update a shop-specific price override",
  })
  @ApiResponse({
    status: 200,
    description: "Override updated successfully",
  })
  async updateShopOverride(
    @Body() dto: UpdateShopOverrideDto,
  ): Promise<{ success: boolean; id: string }> {
    // Upsert the override
    const existing = await (this.prisma as any).shopPriceOverride?.findFirst({
      where: {
        shopId: dto.shopId,
        itemCode: dto.itemCode,
        overrideType: dto.overrideType,
      },
    });

    if (existing) {
      await (this.prisma as any).shopPriceOverride?.update({
        where: { id: existing.id },
        data: {
          overrideMode: dto.overrideMode,
          overrideValue: dto.overrideValue,
          isActive: dto.isActive ?? true,
        },
      });
      return { success: true, id: existing.id };
    } else {
      const created = await (this.prisma as any).shopPriceOverride?.create({
        data: {
          shopId: dto.shopId,
          overrideType: dto.overrideType,
          itemCode: dto.itemCode,
          overrideMode: dto.overrideMode,
          overrideValue: dto.overrideValue,
          isActive: dto.isActive ?? true,
        },
      });
      return { success: true, id: created?.id || "pending" };
    }
  }

  @Patch("market-adjustment")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Update market adjustment",
    description: "Create or update a market-specific price adjustment",
  })
  @ApiResponse({
    status: 200,
    description: "Adjustment updated successfully",
  })
  async updateMarketAdjustment(
    @Body() dto: UpdateMarketAdjustmentDto,
  ): Promise<{ success: boolean; id: string }> {
    // Upsert the adjustment
    const existing = await (
      this.prisma as any
    ).marketAdjustmentConfig?.findFirst({
      where: {
        marketRegion: dto.marketRegion,
        category: dto.category,
      },
    });

    if (existing) {
      await (this.prisma as any).marketAdjustmentConfig?.update({
        where: { id: existing.id },
        data: {
          adjustmentType: dto.adjustmentType,
          adjustmentValue: dto.adjustmentValue,
          description: dto.description,
        },
      });
      return { success: true, id: existing.id };
    } else {
      const created = await (this.prisma as any).marketAdjustmentConfig?.create(
        {
          data: {
            marketRegion: dto.marketRegion,
            category: dto.category,
            adjustmentType: dto.adjustmentType,
            adjustmentValue: dto.adjustmentValue,
            description: dto.description,
            isActive: true,
          },
        },
      );
      return { success: true, id: created?.id || "pending" };
    }
  }

  @Patch("tax-rule")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Update tax rule",
    description: "Create or update a market-specific tax rule",
  })
  @ApiResponse({
    status: 200,
    description: "Tax rule updated successfully",
  })
  async updateTaxRule(
    @Body() dto: UpdateTaxRuleDto,
  ): Promise<{ success: boolean; id: string }> {
    // Upsert the tax rule
    try {
      const existing = await this.prisma['taxRuleConfig'].findFirst({
        where: {
          marketRegion: dto.marketRegion,
          taxName: dto.taxName,
          category: dto.category,
          stateCode: dto.stateCode || null,
        },
      });

      if (existing) {
        await this.prisma['taxRuleConfig'].update({
          where: { id: existing.id },
          data: {
            rate: dto.rate,
          },
        });
        return { success: true, id: existing.id };
      } else {
        const created = await this.prisma['taxRuleConfig'].create({
          data: {
            marketRegion: dto.marketRegion,
            taxName: dto.taxName,
            taxType: dto.taxName,
            category: dto.category,
            rate: dto.rate,
            stateCode: dto.stateCode,
            isActive: true,
          },
        });
        return { success: true, id: created.id };
      }
    } catch (e) {
      this.logger.error(`Failed to update tax rule: ${e}`);
      throw new Error(`Failed to update tax rule: ${dto.taxName}`);
    }
  }

  @Get("tax-rules")
  @ApiOperation({
    summary: "Get tax rules for a region",
    description:
      "Fetch all active tax rules for a market region. Returns DB rules or defaults.",
  })
  @ApiQuery({
    name: "region",
    required: true,
    enum: ["NP", "IN", "AE", "UK", "EU", "US"],
  })
  @ApiResponse({ status: 200, description: "List of tax rules" })
  async getTaxRules(@Query("region") region: string) {
    const validRegions = ["NP", "IN", "AE", "UK", "EU", "US"];
    if (!validRegions.includes(region)) {
      throw new Error(`Invalid region: ${region}`);
    }

    // Try DB first
    let dbRules: any[] = [];
    try {
      dbRules = await this.prisma['taxRuleConfig'].findMany({
        where: {
          marketRegion: region,
          isActive: true,
        },
        orderBy: { priority: 'asc' },
      });
    } catch (e) {
      this.logger.warn(`Failed to fetch tax rules from DB: ${e}`);
    }

    if (dbRules.length > 0) {
      return {
        region,
        source: "DB",
        rules: dbRules.map((r: any) => ({
          id: r.id,
          taxType: r.taxType,
          taxName: r.taxName,
          category: r.category,
          rate: r.rate,
          isCompounding: r.isCompounding,
          priority: r.priority,
          stateCode: r.stateCode,
          description: r.description,
          isActive: r.isActive,
          effectiveFrom: r.effectiveFrom,
          effectiveUntil: r.effectiveUntil,
        })),
      };
    }

    // Fallback to defaults
    const defaults = DEFAULT_TAX_RATES[region as MarketRegion];
    return {
      region,
      source: "DEFAULT",
      rules: Object.entries(defaults.rates).map(([category, rate]) => ({
        id: "",
        taxType: defaults.taxType,
        taxName: defaults.taxName,
        category,
        rate,
        isCompounding: false,
        priority: 0,
        stateCode: null,
        description: null,
        isActive: true,
      })),
    };
  }

  @Post("tax-rules/bulk")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Bulk upsert tax rules",
    description: "Create or update multiple tax rules for a region at once",
  })
  async bulkUpsertTaxRules(
    @Body()
    body: {
      region: string;
      rules: Array<{
        taxName: string;
        taxType: string;
        category: string;
        rate: number;
        description?: string;
        priority?: number;
        isActive?: boolean;
      }>;
    },
  ) {
    const validRegions = ["NP", "IN", "AE", "UK", "EU", "US"];
    if (!validRegions.includes(body.region)) {
      throw new Error(`Invalid region: ${body.region}`);
    }

    const results: { created: number; updated: number } = {
      created: 0,
      updated: 0,
    };

    for (const rule of body.rules) {
      try {
        const existing = await this.prisma['taxRuleConfig'].findFirst({
          where: {
            marketRegion: body.region,
            category: rule.category,
            taxName: rule.taxName,
          },
        });

        if (existing) {
          await this.prisma['taxRuleConfig'].update({
            where: { id: existing.id },
            data: {
              rate: rule.rate,
              taxType: rule.taxType || rule.taxName,
              description: rule.description || null,
              priority: rule.priority ?? 0,
              isActive: rule.isActive ?? true,
            },
          });
          results.updated++;
        } else {
          await this.prisma['taxRuleConfig'].create({
            data: {
              marketRegion: body.region,
              taxName: rule.taxName,
              taxType: rule.taxType || rule.taxName,
              category: rule.category,
              rate: rule.rate,
              description: rule.description || null,
              priority: rule.priority ?? 0,
              isActive: rule.isActive ?? true,
            },
          });
          results.created++;
        }
      } catch (e) {
        this.logger.error(`Failed to upsert tax rule ${rule.taxName}/${rule.category}: ${e}`);
        throw new Error(`Failed to save tax rule: ${rule.taxName} for ${rule.category}`);
      }
    }

    // Clear cache so new rules take effect
    this.taxRulesService.clearCache();

    return { success: true, ...results };
  }

  // ═══════════════════════════════════════════
  // SECURE TAX CALCULATION ENDPOINT
  // (Backend-authoritative - frontend must NOT calculate taxes)
  // ═══════════════════════════════════════════

  @Post("tax/calculate")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Calculate taxes (AUTHORITATIVE)",
    description: `
      Backend-authoritative tax calculation. Frontend MUST use this 
      endpoint for all tax calculations - do NOT calculate taxes locally.
      
      Nepal rules (FY 2081/82+):
      - Luxury Tax (2%): Gold metal + making charges ONLY
      - VAT (13%): Diamonds & gemstones ONLY
      
      This prevents API spoofing and ensures compliance.
    `,
  })
  @ApiResponse({
    status: 200,
    description: "Tax calculation result with full breakdown",
  })
  async calculateTax(
    @Body()
    request: {
      region: string;
      stateCode?: string;
      components: Array<{
        category: string;
        amount: number;
        description: string;
      }>;
      isJewellery?: boolean;
      isInvestmentBullion?: boolean;
      isOldGoldExchange?: boolean;
    },
  ): Promise<TaxCalculationResult> {
    this.logger.log(
      `Tax calculation: region=${request.region}, components=${request.components.length}`,
    );

    // Validate region
    const validRegions = ["NP", "IN", "AE", "UK", "EU", "US"];
    if (!validRegions.includes(request.region)) {
      throw new Error(
        `Invalid region: ${request.region}. Must be one of: ${validRegions.join(", ")}`,
      );
    }

    // Convert components to typed format
    const typedComponents: TaxableComponent[] = request.components.map((c) => ({
      category: c.category as TaxableComponent["category"],
      amount: c.amount,
      description: c.description,
    }));

    const result = await this.backendTaxEngineService.calculateTax({
      region: request.region as MarketRegion,
      stateCode: request.stateCode,
      components: typedComponents,
      isJewellery: request.isJewellery,
      isInvestmentBullion: request.isInvestmentBullion,
      isOldGoldExchange: request.isOldGoldExchange,
    });

    return result;
  }

  @Get("tax/summary")
  @ApiOperation({
    summary: "Get tax summary for a region",
    description:
      "Get applicable tax types and rates for a market region (for display only)",
  })
  @ApiQuery({
    name: "region",
    required: true,
    enum: ["NP", "IN", "AE", "UK", "EU", "US"],
    description: "Market region",
  })
  @ApiResponse({
    status: 200,
    description: "Tax summary for region",
  })
  async getTaxSummary(@Query("region") region: string) {
    const validRegions = ["NP", "IN", "AE", "UK", "EU", "US"];
    if (!validRegions.includes(region)) {
      throw new Error(
        `Invalid region: ${region}. Must be one of: ${validRegions.join(", ")}`,
      );
    }

    return this.backendTaxEngineService.getTaxSummary(region as MarketRegion);
  }

  // ═══════════════════════════════════════════
  // PRIVATE HELPERS
  // ═══════════════════════════════════════════

  private getFxRate(fxSnapshot: any, currency: SupportedCurrency): number {
    if (currency === "USD") return 1.0;

    const rateKey = `USD_${currency}` as keyof typeof fxSnapshot;
    const rate = fxSnapshot[rateKey];

    if (rate && typeof rate === "object" && "rate" in rate) {
      return rate.rate;
    }

    return this.getDefaultFxRate(currency);
  }

  private getDefaultFxRate(currency: SupportedCurrency): number {
    const defaults: Record<SupportedCurrency, number> = {
      USD: 1.0,
      NPR: 134.5,
      INR: 83.5,
      AED: 3.67,
      GBP: 0.79,
      EUR: 0.92,
    };
    return defaults[currency] || 1.0;
  }
}
