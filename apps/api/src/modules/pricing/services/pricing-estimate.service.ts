/**
 * Pricing Estimate Service
 * Main service for calculating complete jewellery estimates
 * Combines metal, finish, and gemstone pricing with making charges
 * 
 * Key concept: Country determines the MARKET (pricing source), 
 * but currency is for DISPLAY and can be any supported currency.
 */
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { PricingFxService } from './pricing-fx.service';
import { MaterialPricingService } from './material-pricing.service';
import { FinishPricingService } from './finish-pricing.service';
import { GemstonesPricingService } from './gemstones-pricing.service';
import { MarketRatesService } from '../../market-rates/market-rates.service';
import { FxRatesService } from '../../fx-rates/fx-rates.service';
import { MarketRegion } from '../../market-rates/types';
import {
  EstimateRequest,
  EstimateResponse,
  EstimateLineItem,
  EstimateWarning,
  BuildMethod,
  SupportedCountry,
  SupportedCurrency,
  MaterialCode,
  DEFAULT_COUNTRY_PREMIUM,
  COUNTRY_DEFAULT_CURRENCY,
  TAX_RATES,
  TAX_NAMES,
} from '../types';

// Default making charge percentage (3%)
const DEFAULT_MAKING_CHARGE_PCT = 3;

@Injectable()
export class PricingEstimateService {
  private readonly logger = new Logger(PricingEstimateService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly fxService: PricingFxService,
    private readonly materialPricingService: MaterialPricingService,
    private readonly finishPricingService: FinishPricingService,
    private readonly gemstonePricingService: GemstonesPricingService,
    private readonly marketRatesService: MarketRatesService,
    private readonly fxRatesService: FxRatesService,
  ) {}

  /**
   * Calculate complete pricing estimate
   * 
   * Key concept:
   * - country: determines the MARKET (pricing source, taxes, adjustments)
   * - currency: determines the DISPLAY currency (can be any supported currency)
   * 
   * Example: country=NP, currency=USD means:
   * - Use Nepal market prices (with Nepal adjustments/taxes)
   * - Display the result in USD
   */
  async calculateEstimate(request: EstimateRequest): Promise<EstimateResponse> {
    const { country, buildMethod, shopId } = request;
    // Use request currency for display, country's default for market pricing
    const displayCurrency: SupportedCurrency = request.currency;
    const marketCurrency: SupportedCurrency = COUNTRY_DEFAULT_CURRENCY[country];
    
    this.logger.debug(
      `Calculating estimate: country=${country}, displayCurrency=${displayCurrency}, marketCurrency=${marketCurrency}`,
    );
    
    const lineItems: EstimateLineItem[] = [];
    const warnings: EstimateWarning[] = [];
    let ratesUpdatedAt = new Date().toISOString();

    // Calculate metal costs based on build method (in market currency)
    const metalResult = await this.calculateMetalCost(request, country, marketCurrency, shopId);
    lineItems.push(...metalResult.lineItems);
    warnings.push(...metalResult.warnings);
    if (metalResult.ratesUpdatedAt) {
      ratesUpdatedAt = metalResult.ratesUpdatedAt;
    }

    // Calculate finish costs (if applicable) - in market currency
    const finishResult = await this.calculateFinishCost(request, country, marketCurrency, shopId);
    lineItems.push(...finishResult.lineItems);
    warnings.push(...finishResult.warnings);

    // Calculate gemstone costs (if applicable) - in market currency
    const gemstoneResult = await this.calculateGemstoneCost(request, country, marketCurrency, shopId);
    lineItems.push(...gemstoneResult.lineItems);
    warnings.push(...gemstoneResult.warnings);

    // Calculate subtotal (in market currency)
    const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);

    // Calculate making charge
    const makingChargePct = request.makingChargePct ?? DEFAULT_MAKING_CHARGE_PCT;
    const makingCharge = (subtotal * makingChargePct) / 100;

    lineItems.push({
      category: 'MAKING_CHARGE',
      description: `Making Charge (${makingChargePct}%)`,
      amount: parseFloat(makingCharge.toFixed(2)),
      currency: marketCurrency,
    });

    // Calculate taxes based on country
    const taxRate = TAX_RATES[country] ?? 0;
    const taxableAmount = makingCharge; // Tax on making charge only
    const taxes = taxableAmount * taxRate;

    lineItems.push({
      category: 'TAX',
      description: TAX_NAMES[country] || `Tax (${(taxRate * 100).toFixed(0)}%)`,
      amount: parseFloat(taxes.toFixed(2)),
      currency: marketCurrency,
    });

    // Calculate total in market currency
    const totalInMarketCurrency = subtotal + makingCharge + taxes;

    // Apply country premium if configured
    const premiumPct = DEFAULT_COUNTRY_PREMIUM.countryPremiumPct[country] ?? 0;
    const premiumAdjustedTotal = totalInMarketCurrency * (1 + premiumPct / 100);

    // Convert to display currency if different from market currency
    let finalTotal = premiumAdjustedTotal;
    let finalSubtotal = subtotal;
    let finalMakingCharge = makingCharge;
    let finalTaxes = taxes;
    const finalLineItems: EstimateLineItem[] = [];

    if (displayCurrency !== marketCurrency) {
      // Convert all amounts to display currency
      const conversion = await this.fxRatesService.convertCurrency(
        1,
        marketCurrency as any,
        displayCurrency as any,
      );
      const fxRate = conversion.rate;

      this.logger.debug(
        `Converting ${marketCurrency} -> ${displayCurrency} @ rate ${fxRate}`,
      );

      finalTotal = premiumAdjustedTotal * fxRate;
      finalSubtotal = subtotal * fxRate;
      finalMakingCharge = makingCharge * fxRate;
      finalTaxes = taxes * fxRate;

      // Convert each line item
      for (const item of lineItems) {
        finalLineItems.push({
          ...item,
          amount: parseFloat((item.amount * fxRate).toFixed(2)),
          ratePerUnit: item.ratePerUnit
            ? parseFloat((item.ratePerUnit * fxRate).toFixed(2))
            : undefined,
          currency: displayCurrency,
        });
      }
    } else {
      finalLineItems.push(...lineItems);
    }

    return {
      country,
      currency: displayCurrency,
      buildMethod,
      lineItems: finalLineItems,
      subtotal: parseFloat(finalSubtotal.toFixed(2)),
      makingCharge: parseFloat(finalMakingCharge.toFixed(2)),
      taxes: parseFloat(finalTaxes.toFixed(2)),
      total: parseFloat(finalTotal.toFixed(2)),
      warnings,
      disclaimer: 'This is an estimate only. Final quote depends on shop rates, exact specifications, and current market prices.',
      source: shopId ? 'shop' : 'platform',
      ratesUpdatedAt,
    };
  }

  /**
   * Calculate metal costs based on build method
   */
  private async calculateMetalCost(
    request: EstimateRequest,
    country: SupportedCountry,
    currency: SupportedCurrency,
    shopId?: string,
  ): Promise<{
    lineItems: EstimateLineItem[];
    warnings: EstimateWarning[];
    ratesUpdatedAt?: string;
  }> {
    const lineItems: EstimateLineItem[] = [];
    const warnings: EstimateWarning[] = [];
    let ratesUpdatedAt: string | undefined;

    switch (request.buildMethod) {
      case BuildMethod.METHOD_A: {
        // Solid precious metal
        if (!request.methodA) {
          warnings.push({
            code: 'MISSING_METHOD_A_DETAILS',
            message: 'Method A details (metal type and weight) are required',
            severity: 'error',
          });
          break;
        }

        const { metal, totalWeightG } = request.methodA;
        
        // Get live market rate for precious metal in market currency
        const marketRates = await this.marketRatesService.getMarketRates(currency, country as any);
        ratesUpdatedAt = marketRates.updatedAt;

        const metalKey = metal.toUpperCase().replace(' ', '_') as keyof typeof marketRates.metals;
        const ratePerGram = marketRates.metals[metalKey] || 0;

        if (ratePerGram === 0) {
          warnings.push({
            code: 'UNKNOWN_METAL',
            message: `Unknown metal type: ${metal}. Using estimate.`,
            severity: 'warning',
          });
        }

        const metalCost = ratePerGram * totalWeightG;
        
        lineItems.push({
          category: 'METAL',
          description: `${metal} (${totalWeightG}g)`,
          quantity: totalWeightG,
          unit: 'gram',
          ratePerUnit: parseFloat(ratePerGram.toFixed(2)),
          amount: parseFloat(metalCost.toFixed(2)),
          currency,
        });
        break;
      }

      case BuildMethod.METHOD_B: {
        // Standard alloy
        if (!request.methodB) {
          warnings.push({
            code: 'MISSING_METHOD_B_DETAILS',
            message: 'Method B details (alloy type and weight) are required',
            severity: 'error',
          });
          break;
        }

        const { alloy, totalWeightG } = request.methodB;
        const materialCode = alloy.toUpperCase() as MaterialCode;
        
        const materialRate = await this.materialPricingService.getMaterialRate(
          materialCode,
          country,
          shopId,
        );

        const alloyCost = materialRate.ratePerGramLocal * totalWeightG;
        
        lineItems.push({
          category: 'METAL',
          description: `${alloy} (${totalWeightG}g)`,
          quantity: totalWeightG,
          unit: 'gram',
          ratePerUnit: parseFloat(materialRate.ratePerGramLocal.toFixed(2)),
          amount: parseFloat(alloyCost.toFixed(2)),
          currency,
        });

        // Add warning for restricted materials
        if (materialRate.isRestricted) {
          warnings.push({
            code: 'RESTRICTED_MATERIAL',
            message: `${alloy} is a restricted material. Shop must have compliance certification.`,
            severity: 'warning',
          });
        }
        break;
      }

      case BuildMethod.METHOD_C: {
        // Core metal + finish
        if (!request.methodC) {
          warnings.push({
            code: 'MISSING_METHOD_C_DETAILS',
            message: 'Method C details (core metal and weight) are required',
            severity: 'error',
          });
          break;
        }

        const { coreMetal, totalWeightG } = request.methodC;
        
        const materialRate = await this.materialPricingService.getMaterialRate(
          coreMetal,
          country,
          shopId,
        );

        const coreCost = materialRate.ratePerGramLocal * totalWeightG;
        
        lineItems.push({
          category: 'METAL',
          description: `${coreMetal} core (${totalWeightG}g)`,
          quantity: totalWeightG,
          unit: 'gram',
          ratePerUnit: parseFloat(materialRate.ratePerGramLocal.toFixed(2)),
          amount: parseFloat(coreCost.toFixed(2)),
          currency,
        });
        break;
      }

      case BuildMethod.METHOD_D: {
        // Multi-metal construction
        if (!request.methodD) {
          warnings.push({
            code: 'MISSING_METHOD_D_DETAILS',
            message: 'Method D details are required',
            severity: 'error',
          });
          break;
        }

        const { primaryMetal, secondaryMetal, totalWeightG, primaryWeightG, primaryPercentage, pattern } = request.methodD;
        
        // Calculate weights
        let primaryWeight = primaryWeightG || 0;
        let secondaryWeight = totalWeightG - primaryWeight;
        
        if (primaryPercentage && !primaryWeightG) {
          primaryWeight = totalWeightG * (primaryPercentage / 100);
          secondaryWeight = totalWeightG - primaryWeight;
        }

        // Get precious metal rate - use market currency for pricing
        const marketRates = await this.marketRatesService.getMarketRates(currency, country as MarketRegion);
        ratesUpdatedAt = marketRates.updatedAt;

        const primaryKey = primaryMetal.toUpperCase().replace(' ', '_') as keyof typeof marketRates.metals;
        const primaryRate = marketRates.metals[primaryKey] || 0;
        const primaryCost = primaryRate * primaryWeight;

        lineItems.push({
          category: 'METAL',
          description: `${primaryMetal} (${primaryWeight.toFixed(2)}g)`,
          quantity: parseFloat(primaryWeight.toFixed(2)),
          unit: 'gram',
          ratePerUnit: parseFloat(primaryRate.toFixed(2)),
          amount: parseFloat(primaryCost.toFixed(2)),
          currency,
        });

        // Get secondary material rate
        const secondaryRate = await this.materialPricingService.getMaterialRate(
          secondaryMetal,
          country,
          shopId,
        );
        const secondaryCost = secondaryRate.ratePerGramLocal * secondaryWeight;

        lineItems.push({
          category: 'METAL',
          description: `${secondaryMetal} (${secondaryWeight.toFixed(2)}g)`,
          quantity: parseFloat(secondaryWeight.toFixed(2)),
          unit: 'gram',
          ratePerUnit: parseFloat(secondaryRate.ratePerGramLocal.toFixed(2)),
          amount: parseFloat(secondaryCost.toFixed(2)),
          currency,
        });

        // Add multi-metal warning
        warnings.push({
          code: 'MULTI_METAL_CONSTRUCTION',
          message: `Multi-metal construction (${pattern}). Not solid gold unless 100% gold is selected.`,
          severity: 'info',
        });
        break;
      }
    }

    return { lineItems, warnings, ratesUpdatedAt };
  }

  /**
   * Calculate finish costs
   */
  private async calculateFinishCost(
    request: EstimateRequest,
    country: SupportedCountry,
    currency: SupportedCurrency,
    shopId?: string,
  ): Promise<{
    lineItems: EstimateLineItem[];
    warnings: EstimateWarning[];
  }> {
    const lineItems: EstimateLineItem[] = [];
    const warnings: EstimateWarning[] = [];

    // Check Method C specific finish
    const finish = request.methodC?.finish || request.finish;
    
    if (!finish) {
      return { lineItems, warnings };
    }

    // Validate vermeil on sterling silver
    if (request.buildMethod === BuildMethod.METHOD_C && request.methodC?.coreMetal) {
      const validation = this.finishPricingService.validateVermeil(
        finish.finishType,
        request.methodC.coreMetal,
      );
      
      if (!validation.valid) {
        warnings.push({
          code: 'INVALID_VERMEIL',
          message: validation.message!,
          severity: 'error',
        });
        return { lineItems, warnings };
      }
    }

    const finishPrice = await this.finishPricingService.getFinishPrice(
      finish.finishType,
      finish.tier,
      country,
      shopId,
    );

    const description = this.finishPricingService.getFinishDescription(
      finish.finishType,
      finish.tier,
    );

    lineItems.push({
      category: 'FINISH',
      description,
      quantity: 1,
      unit: 'piece',
      ratePerUnit: finishPrice.flatFeeLocal,
      amount: finishPrice.flatFeeLocal,
      currency,
    });

    return { lineItems, warnings };
  }

  /**
   * Calculate gemstone costs
   */
  private async calculateGemstoneCost(
    request: EstimateRequest,
    country: SupportedCountry,
    currency: SupportedCurrency,
    shopId?: string,
  ): Promise<{
    lineItems: EstimateLineItem[];
    warnings: EstimateWarning[];
  }> {
    const lineItems: EstimateLineItem[] = [];
    const warnings: EstimateWarning[] = [];

    if (!request.gemstones || request.gemstones.length === 0) {
      return { lineItems, warnings };
    }

    const result = await this.gemstonePricingService.calculateTotalGemstoneCost(
      request.gemstones.map(g => ({
        stoneType: g.stoneType,
        sizeMm: g.sizeMm,
        caratWeight: g.caratWeight,
        qualityTier: g.qualityTier,
        settingType: g.settingType,
        count: g.count,
        origin: g.origin,
      })),
      country,
      shopId,
    );

    // Convert breakdown to line items
    for (const item of result.breakdown) {
      const category = item.description.includes('setting') ? 'SETTING' : 'GEMSTONE';
      
      lineItems.push({
        category,
        description: item.description,
        quantity: item.quantity,
        unit: 'piece',
        ratePerUnit: item.unitPrice,
        amount: item.total,
        currency,
      });
    }

    return { lineItems, warnings };
  }

  /**
   * Get estimate summary (quick preview without full breakdown)
   */
  async getQuickEstimate(
    buildMethod: BuildMethod,
    totalWeightG: number,
    metal: string,
    country: SupportedCountry,
  ): Promise<{ minEstimate: number; maxEstimate: number; currency: SupportedCurrency }> {
    // Use country's default currency for quick estimates
    const currency: SupportedCurrency = COUNTRY_DEFAULT_CURRENCY[country];
    
    // Get market rate for the metal
    const marketRates = await this.marketRatesService.getMarketRates(currency, country as MarketRegion);
    const metalKey = metal.toUpperCase().replace(' ', '_') as keyof typeof marketRates.metals;
    const ratePerGram = marketRates.metals[metalKey] || 0;

    const baseCost = ratePerGram * totalWeightG;
    
    // Estimate range with 10-20% variation for making charges etc.
    const minEstimate = baseCost * 1.05; // 5% making charge
    const maxEstimate = baseCost * 1.25; // 25% with finishing etc.

    return {
      minEstimate: parseFloat(minEstimate.toFixed(2)),
      maxEstimate: parseFloat(maxEstimate.toFixed(2)),
      currency,
    };
  }
}
