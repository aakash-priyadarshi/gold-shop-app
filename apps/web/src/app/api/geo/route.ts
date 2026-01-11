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
  // Priority 1: Read from middleware-set cookie (most reliable - set at edge)
  const cookieCountry = request.cookies.get('orivraa_geo_country')?.value;
  const cookieSource = request.cookies.get('orivraa_geo_source')?.value;
  const cookieRaw = request.cookies.get('orivraa_geo_raw')?.value;
  
  // Priority 2: Read headers directly (fallback if middleware didn't run)
  // Cloudflare header (most reliable when domain is behind Cloudflare)
  const cfCountry = request.headers.get('cf-ipcountry');
  // Vercel header (fallback)
  const vercelCountry = request.headers.get('x-vercel-ip-country');
  // Middleware-set header
  const middlewareCountry = request.headers.get('x-orivraa-country');
  
  // Priority 3: Query param override (for testing)
  const urlCountry = request.nextUrl.searchParams.get('country');
  
  let detectedCountry = 'US';
  let source = 'default';
  let rawCountry = 'US';
  
  if (urlCountry) {
    // Query param override (for testing)
    detectedCountry = mapToSupportedMarket(urlCountry.toUpperCase());
    source = 'query';
    rawCountry = urlCountry.toUpperCase();
  } else if (cookieCountry) {
    // Middleware-set cookie (most reliable)
    detectedCountry = cookieCountry;
    source = cookieSource || 'cookie';
    rawCountry = cookieRaw || cookieCountry;
  } else if (cfCountry && cfCountry !== 'XX') {
    // Direct Cloudflare header
    detectedCountry = mapToSupportedMarket(cfCountry);
    source = 'cloudflare-direct';
    rawCountry = cfCountry;
  } else if (vercelCountry) {
    // Vercel header
    detectedCountry = mapToSupportedMarket(vercelCountry);
    source = 'vercel-direct';
    rawCountry = vercelCountry;
  } else if (middlewareCountry) {
    // Middleware header (shouldn't normally reach here)
    detectedCountry = middlewareCountry;
    source = 'middleware-header';
    rawCountry = middlewareCountry;
  }
  
  return NextResponse.json({
    detectedCountry,
    source,
    raw: {
      country: rawCountry,
      cloudflare: cfCountry,
      vercel: vercelCountry,
      cookie: cookieCountry,
      middleware: middlewareCountry,
    },
    debug: {
      allHeaders: {
        'cf-ipcountry': cfCountry,
        'x-vercel-ip-country': vercelCountry,
        'x-orivraa-country': middlewareCountry,
      },
      cookies: {
        'orivraa_geo_country': cookieCountry,
        'orivraa_geo_source': cookieSource,
        'orivraa_geo_raw': cookieRaw,
      },
    },
  });
}
