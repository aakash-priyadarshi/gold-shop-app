/**
 * Refresh e2e/.auth/session.json user metadata from /auth/me (no token output).
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const sessionPath = resolve(__dirname, '../.auth/session.json');
const API = process.env.E2E_API_URL || 'https://api.orivraa.com/api';

if (!existsSync(sessionPath)) {
  console.error('Missing e2e/.auth/session.json — run import-session.mjs first.');
  process.exit(1);
}

const session = JSON.parse(readFileSync(sessionPath, 'utf8'));
const token = session.token;
if (!token) {
  console.error('session.json has no token field.');
  process.exit(1);
}

const res = await fetch(`${API}/auth/me`, {
  headers: { Authorization: `Bearer ${token}` },
});
if (!res.ok) {
  console.error('/auth/me failed:', res.status);
  process.exit(1);
}

const data = await res.json();
const email = data.data?.email || data.email;
const role = data.data?.role || data.role;
const shopId = data.data?.shop?.id || data.shop?.id;

writeFileSync(
  sessionPath,
  JSON.stringify({ ...session, user: { email, role, shopId } }, null, 2),
);
console.log('✅ Session metadata updated —', email, role);
