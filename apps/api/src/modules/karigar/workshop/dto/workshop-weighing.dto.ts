import { Type } from "class-transformer";
import {
  Equals,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";

const GRAM_STRING = /^\d+(\.\d{1,6})?$/;

export class WorkshopScaleReadingInputDto {
  @IsString()
  @Matches(GRAM_STRING, {
    message: "weightGrams must be a positive decimal gram string",
  })
  weightGrams: string;

  @Equals("g")
  unit: "g";

  @IsBoolean()
  stable: boolean;

  @IsInt()
  @Min(1)
  sequence: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  rawFrame?: string;

  @IsOptional()
  @IsString()
  readingAt?: string;
}

export class CreateWeighingSessionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  treeId: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  jobId?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  deviceId: string;
}

export class CaptureWeighingSessionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  deviceId: string;

  @ValidateNested()
  @Type(() => WorkshopScaleReadingInputDto)
  reading: WorkshopScaleReadingInputDto;
}

/** Confirm posts the already-captured reading. Must not include a weight. */
export class ConfirmWeighingSessionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  readingId: string;

  @IsOptional()
  @IsString()
  @MaxLength(191)
  idempotencyKey?: string;
}

export class UpdateWorkshopLedgerVersionDto {
  @IsIn(["LEGACY", "TRACEABLE"])
  workshopLedgerVersion: "LEGACY" | "TRACEABLE";
}
