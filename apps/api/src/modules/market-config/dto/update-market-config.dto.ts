import { IsString, IsOptional, IsArray, IsBoolean, IsNumber } from 'class-validator';

export class UpdateMarketConfigDto {
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
  @IsString({ each: true })
  supportedCurrencies?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  supportedWeightUnits?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  supportedPaymentMethods?: string[];

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
  @IsBoolean()
  isActive?: boolean;
}
