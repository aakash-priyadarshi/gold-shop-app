/**
 * k6 Load Test — Normal traffic simulation
 *
 * Purpose: Simulate expected daily traffic patterns.
 * Models ~1M requests/day ≈ ~700 req/min ≈ ~12 req/s
 *
 * Ramp: 0→50→100→50→0 users over 5 minutes
 *
 * Run: k6 run k6/load.js
 */

import { check, group, sleep } from 'k6';
import http from 'k6/http';
import { Rate, Trend } from 'k6/metrics';

const API_BASE = __ENV.API_BASE_URL || 'http://localhost:4000/api';
const WEB_BASE = __ENV.WEB_BASE_URL || 'http://localhost:3000';

// Custom metrics
const errorRate = new Rate('errors');
const apiDuration = new Trend('api_duration', true);
const webDuration = new Trend('web_duration', true);

export const options = {
  stages: [
    { duration: '30s', target: 10 },   // Warm up
    { duration: '1m', target: 50 },    // Ramp to 50 users
    { duration: '2m', target: 100 },   // Hold at 100 users (peak)
    { duration: '1m', target: 50 },    // Scale down
    { duration: '30s', target: 0 },    // Cool down
  ],
  thresholds: {
    http_req_duration: ['p(95)<3000', 'p(99)<5000'],
    http_req_failed: ['rate<0.05'],
    errors: ['rate<0.05'],
    api_duration: ['p(95)<2000'],
    web_duration: ['p(95)<4000'],
  },
};

export default function () {
  group('API Endpoints', () => {
    // Health
    const health = http.get(`${API_BASE}/health`);
    check(health, { 'health OK': (r) => r.status === 200 }) || errorRate.add(1);
    apiDuration.add(health.timings.duration);

    // Market config
    const countries = ['NP', 'IN', 'US', 'AE', 'GB'];
    const country = countries[Math.floor(Math.random() * countries.length)];
    const config = http.get(`${API_BASE}/market/config?country=${country}`);
    check(config, { 'config OK': (r) => r.status === 200 }) || errorRate.add(1);
    apiDuration.add(config.timings.duration);

    // Market rates
    const rates = http.get(`${API_BASE}/market-rates`);
    check(rates, { 'rates OK': (r) => r.status === 200 || r.status === 304 }) || errorRate.add(1);
    apiDuration.add(rates.timings.duration);
  });

  group('Web Pages', () => {
    // Homepage
    const home = http.get(`${WEB_BASE}/`);
    check(home, { 'homepage OK': (r) => r.status === 200 }) || errorRate.add(1);
    webDuration.add(home.timings.duration);

    // Catalogue page
    const catalogue = http.get(`${WEB_BASE}/catalogue`);
    check(catalogue, { 'catalogue OK': (r) => r.status === 200 || r.status === 404 });
    webDuration.add(catalogue.timings.duration);
  });

  sleep(Math.random() * 2 + 1); // 1-3s think time
}
