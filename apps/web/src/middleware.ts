import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// Top-level paths that have a dedicated mobile (`/m/*`) version.
// Anything not in this set falls through to the regular (desktop) page on the
// same deployment — so /auth/login, /dashboard, /pricing etc. still work on
// m.orivraa.com without rewriting to a non-existent /m/auth/login.
const MOBILE_TOP_SEGMENTS = new Set([
  "pos",
  "rate-card",
  "orders",
  "quotes",
  "repairs",
  "customers",
  "savings",
  "tax",
  "more",
  "exchange",   // Old Gold Exchange Calculator
  "broadcast",  // WhatsApp Rate Broadcast
  "summary",    // Daily Sales Summary
  "alerts",     // Rate Threshold Alerts
  "pending",    // Pending Payments Register
  "occasions",  // Birthday & Anniversary Reminders
  "purity",     // Gold Purity Calculator
]);

function mapToSupportedMarket(countryCode: string): string {
  const country = countryCode.toUpperCase();
  if (["NP", "IN", "US", "UK", "EU", "AE"].includes(country)) return country;
  if (country === "GB") return "UK";

  const europeanCountries = new Set([
    "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR",
    "DE", "GR", "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL",
    "PL", "PT", "RO", "SK", "SI", "ES", "SE", "CH", "NO",
  ]);
  if (europeanCountries.has(country)) return "EU";

  const middleEastCountries = new Set(["BH", "KW", "OM", "QA", "SA"]);
  if (middleEastCountries.has(country)) return "AE";

  return "US";
}

function withGeoCookies(request: NextRequest, response: NextResponse) {
  const cfCountry = request.headers.get("cf-ipcountry");
  const vercelCountry = request.headers.get("x-vercel-ip-country");
  const rawCountry = cfCountry && cfCountry !== "XX" ? cfCountry : vercelCountry;

  if (!rawCountry) return response;

  const isProdDomain = request.nextUrl.hostname.endsWith("orivraa.com");
  const cookieOptions = {
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
    sameSite: "lax" as const,
    secure: request.nextUrl.protocol === "https:",
    ...(isProdDomain ? { domain: ".orivraa.com" } : {}),
  };

  response.cookies.set("orivraa_geo_country", mapToSupportedMarket(rawCountry), cookieOptions);
  response.cookies.set(
    "orivraa_geo_source",
    cfCountry && cfCountry !== "XX" ? "cloudflare" : "vercel",
    cookieOptions,
  );
  response.cookies.set("orivraa_geo_raw", rawCountry.toUpperCase(), cookieOptions);
  response.headers.set("x-orivraa-country", mapToSupportedMarket(rawCountry));
  return response;
}

export function middleware(request: NextRequest) {
  // request.nextUrl.hostname is the most reliable source in Next.js edge middleware.
  // It reflects the actual custom domain Vercel matched (e.g. m.orivraa.com),
  // whereas x-forwarded-host can be an internal Vercel hostname.
  const hostname = (
    request.nextUrl.hostname ||
    request.headers.get("host") ||
    ""
  )
    .toLowerCase()
    .split(":")[0];
  const pathname = request.nextUrl.pathname;

  // Skip static files, API routes, and Next.js internals
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/") ||
    pathname.includes(".") // static files (favicon.ico, images, etc.)
  ) {
    return withGeoCookies(request, NextResponse.next());
  }

  // Detect mobile subdomain: m.orivraa.com or m.localhost
  const isMobileSubdomain = hostname === "m" || hostname.startsWith("m.");

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-url", request.url);
  requestHeaders.set("x-pathname", pathname);

  if (!isMobileSubdomain) {
    const userAgent = request.headers.get("user-agent") || "";
    const isMobileUserAgent = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    const forceDesktop = request.cookies.get("orivraa_force_desktop")?.value === "true";
    // Never redirect crawlers/bots to the mobile subdomain — Googlebot's smartphone
    // crawler uses a mobile UA (Android/iPhone) but should index the canonical www version.
    const isCrawlerBot = /bot|crawl|spider|slurp|ia_archiver|prerender/i.test(userAgent);

    const isDashboardPath = pathname.startsWith("/dashboard");
    const isMobilePath = pathname === "/m" || pathname.startsWith("/m/");
    const firstSegment = pathname.split("/")[1];
    const hasMobileEquivalent = MOBILE_TOP_SEGMENTS.has(firstSegment);

    if (
      isMobileUserAgent &&
      !forceDesktop &&
      !isCrawlerBot &&
      (isDashboardPath || isMobilePath || hasMobileEquivalent)
    ) {
      const mobileUrl = new URL(request.url);
      const host = hostname;
      if (host === "orivraa.com") {
        mobileUrl.hostname = "m.orivraa.com";
      } else if (host.startsWith("www.")) {
        mobileUrl.hostname = host.replace("www.", "m.");
      } else if (host === "localhost") {
        mobileUrl.hostname = "m.localhost";
      } else if (!host.startsWith("m.")) {
        mobileUrl.hostname = `m.${host}`;
      }

      const redirectResponse = NextResponse.redirect(mobileUrl, 302);
      return withGeoCookies(request, redirectResponse);
    }

    return withGeoCookies(
      request,
      NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      })
    );
  }

  const isMobilePath = pathname === "/m" || pathname.startsWith("/m/");
  const isDashboardPath = pathname.startsWith("/dashboard");
  const firstSegment = pathname.split("/")[1];
  const hasMobileEquivalent = MOBILE_TOP_SEGMENTS.has(firstSegment);

  // If we are on the mobile subdomain but the pathname does not represent a mobile app page or a dashboard page,
  // we redirect them back to the main domain so they can browse the landing page normally.
  if (pathname !== "/" && !isMobilePath && !isDashboardPath && !hasMobileEquivalent) {
    const desktopUrl = new URL(request.url);
    const host = hostname;
    if (host.startsWith("m.")) {
      desktopUrl.hostname = host.substring(2);
    } else if (host === "m") {
      desktopUrl.hostname = "localhost"; // fallback
    }
    return withGeoCookies(request, NextResponse.redirect(desktopUrl, 302));
  }

  // Already on /m/* path — don't double-rewrite
  if (isMobilePath) {
    return withGeoCookies(
      request,
      NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      })
    );
  }

  // Root → mobile home (POS)
  if (pathname === "/") {
    return withGeoCookies(
      request,
      NextResponse.rewrite(new URL("/m/pos", request.url), {
        request: {
          headers: requestHeaders,
        },
      }),
    );
  }

  // Dashboard paths have no mobile equivalent — send shopkeepers to the POS
  if (isDashboardPath) {
    return withGeoCookies(
      request,
      NextResponse.redirect(new URL("/m/pos", request.url)),
    );
  }

  // Only rewrite paths whose first segment has a mobile equivalent.
  if (hasMobileEquivalent) {
    return withGeoCookies(
      request,
      NextResponse.rewrite(new URL(`/m${pathname}`, request.url), {
        request: {
          headers: requestHeaders,
        },
      }),
    );
  }

  return withGeoCookies(
    request,
    NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    }),
  );
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

