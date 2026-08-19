import { Injectable } from "@nestjs/common";
import { LOCALE_REGISTRY, isUiLocale, type UiLocale } from "@gold-shop/shared";
import * as en from "./locales/en.json";
import * as hi from "./locales/hi.json";
import * as ne from "./locales/ne.json";

export type SupportedLocale = UiLocale;

const locales: Record<SupportedLocale, any> = {
  en,
  fr: en,
  de: en,
  ne,
  hi,
  es: en,
  ar: en,
  gu: en,
  mr: en,
  ta: en,
  si: en,
  te: en,
  kn: en,
  he: en,
  yi: en,
};

@Injectable()
export class I18nService {
  private defaultLocale: SupportedLocale = "en";

  // Get translation for a key
  translate(
    key: string,
    locale: SupportedLocale = this.defaultLocale,
    params?: Record<string, string | number>,
  ): string {
    const keys = key.split(".");
    let translation: any = locales[locale] || locales[this.defaultLocale];

    for (const k of keys) {
      translation = translation?.[k];
      if (translation === undefined) {
        // Fallback to English
        translation = this.getFallbackTranslation(key);
        break;
      }
    }

    if (typeof translation !== "string") {
      return key; // Return key if translation not found
    }

    // Replace parameters {{param}}
    if (params) {
      return this.interpolate(translation, params);
    }

    return translation;
  }

  // Shorthand alias
  t(
    key: string,
    locale?: SupportedLocale,
    params?: Record<string, string | number>,
  ): string {
    return this.translate(key, locale, params);
  }

  // Get all translations for a namespace
  getNamespace(
    namespace: string,
    locale: SupportedLocale = this.defaultLocale,
  ): any {
    const localeData = locales[locale] || locales[this.defaultLocale];
    return localeData[namespace] || {};
  }

  // Get available locales
  getAvailableLocales(): SupportedLocale[] {
    return Object.keys(locales) as SupportedLocale[];
  }

  // Get locale info
  getLocaleInfo(locale: SupportedLocale) {
    const info = LOCALE_REGISTRY[locale] || LOCALE_REGISTRY.en;
    return {
      name: info.name,
      nativeName: info.nativeName,
      direction: info.direction,
    };
  }

  // Check if locale is supported
  isSupported(locale: string): locale is SupportedLocale {
    return isUiLocale(locale);
  }

  // Set default locale
  setDefaultLocale(locale: SupportedLocale) {
    if (this.isSupported(locale)) {
      this.defaultLocale = locale;
    }
  }

  // Get fallback translation from English
  private getFallbackTranslation(key: string): any {
    const keys = key.split(".");
    let translation: any = locales.en;

    for (const k of keys) {
      translation = translation?.[k];
      if (translation === undefined) {
        return undefined;
      }
    }

    return translation;
  }

  // Interpolate parameters into translation string
  private interpolate(
    text: string,
    params: Record<string, string | number>,
  ): string {
    return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return params[key]?.toString() ?? match;
    });
  }

  // Format number according to locale
  formatNumber(
    value: number,
    locale: SupportedLocale = this.defaultLocale,
  ): string {
    return new Intl.NumberFormat(LOCALE_REGISTRY[locale].intlLocale).format(
      value,
    );
  }

  // Format currency
  formatCurrency(
    value: number,
    currency = "NPR",
    locale: SupportedLocale = this.defaultLocale,
  ): string {
    return new Intl.NumberFormat(LOCALE_REGISTRY[locale].intlLocale, {
      style: "currency",
      currency,
    }).format(value);
  }

  // Format date
  formatDate(
    date: Date,
    locale: SupportedLocale = this.defaultLocale,
    options?: Intl.DateTimeFormatOptions,
  ): string {
    return new Intl.DateTimeFormat(
      LOCALE_REGISTRY[locale].intlLocale,
      options,
    ).format(date);
  }
}
