import type { Language } from "@/store/preferences";
import { isUiLocale } from "@gold-shop/shared";

export function isSuspiciousFallback(
  source: string,
  translated: string,
): boolean {
  const normalizedSource = source.trim();
  const normalizedTranslated = translated.trim();

  if (!normalizedSource || normalizedSource !== normalizedTranslated) {
    return false;
  }

  if (!/[A-Za-z]/.test(normalizedSource)) {
    return false;
  }

  return /\s/.test(normalizedSource) || normalizedSource.length > 24;
}

/**
 * A localized public route controls only the current presentation. It must not
 * overwrite the language saved for the authenticated dashboard.
 */
export function getPublicRouteLocale(pathname: string | null): Language | null {
  if (!pathname) return null;
  if (pathname === "/about" || pathname === "/tutorial") return "en";

  const routeLocale = pathname.match(
    /^\/(?:about|tutorial)\/([a-z]{2})(?:\/|$)/,
  )?.[1];

  return routeLocale && isUiLocale(routeLocale) ? routeLocale : null;
}
