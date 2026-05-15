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
]);

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
    return NextResponse.next();
  }

  // Detect mobile subdomain: m.orivraa.com or m.localhost
  const isMobileSubdomain = hostname === "m" || hostname.startsWith("m.");

  if (!isMobileSubdomain) {
    return NextResponse.next();
  }

  // Already on /m/* path — don't double-rewrite
  if (pathname === "/m" || pathname.startsWith("/m/")) {
    return NextResponse.next();
  }

  // Root → mobile home (POS)
  if (pathname === "/") {
    return NextResponse.rewrite(new URL("/m/pos", request.url));
  }

  // Only rewrite paths whose first segment has a mobile equivalent.
  // Everything else (auth, dashboard, pricing, settings, …) is served by the
  // regular desktop page on the same deployment.
  const firstSegment = pathname.split("/")[1];
  if (MOBILE_TOP_SEGMENTS.has(firstSegment)) {
    return NextResponse.rewrite(new URL(`/m${pathname}`, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

