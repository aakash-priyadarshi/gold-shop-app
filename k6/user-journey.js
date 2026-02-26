/**
 * k6 User Journey Test — Realistic user flows
 *
 * Purpose: Simulate real user behavior patterns:
 *   1. Browse homepage → view catalogue → view product
 *   2. Register/Login → create RFQ → view offers
 *   3. Seller: Login → view orders → check dashboard
 *
 * Run: k6 run k6/user-journey.js
 */

import http from 'k6/http';
import { check, sleep, group, fail } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const API_BASE = __ENV.API_BASE_URL || 'http://localhost:4000/api';
const WEB_BASE = __ENV.WEB_BASE_URL || 'http://localhost:3000';
const TEST_EMAIL = __ENV.TEST_USER_EMAIL || '';
const TEST_PASSWORD = __ENV.TEST_USER_PASSWORD || '';

const errorRate = new Rate('journey_errors');
const journeyDuration = new Trend('journey_duration', true);

export const options = {
  scenarios: {
    // Browsing users (majority)
    browsers: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 50 },
        { duration: '3m', target: 150 },
        { duration: '2m', target: 50 },
        { duration: '1m', target: 0 },
      ],
      exec: 'browsingJourney',
    },
    // Authenticated users (minority)
    authenticated: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 10 },
        { duration: '3m', target: 30 },
        { duration: '2m', target: 10 },
        { duration: '1m', target: 0 },
      ],
      exec: 'authenticatedJourney',
    },
    // API-heavy users (bots, mobile apps)
    apiUsers: {
      executor: 'constant-arrival-rate',
      rate: 20,
      timeUnit: '1s',
      duration: '5m',
      preAllocatedVUs: 50,
      exec: 'apiOnlyJourney',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<4000'],
    journey_errors: ['rate<0.1'],
    journey_duration: ['p(95)<15000'],
  },
};

// ─── Journey 1: Anonymous browsing ───
export function browsingJourney() {
  const start = Date.now();

  group('Homepage', () => {
    const res = http.get(`${WEB_BASE}/`);
    check(res, { 'homepage OK': (r) => r.status === 200 }) || errorRate.add(1);
    sleep(2 + Math.random() * 3); // Read homepage for 2-5s
  });

  group('Load Market Config', () => {
    const countries = ['NP', 'IN', 'US', 'AE'];
    const country = countries[Math.floor(Math.random() * countries.length)];
    const res = http.get(`${API_BASE}/market/config?country=${country}`);
    check(res, { 'config OK': (r) => r.status === 200 }) || errorRate.add(1);
  });

  group('Load Market Rates', () => {
    const res = http.get(`${API_BASE}/market-rates`);
    check(res, { 'rates OK': (r) => r.status === 200 || r.status === 304 }) || errorRate.add(1);
    sleep(1 + Math.random() * 2);
  });

  group('Browse Catalogue', () => {
    const res = http.get(`${WEB_BASE}/catalogue`);
    check(res, { 'catalogue OK': (r) => r.status < 500 });
    sleep(3 + Math.random() * 5); // Browse for 3-8s
  });

  journeyDuration.add(Date.now() - start);
}

// ─── Journey 2: Authenticated user ───
export function authenticatedJourney() {
  const start = Date.now();

  // Skip if no test credentials
  if (!TEST_EMAIL || !TEST_PASSWORD) {
    // Just do browsing instead
    browsingJourney();
    return;
  }

  group('Login', () => {
    const loginRes = http.post(
      `${API_BASE}/auth/login`,
      JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
      { headers: { 'Content-Type': 'application/json' } }
    );
    const ok = check(loginRes, {
      'login OK': (r) => r.status === 200 || r.status === 201,
    });
    if (!ok) {
      errorRate.add(1);
      return;
    }

    const token = loginRes.json('token') || loginRes.json('access_token');
    if (!token) return;

    const authHeaders = {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    };

    sleep(1);

    // Load dashboard data
    group('Dashboard Data', () => {
      const batch = http.batch([
        ['GET', `${API_BASE}/users/me`, null, authHeaders],
        ['GET', `${API_BASE}/notifications`, null, authHeaders],
        ['GET', `${API_BASE}/orders?limit=5`, null, authHeaders],
      ]);
      check(batch[0], { 'profile OK': (r) => r.status === 200 });
      sleep(2);
    });

    // View RFQs
    group('View RFQs', () => {
      const rfqs = http.get(`${API_BASE}/rfq?limit=10`, authHeaders);
      check(rfqs, { 'rfqs OK': (r) => r.status === 200 }) || errorRate.add(1);
      sleep(3);
    });
  });

  journeyDuration.add(Date.now() - start);
}

// ─── Journey 3: API-only (mobile/bot) ───
export function apiOnlyJourney() {
  const endpoints = [
    `${API_BASE}/health/ping`,
    `${API_BASE}/market/config?country=NP`,
    `${API_BASE}/market-rates`,
    `${API_BASE}/health`,
  ];
  const url = endpoints[Math.floor(Math.random() * endpoints.length)];
  const res = http.get(url);
  check(res, { 'API OK': (r) => r.status === 200 || r.status === 304 });
}
