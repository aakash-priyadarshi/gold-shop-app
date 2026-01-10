/**
 * Global Preferences Store
 * 
 * Manages user preferences (language, currency, country, theme) with:
 * - localStorage persistence for guests
 * - API sync for authenticated users
 * 
 * IMPORTANT: Currency and Country are INDEPENDENT:
 * - Currency: Controls price DISPLAY only (FX conversion)
 * - Country: Controls TAX rules only (VAT/GST/Sales Tax)
 * 
 * Final tax is calculated at checkout based on delivery address.
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { api } from '../lib/api';

// Currency types matching backend CurrencyCode enum
export type CurrencyCode = 'NPR' | 'INR' | 'AED' | 'USD' | 'GBP' | 'EUR';

// Country/Tax jurisdiction types
export type CountryCode = 'NP' | 'IN' | 'AE' | 'UK' | 'EU' | 'US';

export type ThemeMode = 'light' | 'dark' | 'system';

export type Language = 'en' | 'ne' | 'hi';

// Currency metadata (for DISPLAY only)
export const CURRENCIES: Record<CurrencyCode, { symbol: string; name: string; locale: string }> = {
  NPR: { symbol: 'रु', name: 'Nepalese Rupee', locale: 'ne-NP' },
  INR: { symbol: '₹', name: 'Indian Rupee', locale: 'en-IN' },
  AED: { symbol: 'د.إ', name: 'UAE Dirham', locale: 'ar-AE' },
  USD: { symbol: '$', name: 'US Dollar', locale: 'en-US' },
  GBP: { symbol: '£', name: 'British Pound', locale: 'en-GB' },
  EUR: { symbol: '€', name: 'Euro', locale: 'de-DE' },
};

// Country metadata (for TAX jurisdiction)
export const COUNTRIES: Record<CountryCode, { 
  name: string; 
  flag: string;
  taxType: string; 
  taxRate: number;
  taxDisplay: string;
  defaultCurrency: CurrencyCode;
}> = {
  NP: { name: 'Nepal', flag: '🇳🇵', taxType: 'VAT', taxRate: 0.13, taxDisplay: 'VAT (13%)', defaultCurrency: 'NPR' },
  IN: { name: 'India', flag: '🇮🇳', taxType: 'GST', taxRate: 0.03, taxDisplay: 'GST (3%)', defaultCurrency: 'INR' },
  AE: { name: 'UAE', flag: '🇦🇪', taxType: 'VAT', taxRate: 0.05, taxDisplay: 'VAT (5%)', defaultCurrency: 'AED' },
  UK: { name: 'United Kingdom', flag: '🇬🇧', taxType: 'VAT', taxRate: 0.20, taxDisplay: 'VAT (20%)', defaultCurrency: 'GBP' },
  EU: { name: 'Europe', flag: '🇪🇺', taxType: 'VAT', taxRate: 0.19, taxDisplay: 'VAT (~19%)', defaultCurrency: 'EUR' },
  US: { name: 'United States', flag: '🇺🇸', taxType: 'Sales Tax', taxRate: 0.00, taxDisplay: 'Tax (varies by state)', defaultCurrency: 'USD' },
};

// Language metadata
export const LANGUAGES: Record<Language, { name: string; nativeName: string }> = {
  en: { name: 'English', nativeName: 'English' },
  ne: { name: 'Nepali', nativeName: 'नेपाली' },
  hi: { name: 'Hindi', nativeName: 'हिन्दी' },
};

interface PreferencesState {
  // State
  language: Language;
  currency: CurrencyCode;      // For DISPLAY only (FX conversion)
  country: CountryCode;        // For TAX jurisdiction only
  theme: ThemeMode;
  isAuthenticated: boolean;
  isSyncing: boolean;
  lastSyncedAt: number | null;

  // Actions
  setLanguage: (language: Language) => void;
  setCurrency: (currency: CurrencyCode) => void;
  setCountry: (country: CountryCode) => void;
  setTheme: (theme: ThemeMode) => void;
  setAuthenticated: (isAuthenticated: boolean) => void;
  
  // Sync with backend
  syncFromServer: () => Promise<void>;
  syncToServer: () => Promise<void>;
  
  // Helpers
  formatPrice: (amount: number, options?: { showSymbol?: boolean }) => string;
  getCurrencyInfo: () => typeof CURRENCIES[CurrencyCode];
  getCountryInfo: () => typeof COUNTRIES[CountryCode];
  getTaxInfo: () => { taxType: string; taxRate: number; taxDisplay: string };
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set, get) => ({
      // Default state
      language: 'en',
      currency: 'NPR',
      country: 'NP',              // Default tax jurisdiction
      theme: 'system',
      isAuthenticated: false,
      isSyncing: false,
      lastSyncedAt: null,

      // Set language and sync to server if authenticated
      setLanguage: async (language) => {
        set({ language });
        const { isAuthenticated, syncToServer } = get();
        if (isAuthenticated) {
          await syncToServer();
        }
      },

      // Set currency (DISPLAY only - does NOT affect tax)
      setCurrency: async (currency) => {
        set({ currency });
        const { isAuthenticated, syncToServer } = get();
        if (isAuthenticated) {
          await syncToServer();
        }
      },

      // Set country (TAX jurisdiction only - does NOT affect display currency)
      setCountry: async (country) => {
        set({ country });
        const { isAuthenticated, syncToServer } = get();
        if (isAuthenticated) {
          await syncToServer();
        }
      },

      // Set theme and sync to server if authenticated
      setTheme: async (theme) => {
        set({ theme });
        const { isAuthenticated, syncToServer } = get();
        if (isAuthenticated) {
          await syncToServer();
        }
        // Apply theme immediately
        applyTheme(theme);
      },

      setAuthenticated: (isAuthenticated) => {
        set({ isAuthenticated });
        if (isAuthenticated) {
          // Sync from server when user logs in
          get().syncFromServer();
        }
      },

      // Fetch preferences from server (called on login)
      syncFromServer: async () => {
        const { isAuthenticated } = get();
        if (!isAuthenticated) return;

        set({ isSyncing: true });
        try {
          const response = await api.get('/api/users/me/preferences');
          const { language, currency, country } = response.data;
          
          // Only sync language, currency, country - NOT theme
          // Theme is managed by next-themes and should persist locally
          set({
            language: language || 'en',
            currency: currency || 'NPR',
            country: country || 'NP',
            lastSyncedAt: Date.now(),
          });
          
          // Don't override theme - let next-themes handle it
        } catch (error) {
          console.error('Failed to sync preferences from server:', error);
        } finally {
          set({ isSyncing: false });
        }
      },

      // Push preferences to server (called on change when authenticated)
      syncToServer: async () => {
        const { isAuthenticated, language, currency, country, theme } = get();
        if (!isAuthenticated) return;

        set({ isSyncing: true });
        try {
          await api.patch('/api/users/me/preferences', {
            preferredLanguage: language,
            preferredCurrency: currency,
            preferredCountry: country,
            themeMode: theme,
          });
          set({ lastSyncedAt: Date.now() });
        } catch (error) {
          console.error('Failed to sync preferences to server:', error);
        } finally {
          set({ isSyncing: false });
        }
      },

      // Format a price in the current currency
      formatPrice: (amount, options = {}) => {
        const { currency } = get();
        const { showSymbol = true } = options;
        const info = CURRENCIES[currency];
        
        const formatter = new Intl.NumberFormat(info.locale, {
          style: showSymbol ? 'currency' : 'decimal',
          currency: currency,
          minimumFractionDigits: 0,
          maximumFractionDigits: 2,
        });
        
        return formatter.format(amount);
      },

      getCurrencyInfo: () => {
        const { currency } = get();
        return CURRENCIES[currency];
      },

      getCountryInfo: () => {
        const { country } = get();
        return COUNTRIES[country];
      },

      getTaxInfo: () => {
        const { country } = get();
        const countryInfo = COUNTRIES[country];
        return {
          taxType: countryInfo.taxType,
          taxRate: countryInfo.taxRate,
          taxDisplay: countryInfo.taxDisplay,
        };
      },
    }),
    {
      name: 'gold-shop-preferences',
      storage: createJSONStorage(() => localStorage),
      // Only persist these fields
      partialize: (state) => ({
        language: state.language,
        currency: state.currency,
        country: state.country,
        theme: state.theme,
      }),
    }
  )
);

// Helper to apply theme to document
function applyTheme(theme: ThemeMode) {
  if (typeof window === 'undefined') return;
  
  const root = document.documentElement;
  
  if (theme === 'system') {
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.classList.toggle('dark', systemDark);
  } else {
    root.classList.toggle('dark', theme === 'dark');
  }
}

// Listen for system theme changes
if (typeof window !== 'undefined') {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    const { theme } = usePreferencesStore.getState();
    if (theme === 'system') {
      document.documentElement.classList.toggle('dark', e.matches);
    }
  });
}

// Export a hook for easy access to currency-related utilities
export function useCurrency() {
  const currency = usePreferencesStore((state) => state.currency);
  const setCurrency = usePreferencesStore((state) => state.setCurrency);
  const formatPrice = usePreferencesStore((state) => state.formatPrice);
  const getCurrencyInfo = usePreferencesStore((state) => state.getCurrencyInfo);
  
  return {
    currency,
    setCurrency,
    formatPrice,
    currencyInfo: getCurrencyInfo(),
    allCurrencies: CURRENCIES,
  };
}

// Export a hook for country/tax jurisdiction utilities
export function useCountry() {
  const country = usePreferencesStore((state) => state.country);
  const setCountry = usePreferencesStore((state) => state.setCountry);
  const getCountryInfo = usePreferencesStore((state) => state.getCountryInfo);
  const getTaxInfo = usePreferencesStore((state) => state.getTaxInfo);
  
  return {
    country,
    setCountry,
    countryInfo: getCountryInfo(),
    taxInfo: getTaxInfo(),
    allCountries: COUNTRIES,
  };
}

// Export a hook for language utilities
export function useLanguage() {
  const language = usePreferencesStore((state) => state.language);
  const setLanguage = usePreferencesStore((state) => state.setLanguage);
  
  return {
    language,
    setLanguage,
    languageInfo: LANGUAGES[language],
    allLanguages: LANGUAGES,
  };
}

// Export a hook for theme utilities
export function useTheme() {
  const theme = usePreferencesStore((state) => state.theme);
  const setTheme = usePreferencesStore((state) => state.setTheme);
  
  return {
    theme,
    setTheme,
    isDark: theme === 'dark' || (theme === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches),
  };
}
