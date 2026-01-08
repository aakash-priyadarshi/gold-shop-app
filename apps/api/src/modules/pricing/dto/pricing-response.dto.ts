/**
 * Pricing Response DTOs
 * 
 * These DTOs define the output structure for pricing calculations,
 * including line items, totals, and explainable breakdowns.
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SupportedCountry, SupportedCurrency } from './pricing-request.dto';

// ═══════════════════════════════════════════
// LINE ITEM TYPES
// ═══════════════════════════════════════════

export class PricingLineItemDto {
  @ApiProperty({
    description: 'Category of the line item',
    example: 'PRECIOUS_METAL',
    enum: ['PRECIOUS_METAL', 'BASE_METAL', 'GEMSTONE', 'FINISH', 'MAKING_CHARGE', 'TAX', 'PLATFORM_FEE'],
  })
  category: string;

  @ApiProperty({
    description: 'Code for the item',
    example: 'GOLD_22K',
  })
  code: string;

  @ApiProperty({
    description: 'Human-readable description',
    example: 'GOLD 22K (10.00g)',
  })
  description: string;

  @ApiPropertyOptional({
    description: 'Quantity',
    example: 10,
  })
  quantity?: number;

  @ApiPropertyOptional({
    description: 'Unit of measurement',
    example: 'gram',
  })
  unit?: string;

  @ApiPropertyOptional({
    description: 'Rate per unit in USD',
    example: 65.5,
  })
  ratePerUnit?: number;

  @ApiProperty({
    description: 'Amount in USD (internal reference)',
    example: 655,
  })
  amountUsd: number;

  @ApiProperty({
    description: 'Amount in display currency',
    example: 54732.5,
  })
  amountLocal: number;

  @ApiProperty({
    description: 'Currency code for amountLocal',
    example: 'INR',
  })
  currency: SupportedCurrency;

  @ApiPropertyOptional({
    description: 'Source of the price (API, DB, DEFAULT)',
    example: 'MetalpriceAPI',
  })
  source?: string;
}

// ═══════════════════════════════════════════
// WARNING TYPE
// ═══════════════════════════════════════════

export class PricingWarningDto {
  @ApiProperty({
    description: 'Warning code',
    example: 'METAL_RATE_NOT_FOUND',
  })
  code: string;

  @ApiProperty({
    description: 'Warning message',
    example: 'Rate not found for GOLD_22K, using estimate',
  })
  message: string;

  @ApiProperty({
    description: 'Severity level',
    example: 'warning',
    enum: ['info', 'warning', 'error'],
  })
  severity: 'info' | 'warning' | 'error';
}

// ═══════════════════════════════════════════
// EXPLANATION TYPES
// ═══════════════════════════════════════════

export class SpotPriceInfoDto {
  @ApiProperty({
    description: 'Metal code',
    example: 'GOLD',
  })
  metal: string;

  @ApiProperty({
    description: 'Spot price per troy ounce in USD',
    example: 2035.5,
  })
  spotPriceUsdOz: number;

  @ApiProperty({
    description: 'Price per gram in USD',
    example: 65.45,
  })
  pricePerGramUsd: number;

  @ApiProperty({
    description: 'Source of the price',
    example: 'MetalpriceAPI',
  })
  source: string;

  @ApiProperty({
    description: 'When the price was last updated',
    example: '2025-01-07T10:30:00Z',
  })
  updatedAt: string;
}

export class FxRateInfoDto {
  @ApiProperty({
    description: 'Currency pair',
    example: 'USD_INR',
  })
  pair: string;

  @ApiProperty({
    description: 'Exchange rate',
    example: 83.5,
  })
  rate: number;

  @ApiProperty({
    description: 'Source of the rate',
    example: 'Frankfurter',
  })
  source: string;

  @ApiProperty({
    description: 'When the rate was last updated',
    example: '2025-01-07T10:30:00Z',
  })
  updatedAt: string;
}

export class PurityMultiplierDto {
  @ApiProperty({
    description: 'Purity code',
    example: 'GOLD_22K',
  })
  code: string;

  @ApiProperty({
    description: 'Multiplier value (0-1)',
    example: 0.9167,
  })
  value: number;
}

export class WeightBreakdownDto {
  @ApiProperty({
    description: 'Primary metal weight in grams',
    example: 5,
  })
  primary: number;

  @ApiProperty({
    description: 'Secondary metal weight in grams',
    example: 5,
  })
  secondary: number;

  @ApiProperty({
    description: 'Total weight in grams',
    example: 10,
  })
  total: number;
}

export class MarketAdjustmentDto {
  @ApiProperty({
    description: 'Category affected',
    example: 'ALL',
  })
  category: string;

  @ApiProperty({
    description: 'Adjustment type',
    example: 'PERCENTAGE',
  })
  type: string;

  @ApiProperty({
    description: 'Adjustment value',
    example: 2,
  })
  value: number;

  @ApiProperty({
    description: 'Description of the adjustment',
    example: 'Regional premium for Nepal market',
  })
  description: string;
}

export class ShopOverrideDto {
  @ApiProperty({
    description: 'Override type',
    example: 'MAKING_CHARGE',
  })
  type: string;

  @ApiProperty({
    description: 'Item code',
    example: 'GOLD_22K',
  })
  itemCode: string;

  @ApiProperty({
    description: 'Override mode',
    example: 'PERCENTAGE',
  })
  mode: string;

  @ApiProperty({
    description: 'Override value',
    example: 5,
  })
  value: number;

  @ApiProperty({
    description: 'Description',
    example: 'Shop markup for GOLD_22K',
  })
  description: string;
}

export class TaxBreakdownItemDto {
  @ApiProperty({
    description: 'Category taxed',
    example: 'ALL',
  })
  category: string;

  @ApiProperty({
    description: 'Tax rate (decimal)',
    example: 0.03,
  })
  rate: number;

  @ApiProperty({
    description: 'Base amount before tax',
    example: 50000,
  })
  baseAmount: number;

  @ApiProperty({
    description: 'Tax amount calculated',
    example: 1500,
  })
  taxAmount: number;

  @ApiProperty({
    description: 'Description of the tax',
    example: 'GST (3%)',
  })
  description: string;
}

export class TaxCalculationResultDto {
  @ApiProperty({
    description: 'Market region',
    example: 'IN',
  })
  marketRegion: string;

  @ApiProperty({
    description: 'Tax type name',
    example: 'GST',
  })
  taxType: string;

  @ApiProperty({
    description: 'Display name for UI',
    example: 'GST',
  })
  displayName: string;

  @ApiProperty({
    type: [TaxBreakdownItemDto],
    description: 'Breakdown of taxes by category',
  })
  breakdown: TaxBreakdownItemDto[];

  @ApiProperty({
    description: 'Total tax amount',
    example: 1500,
  })
  totalTaxAmount: number;

  @ApiProperty({
    description: 'Effective tax rate across all categories',
    example: 0.03,
  })
  effectiveRate: number;

  @ApiPropertyOptional({
    description: 'State code (US only)',
    example: 'NY',
  })
  stateCode?: string;
}

export class PricingExplanationDto {
  @ApiProperty({
    type: [SpotPriceInfoDto],
    description: 'Spot prices used in calculation',
  })
  spotPrices: SpotPriceInfoDto[];

  @ApiProperty({
    type: FxRateInfoDto,
    description: 'FX rate used for conversion',
  })
  fxRate: FxRateInfoDto;

  @ApiPropertyOptional({
    type: PurityMultiplierDto,
    description: 'Purity multiplier applied',
  })
  purityMultiplier?: PurityMultiplierDto;

  @ApiPropertyOptional({
    type: WeightBreakdownDto,
    description: 'Weight breakdown by metal',
  })
  weightBreakdown?: WeightBreakdownDto;

  @ApiProperty({
    type: [MarketAdjustmentDto],
    description: 'Market adjustments applied',
  })
  marketAdjustments: MarketAdjustmentDto[];

  @ApiProperty({
    type: [ShopOverrideDto],
    description: 'Shop overrides applied',
  })
  shopOverrides: ShopOverrideDto[];

  @ApiProperty({
    type: TaxCalculationResultDto,
    description: 'Tax calculation details',
  })
  taxCalculation: TaxCalculationResultDto;

  @ApiProperty({
    description: 'Time taken for calculation in milliseconds',
    example: 45,
  })
  calculationTimeMs: number;

  @ApiProperty({
    description: 'Unique request ID for audit',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  requestId: string;
}

// ═══════════════════════════════════════════
// MAIN RESPONSE
// ═══════════════════════════════════════════

export class PricingResponseDto {
  // Request context
  @ApiProperty({
    description: 'Market country',
    example: 'IN',
  })
  marketCountry: SupportedCountry;

  @ApiProperty({
    description: 'Display currency',
    example: 'INR',
  })
  displayCurrency: SupportedCurrency;

  @ApiProperty({
    description: 'Build method used',
    example: 'METHOD_A',
  })
  buildMethod: string;

  // Line items
  @ApiProperty({
    type: [PricingLineItemDto],
    description: 'Detailed line items',
  })
  lineItems: PricingLineItemDto[];

  // Totals in USD (internal)
  @ApiProperty({
    description: 'Subtotal in USD (internal reference)',
    example: 655,
  })
  subtotalUsd: number;

  @ApiProperty({
    description: 'Making charge in USD',
    example: 19.65,
  })
  makingChargeUsd: number;

  @ApiProperty({
    description: 'Taxes in USD',
    example: 20.24,
  })
  taxesUsd: number;

  @ApiProperty({
    description: 'Platform fee in USD',
    example: 6.95,
  })
  platformFeeUsd: number;

  @ApiProperty({
    description: 'Total in USD',
    example: 701.84,
  })
  totalUsd: number;

  // Totals in display currency
  @ApiProperty({
    description: 'Subtotal in display currency',
    example: 54693,
  })
  subtotal: number;

  @ApiProperty({
    description: 'Making charge in display currency',
    example: 1641,
  })
  makingCharge: number;

  @ApiProperty({
    description: 'Taxes in display currency',
    example: 1690,
  })
  taxes: number;

  @ApiProperty({
    description: 'Platform fee in display currency',
    example: 580,
  })
  platformFee: number;

  @ApiProperty({
    description: 'Total in display currency',
    example: 58604,
  })
  total: number;

  // Metadata
  @ApiProperty({
    type: [PricingWarningDto],
    description: 'Warnings and informational messages',
  })
  warnings: PricingWarningDto[];

  @ApiProperty({
    type: PricingExplanationDto,
    description: 'Detailed explanation for auditability',
  })
  explanation: PricingExplanationDto;

  @ApiProperty({
    description: 'Legal disclaimer',
    example: 'Prices are estimates and may vary. Final price confirmed at checkout.',
  })
  disclaimer: string;

  @ApiProperty({
    description: 'Source of pricing (PLATFORM or SHOP)',
    example: 'PLATFORM',
    enum: ['PLATFORM', 'SHOP'],
  })
  source: 'PLATFORM' | 'SHOP';

  @ApiProperty({
    description: 'When rates were last updated',
    example: '2025-01-07T10:30:00Z',
  })
  ratesUpdatedAt: string;
}

// ═══════════════════════════════════════════
// QUICK ESTIMATE RESPONSE
// ═══════════════════════════════════════════

export class QuickMetalEstimateResponseDto {
  @ApiProperty({
    description: 'Metal code',
    example: 'GOLD_22K',
  })
  metalCode: string;

  @ApiProperty({
    description: 'Weight in grams',
    example: 10,
  })
  weightG: number;

  @ApiProperty({
    description: 'Current spot price per troy ounce in USD',
    example: 2035.5,
  })
  spotPriceUsdOz: number;

  @ApiProperty({
    description: 'Price per gram in USD (spot * purity)',
    example: 60.02,
  })
  pricePerGramUsd: number;

  @ApiProperty({
    description: 'Price per gram in display currency',
    example: 5011.67,
  })
  pricePerGramLocal: number;

  @ApiProperty({
    description: 'Subtotal before making charge and tax',
    example: 50117,
  })
  subtotal: number;

  @ApiProperty({
    description: 'Making charge (3%)',
    example: 1504,
  })
  makingCharge: number;

  @ApiProperty({
    description: 'Estimated tax',
    example: 1549,
  })
  tax: number;

  @ApiProperty({
    description: 'Estimated total',
    example: 53170,
  })
  total: number;

  @ApiProperty({
    description: 'Display currency',
    example: 'INR',
  })
  currency: SupportedCurrency;

  @ApiProperty({
    description: 'Purity multiplier applied',
    example: 0.9167,
  })
  purityMultiplier: number;

  @ApiProperty({
    description: 'Tax rate applied',
    example: 0.03,
  })
  taxRate: number;

  @ApiProperty({
    description: 'When rates were last updated',
    example: '2025-01-07T10:30:00Z',
  })
  updatedAt: string;
}

// ═══════════════════════════════════════════
// CONFIG RESPONSES
// ═══════════════════════════════════════════

export class PricingConfigResponseDto {
  @ApiProperty({
    description: 'Supported markets with their default currencies',
  })
  markets: {
    country: SupportedCountry;
    defaultCurrency: SupportedCurrency;
    taxType: string;
    taxRate: number;
  }[];

  @ApiProperty({
    description: 'Available currencies',
  })
  currencies: SupportedCurrency[];

  @ApiProperty({
    description: 'Available build methods',
  })
  buildMethods: {
    code: string;
    name: string;
    description: string;
  }[];

  @ApiProperty({
    description: 'Available precious metal purities',
  })
  preciousMetals: {
    code: string;
    metalType: string;
    purityName: string;
    multiplier: number;
  }[];

  @ApiProperty({
    description: 'Available base metals',
  })
  baseMetals: {
    code: string;
    name: string;
    isRestricted: boolean;
  }[];

  @ApiProperty({
    description: 'Available finish types',
  })
  finishTypes: {
    code: string;
    name: string;
    tiers: string[];
  }[];

  @ApiProperty({
    description: 'Available gemstone types',
  })
  gemstoneTypes: {
    code: string;
    name: string;
    availableGrades: string[];
    availableOrigins: string[];
  }[];
}

export class SpotRatesResponseDto {
  @ApiProperty({
    description: 'Precious metal spot rates',
  })
  preciousMetals: {
    metal: string;
    spotPriceUsdOz: number;
    pricePerGramUsd: number;
    updatedAt: string;
    source: string;
  }[];

  @ApiProperty({
    description: 'FX rates from USD',
  })
  fxRates: {
    currency: SupportedCurrency;
    rate: number;
    updatedAt: string;
    source: string;
  }[];

  @ApiProperty({
    description: 'Base metal prices',
  })
  baseMetals: {
    metal: string;
    pricePerGramUsd: number;
    source: string;
  }[];
}
