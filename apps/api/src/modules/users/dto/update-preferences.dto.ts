import { ApiPropertyOptional } from "@nestjs/swagger";
import { UI_LOCALE_CODES } from "@gold-shop/shared";
import { CurrencyCode } from "@prisma/client";
import { IsEnum, IsIn, IsOptional, IsString } from "class-validator";

const SUPPORTED_UI_LANGUAGES = UI_LOCALE_CODES;

export class UpdatePreferencesDto {
  @ApiPropertyOptional({
    enum: SUPPORTED_UI_LANGUAGES,
    description: "Preferred language for the UI",
  })
  @IsOptional()
  @IsEnum(SUPPORTED_UI_LANGUAGES)
  preferredLanguage?: string;

  @ApiPropertyOptional({
    enum: CurrencyCode,
    description: "Preferred currency for prices",
  })
  @IsOptional()
  @IsEnum(CurrencyCode)
  preferredCurrency?: CurrencyCode;

  @ApiPropertyOptional({
    enum: ["NP", "IN", "AE", "UK", "EU", "US", "LK"],
    description: "Preferred country for tax jurisdiction",
  })
  @IsOptional()
  @IsIn(["NP", "IN", "AE", "UK", "EU", "US", "LK"])
  preferredCountry?: string;

  @ApiPropertyOptional({ description: "Preferred state/province code" })
  @IsOptional()
  @IsString()
  preferredState?: string;

  @ApiPropertyOptional({ description: "Preferred city name" })
  @IsOptional()
  @IsString()
  preferredCity?: string;

  @ApiPropertyOptional({
    enum: ["light", "dark", "system"],
    description: "Theme mode preference",
  })
  @IsOptional()
  @IsEnum(["light", "dark", "system"])
  themeMode?: string;
}
