import { NextRequest, NextResponse } from 'next/server';

// Map country codes to supported markets
function mapToSupportedMarket(countryCode: string): string {
  const supportedMarkets = ['NP', 'IN', 'US', 'UK', 'EU', 'AE'];
  
  if (supportedMarkets.includes(countryCode)) {
    return countryCode;
  }

  // UK alternate codes
  if (countryCode === 'GB') {
    return 'UK';
  }

  // European countries → EU
  const europeanCountries = [
    'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR',
    'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL',
    'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE', 'CH', 'NO',
  ];
  if (europeanCountries.includes(countryCode)) {
    return 'EU';
  }

  // Middle East → AE
  const middleEastCountries = ['BH', 'KW', 'OM', 'QA', 'SA'];
  if (middleEastCountries.includes(countryCode)) {
    return 'AE';
  }

  // Default fallback
  return 'US';
}

export async function GET(request: NextRequest) {
  // Get country from Vercel geo headers (available on Vercel deployment)
  const vercelCountry = request.headers.get('x-vercel-ip-country');
  const cfCountry = request.headers.get('cf-ipcountry');
  
  // For local development, check query param
  const urlCountry = request.nextUrl.searchParams.get('country');
  
  let detectedCountry = 'US';
  
  if (urlCountry) {
    // Query param override (for testing)
    detectedCountry = mapToSupportedMarket(urlCountry.toUpperCase());
  } else if (vercelCountry) {
    // Vercel deployment
    detectedCountry = mapToSupportedMarket(vercelCountry);
  } else if (cfCountry) {
    // Cloudflare
    detectedCountry = mapToSupportedMarket(cfCountry);
  }
  
  return NextResponse.json({
    detectedCountry,
    source: vercelCountry ? 'vercel' : cfCountry ? 'cloudflare' : urlCountry ? 'query' : 'default',
    raw: {
      vercel: vercelCountry,
      cloudflare: cfCountry,
    }
  });
}
