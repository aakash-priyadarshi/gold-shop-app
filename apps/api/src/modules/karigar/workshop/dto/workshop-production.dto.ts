import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Matches, MaxLength, Min } from "class-validator";

export class CreateWorkshopChildDto {
  @IsString() @IsNotEmpty() treeId: string;
  @IsOptional() @IsString() treeLineId?: string;
  @IsIn(["DESIGN_GROUP", "ORDER_GROUP", "PIECE"]) kind: "DESIGN_GROUP" | "ORDER_GROUP" | "PIECE";
  @IsString() @IsNotEmpty() @MaxLength(120) label: string;
  @IsInt() @Min(1) quantity: number;
}

export class StartWorkshopProcessDto {
  @IsString() @IsNotEmpty() treeId: string;
  @IsString() @IsNotEmpty() definitionId: string;
  @IsOptional() @IsString() routeStepId?: string;
  @IsOptional() @IsString() batchChildId?: string;
  @IsOptional() @IsString() workstationId?: string;
  @IsOptional() @IsString() department?: string;
  @IsOptional() @IsString() recipeId?: string;
  @IsOptional() @IsString() @Matches(/^\d+(\.\d{1,6})?$/) targetWeightGrams?: string;
  @IsOptional() @IsString() @MaxLength(1000) notes?: string;
}

export class ClassifyWorkshopVarianceDto {
  @IsString() @IsNotEmpty() materialKey: string;
  @IsString() @IsNotEmpty() @MaxLength(1000) reason: string;
}

export class CompleteWorkshopRunDto {
  @IsOptional() @IsString() @MaxLength(1000) notes?: string;
}

export class InspectTraceableQcDto {
  @IsIn(["APPROVED", "REWORK", "REJECTED"]) decision: "APPROVED" | "REWORK" | "REJECTED";
  @IsOptional() @IsString() @MaxLength(1000) reason?: string;
  @IsOptional() @IsString() @MaxLength(2000) notes?: string;
}
