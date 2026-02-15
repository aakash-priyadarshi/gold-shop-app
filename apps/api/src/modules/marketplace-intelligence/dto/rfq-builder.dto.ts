import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class AiRfqBuilderDto {
  @IsString()
  description: string; // Natural language: "I want a gold ring with ruby"

  @IsOptional()
  @IsString()
  budgetHint?: string; // "around 50k" or "50000-80000"

  @IsOptional()
  @IsString()
  occasion?: string; // "wedding", "engagement", "gift", "daily wear"

  @IsOptional()
  @IsString()
  preferredMetal?: string; // "gold", "silver", "platinum"

  @IsOptional()
  @IsString()
  marketRegion?: string; // "NP", "IN", "AE", etc.
}

export class AiRfqBuilderResponse {
  jewelleryType: string;
  buildMethod: string;
  composition: Record<string, any>;
  weightCategory?: string;
  estimatedWeight?: number;
  surfaceFinish?: string;
  budgetMinNpr?: number;
  budgetMaxNpr?: number;
  specialInstructions?: string;
  gemstones?: Array<{
    stoneType: string;
    shape: string;
    count: number;
    settingStyle?: string;
  }>;
  confidence: number; // 0-100
  reasoning: string; // Why the AI chose these specs
  suggestions: string[]; // Additional tips
}

export class FeasibilityCheckDto {
  @IsString()
  jewelleryType: string;

  @IsString()
  buildMethod: string;

  @IsOptional()
  composition?: Record<string, any>;

  @IsOptional()
  @IsNumber()
  @Min(0)
  targetWeightG?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  budgetNpr?: number;

  @IsOptional()
  @IsString()
  marketRegion?: string;
}

export class FeasibilityResponse {
  feasible: boolean;
  score: number; // 0-100
  breakdown: {
    metalCostEstimate: number;
    makingChargeEstimate: number;
    gemstoneCostEstimate: number;
    taxEstimate: number;
    totalEstimate: number;
  };
  issues: string[]; // "Budget too low for 22K gold ring at this weight"
  suggestions: string[]; // "Consider 18K gold to save ~15%"
  marketContext?: string; // "Average price for similar items: NPR 45,000-60,000"
}

export class RecordLossReasonDto {
  @IsString()
  offerId: string;

  @IsString()
  category: string; // PRICE_TOO_HIGH, SLOW_DELIVERY, LOW_TRUST, BETTER_OFFER, OTHER

  @IsOptional()
  @IsString()
  note?: string;
}

export class ReviewAnomalyDto {
  @IsString()
  anomalyId: string;

  @IsOptional()
  @IsString()
  note?: string;
}
