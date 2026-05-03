import { google } from "googleapis";

const DEFAULT_SITEMAP_URL = "https://www.orivraa.com/sitemap.xml";
const SEARCH_CONSOLE_SCOPE = "https://www.googleapis.com/auth/webmasters";

type ServiceAccountCredentials = {
  client_email?: string;
  private_key?: string;
  project_id?: string;
};

function getRequiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function isDryRun() {
  return process.argv.includes("--dry-run") || process.env.DRY_RUN === "1";
}

function parseServiceAccountCredentials(rawJson: string): ServiceAccountCredentials {
  let credentials: ServiceAccountCredentials;

  try {
    credentials = JSON.parse(rawJson) as ServiceAccountCredentials;
  } catch (error) {
    throw new Error(
      `GOOGLE_SEARCH_CONSOLE_SERVICE_ACCOUNT_JSON is not valid JSON: ${String(error)}`,
    );
  }

  if (!credentials.client_email || !credentials.private_key) {
    throw new Error(
      "GOOGLE_SEARCH_CONSOLE_SERVICE_ACCOUNT_JSON must include client_email and private_key",
    );
  }

  return credentials;
}

async function fetchSitemapSummary(sitemapUrl: string) {
  const response = await fetch(sitemapUrl, {
    headers: { "user-agent": "orivraa-search-console-sync/1.0" },
    redirect: "follow",
  });

  if (!response.ok) {
    throw new Error(
      `Sitemap ${sitemapUrl} returned ${response.status} ${response.statusText}`,
    );
  }

  const xml = await response.text();
  return {
    urlCount: (xml.match(/<loc>/g) ?? []).length,
    bytes: Buffer.byteLength(xml, "utf8"),
  };
}

async function getAccessToken(credentials: ServiceAccountCredentials) {
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: [SEARCH_CONSOLE_SCOPE],
  });

  const client = await auth.getClient();
  const tokenResponse = await client.getAccessToken();
  const accessToken =
    typeof tokenResponse === "string" ? tokenResponse : tokenResponse?.token;

  if (!accessToken) {
    throw new Error("Could not obtain a Google access token for Search Console");
  }

  return accessToken;
}

async function submitSitemap(property: string, sitemapUrl: string, accessToken: string) {
  const endpoint = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(
    property,
  )}/sitemaps/${encodeURIComponent(sitemapUrl)}`;

  const response = await fetch(endpoint, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Search Console sitemap submission failed with ${response.status} ${response.statusText}: ${body}`,
    );
  }
}

async function main() {
  const sitemapUrl =
    process.env.SEARCH_CONSOLE_SITEMAP_URL?.trim() || DEFAULT_SITEMAP_URL;
  const dryRun = isDryRun();
  const summary = await fetchSitemapSummary(sitemapUrl);

  console.log(
    `Sitemap reachable: ${sitemapUrl} (${summary.urlCount} URLs, ${summary.bytes} bytes)`,
  );

  if (dryRun) {
    console.log("Dry run enabled, skipping Search Console submission.");
    return;
  }

  const property = getRequiredEnv("SEARCH_CONSOLE_PROPERTY");
  const credentials = parseServiceAccountCredentials(
    getRequiredEnv("GOOGLE_SEARCH_CONSOLE_SERVICE_ACCOUNT_JSON"),
  );
  const accessToken = await getAccessToken(credentials);

  await submitSitemap(property, sitemapUrl, accessToken);

  console.log(`Submitted ${sitemapUrl} to Search Console property ${property}.`);
  console.log(
    `Ensure the service account ${credentials.client_email} has owner or full access in Search Console.`,
  );
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});