/**
 * TEST 5: Rate Limiting
 *
 * Verifies that rate limiting (ThrottlerModule) is properly enforced.
 * OWASP: A04:2017 — XML External Entities (general DoS prevention)
 */

import { CONFIG } from "../pentest.config";
import { login, record, request, sleep } from "../pentest.utils";

export async function testRateLimiting() {
  console.log("\n─── Rate Limiting ───");

  // ═══════════════════════════════════════
  // 5.1 Global rate limit (100 req/min as per ThrottlerModule)
  // ═══════════════════════════════════════

  const burstCount = CONFIG.RATE_LIMIT_BURST;
  let blockedCount = 0;
  let firstBlockAt: number | null = null;

  console.log(`  Sending ${burstCount} rapid requests to test rate limit...`);

  for (let i = 0; i < burstCount; i++) {
    const res = await request("GET", "/materials/jewellery-types");
    if (res.status === 429) {
      blockedCount++;
      if (!firstBlockAt) firstBlockAt = i + 1;
    }
  }

  record({
    name: "Rate limit — global burst test",
    category: "Rate Limiting",
    severity: "HIGH",
    status: blockedCount > 0 ? "PASS" : "FAIL",
    description:
      blockedCount > 0
        ? `Rate limiter kicked in after ${firstBlockAt} requests (${blockedCount}/${burstCount} blocked)`
        : `All ${burstCount} requests succeeded — rate limiter NOT enforced`,
    recommendation:
      blockedCount === 0
        ? "Verify ThrottlerModule is active. Check if ThrottlerGuard is applied globally."
        : undefined,
  });

  // Wait for rate limit window to reset
  console.log("  Waiting 65s for rate limit window to reset...");
  await sleep(65_000);

  // ═══════════════════════════════════════
  // 5.2 Login brute force rate limiting
  // ═══════════════════════════════════════

  const loginBurstCount = 20;
  let loginBlockedCount = 0;
  let loginFirstBlockAt: number | null = null;

  console.log(`  Sending ${loginBurstCount} failed login attempts...`);

  for (let i = 0; i < loginBurstCount; i++) {
    const res = await request("POST", "/auth/login", {
      body: {
        email: "pentest-ratelimit@test.com",
        password: "wrong-password-" + i,
      },
    });
    if (res.status === 429) {
      loginBlockedCount++;
      if (!loginFirstBlockAt) loginFirstBlockAt = i + 1;
    }
  }

  record({
    name: "Rate limit — login brute force",
    category: "Rate Limiting",
    severity: "CRITICAL",
    status: loginBlockedCount > 0 ? "PASS" : "WARN",
    description:
      loginBlockedCount > 0
        ? `Login rate limiter activated after ${loginFirstBlockAt} attempts (${loginBlockedCount}/${loginBurstCount} blocked)`
        : `All ${loginBurstCount} login attempts processed — login may lack specific rate limit`,
    recommendation:
      loginBlockedCount === 0
        ? "Consider adding stricter rate limiting on /auth/login (e.g., 5 attempts per minute per IP)"
        : undefined,
  });

  // Wait again
  console.log("  Waiting 65s for rate limit window to reset...");
  await sleep(65_000);

  // ═══════════════════════════════════════
  // 5.3 Registration rate limiting
  // ═══════════════════════════════════════

  const regBurstCount = 10;
  let regBlockedCount = 0;

  console.log(`  Sending ${regBurstCount} registration attempts...`);

  for (let i = 0; i < regBurstCount; i++) {
    const res = await request("POST", "/auth/register", {
      body: {
        firstName: "PenTest",
        lastName: "User" + i,
        email: `pentest-ratelimit-${i}-${Date.now()}@test.com`,
        password: "TestPass123!",
        phone: "9876" + String(i).padStart(6, "0"),
        countryCode: "+977",
        role: "CUSTOMER",
        turnstileToken: "fake-token",
      },
    });
    if (res.status === 429) {
      regBlockedCount++;
    }
  }

  record({
    name: "Rate limit — registration spam",
    category: "Rate Limiting",
    severity: "HIGH",
    status: regBlockedCount > 0 ? "PASS" : "WARN",
    description:
      regBlockedCount > 0
        ? `Registration rate limiter activated (${regBlockedCount}/${regBurstCount} blocked)`
        : `All ${regBurstCount} registration attempts processed — consider rate limiting registration`,
    recommendation:
      regBlockedCount === 0
        ? "Turnstile CAPTCHA should block automated registrations, but consider IP-based rate limiting too"
        : undefined,
  });

  // Wait again
  console.log("  Waiting 65s for rate limit window to reset...");
  await sleep(65_000);

  // ═══════════════════════════════════════
  // 5.4 Password reset rate limiting
  // ═══════════════════════════════════════

  const resetBurstCount = 10;
  let resetBlockedCount = 0;

  console.log(`  Sending ${resetBurstCount} password reset requests...`);

  for (let i = 0; i < resetBurstCount; i++) {
    const res = await request("POST", "/auth/forgot-password", {
      body: {
        email: "pentest-ratelimit@test.com",
      },
    });
    if (res.status === 429) {
      resetBlockedCount++;
    }
  }

  record({
    name: "Rate limit — password reset flood",
    category: "Rate Limiting",
    severity: "HIGH",
    status: resetBlockedCount > 0 ? "PASS" : "WARN",
    description:
      resetBlockedCount > 0
        ? `Password reset rate limiter activated (${resetBlockedCount}/${resetBurstCount} blocked)`
        : `All ${resetBurstCount} reset requests processed — possible email bombing vector`,
    recommendation:
      resetBlockedCount === 0
        ? "Rate limit forgot-password to prevent email bombing (max 3/hour per email)"
        : undefined,
  });

  // ═══════════════════════════════════════
  // 5.5 Rate limit headers check
  // ═══════════════════════════════════════

  const headerRes = await request("GET", "/materials/jewellery-types");
  const hasRateLimitHeaders =
    headerRes.headers.has("x-ratelimit-limit") ||
    headerRes.headers.has("ratelimit-limit") ||
    headerRes.headers.has("x-ratelimit-remaining") ||
    headerRes.headers.has("retry-after");

  record({
    name: "Rate limit — response headers present",
    category: "Rate Limiting",
    severity: "LOW",
    status: hasRateLimitHeaders ? "PASS" : "INFO",
    description: hasRateLimitHeaders
      ? "Rate limit headers found in response"
      : "No rate limit headers in response — clients cannot know their remaining quota",
    recommendation: !hasRateLimitHeaders
      ? "Consider adding X-RateLimit-Limit, X-RateLimit-Remaining, Retry-After headers"
      : undefined,
  });

  // ═══════════════════════════════════════
  // 5.6 Slowloris / large payload
  // ═══════════════════════════════════════

  // Test body size limit (configured at 10mb in main.ts)
  const oversizedBody = "x".repeat(11 * 1024 * 1024); // 11MB
  const largeRes = await request("POST", "/auth/login", {
    body: { email: oversizedBody, password: "test" },
  });
  record({
    name: "Rate limit — oversized request body (11MB)",
    category: "Rate Limiting",
    severity: "MEDIUM",
    status: largeRes.status === 413 || largeRes.status === 400 ? "PASS" : "WARN",
    description:
      largeRes.status === 413
        ? "Request correctly rejected as too large (413)"
        : largeRes.status === 400
          ? "Request rejected (400) — body parser limit in effect"
          : `Got status ${largeRes.status} — check if body size limit is enforced`,
  });
}
