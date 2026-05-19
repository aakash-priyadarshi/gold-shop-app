/**
 * Pricing Engine Service
 *
 * Core pricing pipeline that:
 * 1. Resolves system base prices (spot + purity multipliers)
 * 2. Applies market adjustments (regional premiums)
 * 3. Applies shop overrides (if shopId provided)
 * 4. Computes subtotal with all components
 * 5. Applies taxes based on market rules
 * 6. Converts to display currency
 * 7. Returns explainable breakdown
 *
 * Key concepts:
 * - marketCountry: determines tax rules, market adjustments
 * - displayCurrency: for final presentation (independent of market)
 * - All internal calculations in USD, then converted
 */

import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { v4 as uuidv4 } from "uuid";
import { PrismaService } from "../../../prisma/prisma.service";
import { CurrencyCode, FxRatesService } from "../../fx-rates";
import { MarketRatesService } from "../../market-rates/market-rates.service";
import { MarketRegion } from "../../market-rates/types";
import {
  CommodityRatesService,
  PURITY_MULTIPLIERS,
} from "./commodity-rates.service";
import { TaxCalculationResult, TaxRulesService } from "./tax-rules.service";

// ═══════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════

export type SupportedCountry = "IN" | "NP" | "AE" | "UK" | "EU" | "US";

export interface PricingRequest {
  // Market context
  marketCountry: SupportedCountry;
  displayCurrency: CurrencyCode;
  stateCode?: string; // For US state taxes

  // Item details
  jewelleryType?: string;
  buildMethod: "METHOD_A" | "METHOD_B" | "METHOD_C" | "METHOD_D";
  totalWeightG: number;

  // Metal details
  primaryMetal?: string; // e.g., 'GOLD_24K', 'SILVER_925'
  secondaryMetal?: string; // For METHOD_D
  primaryWeightG?: number;
  secondaryWeightG?: number;

  // Method C specific
  coreMetal?: string; // Base metal for METHOD_C

  // Finish/plating
  finishType?: string;
  finishTier?: "LIGHT" | "STANDARD" | "PREMIUM";

  // Gemstones
  gemstones?: GemstoneInput[];

  // Charges
  makingChargePct?: number; // Default: 3%
  makingChargeFixed?: number; // Alternative to percentage

  // Shop context
  shopId?: string;

  // Compliance
  nickelCompliantFlag?: boolean;
}

export interface GemstoneInput {
  stoneType: string;
  origin?: "NATURAL" | "LAB";
  sizeMm?: number;
  caratWeight?: number;
  qualityGrade: "A" | "B" | "C" | "BUDGET" | "STANDARD" | "PREMIUM";
  settingType?: string;
  count: number;
}

export interface PricingLineItem {
  category:
    | "PRECIOUS_METAL"
    | "BASE_METAL"
    | "GEMSTONE"
    | "FINISH"
    | "MAKING_CHARGE"
    | "TAX"
    | "PLATFORM_FEE";
  code: string;
  description: string;
  quantity?: number;
  unit?: string;
  ratePerUnit?: number;
  amountUsd: number;
  amountLocal: number;
  currency: CurrencyCode;
  source?: string;
}

export interface PricingWarning {
  code: string;
  message: string;
  severity: "info" | "warning" | "error";
}

export interface SpotPriceInfo {
  metal: string;
  spotPriceUsdOz: number;
  pricePerGramUsd: number;
  source: string;
  updatedAt: string;
}

export interface MarketAdjustment {
  category: string;
  type: string;
  value: number;
  description: string;
}

export interface ShopOverride {
  type: string;
  itemCode: string;
  mode: string;
  value: number;
  description: string;
}

export interface PricingExplanation {
  // Price sources
  spotPrices: SpotPriceInfo[];
  fxRate: { pair: string; rate: number; source: string; updatedAt: string };

  // Calculations
  purityMultiplier?: { code: string; value: number };
  weightBreakdown?: { primary: number; secondary: number; total: number };

  // Adjustments
  marketAdjustments: MarketAdjustment[];
  shopOverrides: ShopOverride[];

  // Taxes
  taxCalculation: TaxCalculationResult;

  // Metadata
  calculationTimeMs: number;
  requestId: string;
}

export interface PricingResponse {
  // Request context
  marketCountry: SupportedCountry;
  displayCurrency: CurrencyCode;
  buildMethod: string;

  // Line items
  lineItems: PricingLineItem[];

  // Totals in USD (internal)
  subtotalUsd: number;
  makingChargeUsd: number;
  taxesUsd: number;
  platformFeeUsd: number;
  totalUsd: number;

  // Totals in display currency
  subtotal: number;
  makingCharge: number;
  taxes: number;
  platformFee: number;
  total: number;

  // Metadata
  warnings: PricingWarning[];
  explanation: PricingExplanation;
  disclaimer: string;
  source: "PLATFORM" | "SHOP";
  ratesUpdatedAt: string;
}

// ═══════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════

const DEFAULT_MAKING_CHARGE_PCT = 10; // Should match platform config default
const PLATFORM_FEE_PCT = 5; // Should match platform_commission_rate config

// Country to region mapping
const COUNTRY_TO_REGION: Record<SupportedCountry, MarketRegion> = {
  NP: "NP",
  IN: "IN",
  AE: "AE",
  UK: "UK",
  EU: "EU",
  US: "US",
};

// Country to default currency
const COUNTRY_DEFAULT_CURRENCY: Record<SupportedCountry, CurrencyCode> = {
  NP: "NPR",
  IN: "INR",
  AE: "AED",
  UK: "GBP",
  EU: "EUR",
  US: "USD",
};

// Rounding rules by currency
const ROUNDING_RULES: Record<
  CurrencyCode,
  { precision: number; roundTo: number }
> = {
  NPR: { precision: 0, roundTo: 1 },
  INR: { precision: 0, roundTo: 1 },
  AED: { precision: 2, roundTo: 0.01 },
  USD: { precision: 2, roundTo: 0.01 },
  GBP: { precision: 2, roundTo: 0.01 },
  EUR: { precision: 2, roundTo: 0.01 },
};

// ═══════════════════════════════════════════
// SERVICE
// ═══════════════════════════════════════════

@Injectable()
export class PricingEngineService {
  private readonly logger = new Logger(PricingEngineService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly commodityRatesService: CommodityRatesService,
    private readonly taxRulesService: TaxRulesService,
    private readonly marketRatesService: MarketRatesService,
    private readonly fxRatesService: FxRatesService,
  ) {}

  /**
   * Main pricing calculation endpoint
   */
  async calculatePrice(request: PricingRequest): Promise<PricingResponse> {
    const startTime = Date.now();
    const requestId = uuidv4();

    this.logger.debug(
      `Calculating price [${requestId}]: market=${request.marketCountry}, ` +
        `currency=${request.displayCurrency}, method=${request.buildMethod}`,
    );

    const warnings: PricingWarning[] = [];
    const lineItems: PricingLineItem[] = [];
    const spotPrices: SpotPriceInfo[] = [];
    const marketAdjustments: MarketAdjustment[] = [];
    const shopOverrides: ShopOverride[] = [];

    // Step 0: Validate request
    this.validateRequest(request);

    // Get region and currencies
    const region = COUNTRY_TO_REGION[request.marketCountry];
    const marketCurrency = COUNTRY_DEFAULT_CURRENCY[request.marketCountry];
    const displayCurrency = request.displayCurrency;

    // Step 1: Get FX rates
    const fxSnapshot = await this.fxRatesService.getExtendedFxSnapshot();
    const usdToDisplay = this.getFxRate(fxSnapshot, displayCurrency);
    const usdToMarket = this.getFxRate(fxSnapshot, marketCurrency);

    const fxInfo = {
      pair: `USD_${displayCurrency}`,
      rate: usdToDisplay,
      source: fxSnapshot.USD_NPR?.source || "fallback",
      updatedAt: fxSnapshot.USD_NPR?.updatedAt || new Date().toISOString(),
    };

    // Step 2: Get commodity rates
    const commodityRates = await this.commodityRatesService.getAllRates(
      region,
      marketCurrency,
    );

    // Track rates updated at
    const ratesUpdatedAt = commodityRates.updatedAt;

    // Step 3: Calculate material costs based on build method
    let subtotalUsd = 0;

    switch (request.buildMethod) {
      case "METHOD_A": {
        // Solid precious metal
        const result = await this.calculatePreciousMetalCost(
          request,
          commodityRates,
          usdToMarket,
          lineItems,
          spotPrices,
          warnings,
        );
        subtotalUsd += result;
        break;
      }

      case "METHOD_B": {
        // Base metal/alloy
        const result = await this.calculateBaseMetalCost(
          request,
          commodityRates,
          usdToMarket,
          lineItems,
          warnings,
        );
        subtotalUsd += result;
        break;
      }

      case "METHOD_C": {
        // Core metal + finish
        const baseCost = await this.calculateBaseMetalCost(
          request,
          commodityRates,
          usdToMarket,
          lineItems,
          warnings,
        );
        subtotalUsd += baseCost;

        // Add finish cost
        if (request.finishType) {
          const finishCost = await this.calculateFinishCost(
            request,
            usdToMarket,
            lineItems,
            warnings,
          );
          subtotalUsd += finishCost;
        }
        break;
      }

      case "METHOD_D": {
        // Multi-metal construction
        const result = await this.calculateMultiMetalCost(
          request,
          commodityRates,
          usdToMarket,
          lineItems,
          spotPrices,
          warnings,
        );
        subtotalUsd += result;
        break;
      }
    }

    // Step 4: Add gemstone costs
    if (request.gemstones && request.gemstones.length > 0) {
      const gemCost = await this.calculateGemstoneCost(
        request,
        usdToMarket,
        lineItems,
        warnings,
      );
      subtotalUsd += gemCost;
    }

    // Step 5: Apply shop overrides (if shopId provided)
    if (request.shopId) {
      const overrideResult = await this.applyShopOverrides(
        request.shopId,
        lineItems,
        shopOverrides,
        warnings,
      );
      subtotalUsd = overrideResult.adjustedSubtotal;
    }

    // Step 6: Apply market adjustments
    const adjustedSubtotalUsd = await this.applyMarketAdjustments(
      region,
      subtotalUsd,
      marketAdjustments,
    );

    // Step 7: Calculate making charge
    const makingChargePct =
      request.makingChargePct ?? DEFAULT_MAKING_CHARGE_PCT;
    let makingChargeUsd = 0;

    if (request.makingChargeFixed) {
      makingChargeUsd = request.makingChargeFixed / usdToDisplay;
    } else {
      makingChargeUsd = adjustedSubtotalUsd * (makingChargePct / 100);
    }

    lineItems.push({
      category: "MAKING_CHARGE",
      code: "MAKING_CHARGE",
      description: request.makingChargeFixed
        ? `Making Charge (Fixed)`
        : `Making Charge (${makingChargePct}%)`,
      amountUsd: makingChargeUsd,
      amountLocal: makingChargeUsd * usdToDisplay,
      currency: displayCurrency,
    });

    // Step 8: Calculate taxes
    const taxableAmounts: Record<string, number> = {
      PRECIOUS_METAL: lineItems
        .filter((i) => i.category === "PRECIOUS_METAL")
        .reduce((sum, i) => sum + i.amountUsd, 0),
      BASE_METAL: lineItems
        .filter((i) => i.category === "BASE_METAL")
        .reduce((sum, i) => sum + i.amountUsd, 0),
      GEMSTONE: lineItems
        .filter((i) => i.category === "GEMSTONE")
        .reduce((sum, i) => sum + i.amountUsd, 0),
      FINISH: lineItems
        .filter((i) => i.category === "FINISH")
        .reduce((sum, i) => sum + i.amountUsd, 0),
      MAKING_CHARGE: makingChargeUsd,
    };

    // Convert to local currency for tax calculation (taxes applied in local currency)
    const taxableAmountsLocal: Record<string, number> = {};
    for (const [key, value] of Object.entries(taxableAmounts)) {
      taxableAmountsLocal[key] = value * usdToMarket;
    }

    const taxResult = await this.taxRulesService.calculateTaxes(
      region,
      taxableAmountsLocal,
      request.stateCode,
    );

    // Convert tax back to USD for consistency
    const taxesUsd = taxResult.totalTaxAmount / usdToMarket;

    // Add tax line items
    for (const taxLine of taxResult.breakdown) {
      lineItems.push({
        category: "TAX",
        code: `TAX_${taxLine.category}`,
        description: taxLine.description,
        quantity: 1,
        ratePerUnit: taxLine.rate * 100,
        unit: "%",
        amountUsd: taxLine.taxAmount / usdToMarket,
        amountLocal: taxLine.taxAmount * (usdToDisplay / usdToMarket),
        currency: displayCurrency,
      });
    }

    // Step 9: Calculate platform fee
    const preTotalUsd = adjustedSubtotalUsd + makingChargeUsd + taxesUsd;
    const platformFeeUsd = preTotalUsd * (PLATFORM_FEE_PCT / 100);

    lineItems.push({
      category: "PLATFORM_FEE",
      code: "PLATFORM_FEE",
      description: `Platform Fee (${PLATFORM_FEE_PCT}%)`,
      amountUsd: platformFeeUsd,
      amountLocal: platformFeeUsd * usdToDisplay,
      currency: displayCurrency,
    });

    // Step 10: Calculate totals
    const totalUsd = preTotalUsd + platformFeeUsd;

    // Convert to display currency with rounding
    const rounding = ROUNDING_RULES[displayCurrency];
    const roundFn = (val: number) => {
      const factor = Math.pow(10, rounding.precision);
      return Math.round(val * factor) / factor;
    };

    const subtotal = roundFn(adjustedSubtotalUsd * usdToDisplay);
    const makingCharge = roundFn(makingChargeUsd * usdToDisplay);
    const taxes = roundFn(taxesUsd * usdToDisplay);
    const platformFee = roundFn(platformFeeUsd * usdToDisplay);
    const total = roundFn(totalUsd * usdToDisplay);

    // Update line items with rounded values
    for (const item of lineItems) {
      item.amountLocal = roundFn(item.amountUsd * usdToDisplay);
    }

    // Build explanation
    const explanation: PricingExplanation = {
      spotPrices,
      fxRate: fxInfo,
      purityMultiplier: request.primaryMetal
        ? {
            code: request.primaryMetal,
            value:
              PURITY_MULTIPLIERS[
                request.primaryMetal as keyof typeof PURITY_MULTIPLIERS
              ] || 1.0,
          }
        : undefined,
      weightBreakdown: {
        primary: request.primaryWeightG || request.totalWeightG,
        secondary: request.secondaryWeightG || 0,
        total: request.totalWeightG,
      },
      marketAdjustments,
      shopOverrides,
      taxCalculation: taxResult,
      calculationTimeMs: Date.now() - startTime,
      requestId,
    };

    // Log calculation for audit
    await this.logCalculation(requestId, request, explanation, {
      subtotalUsd,
      makingChargeUsd,
      taxesUsd,
      platformFeeUsd,
      totalUsd,
      subtotal,
      makingCharge,
      taxes,
      platformFee,
      total,
    });

    const response: PricingResponse = {
      marketCountry: request.marketCountry,
      displayCurrency,
      buildMethod: request.buildMethod,
      lineItems,
      subtotalUsd: roundFn(adjustedSubtotalUsd),
      makingChargeUsd: roundFn(makingChargeUsd),
      taxesUsd: roundFn(taxesUsd),
      platformFeeUsd: roundFn(platformFeeUsd),
      totalUsd: roundFn(totalUsd),
      subtotal,
      makingCharge,
      taxes,
      platformFee,
      total,
      warnings,
      explanation,
      disclaimer: this.getDisclaimer(request.marketCountry),
      source: request.shopId ? "SHOP" : "PLATFORM",
      ratesUpdatedAt,
    };

    this.logger.debug(
      `Price calculated [${requestId}] in ${Date.now() - startTime}ms: ` +
        `${displayCurrency} ${total.toLocaleString()}`,
    );

    return response;
  }

  // ═══════════════════════════════════════════
  // PRIVATE METHODS
  // ═══════════════════════════════════════════

  private validateRequest(request: PricingRequest): void {
    if (!request.marketCountry) {
      throw new BadRequestException("marketCountry is required");
    }
    if (!request.displayCurrency) {
      throw new BadRequestException("displayCurrency is required");
    }
    if (!request.buildMethod) {
      throw new BadRequestException("buildMethod is required");
    }
    if (!request.totalWeightG || request.totalWeightG <= 0) {
      throw new BadRequestException("totalWeightG must be greater than 0");
    }

    // Validate method-specific requirements
    switch (request.buildMethod) {
      case "METHOD_A":
        if (!request.primaryMetal) {
          throw new BadRequestException(
            "primaryMetal is required for METHOD_A",
          );
        }
        break;
      case "METHOD_B":
      case "METHOD_C":
        if (!request.coreMetal && !request.primaryMetal) {
          throw new BadRequestException(
            "coreMetal or primaryMetal is required",
          );
        }
        break;
      case "METHOD_D":
        if (!request.primaryMetal || !request.secondaryMetal) {
          throw new BadRequestException(
            "primaryMetal and secondaryMetal are required for METHOD_D",
          );
        }
        break;
    }

    // Check nickel compliance
    const metalCodes = [
      request.primaryMetal,
      request.secondaryMetal,
      request.coreMetal,
    ];
    const hasNickel = metalCodes.some((m) => m?.includes("NICKEL"));

    if (hasNickel && !request.nickelCompliantFlag) {
      throw new BadRequestException(
        "Nickel-containing materials require nickelCompliantFlag=true",
      );
    }
  }

  private async calculatePreciousMetalCost(
    request: PricingRequest,
    commodityRates: any,
    usdToMarket: number,
    lineItems: PricingLineItem[],
    spotPrices: SpotPriceInfo[],
    warnings: PricingWarning[],
  ): Promise<number> {
    const metal = request.primaryMetal!;
    const weight = request.totalWeightG;

    // Find the rate for this metal
    const rate = commodityRates.preciousMetals.find(
      (r: any) => r.purityCode === metal,
    );

    if (!rate) {
      warnings.push({
        code: "METAL_RATE_NOT_FOUND",
        message: `Rate not found for ${metal}, using estimate`,
        severity: "warning",
      });
      return 0;
    }

    const amountUsd = rate.pricePerGramUsd * weight;

    lineItems.push({
      category: "PRECIOUS_METAL",
      code: metal,
      description: `${metal.replace("_", " ")} (${weight.toFixed(2)}g)`,
      quantity: weight,
      unit: "gram",
      ratePerUnit: rate.pricePerGramUsd,
      amountUsd,
      amountLocal: rate.pricePerGramLocal * weight,
      currency: request.displayCurrency,
      source: rate.source,
    });

    spotPrices.push({
      metal: rate.metalCode,
      spotPriceUsdOz: rate.spotPriceUsdOz,
      pricePerGramUsd: rate.pricePerGramUsd,
      source: rate.source,
      updatedAt: rate.updatedAt,
    });

    return amountUsd;
  }

  private async calculateBaseMetalCost(
    request: PricingRequest,
    commodityRates: any,
    usdToMarket: number,
    lineItems: PricingLineItem[],
    warnings: PricingWarning[],
  ): Promise<number> {
    const metal = request.coreMetal || request.primaryMetal!;
    const weight = request.totalWeightG;

    // Check for restricted materials
    const isRestricted =
      await this.commodityRatesService.isMetalRestricted(metal);
    if (isRestricted && !request.nickelCompliantFlag) {
      throw new BadRequestException(
        `${metal} requires nickelCompliantFlag=true`,
      );
    }

    // Find the rate
    const rate = commodityRates.baseMetals.find(
      (r: any) => r.metalCode === metal,
    );

    if (!rate) {
      warnings.push({
        code: "BASE_METAL_RATE_NOT_FOUND",
        message: `Rate not found for ${metal}, using default`,
        severity: "warning",
      });

      // Use default
      const defaultRate = 0.01; // $0.01/g fallback
      const amountUsd = defaultRate * weight;

      lineItems.push({
        category: "BASE_METAL",
        code: metal,
        description: `${metal.replace("_", " ")} (${weight.toFixed(2)}g)`,
        quantity: weight,
        unit: "gram",
        ratePerUnit: defaultRate,
        amountUsd,
        amountLocal: amountUsd * usdToMarket,
        currency: request.displayCurrency,
        source: "DEFAULT",
      });

      return amountUsd;
    }

    const amountUsd = rate.pricePerGramUsd * weight;

    lineItems.push({
      category: "BASE_METAL",
      code: metal,
      description: `${metal.replace("_", " ")} (${weight.toFixed(2)}g)`,
      quantity: weight,
      unit: "gram",
      ratePerUnit: rate.pricePerGramUsd,
      amountUsd,
      amountLocal: rate.pricePerGramLocal * weight,
      currency: request.displayCurrency,
      source: rate.source,
    });

    return amountUsd;
  }

  private async calculateMultiMetalCost(
    request: PricingRequest,
    commodityRates: any,
    usdToMarket: number,
    lineItems: PricingLineItem[],
    spotPrices: SpotPriceInfo[],
    warnings: PricingWarning[],
  ): Promise<number> {
    let totalUsd = 0;

    // Primary metal (precious)
    const primaryWeight = request.primaryWeightG || request.totalWeightG * 0.5; // Default 50% split

    const primaryRate = commodityRates.preciousMetals.find(
      (r: any) => r.purityCode === request.primaryMetal,
    );

    if (primaryRate) {
      const amountUsd = primaryRate.pricePerGramUsd * primaryWeight;
      totalUsd += amountUsd;

      lineItems.push({
        category: "PRECIOUS_METAL",
        code: request.primaryMetal!,
        description: `${request.primaryMetal!.replace("_", " ")} (${primaryWeight.toFixed(2)}g)`,
        quantity: primaryWeight,
        unit: "gram",
        ratePerUnit: primaryRate.pricePerGramUsd,
        amountUsd,
        amountLocal: primaryRate.pricePerGramLocal * primaryWeight,
        currency: request.displayCurrency,
        source: primaryRate.source,
      });

      spotPrices.push({
        metal: primaryRate.metalCode,
        spotPriceUsdOz: primaryRate.spotPriceUsdOz,
        pricePerGramUsd: primaryRate.pricePerGramUsd,
        source: primaryRate.source,
        updatedAt: primaryRate.updatedAt,
      });
    }

    // Secondary metal (base/alloy)
    const secondaryWeight =
      request.secondaryWeightG || request.totalWeightG - primaryWeight;

    const secondaryRate = commodityRates.baseMetals.find(
      (r: any) => r.metalCode === request.secondaryMetal,
    );

    if (secondaryRate && secondaryWeight > 0) {
      const amountUsd = secondaryRate.pricePerGramUsd * secondaryWeight;
      totalUsd += amountUsd;

      lineItems.push({
        category: "BASE_METAL",
        code: request.secondaryMetal!,
        description: `${request.secondaryMetal!.replace("_", " ")} (${secondaryWeight.toFixed(2)}g)`,
        quantity: secondaryWeight,
        unit: "gram",
        ratePerUnit: secondaryRate.pricePerGramUsd,
        amountUsd,
        amountLocal: secondaryRate.pricePerGramLocal * secondaryWeight,
        currency: request.displayCurrency,
        source: secondaryRate.source,
      });
    }

    // Add multi-metal warning
    warnings.push({
      code: "MULTI_METAL_CONSTRUCTION",
      message:
        "Multi-metal construction. Not solid gold unless 100% gold is selected.",
      severity: "info",
    });

    return totalUsd;
  }

  private async calculateFinishCost(
    request: PricingRequest,
    usdToMarket: number,
    lineItems: PricingLineItem[],
    warnings: PricingWarning[],
  ): Promise<number> {
    const finishType = request.finishType!;
    const tier = request.finishTier || "STANDARD";

    // Get finish price from DB
    const finishConfig = await (
      this.prisma as any
    ).finishPriceConfig?.findFirst({
      where: {
        finishType,
        tier,
        isActive: true,
      },
    });

    let amountUsd = 0;

    if (finishConfig) {
      if (finishConfig.pricingModel === "FIXED") {
        amountUsd = finishConfig.basePrice;
      } else if (
        finishConfig.pricingModel === "PERCENTAGE" &&
        finishConfig.percentageUplift
      ) {
        // Calculate as percentage of subtotal
        const currentSubtotal = lineItems.reduce(
          (sum, i) => sum + i.amountUsd,
          0,
        );
        amountUsd = currentSubtotal * (finishConfig.percentageUplift / 100);
      } else if (
        finishConfig.pricingModel === "PER_GRAM" &&
        finishConfig.perGramRate
      ) {
        amountUsd = finishConfig.perGramRate * request.totalWeightG;
      }
    } else {
      // Use default finish prices
      const defaultPrices: Record<string, Record<string, number>> = {
        GOLD_PLATING: { LIGHT: 5, STANDARD: 10, PREMIUM: 20 },
        ROSE_GOLD_PLATING: { LIGHT: 5, STANDARD: 10, PREMIUM: 20 },
        VERMEIL: { LIGHT: 15, STANDARD: 25, PREMIUM: 40 },
        PVD_COATING: { LIGHT: 8, STANDARD: 15, PREMIUM: 25 },
        RHODIUM_PLATING: { LIGHT: 10, STANDARD: 18, PREMIUM: 30 },
      };

      amountUsd = defaultPrices[finishType]?.[tier] || 10;

      warnings.push({
        code: "FINISH_PRICE_DEFAULT",
        message: `Using default price for ${finishType} ${tier}`,
        severity: "info",
      });
    }

    lineItems.push({
      category: "FINISH",
      code: `${finishType}_${tier}`,
      description: `${finishType.replace("_", " ")} (${tier})`,
      quantity: 1,
      unit: "piece",
      amountUsd,
      amountLocal: amountUsd * usdToMarket,
      currency: request.displayCurrency,
      source: finishConfig ? "DB" : "DEFAULT",
    });

    return amountUsd;
  }

  private async calculateGemstoneCost(
    request: PricingRequest,
    usdToMarket: number,
    lineItems: PricingLineItem[],
    warnings: PricingWarning[],
  ): Promise<number> {
    let totalUsd = 0;

    for (const gem of request.gemstones!) {
      // Get gemstone price from DB
      const gemConfig = await (this.prisma as any).gemPriceConfig?.findFirst({
        where: {
          stoneType: gem.stoneType,
          origin: gem.origin || undefined,
          qualityGrade: gem.qualityGrade,
          isActive: true,
        },
      });

      let pricePerUnit = 0;
      let source = "DEFAULT";

      if (gemConfig) {
        pricePerUnit = gemConfig.pricePerUnit;
        source = gemConfig.source;
      } else {
        // Default gemstone prices per carat (USD)
        const defaultPrices: Record<string, Record<string, number>> = {
          DIAMOND_NATURAL: {
            A: 5000,
            B: 2000,
            C: 500,
            PREMIUM: 5000,
            STANDARD: 2000,
            BUDGET: 500,
          },
          DIAMOND_LAB: {
            A: 1000,
            B: 500,
            C: 200,
            PREMIUM: 1000,
            STANDARD: 500,
            BUDGET: 200,
          },
          MOISSANITE: {
            A: 300,
            B: 200,
            C: 100,
            PREMIUM: 300,
            STANDARD: 200,
            BUDGET: 100,
          },
          CUBIC_ZIRCONIA: {
            A: 10,
            B: 5,
            C: 2,
            PREMIUM: 10,
            STANDARD: 5,
            BUDGET: 2,
          },
          RUBY: {
            A: 1000,
            B: 500,
            C: 200,
            PREMIUM: 1000,
            STANDARD: 500,
            BUDGET: 200,
          },
          SAPPHIRE: {
            A: 800,
            B: 400,
            C: 150,
            PREMIUM: 800,
            STANDARD: 400,
            BUDGET: 150,
          },
          EMERALD: {
            A: 1200,
            B: 600,
            C: 250,
            PREMIUM: 1200,
            STANDARD: 600,
            BUDGET: 250,
          },
          PEARL: {
            A: 200,
            B: 100,
            C: 50,
            PREMIUM: 200,
            STANDARD: 100,
            BUDGET: 50,
          },
        };

        pricePerUnit = defaultPrices[gem.stoneType]?.[gem.qualityGrade] || 50;

        warnings.push({
          code: "GEMSTONE_PRICE_DEFAULT",
          message: `Using default price for ${gem.stoneType} grade ${gem.qualityGrade}`,
          severity: "info",
        });
      }

      // Calculate total for this gemstone
      const quantity = gem.caratWeight || (gem.sizeMm ? gem.sizeMm * 0.1 : 0.5);
      const gemAmountUsd = pricePerUnit * quantity * gem.count;
      totalUsd += gemAmountUsd;

      lineItems.push({
        category: "GEMSTONE",
        code: `${gem.stoneType}_${gem.qualityGrade}`,
        description: `${gem.stoneType.replace("_", " ")} (Grade ${gem.qualityGrade}) x${gem.count}`,
        quantity: quantity * gem.count,
        unit: "carat",
        ratePerUnit: pricePerUnit,
        amountUsd: gemAmountUsd,
        amountLocal: gemAmountUsd * usdToMarket,
        currency: request.displayCurrency,
        source,
      });

      // Add setting cost if specified
      if (gem.settingType) {
        const settingCost = await this.calculateSettingCost(
          gem.settingType,
          gem.count,
          usdToMarket,
        );
        totalUsd += settingCost.amountUsd;
        lineItems.push(settingCost);
      }
    }

    return totalUsd;
  }

  private async calculateSettingCost(
    settingType: string,
    count: number,
    usdToMarket: number,
  ): Promise<PricingLineItem> {
    // Default setting costs per stone (USD)
    const defaultCosts: Record<string, number> = {
      PRONG: 10,
      BEZEL: 15,
      PAVE: 8,
      CHANNEL: 12,
      HALO: 25,
      FLUSH: 20,
      TENSION: 30,
    };

    const costPerStone = defaultCosts[settingType] || 10;
    const amountUsd = costPerStone * count;

    return {
      category: "GEMSTONE",
      code: `SETTING_${settingType}`,
      description: `${settingType} Setting x${count}`,
      quantity: count,
      unit: "piece",
      ratePerUnit: costPerStone,
      amountUsd,
      amountLocal: amountUsd * usdToMarket,
      currency: "USD" as CurrencyCode,
      source: "DEFAULT",
    };
  }

  private async applyShopOverrides(
    shopId: string,
    lineItems: PricingLineItem[],
    shopOverrides: ShopOverride[],
    warnings: PricingWarning[],
  ): Promise<{ adjustedSubtotal: number }> {
    // Get shop overrides from DB
    const overrides =
      (await (this.prisma as any).shopPriceOverride?.findMany({
        where: { shopId, isActive: true },
      })) || [];

    let adjustedSubtotal = lineItems.reduce((sum, i) => sum + i.amountUsd, 0);

    for (const override of overrides) {
      const matchingItems = lineItems.filter(
        (i) =>
          i.code === override.itemCode || i.category === override.overrideType,
      );

      for (const item of matchingItems) {
        let adjustment = 0;

        switch (override.overrideMode) {
          case "FIXED":
            adjustment = override.overrideValue - item.amountUsd;
            item.amountUsd = override.overrideValue;
            break;
          case "PERCENTAGE":
            adjustment = item.amountUsd * (override.overrideValue / 100);
            item.amountUsd += adjustment;
            break;
          case "MULTIPLIER":
            const original = item.amountUsd;
            item.amountUsd = original * override.overrideValue;
            adjustment = item.amountUsd - original;
            break;
        }

        adjustedSubtotal += adjustment;

        shopOverrides.push({
          type: override.overrideType,
          itemCode: override.itemCode,
          mode: override.overrideMode,
          value: override.overrideValue,
          description: `Shop override for ${override.itemCode}`,
        });
      }
    }

    if (overrides.length > 0) {
      warnings.push({
        code: "SHOP_OVERRIDES_APPLIED",
        message: `${overrides.length} shop price override(s) applied`,
        severity: "info",
      });
    }

    return { adjustedSubtotal };
  }

  private async applyMarketAdjustments(
    region: MarketRegion,
    subtotal: number,
    marketAdjustments: MarketAdjustment[],
  ): Promise<number> {
    // Get market adjustments from DB
    const adjustments =
      (await (this.prisma as any).marketAdjustmentConfig?.findMany({
        where: { marketRegion: region, isActive: true },
      })) || [];

    let adjusted = subtotal;

    for (const adj of adjustments) {
      let adjustmentAmount = 0;

      switch (adj.adjustmentType) {
        case "MULTIPLIER":
          adjustmentAmount = subtotal * (adj.adjustmentValue - 1);
          adjusted = subtotal * adj.adjustmentValue;
          break;
        case "PERCENTAGE":
          adjustmentAmount = subtotal * (adj.adjustmentValue / 100);
          adjusted += adjustmentAmount;
          break;
        case "FIXED_ADDON":
          adjustmentAmount = adj.adjustmentValue;
          adjusted += adjustmentAmount;
          break;
      }

      marketAdjustments.push({
        category: adj.category,
        type: adj.adjustmentType,
        value: adj.adjustmentValue,
        description:
          adj.description || `${adj.adjustmentType} adjustment for ${region}`,
      });
    }

    // If no DB adjustments, use defaults (already applied via market rates)
    if (adjustments.length === 0) {
      marketAdjustments.push({
        category: "ALL",
        type: "MULTIPLIER",
        value: 1.0,
        description: "Default market adjustment (included in spot rates)",
      });
    }

    return adjusted;
  }

  private getFxRate(fxSnapshot: any, currency: CurrencyCode): number {
    if (currency === "USD") return 1.0;

    const rateKey = `USD_${currency}` as keyof typeof fxSnapshot;
    const rate = fxSnapshot[rateKey];

    if (rate && typeof rate === "object" && "rate" in rate) {
      return rate.rate;
    }

    // Fallback rates
    const fallbacks: Record<CurrencyCode, number> = {
      USD: 1.0,
      NPR: 134.5,
      INR: 83.5,
      AED: 3.67,
      GBP: 0.79,
      EUR: 0.92,
    };

    return fallbacks[currency] || 1.0;
  }

  private getDisclaimer(country: SupportedCountry): string {
    const disclaimers: Record<SupportedCountry, string> = {
      NP: "Prices are estimates and may vary. Final price confirmed at checkout. VAT included where applicable.",
      IN: "Prices are estimates. GST applied as per Indian tax laws. Final price may vary based on hallmarking.",
      AE: "Prices are estimates. VAT (5%) included. Prices may vary based on gold purity certification.",
      UK: "Prices are estimates including VAT (20%). Final price confirmed at purchase.",
      EU: "Prices are estimates including VAT. Rates vary by country. Customs may apply.",
      US: "Prices are estimates. Sales tax varies by state and may be calculated at checkout.",
    };

    return (
      disclaimers[country] || "Prices are estimates and subject to change."
    );
  }

  private async logCalculation(
    requestId: string,
    request: PricingRequest,
    explanation: PricingExplanation,
    totals: any,
  ): Promise<void> {
    try {
      await (this.prisma as any).priceCalculationLog?.create({
        data: {
          requestId,
          marketRegion: COUNTRY_TO_REGION[request.marketCountry],
          displayCurrency: request.displayCurrency,
          shopId: request.shopId,
          requestPayload: request as any,
          calculationSteps: explanation as any,
          spotPricesUsed: explanation.spotPrices as any,
          fxRatesUsed: explanation.fxRate as any,
          marketAdjustments: explanation.marketAdjustments as any,
          shopOverrides: explanation.shopOverrides as any,
          taxBreakdown: explanation.taxCalculation as any,
          finalResult: totals as any,
          calculationTimeMs: explanation.calculationTimeMs,
          source: request.shopId ? "SHOP" : "PLATFORM",
        },
      });
    } catch (error) {
      this.logger.warn(`Failed to log calculation: ${error}`);
    }
  }
}
