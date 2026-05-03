import { google } from "googleapis";

const DEFAULT_SITEMAP_URL = "https://www.orivraa.com/sitemap.xml";
const SEARCH_CONSOLE_SCOPE = "https://www.googleapis.com/auth/webmasters";

type ServiceAccountCredentials = {
  client_email?: string;
  private_key?: string;
  project_id?: string;
};

type OAuthCredentials = {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  accountEmail?: string;
};

type AuthConfig =
  | { mode: "service-account"; credentials: ServiceAccountCredentials }
  | { mode: "oauth-user"; credentials: OAuthCredentials };

function getRequiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function getOptionalEnv(name: string) {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
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

function parseOAuthCredentialsFromEnv(): OAuthCredentials | null {
  const clientId = getOptionalEnv("GOOGLE_SEARCH_CONSOLE_OAUTH_CLIENT_ID");
  const clientSecret = getOptionalEnv("GOOGLE_SEARCH_CONSOLE_OAUTH_CLIENT_SECRET");
  const refreshToken = getOptionalEnv("GOOGLE_SEARCH_CONSOLE_OAUTH_REFRESH_TOKEN");
  const accountEmail = getOptionalEnv("GOOGLE_SEARCH_CONSOLE_OAUTH_ACCOUNT_EMAIL");
  const providedCount = [clientId, clientSecret, refreshToken].filter(Boolean).length;

  if (providedCount === 0) {
    return null;
  }

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      "To use a Google owner account, set GOOGLE_SEARCH_CONSOLE_OAUTH_CLIENT_ID, GOOGLE_SEARCH_CONSOLE_OAUTH_CLIENT_SECRET, and GOOGLE_SEARCH_CONSOLE_OAUTH_REFRESH_TOKEN.",
    );
  }

  return {
    clientId,
    clientSecret,
    refreshToken,
    accountEmail,
  };
}

function resolveAuthConfig(): AuthConfig {
  const oauthCredentials = parseOAuthCredentialsFromEnv();
  if (oauthCredentials) {
    return { mode: "oauth-user", credentials: oauthCredentials };
  }

  const serviceAccountJson = getOptionalEnv(
    "GOOGLE_SEARCH_CONSOLE_SERVICE_ACCOUNT_JSON",
  );
  if (serviceAccountJson) {
    return {
      mode: "service-account",
      credentials: parseServiceAccountCredentials(serviceAccountJson),
    };
  }

  throw new Error(
    "No Search Console credentials configured. Set GOOGLE_SEARCH_CONSOLE_SERVICE_ACCOUNT_JSON, or use a Google owner account with GOOGLE_SEARCH_CONSOLE_OAUTH_CLIENT_ID, GOOGLE_SEARCH_CONSOLE_OAUTH_CLIENT_SECRET, and GOOGLE_SEARCH_CONSOLE_OAUTH_REFRESH_TOKEN.",
  );
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

async function getServiceAccountAccessToken(credentials: ServiceAccountCredentials) {
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

async function getOAuthUserAccessToken(credentials: OAuthCredentials) {
  const oauthClient = new google.auth.OAuth2(
    credentials.clientId,
    credentials.clientSecret,
  );

  oauthClient.setCredentials({ refresh_token: credentials.refreshToken });

  const tokenResponse = await oauthClient.getAccessToken();
  const accessToken =
    typeof tokenResponse === "string" ? tokenResponse : tokenResponse?.token;

  if (!accessToken) {
    throw new Error(
      "Could not obtain a Google access token from GOOGLE_SEARCH_CONSOLE_OAUTH_REFRESH_TOKEN",
    );
  }

  return accessToken;
}

async function getAccessToken(authConfig: AuthConfig) {
  if (authConfig.mode === "oauth-user") {
    return getOAuthUserAccessToken(authConfig.credentials);
  }

  return getServiceAccountAccessToken(authConfig.credentials);
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
  const authConfig = resolveAuthConfig();
  const accessToken = await getAccessToken(authConfig);

  await submitSitemap(property, sitemapUrl, accessToken);

  console.log(`Submitted ${sitemapUrl} to Search Console property ${property}.`);

  if (authConfig.mode === "oauth-user") {
    const accountLabel = authConfig.credentials.accountEmail
      ? ` ${authConfig.credentials.accountEmail}`
      : "";
    console.log(`Authenticated with OAuth refresh token for Google owner account${accountLabel}.`);
    return;
  }

  console.log(
    `Ensure the service account ${authConfig.credentials.client_email} has owner or full access in Search Console.`,
  );
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});