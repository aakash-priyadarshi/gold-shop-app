import { IsIn, IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from "class-validator";

const GRAMS = /^\d+(\.\d{1,6})?$/;

export class WorkshopManualMovementDto {
  @IsString() @IsNotEmpty() materialKey: string;
  @IsIn(["VAULT", "WIP", "PROCESS", "REUSABLE", "SCRAP", "RECOVERY_PENDING", "REFINERY", "FINISHED"])
  sourceBucket: "VAULT" | "WIP" | "PROCESS" | "REUSABLE" | "SCRAP" | "RECOVERY_PENDING" | "REFINERY" | "FINISHED";
  @IsIn(["VAULT", "WIP", "PROCESS", "REUSABLE", "SCRAP", "RECOVERY_PENDING", "REFINERY", "FINISHED"])
  destinationBucket: "VAULT" | "WIP" | "PROCESS" | "REUSABLE" | "SCRAP" | "RECOVERY_PENDING" | "REFINERY" | "FINISHED";
  @IsOptional() @IsString() sourceScopeId?: string;
  @IsOptional() @IsString() destinationScopeId?: string;
  @IsOptional() @IsString() jobId?: string;
  @IsOptional() @IsString() treeId?: string;
  @IsOptional() @IsString() processRunId?: string;
  @IsString() @Matches(GRAMS) weightGrams: string;
  @IsString() @IsNotEmpty() @MaxLength(1000) reason: string;
  @IsString() @IsNotEmpty() @MaxLength(191) idempotencyKey: string;
}

export class CorrectWorkshopJournalDto {
  @IsOptional() @IsString() @Matches(GRAMS) replacementWeightGrams?: string;
  @IsString() @IsNotEmpty() @MaxLength(1000) reason: string;
  @IsString() @IsNotEmpty() @MaxLength(191) idempotencyKey: string;
}

export class WorkshopMaterialOpeningDto {
  @IsString() @IsNotEmpty() materialKey: string;
  @IsString() @Matches(GRAMS) weightGrams: string;
  @IsString() @IsNotEmpty() @MaxLength(500) source: string;
  @IsString() @IsNotEmpty() @MaxLength(1000) reason: string;
  @IsString() @IsNotEmpty() @MaxLength(191) idempotencyKey: string;
}
