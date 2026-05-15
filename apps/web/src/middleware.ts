import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

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

  if (isMobileSubdomain) {
    // Already on /m/* path — don't double-rewrite
    if (pathname.startsWith("/m")) {
      return NextResponse.next();
    }
    // Rewrite root → /m/pos (billing screen is the home)
    const targetPath = pathname === "/" ? "/m/pos" : `/m${pathname}`;
    return NextResponse.rewrite(new URL(targetPath, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
