import { expect, test } from "@playwright/test";

const API_BASE = process.env.API_BASE_URL || "https://api.orivraa.com/api";

test.describe("API Health Checks", () => {
  test("GET /api/health should return 200", async ({ request }) => {
    const res = await request.get(`${API_BASE}/health`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("status");
  });

  test("GET /api/health/ready should return readiness info", async ({
    request,
  }) => {
    const res = await request.get(`${API_BASE}/health/ready`);
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
      headers: { Origin: "https://www.orivraa.com" },
    });
    expect(res.status()).toBe(200);
  });
});
