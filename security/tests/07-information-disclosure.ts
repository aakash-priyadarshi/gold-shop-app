/**
 * TEST 7: Information Disclosure
 *
 * Tests for leaked sensitive information: stack traces, debug endpoints, version info, etc.
 * OWASP: A05:2021 — Security Misconfiguration
 */

import { CONFIG } from "../pentest.config";
import { login, record, request } from "../pentest.utils";

export async function testInformationDisclosure() {
  console.log("\n─── Information Disclosure ───");

  const token = await login(CONFIG.CUSTOMER.email, CONFIG.CUSTOMER.password);

  // ═══════════════════════════════════════
  // 7.1 Swagger / API docs exposure
  // ═══════════════════════════════════════

  const swaggerRes = await request("GET", "/docs");
  record({
    name: "Info disclosure — Swagger UI accessible",
    category: "Information Disclosure",
    severity: "MEDIUM",
    status: swaggerRes.status === 200 ? "WARN" : "PASS",
    description:
      swaggerRes.status === 200
        ? "Swagger UI is accessible — exposes all API endpoints and DTOs"
        : `Swagger returned ${swaggerRes.status} — ${swaggerRes.status === 404 ? "not exposed" : "check manually"}`,
    recommendation:
      swaggerRes.status === 200
        ? "Disable Swagger in production or restrict access with authentication"
        : undefined,
  });

  // Also try swagger-json
  const swaggerJsonRes = await request("GET", "/docs-json");
  record({
    name: "Info disclosure — Swagger JSON accessible",
    category: "Information Disclosure",
    severity: "MEDIUM",
    status: swaggerJsonRes.status === 200 ? "WARN" : "PASS",
    description:
      swaggerJsonRes.status === 200
        ? "Swagger JSON spec is accessible — machine-readable API schema"
        : `Swagger JSON returned ${swaggerJsonRes.status}`,
    recommendation:
      swaggerJsonRes.status === 200
        ? "Disable /docs-json in production"
        : undefined,
  });

  // ═══════════════════════════════════════
  // 7.2 Error stack traces
  // ═══════════════════════════════════════

  // Trigger an error with invalid data
  const errorRes = await request("POST", "/auth/login", {
    body: { email: "x", password: "" },
  });
  const errorBody = JSON.stringify(errorRes.body);
  const hasStackTrace =
    errorBody.includes("stack") ||
    errorBody.includes("at ") ||
    errorBody.includes(".ts:") ||
    errorBody.includes(".js:") ||
    errorBody.includes("node_modules");

  record({
    name: "Info disclosure — error stack traces",
    category: "Information Disclosure",
    severity: "MEDIUM",
    status: !hasStackTrace ? "PASS" : "FAIL",
    description: !hasStackTrace
      ? "Error response does not contain stack traces"
      : "Error response contains stack trace — leaks internal file paths",
    details: `Response: ${errorBody.substring(0, 300)}`,
    recommendation: hasStackTrace
      ? "Use an exception filter to strip stack traces in production"
      : undefined,
  });

  // ═══════════════════════════════════════
  // 7.3 Version information in responses
  // ═══════════════════════════════════════

  const healthRes = await request("GET", "/");
  const healthBody = JSON.stringify(healthRes.body);
  const hasVersion =
    healthBody.includes("version") ||
    healthBody.includes("node") ||
    healthBody.includes("express") ||
    healthBody.includes("nestjs");

  record({
    name: "Info disclosure — version info in root endpoint",
    category: "Information Disclosure",
    severity: "LOW",
    status: !hasVersion ? "PASS" : "INFO",
    description: !hasVersion
      ? "Root endpoint does not disclose version information"
      : "Root endpoint may disclose version information",
    details: `Response: ${healthBody.substring(0, 200)}`,
  });

  // ═══════════════════════════════════════
  // 7.4 Debug/internal endpoints
  // ═══════════════════════════════════════

  const debugEndpoints = [
    "/debug",
    "/status",
    "/health",
    "/healthcheck",
    "/info",
    "/env",
    "/config",
    "/metrics",
    "/actuator",
    "/actuator/health",
    "/graphql",
    "/.env",
    "/phpinfo.php",
    "/wp-admin",
    "/admin",
    "/api-docs",
    "/swagger",
    "/swagger-ui",
  ];

  for (const endpoint of debugEndpoints) {
    const res = await request("GET", endpoint);
    const isExposed =
      res.status === 200 &&
      JSON.stringify(res.body).length > 5; // Has meaningful content

    // Only record if exposed (reduce noise)
    if (isExposed) {
      record({
        name: `Info disclosure — ${endpoint} accessible`,
        category: "Information Disclosure",
        severity: endpoint.includes("env") || endpoint.includes("config")
          ? "CRITICAL"
          : "LOW",
        status:
          endpoint.includes("env") || endpoint.includes("config")
            ? "FAIL"
            : "INFO",
        description: `${endpoint} returned 200 with content`,
        details: `Response: ${JSON.stringify(res.body).substring(0, 150)}`,
      });
    }
  }

  // ═══════════════════════════════════════
  // 7.5 Sensitive data in login response
  // ═══════════════════════════════════════

  if (token) {
    const loginRes = await request("POST", "/auth/login", {
      body: {
        email: CONFIG.CUSTOMER.email,
        password: CONFIG.CUSTOMER.password,
      },
    });
    const loginBody = loginRes.body;
    const sensitiveFields = [
      "password",
      "passwordHash",
      "hash",
      "secret",
      "internalId",
      "twoFactorSecret",
    ];
    const leakedFields: string[] = [];

    for (const field of sensitiveFields) {
      if (loginBody && typeof loginBody === "object") {
        const jsonStr = JSON.stringify(loginBody);
        if (jsonStr.toLowerCase().includes(`"${field}"`)) {
          leakedFields.push(field);
        }
      }
    }

    record({
      name: "Info disclosure — sensitive fields in login response",
      category: "Information Disclosure",
      severity: "HIGH",
      status: leakedFields.length === 0 ? "PASS" : "FAIL",
      description:
        leakedFields.length === 0
          ? "Login response does not contain sensitive fields"
          : `Login response contains sensitive fields: ${leakedFields.join(", ")}`,
      recommendation:
        leakedFields.length > 0
          ? "Strip sensitive fields from all API responses using serialization interceptors"
          : undefined,
    });
  }

  // ═══════════════════════════════════════
  // 7.6 User data exposure in /auth/me
  // ═══════════════════════════════════════

  if (token) {
    const meRes = await request("GET", "/auth/me", { token });
    const meBody = JSON.stringify(meRes.body || {});
    const sensitiveInMe = [];

    if (meBody.includes("password")) sensitiveInMe.push("password");
    if (meBody.includes("passwordHash")) sensitiveInMe.push("passwordHash");
    if (meBody.includes("twoFactorSecret"))
      sensitiveInMe.push("twoFactorSecret");
    if (meBody.includes("resetToken")) sensitiveInMe.push("resetToken");
    if (meBody.includes("verificationToken"))
      sensitiveInMe.push("verificationToken");

    record({
      name: "Info disclosure — /auth/me sensitive data",
      category: "Information Disclosure",
      severity: "HIGH",
      status: sensitiveInMe.length === 0 ? "PASS" : "FAIL",
      description:
        sensitiveInMe.length === 0
          ? "/auth/me does not expose sensitive fields"
          : `/auth/me exposes: ${sensitiveInMe.join(", ")}`,
      recommendation:
        sensitiveInMe.length > 0
          ? "Use select/exclude in Prisma queries to strip password hashes and tokens"
          : undefined,
    });
  }

  // ═══════════════════════════════════════
  // 7.7 404 response information
  // ═══════════════════════════════════════

  const notFoundRes = await request(
    "GET",
    "/nonexistent-endpoint-" + Date.now()
  );
  const notFoundBody = JSON.stringify(notFoundRes.body || {});
  const leaksFramework =
    notFoundBody.includes("Cannot GET") ||
    notFoundBody.includes("nest") ||
    notFoundBody.includes("express");

  record({
    name: "Info disclosure — 404 response",
    category: "Information Disclosure",
    severity: "LOW",
    status: !leaksFramework ? "PASS" : "INFO",
    description: leaksFramework
      ? '404 response reveals framework info (e.g., "Cannot GET")'
      : "404 response is clean",
    details: `Response: ${notFoundBody.substring(0, 200)}`,
    recommendation: leaksFramework
      ? "Use a custom global exception filter to return generic 404 messages"
      : undefined,
  });

  // ═══════════════════════════════════════
  // 7.8 Unverified email response (known leak)
  // ═══════════════════════════════════════

  // This tests the known issue where unverified email returns userId and email
  const unverifiedRes = await request("POST", "/auth/login", {
    body: {
      email: "unverified-test@orivraa.com",
      password: "SomePassword123!",
    },
  });
  const unverifiedBody = JSON.stringify(unverifiedRes.body || {});
  const leaksUserId = unverifiedBody.includes("userId");
  const leaksEmail =
    unverifiedBody.includes("email") && unverifiedBody.includes("unverified");

  record({
    name: "Info disclosure — unverified email leaks userId/email",
    category: "Information Disclosure",
    severity: "MEDIUM",
    status: !leaksUserId ? "PASS" : "WARN",
    description: leaksUserId
      ? "ForbiddenException for unverified email includes userId and email in response"
      : "No userId leak detected (user may not exist, or issue was fixed)",
    details: `Response: ${unverifiedBody.substring(0, 300)}`,
    recommendation: leaksUserId
      ? 'Return a generic "Invalid credentials" error even for unverified accounts'
      : undefined,
  });

  // ═══════════════════════════════════════
  // 7.9 HTTP method enumeration
  // ═══════════════════════════════════════

  const methods = ["PUT", "DELETE", "TRACE", "PATCH", "OPTIONS"] as const;
  for (const method of methods) {
    const res = await request(method as any, "/materials/jewellery-types");
    if (method === "TRACE" && res.status === 200) {
      record({
        name: "Info disclosure — TRACE method enabled",
        category: "Information Disclosure",
        severity: "MEDIUM",
        status: "FAIL",
        description:
          "HTTP TRACE method is enabled — can be used for Cross-Site Tracing (XST) attacks",
        recommendation: "Disable TRACE method in the HTTP server",
      });
    }
  }

  // ═══════════════════════════════════════
  // 7.10 Matching debug endpoint
  // ═══════════════════════════════════════

  const matchingDebugRes = await request("GET", "/shops/matching-debug", {
    token: token || undefined,
  });
  record({
    name: "Info disclosure — /shops/matching-debug exposed",
    category: "Information Disclosure",
    severity: "MEDIUM",
    status:
      matchingDebugRes.status === 403 ||
      matchingDebugRes.status === 404 ||
      matchingDebugRes.status === 401
        ? "PASS"
        : "WARN",
    description:
      matchingDebugRes.status === 200
        ? "matching-debug endpoint is accessible — may reveal internal scoring logic"
        : `matching-debug returned ${matchingDebugRes.status}`,
    recommendation:
      matchingDebugRes.status === 200
        ? "Restrict /shops/matching-debug to admin-only or remove in production"
        : undefined,
  });
}
