/**
 * k6 Diagnostic Test — Identify failure types
 * Captures HTTP status codes to understand what's blocking requests
 */

import { check, sleep } from 'k6';
import http from 'k6/http';
import { Counter } from 'k6/metrics';

const API_BASE = __ENV.API_BASE_URL || 'http://localhost:4000/api';

const status429 = new Counter('status_429_rate_limited');
const status403 = new Counter('status_403_forbidden');
const status503 = new Counter('status_503_unavailable');
const statusOther = new Counter('status_other_error');

export const options = {
  stages: [
    { duration: '15s', target: 20 },
    { duration: '30s', target: 50 },
    { duration: '15s', target: 0 },
  ],
};

export default function () {
  const res = http.get(`${API_BASE}/health/ping`);

  if (res.status === 200) {
    // OK
  } else if (res.status === 429) {
    status429.add(1);
  } else if (res.status === 403) {
    status403.add(1);
  } else if (res.status === 503) {
    status503.add(1);
  } else {
    statusOther.add(1);
    console.log(`Unexpected status: ${res.status} — body: ${res.body?.substring(0, 200)}`);
  }

  check(res, {
    [`status ${res.status}`]: () => true, // Just log the status
  });

  sleep(0.5);
}
