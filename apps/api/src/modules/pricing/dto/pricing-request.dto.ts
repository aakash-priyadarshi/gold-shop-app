/**
 * Pricing Request DTOs
 * 
 * These DTOs define the input structure for pricing calculations.
 * Key concept: marketCountry (determines taxes/adjustments) is separate from
 * displayCurrency (for presentation).
 */

import {
  IsString,
  IsNumber,
  IsEnum,
  IsArray,
  IsOptional,
  IsBoolean,
  IsUUID,
  ValidateNested,
  Min,
  Max,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ═══════════════════════════════════════════
// ENUMS
// ═══════════════════════════════════════════

export const SUPPORTED_COUNTRIES = ['IN', 'NP', 'AE', 'UK', 'EU', 'US'] as const;
export type SupportedCountry = typeof SUPPORTED_COUNTRIES[number];

export const SUPPORTED_CURRENCIES = ['INR', 'NPR', 'AED', 'USD', 'GBP', 'EUR'] as const;
export type SupportedCurrency = typeof SUPPORTED_CURRENCIES[number];

export const BUILD_METHODS = ['METHOD_A', 'METHOD_B', 'METHOD_C', 'METHOD_D'] as const;
export type BuildMethod = typeof BUILD_METHODS[number];

export const FINISH_TIERS = ['LIGHT', 'STANDARD', 'PREMIUM'] as const;
export type FinishTier = typeof FINISH_TIERS[number];

export const GEM_QUALITY_GRADES = ['A', 'B', 'C', 'BUDGET', 'STANDARD', 'PREMIUM'] as const;
export type GemQualityGrade = typeof GEM_QUALITY_GRADES[number];

export const GEM_ORIGINS = ['NATURAL', 'LAB'] as const;
export type GemOrigin = typeof GEM_ORIGINS[number];

// Metal codes (purity)
export const PRECIOUS_METAL_CODES = [
  // Gold
  'GOLD_24K', 'GOLD_22K', 'GOLD_18K', 'GOLD_14K', 'GOLD_10K',
  // Silver
  'SILVER_999', 'SILVER_925', 'SILVER_900',
  // Platinum
  'PLATINUM_PT950', 'PLATINUM_PT900',
  // Palladium
  'PALLADIUM_PD950',
] as const;

export const BASE_METAL_CODES = [
  'BRASS', 'BRONZE', 'COPPER', 'ZINC', 'STAINLESS_STEEL',
  'NICKEL', 'GERMAN_SILVER', 'PEWTER', 'TITANIUM', 'TUNGSTEN',
] as const;

export const ALL_METAL_CODES = [...PRECIOUS_METAL_CODES, ...BASE_METAL_CODES] as const;

export const FINISH_TYPES = [
  'GOLD_PLATING', 'ROSE_GOLD_PLATING', 'SILVER_PLATING',
  'RHODIUM_PLATING', 'VERMEIL', 'PVD_COATING', 'LACQUER',
  'OXIDIZED', 'MATTE', 'POLISHED',
] as const;

export const STONE_TYPES = [
  'DIAMOND_NATURAL', 'DIAMOND_LAB', 'MOISSANITE', 'CUBIC_ZIRCONIA',
  'RUBY', 'SAPPHIRE', 'EMERALD', 'PEARL', 'OPAL', 'AMETHYST',
  'TOPAZ', 'GARNET', 'PERIDOT', 'AQUAMARINE', 'TOURMALINE',
] as const;

export const SETTING_TYPES = [
  'PRONG', 'BEZEL', 'PAVE', 'CHANNEL', 'HALO', 'FLUSH', 'TENSION',
] as const;

// ═══════════════════════════════════════════
// SUB-DTOS
// ═══════════════════════════════════════════

export class GemstoneInputDto {
  @ApiProperty({
    enum: STONE_TYPES,
    description: 'Type of gemstone',
    example: 'DIAMOND_NATURAL',
  })
  @IsIn([...STONE_TYPES])
  stoneType: string;

  @ApiPropertyOptional({
    enum: GEM_ORIGINS,
    description: 'Natural or lab-created',
    example: 'NATURAL',
  })
  @IsOptional()
  @IsIn([...GEM_ORIGINS])
  origin?: GemOrigin;

  @ApiPropertyOptional({
    description: 'Size in millimeters (alternative to carat weight)',
    example: 5,
    minimum: 0.1,
    maximum: 100,
  })
  @IsOptional()
  @IsNumber()
  @Min(0.1)
  @Max(100)
  sizeMm?: number;

  @ApiPropertyOptional({
    description: 'Carat weight (alternative to size)',
    example: 1.5,
    minimum: 0.01,
    maximum: 100,
  })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  @Max(100)
  caratWeight?: number;

  @ApiProperty({
    enum: GEM_QUALITY_GRADES,
    description: 'Quality grade of the gemstone',
    example: 'A',
  })
  @IsIn([...GEM_QUALITY_GRADES])
  qualityGrade: GemQualityGrade;

  @ApiPropertyOptional({
    enum: SETTING_TYPES,
    description: 'Type of setting for the gemstone',
    example: 'PRONG',
  })
  @IsOptional()
  @IsIn([...SETTING_TYPES])
  settingType?: string;

  @ApiProperty({
    description: 'Number of this type of gemstone',
    example: 1,
    minimum: 1,
    maximum: 1000,
  })
  @IsNumber()
  @Min(1)
  @Max(1000)
  count: number;
}

// ═══════════════════════════════════════════
// MAIN DTO
// ═══════════════════════════════════════════

export class PricingRequestDto {
  // Market Context
  @ApiProperty({
    enum: SUPPORTED_COUNTRIES,
    description: 'Market country (determines tax rules and market adjustments)',
    example: 'IN',
  })
  @IsIn([...SUPPORTED_COUNTRIES])
  marketCountry: SupportedCountry;

  @ApiProperty({
    enum: SUPPORTED_CURRENCIES,
    description: 'Display currency for prices (independent of market)',
    example: 'INR',
  })
  @IsIn([...SUPPORTED_CURRENCIES])
  displayCurrency: SupportedCurrency;

  @ApiPropertyOptional({
    description: 'US state code for state tax calculations (required if marketCountry=US)',
    example: 'NY',
  })
  @IsOptional()
  @IsString()
  stateCode?: string;

  // Build Method
  @ApiProperty({
    enum: BUILD_METHODS,
    description: 'Construction method: METHOD_A=solid precious, METHOD_B=base metal, METHOD_C=core+finish, METHOD_D=multi-metal',
    example: 'METHOD_A',
  })
  @IsIn([...BUILD_METHODS])
  buildMethod: BuildMethod;

  @ApiPropertyOptional({
    description: 'Type of jewellery (ring, necklace, bracelet, etc.)',
    example: 'RING',
  })
  @IsOptional()
  @IsString()
  jewelleryType?: string;

  // Weight
  @ApiProperty({
    description: 'Total weight in grams',
    example: 10,
    minimum: 0.01,
    maximum: 10000,
  })
  @IsNumber()
  @Min(0.01)
  @Max(10000)
  totalWeightG: number;

  // Metal Details
  @ApiPropertyOptional({
    description: 'Primary metal code (required for METHOD_A and METHOD_D)',
    example: 'GOLD_22K',
  })
  @IsOptional()
  @IsIn([...ALL_METAL_CODES])
  primaryMetal?: string;

  @ApiPropertyOptional({
    description: 'Secondary metal code (required for METHOD_D)',
    example: 'BRASS',
  })
  @IsOptional()
  @IsIn([...ALL_METAL_CODES])
  secondaryMetal?: string;

  @ApiPropertyOptional({
    description: 'Weight of primary metal in grams (for METHOD_D)',
    example: 5,
    minimum: 0.01,
    maximum: 10000,
  })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  @Max(10000)
  primaryWeightG?: number;

  @ApiPropertyOptional({
    description: 'Weight of secondary metal in grams (for METHOD_D)',
    example: 5,
    minimum: 0.01,
    maximum: 10000,
  })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  @Max(10000)
  secondaryWeightG?: number;

  @ApiPropertyOptional({
    description: 'Core metal for METHOD_C (base metal beneath finish)',
    example: 'BRASS',
  })
  @IsOptional()
  @IsIn([...BASE_METAL_CODES])
  coreMetal?: string;

  // Finish/Plating
  @ApiPropertyOptional({
    description: 'Finish type (for METHOD_C or decorative finish)',
    example: 'GOLD_PLATING',
  })
  @IsOptional()
  @IsIn([...FINISH_TYPES])
  finishType?: string;

  @ApiPropertyOptional({
    enum: FINISH_TIERS,
    description: 'Finish tier/thickness',
    example: 'STANDARD',
  })
  @IsOptional()
  @IsIn([...FINISH_TIERS])
  finishTier?: FinishTier;

  // Gemstones
  @ApiPropertyOptional({
    type: [GemstoneInputDto],
    description: 'Array of gemstones to include',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GemstoneInputDto)
  gemstones?: GemstoneInputDto[];

  // Making Charges
  @ApiPropertyOptional({
    description: 'Making charge percentage (default: 3%)',
    example: 3,
    minimum: 0,
    maximum: 100,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  makingChargePct?: number;

  @ApiPropertyOptional({
    description: 'Fixed making charge in display currency (alternative to percentage)',
    example: 500,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  makingChargeFixed?: number;

  // Shop Context
  @ApiPropertyOptional({
    description: 'Shop ID for shop-specific pricing overrides',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  shopId?: string;

  // Compliance
  @ApiPropertyOptional({
    description: 'Flag indicating nickel-containing materials are compliant',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  nickelCompliantFlag?: boolean;
}

// ═══════════════════════════════════════════
// QUICK ESTIMATE DTOs
// ═══════════════════════════════════════════

export class QuickMetalEstimateDto {
  @ApiProperty({
    enum: SUPPORTED_COUNTRIES,
    description: 'Market country',
    example: 'NP',
  })
  @IsIn([...SUPPORTED_COUNTRIES])
  marketCountry: SupportedCountry;

  @ApiProperty({
    enum: SUPPORTED_CURRENCIES,
    description: 'Display currency',
    example: 'NPR',
  })
  @IsIn([...SUPPORTED_CURRENCIES])
  displayCurrency: SupportedCurrency;

  @ApiProperty({
    description: 'Metal purity code',
    example: 'GOLD_22K',
  })
  @IsIn([...PRECIOUS_METAL_CODES])
  metalCode: string;

  @ApiProperty({
    description: 'Weight in grams',
    example: 10,
    minimum: 0.01,
    maximum: 10000,
  })
  @IsNumber()
  @Min(0.01)
  @Max(10000)
  weightG: number;
}

// ═══════════════════════════════════════════
// CONFIG UPDATE DTOs
// ═══════════════════════════════════════════

export class UpdateShopOverrideDto {
  @ApiProperty({
    description: 'Shop ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  shopId: string;

  @ApiProperty({
    description: 'Override type (MAKING_CHARGE, METAL, GEMSTONE, FINISH)',
    example: 'MAKING_CHARGE',
  })
  @IsString()
  overrideType: string;

  @ApiProperty({
    description: 'Item code being overridden',
    example: 'GOLD_22K',
  })
  @IsString()
  itemCode: string;

  @ApiProperty({
    description: 'Override mode (FIXED, PERCENTAGE, MULTIPLIER)',
    example: 'PERCENTAGE',
  })
  @IsIn(['FIXED', 'PERCENTAGE', 'MULTIPLIER'])
  overrideMode: 'FIXED' | 'PERCENTAGE' | 'MULTIPLIER';

  @ApiProperty({
    description: 'Override value',
    example: 5,
  })
  @IsNumber()
  overrideValue: number;

  @ApiPropertyOptional({
    description: 'Whether override is active',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateMarketAdjustmentDto {
  @ApiProperty({
    enum: SUPPORTED_COUNTRIES,
    description: 'Market region',
    example: 'NP',
  })
  @IsIn([...SUPPORTED_COUNTRIES])
  marketRegion: SupportedCountry;

  @ApiProperty({
    description: 'Category for adjustment (ALL, PRECIOUS_METAL, BASE_METAL, etc.)',
    example: 'ALL',
  })
  @IsString()
  category: string;

  @ApiProperty({
    description: 'Adjustment type',
    example: 'PERCENTAGE',
  })
  @IsIn(['MULTIPLIER', 'PERCENTAGE', 'FIXED_ADDON'])
  adjustmentType: 'MULTIPLIER' | 'PERCENTAGE' | 'FIXED_ADDON';

  @ApiProperty({
    description: 'Adjustment value',
    example: 2,
  })
  @IsNumber()
  adjustmentValue: number;

  @ApiPropertyOptional({
    description: 'Description of the adjustment',
    example: 'Regional premium for Nepal market',
  })
  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateTaxRuleDto {
  @ApiProperty({
    enum: SUPPORTED_COUNTRIES,
    description: 'Market region',
    example: 'IN',
  })
  @IsIn([...SUPPORTED_COUNTRIES])
  marketRegion: SupportedCountry;

  @ApiProperty({
    description: 'Tax name',
    example: 'GST',
  })
  @IsString()
  taxName: string;

  @ApiProperty({
    description: 'Category (ALL, PRECIOUS_METAL, MAKING_CHARGE, GEMSTONE, FINISH)',
    example: 'ALL',
  })
  @IsIn(['ALL', 'PRECIOUS_METAL', 'MAKING_CHARGE', 'GEMSTONE', 'FINISH'])
  category: string;

  @ApiProperty({
    description: 'Tax rate (e.g., 0.03 for 3%)',
    example: 0.03,
    minimum: 0,
    maximum: 1,
  })
  @IsNumber()
  @Min(0)
  @Max(1)
  rate: number;

  @ApiPropertyOptional({
    description: 'State code (for US)',
    example: 'NY',
  })
  @IsOptional()
  @IsString()
  stateCode?: string;
}
