/**
 * API-level core sales pipeline E2E (no browser).
 * Requires session from api-login.mjs or TOKEN env var.
 */
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required; this write-capable test has no production default`);
  return value;
}

function assertSafeCredentialDestination(value, name) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${name} must be a valid URL`);
  }
  const loopback = ['localhost', '127.0.0.1', '::1', '[::1]'].includes(
    url.hostname,
  );
  if (url.username || url.password) {
    throw new Error(`${name} must not contain embedded credentials`);
  }
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && loopback)) {
    throw new Error(`${name} must use HTTPS unless it targets loopback`);
  }
}

const apiTarget = required('E2E_API_URL');
const webTarget = required('E2E_WEB_URL');
assertSafeCredentialDestination(apiTarget, 'E2E_API_URL');
assertSafeCredentialDestination(webTarget, 'E2E_WEB_URL');
const API = apiTarget.replace(/\/$/, '');
const WEB = webTarget.replace(/\/$/, '');

let token = process.env.E2E_TOKEN;
if (!token && existsSync(resolve(__dirname, '../.auth/session.json'))) {
  token = JSON.parse(readFileSync(resolve(__dirname, '../.auth/session.json'), 'utf8')).token;
}

const results = [];

const SMOKE_USER_AGENT =
  'Mozilla/5.0 (compatible; Orivraa-SmokeTest/1.0; +https://orivraa.com)';

const BROWSER_HEADERS = {
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json',
  Accept: 'application/json',
  'User-Agent': SMOKE_USER_AGENT,
  Origin: WEB,
  Referer: `${WEB}/dashboard`,
};

async function api(method, path, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    redirect: 'error',
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
const health = await fetch(`${API}/health`, {
  headers: { Accept: 'application/json', 'User-Agent': SMOKE_USER_AGENT },
});
record('health', 'API health', health.ok, `status ${health.status}`);

if (!token) {
  console.log('\n⚠️  No auth token — skipping authenticated API tests.');
  console.log('Set explicit E2E API/web URLs, shop credentials, and bypass secret, then:');
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
  ['invoice-settings', 'GET invoice settings', '/invoices/settings'],
  ['inventory', 'GET in-stock inventory', '/inventory?inStock=true&limit=5'],
  ['market-rates', 'GET market rates', '/market-rates?country=NP&currency=NPR'],
  ['pos-session', 'GET POS active session', '/pos/session/active'],
  ['tax-summary-np', 'GET NP tax summary', '/pricing/tax/summary?region=NP'],
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
      const verify = await fetch(`${WEB}/verify-bill/${first.verificationToken}`);
      record('verify-bill', 'Public verify-bill page', verify.status === 200, `HTTP ${verify.status}`);
    } else {
      record('verify-bill', 'Public verify-bill page', true, 'skipped (no invoice with token)');
    }
    const invoiceId = first?.id;
    if (invoiceId) {
      const pdfRes = await fetch(`${API}/invoices/${invoiceId}/pdf`, {
        redirect: 'error',
        headers: { ...BROWSER_HEADERS, Accept: 'application/pdf' },
      });
      const buf = Buffer.from(await pdfRes.arrayBuffer());
      const magic = buf.subarray(0, 4).toString('utf8');
      record(
        'invoice-pdf',
        'GET invoice PDF',
        pdfRes.ok && magic.startsWith('%PDF'),
        `HTTP ${pdfRes.status} magic=${magic.slice(0, 4)} bytes=${buf.length}`,
      );
    } else {
      record('invoice-pdf', 'GET invoice PDF', true, 'skipped (no invoice id)');
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
