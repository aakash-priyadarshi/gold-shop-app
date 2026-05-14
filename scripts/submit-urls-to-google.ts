/**
 * submit-urls-to-google.ts
 *
 * Pushes individual URLs to Google's Indexing API to nudge Googlebot to recrawl.
 *
 * Notes / disclaimers:
 * - The Indexing API is officially supported for JobPosting & BroadcastEvent
 *   structured data, but submitting any URL is harmless and often triggers a
 *   recrawl in practice. We use it to accelerate "Discovered – currently not
 *   indexed" pages.
 * - Quota: 200 URL_UPDATED requests per day per project (default).
 * - Auth: reuses the same OAuth refresh token from submit-sitemap-to-google.ts.
 *   The Search Console owner account must also have the Indexing API enabled
 *   in the same Google Cloud project as the OAuth client.
 *
 * Usage:
 *   pnpm seo:submit-urls                         # uses URLS list below
 *   pnpm seo:submit-urls --url=https://...       # submit one URL
 *   pnpm seo:submit-urls --from-sitemap          # fetch URLs from sitemap.xml
 *   pnpm seo:submit-urls --dry-run               # show what would be sent
 */

import { google } from "googleapis";

const DEFAULT_SITEMAP_URL = "https://www.orivraa.com/sitemap.xml";
const INDEXING_SCOPE = "https://www.googleapis.com/auth/indexing";
const INDEXING_ENDPOINT =
  "https://indexing.googleapis.com/v3/urlNotifications:publish";

// Priority URLs to push when no other source is given.
// Keep this list to pages that are genuinely unindexed or recently updated.
// Pages already stably indexed do not need daily nudging (wastes 200/day quota).
const PRIORITY_URLS: string[] = [
  // ── Pages with thin/no internal links (most likely to stay stuck) ──
  "https://www.orivraa.com/jewellery-store-management-software",
  "https://www.orivraa.com/help",

  // ── Jewellery landing pages — updated 2026-05-13 with new pricing content ──
  "https://www.orivraa.com/jewellery-shop-software",
  "https://www.orivraa.com/jewellery-ecommerce-software",
  "https://www.orivraa.com/jewellery-inventory-software",
  "https://www.orivraa.com/jewellery-pos-software",
  "https://www.orivraa.com/jewellery-shop-billing-software",

  // ── Compare pages — updated 2026-05-13, linked only from 3 indexed pages ──
  "https://www.orivraa.com/compare/orivraa-vs-tally",
  "https://www.orivraa.com/compare/orivraa-vs-marg-erp",
  "https://www.orivraa.com/compare/jewellery-crm-software-india",
  "https://www.orivraa.com/compare/billing-software-india-jewellery-shops",

  // ── Utility pages not in main nav ──
  "https://www.orivraa.com/ai-sales-team",
  "https://www.orivraa.com/designs",
  "https://www.orivraa.com/shop",
  "https://www.orivraa.com/for-sellers",
  "https://www.orivraa.com/support",
  "https://www.orivraa.com/privacy",
  "https://www.orivraa.com/terms",
  "https://www.orivraa.com/download/changelog",
  "https://www.orivraa.com/rfq/create",

  // ── Blog posts not yet indexed ──
  "https://www.orivraa.com/blog/best-jewellery-shop-software-2025",
  "https://www.orivraa.com/blog/best-jewellery-store-management-software-2026",
  "https://www.orivraa.com/blog/hallmarking-compliance-checklist-jewellers-india",
  "https://www.orivraa.com/blog/how-jewellery-pricing-works",
  "https://www.orivraa.com/blog/how-jewellery-shops-can-go-digital",
  "https://www.orivraa.com/blog/how-to-calculate-gst-on-gold-jewellery-india",
  "https://www.orivraa.com/blog/how-to-manage-gold-inventory-jewellery-store",
  "https://www.orivraa.com/blog/how-to-sell-jewellery-online-2025",
  "https://www.orivraa.com/blog/jewellery-gst-billing-guide-india",
  "https://www.orivraa.com/blog/jewellery-shop-billing-software-guide",
  "https://www.orivraa.com/blog/zoho-vs-orivraa-jewellery-business",
];

type OAuthCredentials = {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
};

function getOptionalEnv(name: string) {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

function isDryRun() {
  return process.argv.includes("--dry-run") || process.env.DRY_RUN === "1";
}

function getArgValue(prefix: string): string | undefined {
  const arg = process.argv.find((a) => a.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : undefined;
}

function parseOAuthCredentials(): OAuthCredentials {
  const clientId = getOptionalEnv("GOOGLE_SEARCH_CONSOLE_OAUTH_CLIENT_ID");
  const clientSecret = getOptionalEnv("GOOGLE_SEARCH_CONSOLE_OAUTH_CLIENT_SECRET");
  const refreshToken = getOptionalEnv("GOOGLE_SEARCH_CONSOLE_OAUTH_REFRESH_TOKEN");

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      "Set GOOGLE_SEARCH_CONSOLE_OAUTH_CLIENT_ID, GOOGLE_SEARCH_CONSOLE_OAUTH_CLIENT_SECRET, and GOOGLE_SEARCH_CONSOLE_OAUTH_REFRESH_TOKEN.",
    );
  }

  return { clientId, clientSecret, refreshToken };
}

async function getAccessToken(credentials: OAuthCredentials) {
  const oauth = new google.auth.OAuth2(
    credentials.clientId,
    credentials.clientSecret,
  );
  oauth.setCredentials({ refresh_token: credentials.refreshToken });

  // Request the Indexing API scope explicitly when refreshing.
  // The refresh token must have been issued with the indexing scope.
  const tokenResponse = await oauth.getAccessToken();
  const accessToken =
    typeof tokenResponse === "string" ? tokenResponse : tokenResponse?.token;

  if (!accessToken) {
    throw new Error("Could not obtain a Google access token for the Indexing API.");
  }

  return accessToken;
}

async function publishUrl(url: string, accessToken: string) {
  const response = await fetch(INDEXING_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ url, type: "URL_UPDATED" }),
  });

  if (!response.ok) {
    const body = await response.text();
    return { ok: false, status: response.status, body };
  }

  return { ok: true, status: response.status };
}

async function fetchUrlsFromSitemap(sitemapUrl: string): Promise<string[]> {
  const response = await fetch(sitemapUrl, {
    headers: { "user-agent": "orivraa-indexing-sync/1.0" },
    redirect: "follow",
  });
  if (!response.ok) {
    throw new Error(
      `Sitemap ${sitemapUrl} returned ${response.status} ${response.statusText}`,
    );
  }
  const xml = await response.text();
  const matches = xml.match(/<loc>([^<]+)<\/loc>/g) ?? [];
  return matches
    .map((m) => m.replace(/<\/?loc>/g, "").trim())
    .filter((u) => u.length > 0);
}

async function resolveUrls(): Promise<string[]> {
  const singleUrl = getArgValue("--url=");
  if (singleUrl) return [singleUrl];

  if (process.argv.includes("--from-sitemap")) {
    const sitemap =
      process.env.SEARCH_CONSOLE_SITEMAP_URL?.trim() || DEFAULT_SITEMAP_URL;
    return fetchUrlsFromSitemap(sitemap);
  }

  return PRIORITY_URLS;
}

async function main() {
  const urls = await resolveUrls();
  const dryRun = isDryRun();

  console.log(`Submitting ${urls.length} URLs to Google Indexing API${dryRun ? " (dry run)" : ""}.`);

  if (dryRun) {
    urls.forEach((u) => console.log(`  - ${u}`));
    return;
  }

  const credentials = parseOAuthCredentials();
  const accessToken = await getAccessToken(credentials);

  let successCount = 0;
  let failCount = 0;

  for (const url of urls) {
    const result = await publishUrl(url, accessToken);
    if (result.ok) {
      successCount += 1;
      console.log(`  ✓ ${url}`);
    } else {
      failCount += 1;
      // 403 typically means the OAuth user lacks Indexing API permission for the property,
      // or the Indexing API isn't enabled in the Cloud project.
      console.warn(`  ✗ ${url} -> ${result.status} ${result.body?.slice(0, 200) ?? ""}`);
    }
    // Be polite — small delay to stay under per-second quota
    await new Promise((r) => setTimeout(r, 150));
  }

  console.log(`\nDone. Success: ${successCount}, Failed: ${failCount}`);

  if (failCount > 0 && successCount === 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
