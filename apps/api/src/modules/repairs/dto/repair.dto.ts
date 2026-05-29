import {
  IsEnum,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  Min,
} from "class-validator";

export enum RepairStatusDto {
  RECEIVED = "RECEIVED",
  DIAGNOSING = "DIAGNOSING",
  IN_REPAIR = "IN_REPAIR",
  READY = "READY",
  DELIVERED = "DELIVERED",
}

export class CreateRepairDto {
  /** Client-generated UUID for offline idempotency (PWA / native app). */
  @IsOptional()
  @IsString()
  @MaxLength(64)
  clientId?: string;

  @IsString()
  @MaxLength(200)
  customerName: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  customerPhone?: string;

  @IsString()
  @MaxLength(500)
  itemDescription: string;

  @IsString()
  @MaxLength(1000)
  issueDescription: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  estimatedCost?: number;

  @IsOptional()
  @IsISO8601()
  expectedReadyDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @IsOptional()
  @IsEnum(RepairStatusDto)
  status?: RepairStatusDto;
}

export class UpdateRepairStatusDto {
  /** Accepted for offline-replay parity; status updates are naturally idempotent. */
  @IsOptional()
  @IsString()
  @MaxLength(64)
  clientId?: string;

  @IsEnum(RepairStatusDto)
  status: RepairStatusDto;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  finalCost?: number;
}
