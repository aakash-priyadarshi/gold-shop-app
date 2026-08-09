/**
 * Production API login via Turnstile bypass.
 * Usage: cd apps/api && railway run node ../../e2e/scripts/api-login.mjs
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '../../apps/api/.env');

if (existsSync(envPath) && !process.env.TURNSTILE_BYPASS_SECRET) {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^TURNSTILE_BYPASS_SECRET=(.+)$/);
    if (m) process.env.TURNSTILE_BYPASS_SECRET = m[1].trim().replace(/^["']|["']$/g, '');
  }
}

const API = process.env.E2E_API_URL || 'https://api.orivraa.com/api';
const bypass = process.env.TURNSTILE_BYPASS_SECRET;
const candidates = [
  { email: process.env.E2E_SHOP_EMAIL, password: process.env.E2E_SHOP_PASSWORD },
  { email: 'demo-shop@orivraa.com', password: 'Demo@2026' },
  { email: 'pentest-shop@orivraa.com', password: 'PenTest123!@#' },
].filter((c) => c.email && c.password);

if (!bypass) {
  console.error('TURNSTILE_BYPASS_SECRET missing — add to apps/api/.env or use railway run');
  process.exit(1);
}

let token, refresh, user;
for (const { email, password } of candidates) {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, turnstileToken: bypass }),
  });
  const data = await res.json();
  if (res.ok) {
    token = data.data?.accessToken || data.accessToken;
    refresh = data.data?.refreshToken || data.refreshToken;
    user = data.data?.user || data.user;
    console.log('LOGIN_OK', email, user?.role, user?.shop?.name || 'no-shop');
    break;
  }
  if (data.message?.includes('CAPTCHA')) {
    console.error('BYPASS_FAIL', data.message);
    process.exit(1);
  }
}

if (!token) {
  console.error('LOGIN_FAIL all candidate accounts rejected (401). Set E2E_SHOP_EMAIL/PASSWORD in apps/api/.env');
  process.exit(1);
}

const authDir = resolve(__dirname, '../.auth');
mkdirSync(authDir, { recursive: true });

writeFileSync(
  resolve(authDir, 'seller.json'),
  JSON.stringify(
    {
      cookies: [],
      origins: [
        {
          origin: 'https://www.orivraa.com',
          localStorage: [
            { name: 'token', value: token },
            ...(refresh ? [{ name: 'refreshToken', value: refresh }] : []),
          ],
        },
      ],
    },
    null,
    2,
  ),
);

writeFileSync(
  resolve(authDir, 'session.json'),
  JSON.stringify({ token, refresh, user: { email: user?.email, role: user?.role, shopId: user?.shop?.id } }, null, 2),
);
