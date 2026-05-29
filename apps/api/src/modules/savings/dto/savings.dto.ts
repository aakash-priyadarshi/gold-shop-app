import {
  IsEnum,
  IsISO8601,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from "class-validator";

export enum SavingsSchemeTypeDto {
  DAILY = "DAILY",
  WEEKLY = "WEEKLY",
  MONTHLY = "MONTHLY",
}

export enum SavingsMemberStatusDto {
  ACTIVE = "ACTIVE",
  MATURED = "MATURED",
  REDEEMED = "REDEEMED",
  CANCELLED = "CANCELLED",
}

export class EnrollSavingsMemberDto {
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

  @IsEnum(SavingsSchemeTypeDto)
  schemeType: SavingsSchemeTypeDto;

  @IsNumber()
  @Min(0)
  installmentAmount: number;

  @IsInt()
  @Min(1)
  totalInstallments: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  bonusInstallments?: number;

  @IsOptional()
  @IsString()
  @MaxLength(8)
  currency?: string;

  @IsOptional()
  @IsISO8601()
  startDate?: string;
}

export class RecordSavingsPaymentDto {
  /** Client-generated UUID for offline idempotency (PWA / native app). */
  @IsOptional()
  @IsString()
  @MaxLength(64)
  clientId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;
}
