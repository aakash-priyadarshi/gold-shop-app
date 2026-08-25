import { Type } from "class-transformer";
import {
  IsArray,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
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
  @MaxLength(40)
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
  @MaxLength(120)
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
  @MaxLength(40)
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
  @MaxLength(120)
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
  @MaxLength(120)
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
}

export class KarigarStatementQueryDto {
  @IsOptional()
  @IsString()
  from?: string;

  @IsOptional()
  @IsString()
  to?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  type?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  jobId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number;

  @IsOptional()
  @IsString()
  cursor?: string;
}
