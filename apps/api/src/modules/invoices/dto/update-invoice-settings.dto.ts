import { IsString, IsBoolean, IsOptional, IsNumber } from "class-validator";

export class UpdateInvoiceSettingsDto {
  @IsOptional()
  @IsString()
  prefix?: string;

  @IsOptional()
  @IsNumber()
  nextNumber?: number;

  @IsOptional()
  @IsString()
  taxId?: string;

  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsOptional()
  @IsBoolean()
  showTaxBreakdown?: boolean;

  @IsOptional()
  @IsBoolean()
  showPaymentTerms?: boolean;

  @IsOptional()
  @IsString()
  paymentTerms?: string;

  @IsOptional()
  @IsString()
  footerNote?: string;
}
