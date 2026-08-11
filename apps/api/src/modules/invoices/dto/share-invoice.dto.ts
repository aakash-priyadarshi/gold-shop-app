import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class ShareInvoiceEmailDto {
  @IsOptional()
  @IsEmail()
  to?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  message?: string;
}

export class ShareInvoiceSmsDto {
  @IsOptional()
  @IsString()
  @MinLength(6)
  @MaxLength(20)
  to?: string;

  @IsOptional()
  @IsString()
  @MaxLength(480)
  message?: string;
}
