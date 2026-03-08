import {
  ArrayMaxSize,
  IsArray,
  IsIn,
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
