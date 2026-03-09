import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

export const SUPPORTED_LOCALES = [
  "en",
  "fr",
  "de",
  "hi",
  "es",
  "ar",
  "ne",
] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const LOCALE_NAMES: Record<SupportedLocale, string> = {
  en: "English",
  fr: "French",
  de: "German",
  hi: "Hindi",
  es: "Spanish",
  ar: "Arabic",
  ne: "Nepali",
};

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
