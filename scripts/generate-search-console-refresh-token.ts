import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import process from "node:process";
import { createInterface } from "node:readline/promises";
import { google } from "googleapis";

const SEARCH_CONSOLE_SCOPE = "https://www.googleapis.com/auth/webmasters";
const DEFAULT_REDIRECT_URI = "http://localhost";

type OAuthClientConfig = {
  client_id?: string;
  client_secret?: string;
  redirect_uris?: string[];
};

type OAuthClientFile = {
  installed?: OAuthClientConfig;
  web?: OAuthClientConfig;
};

type ResolvedClientCredentials = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  source: string;
};

function hasFlag(flag: string) {
  return process.argv.includes(flag);
}

function getArg(name: string) {
  const inlineArg = process.argv.find((arg) => arg.startsWith(`${name}=`));
  if (inlineArg) {
    return inlineArg.slice(name.length + 1).trim();
  }

  const argIndex = process.argv.indexOf(name);
  if (argIndex === -1) {
    return undefined;
  }

  const nextValue = process.argv[argIndex + 1];
  return nextValue?.trim() || undefined;
}

function getOptionalEnv(name: string) {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

function printHelp() {
  console.log(`Generate a Google Search Console OAuth refresh token for a human owner account.

Usage:
  pnpm seo:get-refresh-token [--client-file path/to/client_secret.json]
  pnpm seo:get-refresh-token --print-auth-url

Options:
  --client-file      Path to a Google OAuth client JSON file
  --scope            OAuth scope to request (default: ${SEARCH_CONSOLE_SCOPE})
  --print-auth-url   Print the authorization URL and exit without prompting
  --help             Show this help message

Credential sources:
  1. --client-file path/to/client_secret.json
  2. The only client_secret*.json file in the current directory
  3. Env vars GOOGLE_SEARCH_CONSOLE_OAUTH_CLIENT_ID and GOOGLE_SEARCH_CONSOLE_OAUTH_CLIENT_SECRET

Notes:
  - This flow is designed for Desktop app OAuth clients that use http://localhost.
  - After sign-in, your browser may show a localhost error page. That is expected.
  - Copy the full localhost URL from the browser and paste it back into the terminal.
`);
}

function findDefaultClientFile() {
  const matches = readdirSync(process.cwd()).filter((entry) =>
    /^client_secret.*\.json$/i.test(entry),
  );

  if (matches.length === 1) {
    return resolve(process.cwd(), matches[0]);
  }

  if (matches.length > 1) {
    throw new Error(
      "Multiple client_secret*.json files found. Re-run with --client-file to choose one explicitly.",
    );
  }

  return undefined;
}

function parseClientFile(filePath: string): ResolvedClientCredentials {
  let parsedFile: OAuthClientFile;

  try {
    parsedFile = JSON.parse(readFileSync(filePath, "utf8")) as OAuthClientFile;
  } catch (error) {
    throw new Error(`Could not read OAuth client file ${filePath}: ${String(error)}`);
  }

  const clientConfig = parsedFile.installed ?? parsedFile.web;
  if (!clientConfig?.client_id || !clientConfig.client_secret) {
    throw new Error(
      `OAuth client file ${filePath} must include client_id and client_secret under \"installed\" or \"web\".`,
    );
  }

  return {
    clientId: clientConfig.client_id,
    clientSecret: clientConfig.client_secret,
    redirectUri: clientConfig.redirect_uris?.[0]?.trim() || DEFAULT_REDIRECT_URI,
    source: filePath,
  };
}

function resolveClientCredentials(): ResolvedClientCredentials {
  const clientId = getOptionalEnv("GOOGLE_SEARCH_CONSOLE_OAUTH_CLIENT_ID");
  const clientSecret = getOptionalEnv("GOOGLE_SEARCH_CONSOLE_OAUTH_CLIENT_SECRET");
  const redirectUri =
    getOptionalEnv("GOOGLE_SEARCH_CONSOLE_OAUTH_REDIRECT_URI") || DEFAULT_REDIRECT_URI;

  if (clientId || clientSecret) {
    if (!clientId || !clientSecret) {
      throw new Error(
        "Set both GOOGLE_SEARCH_CONSOLE_OAUTH_CLIENT_ID and GOOGLE_SEARCH_CONSOLE_OAUTH_CLIENT_SECRET, or use --client-file.",
      );
    }

    return {
      clientId,
      clientSecret,
      redirectUri,
      source: "environment variables",
    };
  }

  const clientFile = getArg("--client-file") || findDefaultClientFile();
  if (!clientFile) {
    throw new Error(
      "No OAuth client credentials found. Provide --client-file, place one client_secret*.json file in the repo root, or set GOOGLE_SEARCH_CONSOLE_OAUTH_CLIENT_ID and GOOGLE_SEARCH_CONSOLE_OAUTH_CLIENT_SECRET.",
    );
  }

  return parseClientFile(clientFile);
}

function extractAuthorizationCode(value: string) {
  const trimmedValue = value.trim();
  if (!trimmedValue) {
    throw new Error("No authorization code or callback URL was provided.");
  }

  if (!trimmedValue.startsWith("http://") && !trimmedValue.startsWith("https://")) {
    return trimmedValue;
  }

  const callbackUrl = new URL(trimmedValue);
  const code = callbackUrl.searchParams.get("code");
  if (!code) {
    const oauthError = callbackUrl.searchParams.get("error");
    if (oauthError) {
      throw new Error(`Google returned an OAuth error: ${oauthError}`);
    }

    throw new Error("The pasted URL does not include a code query parameter.");
  }

  return code;
}

async function main() {
  if (hasFlag("--help")) {
    printHelp();
    return;
  }

  const scope = getArg("--scope") || SEARCH_CONSOLE_SCOPE;
  const credentials = resolveClientCredentials();
  const oauthClient = new google.auth.OAuth2(
    credentials.clientId,
    credentials.clientSecret,
    credentials.redirectUri,
  );

  const authorizationUrl = oauthClient.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: true,
    scope: [scope],
  });

  if (hasFlag("--print-auth-url")) {
    console.log(authorizationUrl);
    return;
  }

  console.log(`Using OAuth client from ${credentials.source}`);
  console.log(`Redirect URI: ${credentials.redirectUri}`);
  console.log();
  console.log("1. Open this URL in your browser:");
  console.log(authorizationUrl);
  console.log();
  console.log(
    "2. Sign in as the Google account that already owns the Search Console property.",
  );
  console.log(
    "3. After Google redirects to localhost, the page may fail to load. That is expected.",
  );
  console.log(
    "4. Copy the full localhost URL from the browser address bar and paste it below.",
  );
  console.log();

  const readline = createInterface({ input: process.stdin, output: process.stdout });

  try {
    const callbackValue = await readline.question("Paste the callback URL or code: ");
    const authorizationCode = extractAuthorizationCode(callbackValue);
    const tokenResponse = await oauthClient.getToken(authorizationCode);
    const refreshToken = tokenResponse.tokens.refresh_token?.trim();

    if (!refreshToken) {
      throw new Error(
        "Google did not return a refresh token. Re-run the script and approve the consent screen again.",
      );
    }

    console.log();
    console.log("Refresh token generated successfully.");
    console.log();
    console.log("GitHub secrets to set:");
    console.log("SEARCH_CONSOLE_PROPERTY=sc-domain:orivraa.com");
    console.log("GOOGLE_SEARCH_CONSOLE_OAUTH_CLIENT_ID=<value from your OAuth client JSON>");
    console.log("GOOGLE_SEARCH_CONSOLE_OAUTH_CLIENT_SECRET=<value from your OAuth client JSON>");
    console.log(`GOOGLE_SEARCH_CONSOLE_OAUTH_REFRESH_TOKEN=${refreshToken}`);
    console.log("GOOGLE_SEARCH_CONSOLE_OAUTH_ACCOUNT_EMAIL=aakashm301@gmail.com");
  } finally {
    readline.close();
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});