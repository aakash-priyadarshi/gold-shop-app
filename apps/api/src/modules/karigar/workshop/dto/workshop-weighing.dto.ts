import { Type } from "class-transformer";
import {
  Equals,
  IsBoolean,
  IsIn,
  IsInt,
  ArrayMaxSize,
  ArrayMinSize,
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
  @MaxLength(32)
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
  @MaxLength(64)
  readingAt?: string;

  /** Required for real devices: three or more recent, consistent native frames. */
  @IsOptional()
  @ArrayMinSize(3)
  @ArrayMaxSize(8)
  @ValidateNested({ each: true })
  @Type(() => WorkshopScaleSampleDto)
  samples?: WorkshopScaleSampleDto[];
}

export class WorkshopScaleSampleDto {
  @IsString() @IsNotEmpty() @MaxLength(500) rawFrame: string;
  @IsString() @MaxLength(64) readingAt: string;
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

export class WorkshopOpeningBalanceDto {
  @Equals("goldGrains995")
  materialKey: "goldGrains995";

  @IsString()
  @Matches(GRAM_STRING)
  @MaxLength(32)
  weightGrams: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  reason: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  source: string;

  @Equals(true)
  confirmedPhysicalGold995: true;

  @IsString()
  @IsNotEmpty()
  @MaxLength(191)
  idempotencyKey: string;
}
