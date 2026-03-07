import { IsString, IsOptional, IsArray, IsBoolean, IsNumber, IsEnum } from 'class-validator';
import { CurrencyCode, WeightUnit, PaymentMethod } from '@prisma/client';

export class UpdateMarketConfigDto {
  @IsOptional()
  @IsString()
  countryName?: string;

  @IsOptional()
  @IsEnum(CurrencyCode)
  defaultCurrency?: CurrencyCode;

  @IsOptional()
  @IsString()
  heroHeadline?: string;

  @IsOptional()
  @IsString()
  heroSubheadline?: string;

  @IsOptional()
  @IsString()
  footerContactTitle?: string;

  @IsOptional()
  @IsString()
  contactEmail?: string;

  @IsOptional()
  @IsString()
  contactPhone?: string;

  @IsOptional()
  @IsString()
  contactAddress?: string;

  @IsOptional()
  @IsString()
  contactWhatsapp?: string;

  @IsOptional()
  @IsArray()
  @IsEnum(CurrencyCode, { each: true })
  supportedCurrencies?: CurrencyCode[];

  @IsOptional()
  @IsArray()
  @IsEnum(WeightUnit, { each: true })
  supportedWeightUnits?: WeightUnit[];

  @IsOptional()
  @IsArray()
  @IsEnum(PaymentMethod, { each: true })
  supportedPaymentMethods?: PaymentMethod[];

  @IsOptional()
  @IsBoolean()
  codEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  customOrdersEnabled?: boolean;

  @IsOptional()
  @IsNumber()
  taxPercentage?: number;

  @IsOptional()
  @IsString()
  taxName?: string;

  @IsOptional()
  @IsNumber()
  priceMultiplier?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
