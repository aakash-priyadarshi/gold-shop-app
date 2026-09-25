import { Type } from "class-transformer";
import {
  ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsIn, IsNotEmpty,
  IsObject, IsOptional, IsString, Matches, MaxLength, ValidateNested,
} from "class-validator";

const FRACTION = /^(0(\.\d{1,6})?|1(\.0{1,6})?)$/;
const GRAMS = /^\d+(\.\d{1,6})?$/;

export class CreateWorkshopMaterialDto {
  @IsString() @Matches(/^[A-Za-z][A-Za-z0-9_-]{1,79}$/) key: string;
  @IsString() @IsNotEmpty() @MaxLength(120) name: string;
  @IsIn(["GOLD", "ALLOY", "SOLDER", "MIXED", "RECOVERED", "REFINERY", "DIAMOND", "STONE", "OTHER"])
  kind: string;
  @IsIn(["GOLD", "STONE"]) scalePurpose: "GOLD" | "STONE";
  @IsOptional() @IsString() @Matches(FRACTION) theoreticalPurity?: string;
  @IsOptional() @IsObject() composition?: Record<string, string>;
}

export class RecipeComponentDto {
  @IsString() @Matches(/^[A-Za-z][A-Za-z0-9_-]{1,79}$/) materialKey: string;
  @IsString() @Matches(FRACTION) fraction: string;
}

export class CreateWorkshopRecipeDto {
  @IsString() @IsNotEmpty() @MaxLength(100) name: string;
  @IsString() @Matches(FRACTION) targetFineGoldFraction: string;
  @IsString() @Matches(FRACTION) alloyFineGoldFraction: string;
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(20) @ValidateNested({ each: true }) @Type(() => RecipeComponentDto)
  components: RecipeComponentDto[];
}

export class RecommendWorkshopRecipeDto {
  @IsString() @Matches(GRAMS) targetWeightGrams: string;
}

export class CreateWorkshopDeviceDto {
  @IsString() @IsNotEmpty() @MaxLength(100) name: string;
  @IsIn(["GOLD", "STONE"]) purpose: "GOLD" | "STONE";
  @IsIn(["SERIAL", "TCP"]) adapterKind: "SERIAL" | "TCP";
  @IsObject() profile: Record<string, unknown>;
}

export class CreateWorkshopProcessDto {
  @IsString() @IsNotEmpty() @MaxLength(100) name: string;
  @IsOptional() @IsString() @MaxLength(100) department?: string;
}

export class CreateWorkshopRouteDto {
  @IsString() @IsNotEmpty() @MaxLength(100) name: string;
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(50) @IsString({ each: true })
  definitionIds: string[];
}

export class CreateWorkshopWorkstationDto {
  @IsString() @IsNotEmpty() @MaxLength(100) name: string;
  @IsOptional() @IsString() @MaxLength(100) department?: string;
  @IsOptional() @IsString() definitionId?: string;
}

export class CreateWorkshopToleranceDto {
  @IsString() @IsNotEmpty() @MaxLength(40) movementKind: string;
  @IsOptional() @IsString() @MaxLength(80) materialKey?: string;
  @IsOptional() @IsString() @MaxLength(80) definitionId?: string;
  @IsOptional() @IsIn(["REQUIRE_CLASSIFICATION", "ACCEPT_WITHIN_TOLERANCE"]) policy?: "REQUIRE_CLASSIFICATION" | "ACCEPT_WITHIN_TOLERANCE";
  @IsIn(["GOLD", "STONE"]) scalePurpose: "GOLD" | "STONE";
  @IsString() @Matches(GRAMS) maxDifferenceGrams: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class RouteJobDto {
  @IsString() @IsNotEmpty() templateId: string;
}

export class RouteStepChangeDto {
  @IsIn(["SKIP", "REPEAT", "REWORK", "ADD"]) action: "SKIP" | "REPEAT" | "REWORK" | "ADD";
  @IsOptional() @IsString() definitionId?: string;
  @IsString() @IsNotEmpty() @MaxLength(1000) reason: string;
}
