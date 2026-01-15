'use client';

import * as React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SessionProvider } from 'next-auth/react';
import { ThemeProvider } from 'next-themes';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import { MarketProvider, useMarket, type MarketRegion, type CurrencyCode as MarketCurrency } from '@/hooks/useMarket';
import { usePreferencesStore, type CountryCode, type CurrencyCode } from '@/store/preferences';
import { CartProvider } from '@/contexts/CartContext';

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
  const { isAuthenticated } = useAuth();
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
    
    // IMPORTANT: For authenticated users, preferences are synced from server
    // Do NOT override with geo detection - the server is the source of truth
    if (isAuthenticated) {
      console.log('[MarketPreferencesSync] Authenticated user - skipping geo sync, server is source of truth');
      syncedRef.current = true;
      return;
    }
    
    if (detectedCountry) {
      // Check if user has explicitly set preferences (user_choice flag in localStorage)
      const userCountryChoice = typeof window !== 'undefined' 
        ? localStorage.getItem('orivraa_user_country_choice') 
        : null;
      const userCurrencyChoice = typeof window !== 'undefined' 
        ? localStorage.getItem('orivraa_user_currency_choice') 
        : null;
      
      // Valid country codes for preferences
      const validCountries: CountryCode[] = ['NP', 'IN', 'AE', 'UK', 'EU', 'US'];
      
      // Currency map based on detected country
      const currencyMap: Record<string, CurrencyCode> = {
        NP: 'NPR',
        IN: 'INR',
        US: 'USD',
        UK: 'GBP',
        EU: 'EUR',
        AE: 'AED',
      };
      
      // Sync detected country to preferences if user hasn't explicitly chosen
      if (validCountries.includes(detectedCountry as CountryCode)) {
        // IMPORTANT: Sync BOTH country and currency together from detected country
        // This fixes the mismatch where currency is INR but country shows Nepal
        if (userCountryChoice !== 'true') {
          if (prefsCountry !== detectedCountry) {
            console.log('[MarketPreferencesSync] Syncing detected country:', detectedCountry, '(was:', prefsCountry, ')');
            syncCountryFromGeo(detectedCountry as CountryCode);
          }
          
          // Also sync currency to match the detected country (unless user chose a different currency)
          const expectedCurrency = currencyMap[detectedCountry];
          if (userCurrencyChoice !== 'true' && expectedCurrency && prefsCurrency !== expectedCurrency) {
            console.log('[MarketPreferencesSync] Syncing currency to match country:', expectedCurrency, '(was:', prefsCurrency, ')');
            syncCurrencyFromGeo(expectedCurrency);
          }
        } else {
          console.log('[MarketPreferencesSync] User has explicit country choice, keeping:', prefsCountry);
          // If user chose a country but not currency, sync currency to user's chosen country
          if (userCurrencyChoice !== 'true') {
            const expectedCurrency = currencyMap[prefsCountry];
            if (expectedCurrency && prefsCurrency !== expectedCurrency) {
              console.log('[MarketPreferencesSync] Syncing currency to user country:', expectedCurrency);
              syncCurrencyFromGeo(expectedCurrency);
            }
          }
        }
      }
      
      syncedRef.current = true;
    }
  }, [isLoading, detectedCountry, prefsCountry, prefsCurrency, syncCountryFromGeo, syncCurrencyFromGeo, isAuthenticated]);

  return <>{children}</>;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <AuthProvider>
            <CartProvider>
              <MarketProvider>
                <MarketPreferencesSync>
                  {children}
                </MarketPreferencesSync>
              </MarketProvider>
            </CartProvider>
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </SessionProvider>
  );
}
