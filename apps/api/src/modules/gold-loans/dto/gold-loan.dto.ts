import {
  IsArray,
  IsEnum,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { CurrencyCode } from "@prisma/client";

export enum GoldLoanStatusDto {
  ACTIVE = "ACTIVE",
  REDEEMED = "REDEEMED",
  DEFAULTED = "DEFAULTED",
}

export class PawnedItemDto {
  @IsString()
  @MaxLength(200)
  name: string;

  @IsString()
  @MaxLength(20)
  purity: string; // 24K | 22K | 18K | 14K | SILVER

  @IsNumber()
  @Min(0)
  grossWeight: number;

  @IsNumber()
  @Min(0)
  netWeight: number;
}

export class CreateGoldLoanDto {
  /** Client-generated UUID for offline idempotency (PWA / native app). */
  @IsOptional()
  @IsString()
  @MaxLength(64)
  clientId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  loanNumber?: string;

  @IsString()
  @MaxLength(200)
  customerName: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  customerPhone?: string;

  @IsNumber()
  @Min(0)
  principal: number;

  @IsNumber()
  @Min(0)
  interestRate: number;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  rateType?: string; // MONTHLY | ANNUAL

  @IsOptional()
  @IsString()
  @MaxLength(20)
  interestType?: string; // SIMPLE | COMPOUND

  @IsOptional()
  @IsString()
  @MaxLength(20)
  compoundFrequency?: string; // MONTHLY | QUARTERLY | ANNUALLY

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PawnedItemDto)
  pawnedItems: PawnedItemDto[];

  @IsOptional()
  @IsEnum(CurrencyCode)
  currency?: CurrencyCode;

  @IsOptional()
  @IsISO8601()
  loanDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class UpdateGoldLoanStatusDto {
  /** Declared for offline-replay parity (outbox injects clientId on every op). */
  @IsOptional()
  @IsString()
  @MaxLength(64)
  clientId?: string;

  @IsEnum(GoldLoanStatusDto)
  status: GoldLoanStatusDto;

  @IsOptional()
  @IsISO8601()
  redeemedDate?: string;
}
