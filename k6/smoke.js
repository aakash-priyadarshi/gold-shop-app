/**
 * k6 Smoke Test — Sanity check
 *
 * Purpose: Verify the system is alive with minimal load.
 * Use this before deploying to ensure endpoints respond correctly.
 *
 * Run: k6 run k6/smoke.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';

const API_BASE = __ENV.API_BASE_URL || 'http://localhost:4000/api';
const WEB_BASE = __ENV.WEB_BASE_URL || 'http://localhost:3000';

export const options = {
  vus: 1,
  duration: '30s',
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% of requests under 2s
    http_req_failed: ['rate<0.01'],    // <1% error rate
  },
};

export default function () {
  // Health check
  const healthRes = http.get(`${API_BASE}/health`);
  check(healthRes, {
    'health status is 200': (r) => r.status === 200,
    'health body has status': (r) => JSON.parse(r.body).status !== undefined,
  });

  // Ping
  const pingRes = http.get(`${API_BASE}/health/ping`);
  check(pingRes, {
    'ping status is 200': (r) => r.status === 200,
  });

  // Market config (public endpoint)
  const configRes = http.get(`${API_BASE}/market/config?country=NP`);
  check(configRes, {
    'config status is 200': (r) => r.status === 200,
  });

  // Homepage
  const homeRes = http.get(`${WEB_BASE}/`);
  check(homeRes, {
    'homepage status is 200': (r) => r.status === 200,
    'homepage has content': (r) => r.body.length > 100,
  });

  // Metrics endpoint
  const metricsRes = http.get(`${API_BASE}/metrics`);
  check(metricsRes, {
    'metrics status is 200': (r) => r.status === 200,
    'metrics has prometheus format': (r) => r.body.includes('orivraa_'),
  });

  sleep(1);
}
