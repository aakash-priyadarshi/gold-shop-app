import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
} from "class-validator";

enum MarketRegionDto {
  NP = "NP",
  IN = "IN",
  AE = "AE",
  UK = "UK",
  EU = "EU",
  US = "US",
}

enum CurrencyCodeDto {
  NPR = "NPR",
  INR = "INR",
  AED = "AED",
  USD = "USD",
  GBP = "GBP",
  EUR = "EUR",
}

enum OverageBehaviorDto {
  BLOCK = "BLOCK",
  AUTO_CHARGE = "AUTO_CHARGE",
}

export class CreatePlanDto {
  @IsString()
  name: string;

  @IsString()
  displayName: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(MarketRegionDto)
  country: string;

  @IsEnum(CurrencyCodeDto)
  currency: string;

  @IsNumber()
  @Min(0)
  monthlyPrice: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  annualPrice?: number;

  // ─── Resource Limits (null / omit = unlimited) ──────────────────────
  @IsOptional()
  @IsInt()
  @Min(0)
  maxProducts?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxInvoicesPerMonth?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxCatalogues?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  catalogueLimit?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxOrdersPerMonth?: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  commissionPercent: number;

  @IsBoolean()
  includesAi: boolean;

  @IsInt()
  @Min(0)
  monthlyAiCredits: number;

  @IsInt()
  @Min(0)
  rolloverCap: number;

  @IsNumber()
  @Min(0)
  extraCreditPrice: number;

  @IsOptional()
  @IsEnum(OverageBehaviorDto)
  overageBehavior?: string;

  @IsOptional()
  @IsObject()
  features?: Record<string, unknown>;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsString()
  badgeText?: string;

  @IsOptional()
  @IsString()
  buttonColor?: string;
}

export class UpdatePlanDto {
  @IsOptional()
  @IsString()
  displayName?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  monthlyPrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  annualPrice?: number;

  // ─── Resource Limits (null / omit = unlimited) ──────────────────────
  @IsOptional()
  @IsInt()
  @Min(0)
  maxProducts?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxInvoicesPerMonth?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxCatalogues?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  catalogueLimit?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxOrdersPerMonth?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  commissionPercent?: number;

  @IsOptional()
  @IsBoolean()
  includesAi?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  monthlyAiCredits?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  rolloverCap?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  extraCreditPrice?: number;

  @IsOptional()
  @IsEnum(OverageBehaviorDto)
  overageBehavior?: string;

  @IsOptional()
  @IsObject()
  features?: Record<string, unknown>;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsString()
  badgeText?: string;

  @IsOptional()
  @IsString()
  buttonColor?: string;

  @IsOptional()
  @IsString()
  successorPlanId?: string;
}

export class DisablePlanWithSuccessorDto {
  @IsString()
  successorPlanId: string;
}

export class MigrationResponseDto {
  @IsBoolean()
  accept: boolean;
}
