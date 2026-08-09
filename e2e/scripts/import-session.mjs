/**
 * Import an existing browser session (no Playwright browser needed).
 *
 * In Edge while logged in at orivraa.com:
 *   F12 → Application → Local Storage → https://www.orivraa.com
 *   Copy values for "token" and "refreshToken"
 *
 * Then run from repo root:
 *   cd e2e
 *   $env:E2E_TOKEN="paste-jwt-here"
 *   $env:E2E_REFRESH_TOKEN="paste-refresh-here"   # optional but recommended
 *   node scripts/import-session.mjs
 *
 * Or pass as args:
 *   node scripts/import-session.mjs "<accessToken>" "<refreshToken>"
 */
import { mkdirSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE_URL = process.env.BASE_URL || 'https://www.orivraa.com';
const API = process.env.E2E_API_URL || 'https://api.orivraa.com/api';

const token = process.argv[2] || process.env.E2E_TOKEN;
const refresh = process.argv[3] || process.env.E2E_REFRESH_TOKEN || '';

if (!token || token.length < 20) {
  console.error(`
Usage:
  node scripts/import-session.mjs "<accessToken>" "<refreshToken>"

Or set env vars E2E_TOKEN and E2E_REFRESH_TOKEN.

Get tokens from Edge DevTools:
  Application → Local Storage → https://www.orivraa.com → token / refreshToken
`);
  process.exit(1);
}

const authDir = resolve(__dirname, '../.auth');
mkdirSync(authDir, { recursive: true });

const localStorage = [
  { name: 'token', value: token },
  { name: 'orivraa_remember_me', value: '1' },
];
if (refresh) {
  localStorage.push({ name: 'refreshToken', value: refresh });
}

writeFileSync(
  resolve(authDir, 'seller.json'),
  JSON.stringify(
    {
      cookies: [],
      origins: [{ origin: BASE_URL, localStorage }],
    },
    null,
    2,
  ),
);

// Verify token works
let userEmail = 'unknown';
try {
  const res = await fetch(`${API}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.ok) {
    const data = await res.json();
    userEmail = data.data?.email || data.email || userEmail;
    const role = data.data?.role || data.role;
    const shopId = data.data?.shop?.id || data.shop?.id;
    console.log('✅ Token valid —', userEmail, role);
    writeFileSync(
      resolve(authDir, 'session.json'),
      JSON.stringify({ token, refresh, user: { email: userEmail, role, shopId } }, null, 2),
    );
  } else {
    console.warn('⚠️  Token saved but /auth/me returned', res.status, '— may be expired');
    writeFileSync(
      resolve(authDir, 'session.json'),
      JSON.stringify({ token, refresh, userEmail }, null, 2),
    );
  }
} catch (e) {
  console.warn('⚠️  Could not verify token:', e.message);
  writeFileSync(
    resolve(authDir, 'session.json'),
    JSON.stringify({ token, refresh, userEmail }, null, 2),
  );
}

console.log(`\nSession saved to e2e/.auth/seller.json`);
console.log('Run tests:  cd e2e && npx playwright test core-sales-pipeline --project=chromium --workers=1\n');
