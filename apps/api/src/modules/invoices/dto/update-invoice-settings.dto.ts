import { IsBoolean, IsIn, IsOptional, IsString } from "class-validator";
import { BILL_TEMPLATE_IDS } from "@gold-shop/shared";

const POSITION = ["TOP", "BOTTOM"] as const;

/**
 * Must match InvoiceSettings schema + frontend bill-settings payload.
 * Global ValidationPipe uses whitelist + forbidNonWhitelisted — every
 * field the UI sends needs a decorator or PATCH returns 400.
 */
export class UpdateInvoiceSettingsDto {
  // Branding
  @IsOptional()
  @IsString()
  shopNameOnBill?: string;

  @IsOptional()
  @IsString()
  shopLogoUrl?: string;

  @IsOptional()
  @IsString()
  tagline?: string;

  // Contact & legal
  @IsOptional()
  @IsString()
  shopAddress?: string;

  @IsOptional()
  @IsString()
  shopPhone?: string;

  @IsOptional()
  @IsString()
  shopEmail?: string;

  @IsOptional()
  @IsString()
  gstin?: string;

  @IsOptional()
  @IsString()
  licenseNumber?: string;

  @IsOptional()
  @IsString()
  footerNote?: string;

  @IsOptional()
  @IsString()
  termsText?: string;

  // Per-field positions
  @IsOptional()
  @IsIn(POSITION)
  shopNamePosition?: string;

  @IsOptional()
  @IsIn(POSITION)
  logoPosition?: string;

  @IsOptional()
  @IsIn(POSITION)
  taglinePosition?: string;

  @IsOptional()
  @IsIn(POSITION)
  addressPosition?: string;

  @IsOptional()
  @IsIn(POSITION)
  phonePosition?: string;

  @IsOptional()
  @IsIn(POSITION)
  emailPosition?: string;

  @IsOptional()
  @IsIn(POSITION)
  gstinPosition?: string;

  @IsOptional()
  @IsIn(POSITION)
  licensePosition?: string;

  @IsOptional()
  @IsIn(POSITION)
  footerPosition?: string;

  @IsOptional()
  @IsIn(POSITION)
  termsPosition?: string;

  // Visibility toggles
  @IsOptional()
  @IsBoolean()
  showLogo?: boolean;

  @IsOptional()
  @IsBoolean()
  showAddress?: boolean;

  @IsOptional()
  @IsBoolean()
  showPhone?: boolean;

  @IsOptional()
  @IsBoolean()
  showEmail?: boolean;

  @IsOptional()
  @IsBoolean()
  showGstin?: boolean;

  @IsOptional()
  @IsBoolean()
  showLicense?: boolean;

  @IsOptional()
  @IsBoolean()
  showFooter?: boolean;

  @IsOptional()
  @IsBoolean()
  showTerms?: boolean;

  @IsOptional()
  @IsIn([...BILL_TEMPLATE_IDS])
  billTemplateId?: string;
}
