import { Type } from "class-transformer";
import {
  IsArray,
  IsIn,
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";

export class KarigarPaymentAllocationDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  jobId: string;

  @IsNumber()
  @Min(0.01)
  amount: number;
}

export class RecordKarigarPaymentDto {
  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsOptional()
  @IsString()
  @IsIn([
    "CASH",
    "BANK_TRANSFER",
    "UPI",
    "ESEWA",
    "KHALTI",
    "CONNECTIPS",
    "CHEQUE",
    "OTHER",
  ])
  paymentMethod?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  reference?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;

  @IsOptional()
  @IsString()
  @MaxLength(191)
  idempotencyKey?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => KarigarPaymentAllocationDto)
  allocations?: KarigarPaymentAllocationDto[];
}

export class RecordKarigarAdvanceDto {
  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsOptional()
  @IsString()
  @IsIn([
    "CASH",
    "BANK_TRANSFER",
    "UPI",
    "ESEWA",
    "KHALTI",
    "CONNECTIPS",
    "CHEQUE",
    "OTHER",
  ])
  paymentMethod?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  reference?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;

  @IsOptional()
  @IsString()
  @MaxLength(191)
  idempotencyKey?: string;
}

export class RecordKarigarAdjustmentDto {
  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsString()
  @IsIn(["ADJUSTMENT_INCREASE", "ADJUSTMENT_DECREASE"])
  type: "ADJUSTMENT_INCREASE" | "ADJUSTMENT_DECREASE";

  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  note: string;

  @IsOptional()
  @IsString()
  @MaxLength(191)
  idempotencyKey?: string;
}

export class RecordKarigarMetalReturnDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  metalKey: string;

  @IsNumber()
  @Min(0.001)
  weightGrams: number;

  @IsString()
  @IsIn(["RETURN_UNUSED", "RETURN_SPRUE", "SCRAP", "DUST"])
  type: "RETURN_UNUSED" | "RETURN_SPRUE" | "SCRAP" | "DUST";

  @IsOptional()
  @IsString()
  @MaxLength(64)
  jobId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(400)
  note?: string;

  @IsOptional()
  @IsString()
  @MaxLength(191)
  idempotencyKey?: string;
}

export class KarigarStatementQueryDto {
  @IsOptional()
  @IsISO8601()
  from?: string;

  @IsOptional()
  @IsISO8601()
  to?: string;

  @IsOptional()
  @IsString()
  @IsIn([
    "ALL",
    "METAL",
    "MONEY",
    "WAGES",
    "PAYMENTS",
    "ADVANCES",
    "ADJUSTMENTS",
    "WAGE",
    "PAYMENT",
    "ADVANCE",
    "ADJUSTMENT",
  ])
  type?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  jobId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(250)
  limit?: number;

  @IsOptional()
  @IsString()
  cursor?: string;
}
