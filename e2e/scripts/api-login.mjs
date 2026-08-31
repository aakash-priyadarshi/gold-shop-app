/**
 * Explicit-target API login via Turnstile bypass.
 * Requires E2E_API_URL, E2E_WEB_URL, E2E_SHOP_EMAIL, E2E_SHOP_PASSWORD,
 * and TURNSTILE_BYPASS_SECRET. There are deliberately no fallback accounts or
 * production URLs.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "../../apps/api/.env");

if (existsSync(envPath) && !process.env.TURNSTILE_BYPASS_SECRET) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^TURNSTILE_BYPASS_SECRET=(.+)$/);
    if (m)
      process.env.TURNSTILE_BYPASS_SECRET = m[1]
        .trim()
        .replace(/^["']|["']$/g, "");
  }
}

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    console.error(name + " is required");
    process.exit(1);
  }
  return value;
}

const API = required("E2E_API_URL").replace(/\/$/, "");
const WEB = required("E2E_WEB_URL").replace(/\/$/, "");
const email = required("E2E_SHOP_EMAIL");
const password = required("E2E_SHOP_PASSWORD");
const bypass = process.env.TURNSTILE_BYPASS_SECRET;

if (!bypass) {
  console.error(
    "TURNSTILE_BYPASS_SECRET missing — add to apps/api/.env or use railway run",
  );
  process.exit(1);
}

const res = await fetch(`${API}/auth/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email, password, turnstileToken: bypass }),
});
const data = await res.json();
if (!res.ok) {
  console.error("LOGIN_FAIL HTTP " + res.status);
  process.exit(1);
}
const token = data.data?.accessToken || data.accessToken;
const refresh = data.data?.refreshToken || data.refreshToken;
const user = data.data?.user || data.user;
if (!token) throw new Error("Login succeeded without an access token");
console.log("LOGIN_OK", user?.role, user?.shop?.name || "no-shop");

const authDir = resolve(__dirname, "../.auth");
mkdirSync(authDir, { recursive: true });

writeFileSync(
  resolve(authDir, "seller.json"),
  JSON.stringify(
    {
      cookies: [],
      origins: [
        {
          origin: WEB,
          localStorage: [
            { name: "token", value: token },
            ...(refresh ? [{ name: "refreshToken", value: refresh }] : []),
          ],
        },
      ],
    },
    null,
    2,
  ),
);

writeFileSync(
  resolve(authDir, "session.json"),
  JSON.stringify(
    {
      token,
      refresh,
      user: { email: user?.email, role: user?.role, shopId: user?.shop?.id },
    },
    null,
    2,
  ),
);
