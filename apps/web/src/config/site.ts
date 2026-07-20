/**
 * Central site URL + SEO origin configuration.
 *
 * Use this everywhere instead of hardcoding "https://www.orivraa.com" so that
 * staging / preview / region deployments emit correct canonical, sitemap,
 * robots, OpenGraph and JSON-LD URLs.
 *
 * Resolution order:
 *   1. NEXT_PUBLIC_SITE_URL            (explicit, preferred)
 *   2. VERCEL_PROJECT_PRODUCTION_URL   (production deployment domain)
 *   3. NEXT_PUBLIC_VERCEL_URL           (auto-set on Vercel preview deploys)
 *   4. https://www.orivraa.com          (production default)
 */

const PRODUCTION_SITE_URL = "https://www.orivraa.com";

function normalize(url: string): string {
  const trimmed = url.trim().replace(/\/+$/, "");
  if (!trimmed) return PRODUCTION_SITE_URL;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export const SITE_URL: string = (() => {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return normalize(explicit);

  // In production, never let a Vercel preview/slug domain become the canonical
  // origin. This prevents sitemaps, robots Host, and OpenGraph URLs from
  // pointing to a deployment URL and causing Google to unlist pages.
  if (process.env.VERCEL_ENV === "production") {
    const productionUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
    if (
      productionUrl &&
      !productionUrl.toLowerCase().includes("vercel.app")
    ) {
      return normalize(productionUrl);
    }
    return PRODUCTION_SITE_URL;
  }

  const vercel = process.env.NEXT_PUBLIC_VERCEL_URL?.trim();
  if (vercel) return normalize(vercel);

  return PRODUCTION_SITE_URL;
})();

/** Mobile sibling domain (m.orivraa.com in production, derived otherwise). */
export const MOBILE_SITE_URL: string = (() => {
  const explicit = process.env.NEXT_PUBLIC_MOBILE_SITE_URL?.trim();
  if (explicit) return normalize(explicit);
  try {
    const u = new URL(SITE_URL);
    const host = u.host.replace(/^www\./, "");
    return `${u.protocol}//m.${host}`;
  } catch {
    return "https://m.orivraa.com";
  }
})();

/** Build an absolute URL on the canonical site origin. */
export function absoluteUrl(path = "/"): string {
  const clean = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_URL}${clean === "/" ? "/" : clean}`;
}
