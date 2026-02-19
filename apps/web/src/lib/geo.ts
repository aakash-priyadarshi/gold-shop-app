/**
 * Geo-based hero video selection.
 *
 * Maps the visitor's country (from Cloudflare CF-IPCountry header)
 * to one of three regional hero videos stored in R2 at /vid/.
 *
 * Country → Video mapping:
 *   IN, NP           → IN-woman.mp4   (South-Asia)
 *   AE               → UAE-woman.mp4  (Gulf)
 *   Everything else   → EU-woman.mp4  (Default / Western)
 */

const CDN_BASE =
  process.env.NEXT_PUBLIC_MEDIA_CDN_BASE_URL || 'https://images.orivraa.com';

/** Filename per region bucket. */
const HERO_VIDEOS: Record<string, string> = {
  IN: 'IN-woman.mp4',
  NP: 'IN-woman.mp4',
  AE: 'UAE-woman.mp4',
};

const DEFAULT_VIDEO = 'EU-woman.mp4';

/**
 * Return the full CDN URL for the hero video that matches the given
 * ISO-3166 alpha-2 country code (upper-cased).
 *
 * Unknown / missing / special codes ("XX", "T1", etc.) resolve to the
 * EU default video.
 */
export function getHeroVideoUrl(countryCode: string | null | undefined): string {
  const code = (countryCode ?? '').toUpperCase().trim();
  const filename = HERO_VIDEOS[code] || DEFAULT_VIDEO;
  return `${CDN_BASE}/vid/${filename}`;
}

/**
 * Thin wrapper that also returns the detected country so the caller
 * can forward it as a prop (useful for analytics / debugging).
 */
export function resolveHeroVideo(countryCode: string | null | undefined) {
  return {
    videoSrc: getHeroVideoUrl(countryCode),
    detectedCountry: (countryCode ?? 'XX').toUpperCase(),
  };
}
