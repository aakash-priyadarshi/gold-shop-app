/**
 * Validate that a redirect URL is a safe internal path.
 * Prevents open redirect attacks by ensuring the URL starts with "/"
 * and doesn't contain protocol-relative URLs (//) or absolute URLs.
 */
export function isSafeRedirectUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  // Must start with a single slash (internal path)
  if (!url.startsWith('/')) return false;
  // Block protocol-relative URLs (//evil.com)
  if (url.startsWith('//')) return false;
  if (url.includes('\\') || /[\s]/.test(url)) return false;
  // Block scheme-bearing values such as /javascript:alert(1)
  if (url.includes(':')) return false;
  return true;
}

/**
 * Sanitize a redirect URL, returning a safe fallback if invalid.
 */
export function sanitizeRedirectUrl(url: string | null | undefined, fallback = '/'): string {
  if (!url || !isSafeRedirectUrl(url)) return fallback;
  return url;
}
