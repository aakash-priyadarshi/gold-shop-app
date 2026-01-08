/**
 * Pricing DTOs
 * Data Transfer Objects for pricing endpoints
 */
import { IsString, IsNumber, IsOptional, IsEnum, IsArray, ValidateNested, IsBoolean, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import {
  SupportedCountry,
  SupportedCurrency,
  BuildMethod,
  MaterialCode,
  FinishType,
  FinishTier,
  StoneType,
  DiamondOrigin,
  QualityTier,
  SettingType,
} from '../types';

// ═══════════════════════════════════════════
// Method Detail DTOs
// ═══════════════════════════════════════════

export class MethodADetailsDto {
  @IsString()
  metal: string; // e.g., GOLD_24K, GOLD_22K, SILVER_999

  @IsNumber()
  @Min(0.1)
  totalWeightG: number;
}

export class MethodBDetailsDto {
  @IsString()
  alloy: string; // e.g., BRASS, BRONZE

  @IsNumber()
  @Min(0.1)
  totalWeightG: number;
}

export class EstimateFinishDto {
  @IsEnum(FinishType)
  finishType: FinishType;

  @IsEnum(FinishTier)
  tier: FinishTier;
}

export class MethodCDetailsDto {
  @IsEnum(MaterialCode)
  coreMetal: MaterialCode;

  @IsNumber()
  @Min(0.1)
  totalWeightG: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => EstimateFinishDto)
  finish?: EstimateFinishDto;
}

export class MethodDDetailsDto {
  @IsString()
  primaryMetal: string; // Precious metal

  @IsEnum(MaterialCode)
  secondaryMetal: MaterialCode;

  @IsNumber()
  @Min(0.1)
  totalWeightG: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  primaryWeightG?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  primaryPercentage?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  secondaryWeightG?: number;

  @IsString()
  pattern: 'TOP_PLATE' | 'INLAY' | 'OUTER_SLEEVE' | 'TWO_TONE_SPLIT';
}

// ═══════════════════════════════════════════
// Gemstone DTO
// ═══════════════════════════════════════════

export class EstimateGemstoneDto {
  @IsEnum(StoneType)
  stoneType: StoneType;

  @IsOptional()
  @IsEnum(DiamondOrigin)
  origin?: DiamondOrigin;

  @IsOptional()
  @IsNumber()
  @Min(0.5)
  sizeMm?: number;

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  caratWeight?: number;

  @IsEnum(QualityTier)
  qualityTier: QualityTier;

  @IsEnum(SettingType)
  settingType: SettingType;

  @IsNumber()
  @Min(1)
  count: number;
}

// ═══════════════════════════════════════════
// Main Estimate DTO
// ═══════════════════════════════════════════

export class PricingEstimateDto {
  @IsEnum(['IN', 'NP', 'AE', 'UK', 'EU', 'US'])
  country: SupportedCountry;

  @IsEnum(['INR', 'NPR', 'AED', 'USD', 'GBP', 'EUR'])
  currency: SupportedCurrency;

  @IsOptional()
  @IsString()
  jewelleryType?: string;

  @IsEnum(BuildMethod)
  buildMethod: BuildMethod;

  @IsOptional()
  @IsNumber()
  @Min(0.1)
  totalWeightG?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => MethodADetailsDto)
  methodA?: MethodADetailsDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => MethodBDetailsDto)
  methodB?: MethodBDetailsDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => MethodCDetailsDto)
  methodC?: MethodCDetailsDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => MethodDDetailsDto)
  methodD?: MethodDDetailsDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => EstimateFinishDto)
  finish?: EstimateFinishDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EstimateGemstoneDto)
  gemstones?: EstimateGemstoneDto[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(50)
  makingChargePct?: number;

  @IsOptional()
  @IsString()
  shopId?: string;
}

// ═══════════════════════════════════════════
// Query DTOs
// ═══════════════════════════════════════════

export class GetRatesQueryDto {
  @IsOptional()
  @IsEnum(['IN', 'NP', 'AE', 'UK', 'EU', 'US'])
  country?: SupportedCountry;
}
