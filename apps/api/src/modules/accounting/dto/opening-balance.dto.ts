import { CurrencyCode } from "@prisma/client";
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from "class-validator";

export class OpeningBalanceDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  cashAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  bankAmount?: number;

  @IsOptional()
  @IsEnum(CurrencyCode)
  transactionCurrency?: CurrencyCode;

  /** As-of date (YYYY-MM-DD). Used as the idempotent opening-balance reference. */
  @IsDateString()
  asOfDate!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
