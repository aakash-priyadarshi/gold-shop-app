import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
} from "class-validator";

enum MarketRegionDto {
  NP = "NP",
  IN = "IN",
  AE = "AE",
  UK = "UK",
  EU = "EU",
  US = "US",
}

export class SubscribeDto {
  @IsString()
  shopId: string;

  @IsString()
  planId: string;

  @IsEnum(MarketRegionDto)
  country: string;

  @IsOptional()
  @IsString()
  billingCycle?: "monthly" | "annual";

  @IsOptional()
  @IsString()
  stripePaymentMethodId?: string;
}

export class CancelSubscriptionDto {
  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsBoolean()
  immediate?: boolean; // default: cancel at period end
}

export class AdminOverrideDto {
  @IsString()
  shopId: string;

  @IsString()
  planId: string;

  @IsOptional()
  @IsDateString()
  periodEnd?: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
