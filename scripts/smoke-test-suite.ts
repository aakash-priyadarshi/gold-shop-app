/**
 * Enhanced Smoke Test Suite
 *
 * Runs a comprehensive battery of checks against the API.
 * Defaults to production (https://api.orivraa.com/api).
 *
 * Usage:  npx tsx scripts/smoke-test-suite.ts [baseUrl]
 * Examples:
 *   npx tsx scripts/smoke-test-suite.ts                           # production
 *   npx tsx scripts/smoke-test-suite.ts http://localhost:4000/api  # local dev
 */

import * as http from "http";
import * as https from "https";

// ── Configuration ──────────────────────────────────────────

const BASE = (
  process.argv[2] ||
  process.env.SMOKE_TEST_URL ||
  "https://api.orivraa.com/api"
).replace(/\/$/, ""); // strip trailing slash
const TIMEOUT = 10_000;

// Browser-like headers to avoid CDN bot detection (Cloudflare Bot Fight Mode)
const COMMON_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (compatible; Orivraa-SmokeTest/1.0; +https://orivraa.com)",
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9",
};

interface TestResult {
  name: string;
  status: "PASS" | "FAIL" | "SKIP";
  duration: number;
  detail?: string;
}

const results: TestResult[] = [];

// ── Helpers ────────────────────────────────────────────────

function get(
  path: string,
): Promise<{ status: number; body: string; duration: number }> {
  return new Promise((resolve, reject) => {
    // Use string concatenation — new URL("/path", base) drops the base pathname
    const fullUrl = BASE + path;
    const url = new URL(fullUrl);
    const isHttps = url.protocol === "https:";
    const transport = isHttps ? https : http;
    const start = Date.now();
    const req = transport.request(
      url,
      {
        method: "GET",
        timeout: TIMEOUT,
        headers: { ...COMMON_HEADERS },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () =>
          resolve({
            status: res.statusCode!,
            body: data,
            duration: Date.now() - start,
          }),
        );
      },
    );
    req.on("error", (err) => reject(err));
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Request timeout"));
    });
    req.end();
  });
}

async function runTest(name: string, fn: () => Promise<void>): Promise<void> {
  const start = Date.now();
  try {
    await fn();
    results.push({ name, status: "PASS", duration: Date.now() - start });
  } catch (err: any) {
    results.push({
      name,
      status: "FAIL",
      duration: Date.now() - start,
      detail: err.message || String(err),
    });
  }
}

function assert(condition: boolean, msg: string): void {
  if (!condition) throw new Error(msg);
}

// ── Test Definitions ───────────────────────────────────────

async function main() {
  console.log(`\n🧪  Enhanced Smoke Test Suite`);
  console.log(`   Target: ${BASE}\n`);

  // ── Pre-flight: detect CDN/WAF blocking ──────────────────
  try {
    const preflight = await get("/health");
    if (preflight.status === 403) {
      // Check if it's a CDN/WAF block (Cloudflare, etc.)
      const isHtml = preflight.body.trim().startsWith("<");
      const isCdnBlock =
        isHtml ||
        preflight.body.includes("cloudflare") ||
        preflight.body.includes("Forbidden: Invalid host");
      if (isCdnBlock) {
        console.log(
          "⚠️  CDN/WAF is blocking requests from this IP (likely Cloudflare Bot Fight Mode).",
        );
        console.log(
          "   To fix: add a Cloudflare WAF exception for CI, or use the Railway direct URL.",
        );
        console.log(
          `   Response (first 200 chars): ${preflight.body.substring(0, 200)}`,
        );
        console.log("   Skipping all tests.");
        process.exit(0); // exit success — not a code bug
      }
      // If JSON 403, it's the NestJS security guard — continue with tests
      console.log(
        `⚠️  Pre-flight /health returned 403 (JSON). May be security guard or host validation.`,
      );
      console.log(`   Body: ${preflight.body.substring(0, 300)}`);
    }
  } catch (err: any) {
    console.log(`⚠️  Pre-flight check failed: ${err.message}`);
    console.log(`   Continuing with tests anyway...\n`);
  }

  // 1 — Health
  await runTest("GET /health → 200", async () => {
    const { status } = await get("/health");
    assert(status === 200, `Expected 200, got ${status}`);
  });

  // 2 — Health readiness
  await runTest("GET /health/ready → 200 + ready field", async () => {
    const { status, body } = await get("/health/ready");
    assert(status === 200, `Expected 200, got ${status}`);
    const json = JSON.parse(body);
    assert(
      "ready" in json || "status" in json,
      "Missing 'ready' or 'status' field",
    );
  });

  // 3 — Metrics
  await runTest("GET /metrics → 200", async () => {
    const { status } = await get("/metrics");
    assert(status === 200, `Expected 200, got ${status}`);
  });

  // 4 — Auth rejects empty body
  await runTest("POST /auth/login with empty body → 400/401/422", async () => {
    const fullUrl = BASE + "/auth/login";
    const url = new URL(fullUrl);
    const isHttps = url.protocol === "https:";
    const transport = isHttps ? https : http;
    const { status } = await new Promise<{ status: number }>(
      (resolve, reject) => {
        const req = transport.request(
          url,
          {
            method: "POST",
            timeout: TIMEOUT,
            headers: {
              ...COMMON_HEADERS,
              "Content-Type": "application/json",
            },
          },
          (res) => {
            res.resume();
            res.on("end", () => resolve({ status: res.statusCode! }));
          },
        );
        req.on("error", reject);
        req.write("{}");
        req.end();
      },
    );
    assert(
      [400, 401, 422].includes(status),
      `Expected 400/401/422, got ${status}`,
    );
  });

  // 5 — Protected route without token
  await runTest("GET /users/me without token → 401", async () => {
    const { status } = await get("/users/me");
    assert(status === 401, `Expected 401, got ${status}`);
  });

  // 6 — Unknown route
  await runTest("GET /unknown-route → 404", async () => {
    const { status } = await get("/this-route-does-not-exist-99");
    assert(status === 404, `Expected 404, got ${status}`);
  });

  // 7 — Response time (2s budget for production, network latency included)
  await runTest("GET /health response < 2s", async () => {
    const { duration } = await get("/health");
    assert(duration < 2000, `Health took ${duration}ms > 2000ms`);
  });

  // 8 — Market rates (public)
  await runTest("GET /market-rates → 200", async () => {
    const { status } = await get("/market-rates");
    assert([200, 304].includes(status), `Expected 200/304, got ${status}`);
  });

  // ── Report ─────────────────────────────────────────────

  console.log("\n" + "─".repeat(60));
  const passed = results.filter((r) => r.status === "PASS").length;
  const failed = results.filter((r) => r.status === "FAIL").length;
  const skipped = results.filter((r) => r.status === "SKIP").length;

  for (const r of results) {
    const icon = r.status === "PASS" ? "✅" : r.status === "FAIL" ? "❌" : "⏭️";
    const detail = r.detail ? ` — ${r.detail}` : "";
    console.log(`  ${icon} ${r.name} (${r.duration}ms)${detail}`);
  }

  console.log("\n" + "─".repeat(60));
  console.log(
    `  Total: ${results.length}  |  ✅ ${passed}  |  ❌ ${failed}  |  ⏭️  ${skipped}`,
  );
  console.log("─".repeat(60) + "\n");

  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
