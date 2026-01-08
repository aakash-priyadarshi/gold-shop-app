import { Injectable } from '@nestjs/common';
import * as en from './locales/en.json';
import * as ne from './locales/ne.json';
import * as hi from './locales/hi.json';

export type SupportedLocale = 'en' | 'ne' | 'hi';

const locales: Record<SupportedLocale, any> = {
  en,
  ne,
  hi,
};

@Injectable()
export class I18nService {
  private defaultLocale: SupportedLocale = 'en';

  // Get translation for a key
  translate(
    key: string,
    locale: SupportedLocale = this.defaultLocale,
    params?: Record<string, string | number>,
  ): string {
    const keys = key.split('.');
    let translation: any = locales[locale] || locales[this.defaultLocale];

    for (const k of keys) {
      translation = translation?.[k];
      if (translation === undefined) {
        // Fallback to English
        translation = this.getFallbackTranslation(key);
        break;
      }
    }

    if (typeof translation !== 'string') {
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
  getNamespace(namespace: string, locale: SupportedLocale = this.defaultLocale): any {
    const localeData = locales[locale] || locales[this.defaultLocale];
    return localeData[namespace] || {};
  }

  // Get available locales
  getAvailableLocales(): SupportedLocale[] {
    return Object.keys(locales) as SupportedLocale[];
  }

  // Get locale info
  getLocaleInfo(locale: SupportedLocale) {
    const info: Record<SupportedLocale, { name: string; nativeName: string; direction: string }> = {
      en: { name: 'English', nativeName: 'English', direction: 'ltr' },
      ne: { name: 'Nepali', nativeName: 'नेपाली', direction: 'ltr' },
      hi: { name: 'Hindi', nativeName: 'हिन्दी', direction: 'ltr' },
    };
    return info[locale] || info.en;
  }

  // Check if locale is supported
  isSupported(locale: string): locale is SupportedLocale {
    return locale in locales;
  }

  // Set default locale
  setDefaultLocale(locale: SupportedLocale) {
    if (this.isSupported(locale)) {
      this.defaultLocale = locale;
    }
  }

  // Get fallback translation from English
  private getFallbackTranslation(key: string): any {
    const keys = key.split('.');
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
  formatNumber(value: number, locale: SupportedLocale = this.defaultLocale): string {
    const localeMap: Record<SupportedLocale, string> = {
      en: 'en-US',
      ne: 'ne-NP',
      hi: 'hi-IN',
    };
    return new Intl.NumberFormat(localeMap[locale]).format(value);
  }

  // Format currency
  formatCurrency(
    value: number,
    currency = 'NPR',
    locale: SupportedLocale = this.defaultLocale,
  ): string {
    const localeMap: Record<SupportedLocale, string> = {
      en: 'en-US',
      ne: 'ne-NP',
      hi: 'hi-IN',
    };
    return new Intl.NumberFormat(localeMap[locale], {
      style: 'currency',
      currency,
    }).format(value);
  }

  // Format date
  formatDate(
    date: Date,
    locale: SupportedLocale = this.defaultLocale,
    options?: Intl.DateTimeFormatOptions,
  ): string {
    const localeMap: Record<SupportedLocale, string> = {
      en: 'en-US',
      ne: 'ne-NP',
      hi: 'hi-IN',
    };
    return new Intl.DateTimeFormat(localeMap[locale], options).format(date);
  }
}
