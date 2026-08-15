import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";
import {
  LOCALE_REGISTRY,
  TRANSLATION_TEXT_MAX_LENGTH,
  UI_LOCALE_CODES,
  type UiLocale,
} from "@gold-shop/shared";

export const SUPPORTED_LOCALES = UI_LOCALE_CODES;
export type SupportedLocale = UiLocale;

/** Server-side ceiling. The web client chunks below this (typically 80). */
export const TRANSLATION_BATCH_MAX_SIZE = 200;
export { TRANSLATION_TEXT_MAX_LENGTH };

export const LOCALE_NAMES = Object.fromEntries(
  SUPPORTED_LOCALES.map((locale) => [locale, LOCALE_REGISTRY[locale].name]),
) as Record<SupportedLocale, string>;

export class TranslateBatchDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(TRANSLATION_BATCH_MAX_SIZE)
  @IsString({ each: true })
  @MaxLength(TRANSLATION_TEXT_MAX_LENGTH, { each: true })
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
