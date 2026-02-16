/**
 * TEST 1: Security Headers
 *
 * Checks HTTP response headers for security best practices.
 * OWASP reference: https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Headers_Cheat_Sheet.html
 */

import { record, request } from "../pentest.utils";

export async function testSecurityHeaders() {
  console.log("\n─── Security Headers ───");

  const res = await request("GET", "/health");

  // 1. Strict-Transport-Security
  const hsts = res.headers.get("strict-transport-security");
  record({
    name: "HSTS Header",
    category: "Headers",
    severity: "HIGH",
    status: hsts ? "PASS" : "WARN",
    description: hsts
      ? `HSTS present: ${hsts}`
      : "Strict-Transport-Security header missing",
    recommendation:
      "Add HSTS header with max-age=31536000; includeSubDomains; preload",
  });

  // 2. X-Content-Type-Options
  const xcto = res.headers.get("x-content-type-options");
  record({
    name: "X-Content-Type-Options",
    category: "Headers",
    severity: "MEDIUM",
    status: xcto === "nosniff" ? "PASS" : "FAIL",
    description:
      xcto === "nosniff"
        ? "X-Content-Type-Options: nosniff is set"
        : "X-Content-Type-Options header missing or wrong",
    recommendation: "Helmet should set this — check helmet config",
  });

  // 3. X-Frame-Options
  const xfo = res.headers.get("x-frame-options");
  record({
    name: "X-Frame-Options",
    category: "Headers",
    severity: "MEDIUM",
    status: xfo ? "PASS" : "WARN",
    description: xfo
      ? `X-Frame-Options: ${xfo}`
      : "X-Frame-Options header missing",
    recommendation: "Set X-Frame-Options: DENY or SAMEORIGIN",
  });

  // 4. Content-Security-Policy
  const csp = res.headers.get("content-security-policy");
  record({
    name: "Content-Security-Policy",
    category: "Headers",
    severity: "MEDIUM",
    status: csp ? "PASS" : "WARN",
    description: csp
      ? `CSP present (${csp.substring(0, 80)}...)`
      : "Content-Security-Policy header missing",
    recommendation: "Helmet configures CSP — verify it's applied to API routes",
  });

  // 5. X-Powered-By should NOT be present
  const xpb = res.headers.get("x-powered-by");
  record({
    name: "X-Powered-By Hidden",
    category: "Headers",
    severity: "LOW",
    status: xpb ? "FAIL" : "PASS",
    description: xpb
      ? `X-Powered-By header exposed: "${xpb}"`
      : "X-Powered-By correctly hidden",
    recommendation: "Helmet removes this by default — ensure it's applied",
  });

  // 6. Server header
  const server = res.headers.get("server");
  record({
    name: "Server Header Hidden",
    category: "Headers",
    severity: "LOW",
    status: server ? "WARN" : "PASS",
    description: server
      ? `Server header exposed: "${server}"`
      : "Server header not exposed",
    recommendation: "Hide server identity to reduce fingerprinting",
  });

  // 7. Referrer-Policy
  const rp = res.headers.get("referrer-policy");
  record({
    name: "Referrer-Policy",
    category: "Headers",
    severity: "LOW",
    status: rp ? "PASS" : "WARN",
    description: rp
      ? `Referrer-Policy: ${rp}`
      : "Referrer-Policy header missing",
    recommendation: "Set Referrer-Policy: strict-origin-when-cross-origin",
  });
}
