/**
 * k6 Stress Test — Find the breaking point
 *
 * Purpose: Push beyond expected traffic to find capacity limits.
 * Ramps from 10 to 500 concurrent users over 10 minutes.
 *
 * Run: k6 run k6/stress.js
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Counter } from 'k6/metrics';

const API_BASE = __ENV.API_BASE_URL || 'http://localhost:4000/api';

const failedRequests = new Counter('failed_requests');
const errorRate = new Rate('error_rate');

export const options = {
  stages: [
    { duration: '1m', target: 50 },    // Below normal
    { duration: '2m', target: 100 },   // Normal load
    { duration: '2m', target: 200 },   // Above normal
    { duration: '2m', target: 350 },   // High stress
    { duration: '1m', target: 500 },   // Peak stress
    { duration: '1m', target: 500 },   // Hold peak
    { duration: '1m', target: 0 },     // Recovery
  ],
  thresholds: {
    http_req_duration: ['p(95)<5000'],  // Looser than load test
    error_rate: ['rate<0.15'],          // Allow up to 15% errors under extreme load
  },
};

export default function () {
  group('Health Endpoint', () => {
    const res = http.get(`${API_BASE}/health/ping`);
    const ok = check(res, { 'ping alive': (r) => r.status === 200 });
    if (!ok) {
      failedRequests.add(1);
      errorRate.add(1);
    } else {
      errorRate.add(0);
    }
  });

  group('Market Config', () => {
    const countries = ['NP', 'IN', 'US', 'AE', 'GB', 'SA', 'QA', 'KW'];
    const country = countries[Math.floor(Math.random() * countries.length)];
    const res = http.get(`${API_BASE}/market/config?country=${country}`);
    const ok = check(res, {
      'config OK': (r) => r.status === 200,
      'config fast': (r) => r.timings.duration < 3000,
    });
    if (!ok) {
      failedRequests.add(1);
      errorRate.add(1);
    } else {
      errorRate.add(0);
    }
  });

  group('Market Rates', () => {
    const res = http.get(`${API_BASE}/market-rates`);
    const ok = check(res, {
      'rates OK': (r) => r.status === 200 || r.status === 304,
    });
    if (!ok) {
      failedRequests.add(1);
      errorRate.add(1);
    } else {
      errorRate.add(0);
    }
  });

  group('Metrics Endpoint', () => {
    const res = http.get(`${API_BASE}/metrics`);
    check(res, { 'metrics OK': (r) => r.status === 200 });
  });

  sleep(Math.random() * 1.5 + 0.5); // 0.5-2s think time
}
