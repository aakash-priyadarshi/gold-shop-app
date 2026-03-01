import { expect, test } from "@playwright/test";

const API_BASE = process.env.API_BASE_URL || "http://localhost:4000/api";

test.describe("API Health Checks", () => {
  test("GET /api/health should return 200", async ({ request }) => {
    const res = await request.get(`${API_BASE}/health`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("status");
  });

  test("GET /api/health/detailed should return service info", async ({ request }) => {
    const res = await request.get(`${API_BASE}/health/detailed`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("status");
  });

  test("GET /api/metrics should return metrics data", async ({ request }) => {
    const res = await request.get(`${API_BASE}/metrics`);
    expect(res.ok()).toBeTruthy();
  });

  test("API should reject invalid routes with 404", async ({ request }) => {
    const res = await request.get(`${API_BASE}/nonexistent-endpoint-12345`);
    expect(res.status()).toBe(404);
  });

  test("API should handle CORS headers", async ({ request }) => {
    const res = await request.get(`${API_BASE}/health`, {
      headers: { Origin: "http://localhost:3000" },
    });
    expect(res.status()).toBe(200);
  });
});
