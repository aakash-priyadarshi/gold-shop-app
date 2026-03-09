import { ApiPropertyOptional } from "@nestjs/swagger";
import { CurrencyCode } from "@prisma/client";
import { IsEnum, IsOptional, IsString } from "class-validator";

export class UpdatePreferencesDto {
  @ApiPropertyOptional({
    enum: ["en", "fr", "de", "hi", "es", "ar", "ne"],
    description: "Preferred language for the UI",
  })
  @IsOptional()
  @IsEnum(["en", "fr", "de", "hi", "es", "ar", "ne"])
  preferredLanguage?: string;

  @ApiPropertyOptional({
    enum: CurrencyCode,
    description: "Preferred currency for prices",
  })
  @IsOptional()
  @IsEnum(CurrencyCode)
  preferredCurrency?: CurrencyCode;

  @ApiPropertyOptional({
    enum: ["NP", "IN", "AE", "UK", "EU", "US"],
    description: "Preferred country for tax jurisdiction",
  })
  @IsOptional()
  @IsEnum(["NP", "IN", "AE", "UK", "EU", "US"])
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
