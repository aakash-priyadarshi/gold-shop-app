'use client';

import * as React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SessionProvider } from 'next-auth/react';
import { ThemeProvider } from 'next-themes';
import { AuthProvider } from '@/hooks/useAuth';
import { MarketProvider, useMarket, type MarketRegion, type CurrencyCode as MarketCurrency } from '@/hooks/useMarket';
import { usePreferencesStore, type CountryCode, type CurrencyCode } from '@/store/preferences';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      refetchOnWindowFocus: false,
    },
  },
});

// Bridge component to sync MarketContext with Zustand preferences store
function MarketPreferencesSync({ children }: { children: React.ReactNode }) {
  const { selectedCountry, selectedCurrency, isLoading } = useMarket();
  const setCountry = usePreferencesStore((state) => state.setCountry);
  const setCurrency = usePreferencesStore((state) => state.setCurrency);
  const prefsCountry = usePreferencesStore((state) => state.country);

  // Sync market detection to preferences store (only once when market loads)
  React.useEffect(() => {
    if (!isLoading && selectedCountry) {
      // Check if preferences store has localStorage data
      const stored = typeof window !== 'undefined' ? localStorage.getItem('gold-shop-preferences') : null;
      
      // If no stored preferences, sync from market detection
      if (!stored) {
        // Valid country codes for preferences
        const validCountries: CountryCode[] = ['NP', 'IN', 'AE', 'UK', 'EU', 'US'];
        if (validCountries.includes(selectedCountry as CountryCode)) {
          setCountry(selectedCountry as CountryCode);
          
          // Also sync currency
          const currencyMap: Record<MarketRegion, CurrencyCode> = {
            NP: 'NPR',
            IN: 'INR',
            US: 'USD',
            UK: 'GBP',
            EU: 'EUR',
            AE: 'AED',
          };
          setCurrency(currencyMap[selectedCountry]);
        }
      }
    }
  }, [isLoading, selectedCountry, setCountry, setCurrency]);

  return <>{children}</>;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <AuthProvider>
            <MarketProvider>
              <MarketPreferencesSync>
                {children}
              </MarketPreferencesSync>
            </MarketProvider>
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </SessionProvider>
  );
}
