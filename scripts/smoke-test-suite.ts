/**
 * Enhanced Smoke Test Suite
 *
 * Runs a comprehensive battery of checks against the running backend.
 *
 * Usage:  npx tsx scripts/smoke-test-suite.ts [baseUrl]
 * Default baseUrl: http://localhost:4000/api
 */

import * as http from "http";

// ── Configuration ──────────────────────────────────────────

const BASE = process.argv[2] || "http://localhost:4000/api";
const TIMEOUT = 8_000;

interface TestResult {
  name: string;
  status: "PASS" | "FAIL" | "SKIP";
  duration: number;
  detail?: string;
}

const results: TestResult[] = [];

// ── Helpers ────────────────────────────────────────────────

function get(path: string): Promise<{ status: number; body: string; duration: number }> {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE);
    const start = Date.now();
    const req = http.request(url, { method: "GET", timeout: TIMEOUT }, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () =>
        resolve({ status: res.statusCode!, body: data, duration: Date.now() - start }),
      );
    });
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

  // 1 — Health
  await runTest("GET /health → 200", async () => {
    const { status } = await get("/health");
    assert(status === 200, `Expected 200, got ${status}`);
  });

  // 2 — Health detailed
  await runTest("GET /health/detailed → 200 + status field", async () => {
    const { status, body } = await get("/health/detailed");
    assert(status === 200, `Expected 200, got ${status}`);
    const json = JSON.parse(body);
    assert("status" in json, "Missing 'status' field");
  });

  // 3 — Metrics
  await runTest("GET /metrics → 200", async () => {
    const { status } = await get("/metrics");
    assert(status === 200, `Expected 200, got ${status}`);
  });

  // 4 — Auth rejects empty body
  await runTest("POST /auth/login with empty body → 400/401/422", async () => {
    const url = new URL("/auth/login", BASE);
    const { status } = await new Promise<{ status: number }>((resolve, reject) => {
      const req = http.request(url, { method: "POST", timeout: TIMEOUT, headers: { "Content-Type": "application/json" } }, (res) => {
        res.resume();
        res.on("end", () => resolve({ status: res.statusCode! }));
      });
      req.on("error", reject);
      req.write("{}");
      req.end();
    });
    assert([400, 401, 422].includes(status), `Expected 400/401/422, got ${status}`);
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

  // 7 — Response time
  await runTest("GET /health response < 1s", async () => {
    const { duration } = await get("/health");
    assert(duration < 1000, `Health took ${duration}ms > 1000ms`);
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
  console.log(`  Total: ${results.length}  |  ✅ ${passed}  |  ❌ ${failed}  |  ⏭️  ${skipped}`);
  console.log("─".repeat(60) + "\n");

  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
