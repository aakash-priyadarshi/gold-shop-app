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
  const { selectedCountry, selectedCurrency, isLoading, detectedCountry } = useMarket();
  const syncCountryFromGeo = usePreferencesStore((state) => state.syncCountryFromGeo);
  const syncCurrencyFromGeo = usePreferencesStore((state) => state.syncCurrencyFromGeo);
  const prefsCountry = usePreferencesStore((state) => state.country);
  const prefsCurrency = usePreferencesStore((state) => state.currency);
  const syncedRef = React.useRef(false);

  // Sync market detection to preferences store
  React.useEffect(() => {
    // Only sync once per session and when market is loaded
    if (isLoading || syncedRef.current) return;
    
    if (selectedCountry && detectedCountry) {
      // Check if user has explicitly set preferences (user_choice flag in localStorage)
      const userCountryChoice = typeof window !== 'undefined' 
        ? localStorage.getItem('orivraa_user_country_choice') 
        : null;
      const userCurrencyChoice = typeof window !== 'undefined' 
        ? localStorage.getItem('orivraa_user_currency_choice') 
        : null;
      
      // Valid country codes for preferences
      const validCountries: CountryCode[] = ['NP', 'IN', 'AE', 'UK', 'EU', 'US'];
      
      // Sync detected country to preferences if user hasn't explicitly chosen
      if (validCountries.includes(detectedCountry as CountryCode)) {
        if (userCountryChoice !== 'true' && prefsCountry !== detectedCountry) {
          console.log('[MarketPreferencesSync] Syncing detected country:', detectedCountry, '(was:', prefsCountry, ')');
          syncCountryFromGeo(detectedCountry as CountryCode);
        } else if (userCountryChoice === 'true') {
          console.log('[MarketPreferencesSync] User has explicit country choice, keeping:', prefsCountry);
        }
        
        // Also sync currency based on detected country if user hasn't explicitly chosen
        const currencyMap: Record<MarketRegion, CurrencyCode> = {
          NP: 'NPR',
          IN: 'INR',
          US: 'USD',
          UK: 'GBP',
          EU: 'EUR',
          AE: 'AED',
        };
        const expectedCurrency = currencyMap[detectedCountry];
        if (userCurrencyChoice !== 'true' && expectedCurrency && prefsCurrency !== expectedCurrency) {
          console.log('[MarketPreferencesSync] Syncing currency:', expectedCurrency, '(was:', prefsCurrency, ')');
          syncCurrencyFromGeo(expectedCurrency);
        } else if (userCurrencyChoice === 'true') {
          console.log('[MarketPreferencesSync] User has explicit currency choice, keeping:', prefsCurrency);
        }
      }
      
      syncedRef.current = true;
    }
  }, [isLoading, selectedCountry, detectedCountry, prefsCountry, prefsCurrency, syncCountryFromGeo, syncCurrencyFromGeo]);

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
