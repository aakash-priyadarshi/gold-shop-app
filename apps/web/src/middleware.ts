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

function isApprovedDomain(hostname: string): boolean {
  const lowerHost = hostname.toLowerCase().split(":")[0];
  return (
    lowerHost === "orivraa.com" ||
    lowerHost.endsWith(".orivraa.com") ||
    lowerHost === "localhost" ||
    lowerHost.endsWith(".localhost") ||
    lowerHost.endsWith(".vercel.app")
  );
}

function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function generateRedirectWarningHtml(targetUrl: string, displayDomain: string): string {
  const safeTargetUrl = escapeHtml(targetUrl);
  const safeDisplayDomain = escapeHtml(displayDomain);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Security Alert: Leaving Orivraa</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #09090b;
      --card-bg: rgba(20, 20, 25, 0.7);
      --primary: #f59e0b;
      --primary-hover: #d97706;
      --text: #f4f4f5;
      --text-muted: #a1a1aa;
      --border: rgba(245, 158, 11, 0.2);
      --red: #ef4444;
      --red-hover: #dc2626;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: 'Outfit', sans-serif;
      background-color: var(--bg);
      background-image: 
        radial-gradient(circle at 10% 20%, rgba(245, 158, 11, 0.05) 0%, transparent 40%),
        radial-gradient(circle at 90% 80%, rgba(245, 158, 11, 0.03) 0%, transparent 40%);
      color: var(--text);
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      overflow: hidden;
      padding: 20px;
    }

    .container {
      max-width: 500px;
      width: 100%;
      background: var(--card-bg);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid var(--border);
      border-radius: 24px;
      padding: 40px;
      text-align: center;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5), 0 0 50px rgba(245, 158, 11, 0.05);
      animation: fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .icon-wrapper {
      width: 72px;
      height: 72px;
      background: rgba(245, 158, 11, 0.1);
      border: 1px solid rgba(245, 158, 11, 0.3);
      border-radius: 50%;
      display: flex;
      justify-content: center;
      align-items: center;
      margin: 0 auto 24px;
      box-shadow: 0 0 20px rgba(245, 158, 11, 0.1);
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0% {
        box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.2);
      }
      70% {
        box-shadow: 0 0 0 15px rgba(245, 158, 11, 0);
      }
      100% {
        box-shadow: 0 0 0 0 rgba(245, 158, 11, 0);
      }
    }

    .icon {
      color: var(--primary);
    }

    h1 {
      font-size: 28px;
      font-weight: 600;
      margin-bottom: 12px;
      letter-spacing: -0.5px;
      background: linear-gradient(135deg, #ffffff 0%, #f59e0b 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .warning-text {
      color: var(--text-muted);
      font-size: 16px;
      line-height: 1.6;
      margin-bottom: 24px;
    }

    .domain-card {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 16px;
      padding: 16px;
      margin-bottom: 32px;
      font-family: monospace;
      font-size: 14px;
      word-break: break-all;
      color: #f59e0b;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
    }

    .domain-label {
      font-family: 'Outfit', sans-serif;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: var(--text-muted);
      margin-bottom: 4px;
    }

    .domain-value {
      font-weight: 600;
      font-size: 16px;
    }

    .actions {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .btn {
      width: 100%;
      padding: 14px 28px;
      font-family: 'Outfit', sans-serif;
      font-size: 15px;
      font-weight: 500;
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      display: inline-flex;
      justify-content: center;
      align-items: center;
      text-decoration: none;
    }

    .btn-primary {
      background: var(--primary);
      border: none;
      color: #000000;
      box-shadow: 0 4px 12px rgba(245, 158, 11, 0.2);
    }

    .btn-primary:hover {
      background: var(--primary-hover);
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(245, 158, 11, 0.3);
    }

    .btn-secondary {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: var(--text);
    }

    .btn-secondary:hover {
      background: rgba(255, 255, 255, 0.1);
      transform: translateY(-2px);
    }

    .footer {
      margin-top: 32px;
      font-size: 12px;
      color: var(--text-muted);
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon-wrapper">
      <svg class="icon" xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
        <line x1="12" y1="9" x2="12" y2="13"/>
        <line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
    </div>
    <h1>Security Warning</h1>
    <p class="warning-text">You are attempting to leave Orivraa and are being redirected to an external, untrusted website.</p>
    
    <div class="domain-card">
      <div class="domain-label">Destination Domain</div>
      <div class="domain-value">${safeDisplayDomain}</div>
    </div>

    <div class="actions">
      <a href="https://orivraa.com" class="btn btn-primary">Return to Safety (Orivraa.com)</a>
      <a href="${safeTargetUrl}" rel="noopener noreferrer nofollow" class="btn btn-secondary">Proceed to Destination Anyway</a>
    </div>

    <div class="footer">
      Powered by Orivraa Advanced Security Protection
    </div>
  </div>
</body>
</html>`;
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

      if (!isApprovedDomain(mobileUrl.hostname)) {
        const html = generateRedirectWarningHtml(mobileUrl.toString(), mobileUrl.hostname);
        const warningResponse = new NextResponse(html, {
          headers: { "Content-Type": "text/html" },
        });
        return withGeoCookies(request, warningResponse);
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

    if (!isApprovedDomain(desktopUrl.hostname)) {
      const html = generateRedirectWarningHtml(desktopUrl.toString(), desktopUrl.hostname);
      const warningResponse = new NextResponse(html, {
        headers: { "Content-Type": "text/html" },
      });
      return withGeoCookies(request, warningResponse);
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

