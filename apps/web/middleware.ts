import { NextRequest, NextResponse } from 'next/server';

/**
 * Next.js Edge Middleware for Geo Detection
 * 
 * Reads Cloudflare's CF-IPCountry header (or Vercel's x-vercel-ip-country)
 * and sets a cookie for the app to use for market detection.
 * 
 * Priority order:
 * 1. CF-IPCountry (Cloudflare - most reliable when domain is behind CF)
 * 2. x-vercel-ip-country (Vercel's built-in geo)
 * 3. Fallback to 'US'
 */

// Map raw country codes to supported markets
function mapToSupportedMarket(countryCode: string | null | undefined): string {
  if (!countryCode || countryCode === 'XX' || countryCode === 'T1') {
    return 'US'; // Unknown or Tor
  }

  const code = countryCode.toUpperCase();
  const supportedMarkets = ['NP', 'IN', 'US', 'UK', 'AE'];

  // Direct match
  if (supportedMarkets.includes(code)) {
    return code;
  }

  // UK alternate codes
  if (code === 'GB') {
    return 'UK';
  }

  // European countries → EU
  const europeanCountries = [
    'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR',
    'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL',
    'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE', 'CH', 'NO', 'IS',
  ];
  if (europeanCountries.includes(code)) {
    return 'EU';
  }

  // Middle East → AE
  const middleEastCountries = ['BH', 'KW', 'OM', 'QA', 'SA', 'YE', 'JO', 'LB', 'SY', 'IQ'];
  if (middleEastCountries.includes(code)) {
    return 'AE';
  }

  // South Asian neighbors of Nepal/India
  const southAsianCountries = ['BD', 'LK', 'PK', 'BT', 'MV'];
  if (southAsianCountries.includes(code)) {
    return 'IN'; // Default to India market for South Asia
  }

  // Default fallback
  return 'US';
}

export function middleware(request: NextRequest) {
  // Read geo headers - Cloudflare first (more reliable), then Vercel
  // Note: Header names are lowercase in Node.js
  const cfCountry = request.headers.get('cf-ipcountry');
  const vercelCountry = request.headers.get('x-vercel-ip-country');
  
  // Cloudflare also provides these (for debugging)
  const cfCity = request.headers.get('cf-ipcity');
  const cfRegion = request.headers.get('cf-region');
  
  // Determine the raw country code
  const rawCountry = cfCountry || vercelCountry || 'US';
  const mappedCountry = mapToSupportedMarket(rawCountry);
  
  // Create response
  const response = NextResponse.next();
  
  // Set cookies for client-side and server-side access
  // These cookies will be readable by the app
  response.cookies.set('orivraa_geo_country', mappedCountry, {
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24, // 24 hours - re-detect daily
  });
  
  // Also set raw country for debugging
  response.cookies.set('orivraa_geo_raw', rawCountry, {
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24,
  });
  
  // Set geo source for debugging
  const source = cfCountry ? 'cloudflare' : vercelCountry ? 'vercel' : 'default';
  response.cookies.set('orivraa_geo_source', source, {
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24,
  });

  // Add headers for API routes to access
  response.headers.set('x-orivraa-country', mappedCountry);
  response.headers.set('x-orivraa-geo-source', source);

  // ===========================
  // Content Security Policy
  // ===========================
  const cspDirectives = [
    "default-src 'self'",
    // Scripts: self + Vercel analytics/speed-insights + inline for Next.js hydration
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://va.vercel-scripts.com https://vercel.live",
    // Styles: self + inline (Tailwind/CSS-in-JS) + Google Fonts
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    // Images: self + data URIs + Cloudinary + orivraa CDN + blob for previews
    "img-src 'self' data: blob: https://res.cloudinary.com https://*.cloudinary.com https://images.orivraa.com https://orivraa.com",
    // Fonts: self + Google Fonts CDN
    "font-src 'self' https://fonts.gstatic.com data:",
    // API connections: self + API + Vercel analytics + Stripe
    "connect-src 'self' https://api.orivraa.com https://*.vercel-insights.com https://va.vercel-scripts.com https://vercel.live https://*.stripe.com https://vitals.vercel-insights.com",
    // Frames: self + Stripe (for 3D Secure)
    "frame-src 'self' https://*.stripe.com https://vercel.live",
    // Media
    "media-src 'self' blob:",
    // Objects: none (no Flash/Java)
    "object-src 'none'",
    // Base URI restriction
    "base-uri 'self'",
    // Form targets
    "form-action 'self'",
    // Frame ancestors (clickjacking protection)
    "frame-ancestors 'self'",
    // Upgrade HTTP → HTTPS in production
    ...(process.env.NODE_ENV === 'production' ? ['upgrade-insecure-requests'] : []),
  ];
  response.headers.set('Content-Security-Policy', cspDirectives.join('; '));
  
  return response;
}

// Run middleware on all routes except static files
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
