/**
 * TEST 6: CORS Misconfiguration
 *
 * Tests that CORS is properly configured and doesn't allow unauthorized origins.
 * OWASP: A05:2021 — Security Misconfiguration
 */

import { CONFIG } from "../pentest.config";
import { record, request } from "../pentest.utils";

export async function testCORS() {
  console.log("\n─── CORS Misconfiguration ───");

  const apiBase = CONFIG.BASE_URL;

  // ═══════════════════════════════════════
  // 6.1 Allowed origin should work
  // ═══════════════════════════════════════

  const allowedOrigin = CONFIG.FRONTEND_URL;
  const allowedRes = await request("GET", "/materials/jewellery-types", {
    headers: { Origin: allowedOrigin },
  });
  const allowedACAO = allowedRes.headers.get("access-control-allow-origin");
  record({
    name: "CORS — allowed origin accepted",
    category: "CORS",
    severity: "INFO",
    status: allowedACAO === allowedOrigin || allowedACAO === "*" ? "PASS" : "WARN",
    description: allowedACAO
      ? `ACAO header: ${allowedACAO}`
      : "No Access-Control-Allow-Origin header returned for allowed origin",
  });

  // ═══════════════════════════════════════
  // 6.2 Evil origin should be rejected
  // ═══════════════════════════════════════

  const evilOrigins = [
    "https://evil.com",
    "https://attacker.orivraa.com",
    "https://orivraa.com.evil.com",
    "null",
    "https://localhost:3001",
    "http://localhost:3000", // Different scheme
    "https://evil-orivraa.com",
  ];

  for (const origin of evilOrigins) {
    const res = await request("GET", "/materials/jewellery-types", {
      headers: { Origin: origin },
    });
    const acao = res.headers.get("access-control-allow-origin");
    const isBlocked = !acao || (acao !== origin && acao !== "*");

    record({
      name: `CORS — reject evil origin: ${origin.substring(0, 30)}`,
      category: "CORS",
      severity: "HIGH",
      status: isBlocked ? "PASS" : "FAIL",
      description: isBlocked
        ? `Correctly rejected evil origin (ACAO: ${acao || "not set"})`
        : `CORS allows evil origin! ACAO: ${acao}`,
      recommendation: !isBlocked
        ? "CORS origin whitelist is too permissive — restrict to exact production URLs"
        : undefined,
    });
  }

  // ═══════════════════════════════════════
  // 6.3 Wildcard CORS check
  // ═══════════════════════════════════════

  const wildcardRes = await request("GET", "/materials/jewellery-types", {
    headers: { Origin: "https://evil.com" },
  });
  const wildcardAcao = wildcardRes.headers.get("access-control-allow-origin");
  record({
    name: "CORS — wildcard (*) check",
    category: "CORS",
    severity: "CRITICAL",
    status: wildcardAcao !== "*" ? "PASS" : "FAIL",
    description:
      wildcardAcao !== "*"
        ? "CORS does not use wildcard — origin whitelist in effect"
        : "CORS returns Access-Control-Allow-Origin: * — ANY website can make API requests",
    recommendation:
      wildcardAcao === "*"
        ? "Replace wildcard with explicit origin whitelist"
        : undefined,
  });

  // ═══════════════════════════════════════
  // 6.4 Preflight OPTIONS response
  // ═══════════════════════════════════════

  try {
    const preflightRes = await fetch(`${apiBase}/materials/jewellery-types`, {
      method: "OPTIONS",
      headers: {
        Origin: CONFIG.FRONTEND_URL,
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "Content-Type, Authorization",
      },
    });

    const allowMethods =
      preflightRes.headers.get("access-control-allow-methods") || "";
    const allowHeaders =
      preflightRes.headers.get("access-control-allow-headers") || "";
    const allowCredentials =
      preflightRes.headers.get("access-control-allow-credentials") || "";

    record({
      name: "CORS — preflight response",
      category: "CORS",
      severity: "MEDIUM",
      status: preflightRes.status === 204 || preflightRes.status === 200 ? "PASS" : "WARN",
      description: `Preflight status: ${preflightRes.status}, Methods: ${allowMethods}, Headers: ${allowHeaders}, Credentials: ${allowCredentials}`,
    });

    // Check if credentials are allowed (risky with broad origins)
    if (allowCredentials === "true" && wildcardAcao === "*") {
      record({
        name: "CORS — credentials with wildcard",
        category: "CORS",
        severity: "CRITICAL",
        status: "FAIL",
        description:
          "CORS allows credentials with wildcard origin — any site can make authenticated requests",
        recommendation:
          "Never combine Access-Control-Allow-Credentials: true with Access-Control-Allow-Origin: *",
      });
    }
  } catch (e: any) {
    record({
      name: "CORS — preflight OPTIONS",
      category: "CORS",
      severity: "MEDIUM",
      status: "WARN",
      description: `Could not send preflight: ${e.message}`,
    });
  }

  // ═══════════════════════════════════════
  // 6.5 CORS with credentials from evil origin
  // ═══════════════════════════════════════

  const credRes = await request("GET", "/materials/jewellery-types", {
    headers: {
      Origin: "https://evil.com",
      Cookie: "session=fake-session-cookie",
    },
  });
  const credAcao = credRes.headers.get("access-control-allow-origin");
  const credCreds = credRes.headers.get("access-control-allow-credentials");
  record({
    name: "CORS — credentials from evil origin",
    category: "CORS",
    severity: "HIGH",
    status:
      credAcao !== "https://evil.com" || credCreds !== "true" ? "PASS" : "FAIL",
    description:
      credAcao !== "https://evil.com"
        ? "Correctly rejected evil origin with credentials"
        : `Evil origin accepted with credentials: ACAO=${credAcao}, Credentials=${credCreds}`,
  });

  // ═══════════════════════════════════════
  // 6.6 Vary: Origin header check
  // ═══════════════════════════════════════

  const varyHeader = allowedRes.headers.get("vary") || "";
  record({
    name: "CORS — Vary: Origin header",
    category: "CORS",
    severity: "LOW",
    status: varyHeader.toLowerCase().includes("origin") ? "PASS" : "INFO",
    description: varyHeader.toLowerCase().includes("origin")
      ? "Vary header includes Origin — proper cache behavior"
      : "Vary header does not include Origin — CDN/proxy may cache wrong CORS response",
    recommendation: !varyHeader.toLowerCase().includes("origin")
      ? "Add 'Origin' to the Vary response header to prevent CORS cache poisoning"
      : undefined,
  });
}
