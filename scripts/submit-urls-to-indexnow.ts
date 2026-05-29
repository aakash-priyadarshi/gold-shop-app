/**
 * submit-urls-to-indexnow.ts
 *
 * Pushes URLs to IndexNow (Bing, Yandex, Seznam, Naver, …) to trigger an
 * immediate recrawl. Unlike Google's Indexing API, IndexNow has no per-day
 * quota for normal volumes, so we default to submitting the full sitemap.
 *
 * Ownership is proven via a key file served at:
 *   https://www.orivraa.com/indexnow-key.txt   (apps/web/src/app/indexnow-key.txt/route.ts)
 * which returns the value of the INDEXNOW_KEY env var.
 *
 * Required env:
 *   INDEXNOW_KEY   – the IndexNow key (any 8–128 hex chars; generate once and keep stable)
 *
 * Optional env:
 *   SEO_SITE_URL              – site origin (default https://www.orivraa.com)
 *   SEARCH_CONSOLE_SITEMAP_URL – sitemap to read URLs from (default <site>/sitemap.xml)
 *
 * Usage:
 *   pnpm seo:submit-indexnow                  # submit URLs from the live sitemap
 *   pnpm seo:submit-indexnow --url=https://...# submit a single URL
 *   pnpm seo:submit-indexnow --dry-run        # print payload without sending
 */

const INDEXNOW_ENDPOINT = "https://api.indexnow.org/IndexNow";
const DEFAULT_SITE_URL = "https://www.orivraa.com";
// IndexNow accepts up to 10,000 URLs per request.
const MAX_URLS_PER_REQUEST = 10000;

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

function resolveSiteUrl(): string {
  const raw = getOptionalEnv("SEO_SITE_URL") ?? DEFAULT_SITE_URL;
  return raw.replace(/\/+$/, "");
}

async function fetchUrlsFromSitemap(sitemapUrl: string): Promise<string[]> {
  const response = await fetch(sitemapUrl, {
    headers: { "user-agent": "orivraa-indexnow-sync/1.0" },
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

async function resolveUrls(siteUrl: string): Promise<string[]> {
  const singleUrl = getArgValue("--url=");
  if (singleUrl) return [singleUrl];

  const sitemap =
    process.env.SEARCH_CONSOLE_SITEMAP_URL?.trim() || `${siteUrl}/sitemap.xml`;
  return fetchUrlsFromSitemap(sitemap);
}

async function submitBatch(
  urls: string[],
  host: string,
  key: string,
  keyLocation: string,
) {
  const response = await fetch(INDEXNOW_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify({ host, key, keyLocation, urlList: urls }),
  });

  const body = await response.text().catch(() => "");
  return { ok: response.ok, status: response.status, body };
}

async function main() {
  const siteUrl = resolveSiteUrl();
  const host = new URL(siteUrl).host;
  const dryRun = isDryRun();

  const key = getOptionalEnv("INDEXNOW_KEY");
  if (!key && !dryRun) {
    console.log(
      "INDEXNOW_KEY not set — skipping IndexNow submission. " +
        "Set INDEXNOW_KEY (and host the same value at <site>/indexnow-key.txt) to enable.",
    );
    return;
  }
  const keyLocation = `${siteUrl}/indexnow-key.txt`;

  const allUrls = await resolveUrls(siteUrl);
  // Only submit same-host URLs — IndexNow rejects mixed hosts in one request.
  const urls = allUrls.filter((u) => {
    try {
      return new URL(u).host === host;
    } catch {
      return false;
    }
  });

  console.log(
    `Submitting ${urls.length} URLs to IndexNow for ${host}${dryRun ? " (dry run)" : ""}.`,
  );

  if (dryRun) {
    urls.slice(0, 50).forEach((u) => console.log(`  - ${u}`));
    if (urls.length > 50) console.log(`  … and ${urls.length - 50} more`);
    return;
  }

  if (urls.length === 0) {
    console.log("No same-host URLs to submit.");
    return;
  }

  let successBatches = 0;
  let failBatches = 0;

  for (let i = 0; i < urls.length; i += MAX_URLS_PER_REQUEST) {
    const batch = urls.slice(i, i + MAX_URLS_PER_REQUEST);
    const result = await submitBatch(batch, host, key as string, keyLocation);
    // IndexNow returns 200 (accepted) or 202 (received). Anything else is a failure.
    if (result.ok || result.status === 202) {
      successBatches += 1;
      console.log(`  ✓ batch of ${batch.length} -> ${result.status}`);
    } else {
      failBatches += 1;
      console.warn(
        `  ✗ batch of ${batch.length} -> ${result.status} ${result.body?.slice(0, 200) ?? ""}`,
      );
    }
  }

  console.log(`\nDone. Batches OK: ${successBatches}, Failed: ${failBatches}`);

  if (failBatches > 0 && successBatches === 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
