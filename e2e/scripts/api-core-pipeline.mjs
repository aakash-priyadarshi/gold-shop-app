/**
 * API-level core sales pipeline E2E (no browser).
 * Requires session from api-login.mjs or TOKEN env var.
 */
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const API = process.env.E2E_API_URL || 'https://api.orivraa.com/api';

let token = process.env.E2E_TOKEN;
if (!token && existsSync(resolve(__dirname, '../.auth/session.json'))) {
  token = JSON.parse(readFileSync(resolve(__dirname, '../.auth/session.json'), 'utf8')).token;
}

const results = [];

const BROWSER_HEADERS = {
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json',
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0',
  Origin: 'https://www.orivraa.com',
  Referer: 'https://www.orivraa.com/dashboard',
};

async function api(method, path, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: BROWSER_HEADERS,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { status: res.status, data };
}

function record(id, name, ok, detail = '') {
  results.push({ id, name, ok, detail });
  console.log(ok ? '✅' : '❌', id, name, detail ? `— ${detail}` : '');
}

// ── Public ──
const health = await fetch(`${API}/health`);
record('health', 'API health', health.ok, `status ${health.status}`);

if (!token) {
  console.log('\n⚠️  No auth token — skipping authenticated API tests.');
  console.log('Add E2E_SHOP_EMAIL + E2E_SHOP_PASSWORD to apps/api/.env, then:');
  console.log('  cd apps/api && railway run node ../../e2e/scripts/api-login.mjs');
  process.exit(results.every((r) => r.ok) ? 0 : 1);
}

const me = await api('GET', '/auth/me');
record('auth', 'GET /auth/me', me.status === 200, me.data?.data?.email || me.data?.email);

const shopId = me.data?.data?.shop?.id || me.data?.shop?.id;

const endpoints = [
  ['component-pricing', 'GET component pricing', '/shops/my-shop/component-pricing'],
  ['quotes', 'GET shop quotes', '/shop-quotes?limit=5'],
  ['invoices', 'GET invoices', '/invoices?limit=5'],
  ['inventory', 'GET in-stock inventory', '/inventory?inStock=true&limit=5'],
  ['market-rates', 'GET market rates', '/market-rates?country=NP&currency=NPR'],
];

for (const [id, name, path] of endpoints) {
  const r = await api('GET', path);
  const msg =
    r.status >= 400
      ? `HTTP ${r.status} — ${typeof r.data === 'object' ? r.data?.message || JSON.stringify(r.data).slice(0, 120) : r.data}`
      : `HTTP ${r.status}`;
  record(id, name, r.status >= 200 && r.status < 400, msg);
}

// InventoryStockMovement table indirectly via POS — just note if invoices work
if (shopId) {
  const inv = await api('GET', `/invoices?limit=1`);
  if (inv.status === 200) {
    const list = inv.data?.data || inv.data;
    const first = Array.isArray(list) ? list[0] : list?.items?.[0];
    if (first?.verificationToken) {
      const verify = await fetch(`https://www.orivraa.com/verify-bill/${first.verificationToken}`);
      record('verify-bill', 'Public verify-bill page', verify.status === 200, `HTTP ${verify.status}`);
    } else {
      record('verify-bill', 'Public verify-bill page', true, 'skipped (no invoice with token)');
    }
  }
}

console.log('\n=== Summary ===');
const passed = results.filter((r) => r.ok).length;
console.log(`${passed}/${results.length} passed`);

const ipBlocked = results.some(
  (r) => !r.ok && typeof r.detail === 'string' && r.detail.includes('Access denied'),
);
if (ipBlocked) {
  console.log(
    '\n⚠️  Some endpoints returned "Access denied" — your IP may be temporarily blocked by the API security guard.',
  );
  console.log('   Browser E2E (Playwright msedge) is the reliable path; whitelist your IP in admin if needed.');
}

process.exit(passed === results.length ? 0 : 1);
