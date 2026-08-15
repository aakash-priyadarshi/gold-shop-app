import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";
import {
  LOCALE_REGISTRY,
  UI_LOCALE_CODES,
  type UiLocale,
} from "@gold-shop/shared";

export const SUPPORTED_LOCALES = UI_LOCALE_CODES;
export type SupportedLocale = UiLocale;

export const LOCALE_NAMES = Object.fromEntries(
  SUPPORTED_LOCALES.map((locale) => [locale, LOCALE_REGISTRY[locale].name]),
) as Record<SupportedLocale, string>;

export class TranslateBatchDto {
  @IsArray()
  @ArrayMaxSize(100)
  @IsString({ each: true })
  @MaxLength(2000, { each: true })
  texts: string[];

  @IsString()
  @IsIn(SUPPORTED_LOCALES)
  locale: SupportedLocale;
}

export class TranslateHtmlDto {
  @IsString()
  @MaxLength(200_000) // blog posts / CMS pages can be large
  html: string;

  @IsString()
  @IsIn(SUPPORTED_LOCALES)
  locale: SupportedLocale;

  /** Optional client-side content hash for cache validation */
  @IsOptional()
  @IsString()
  @MaxLength(64)
  contentHash?: string;
}
