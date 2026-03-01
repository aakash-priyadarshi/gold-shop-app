import { expect, test } from "@playwright/test";

test.describe("Performance", () => {
  test("homepage should load within 3 seconds", async ({ page }) => {
    const start = Date.now();
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const loadTime = Date.now() - start;
    expect(loadTime).toBeLessThan(3000);
  });

  test("homepage should have no console errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    // Filter out known third-party errors
    const criticalErrors = errors.filter(
      (e) => !e.includes("favicon") && !e.includes("third-party"),
    );
    expect(criticalErrors).toHaveLength(0);
  });

  test("API health endpoint should respond within 500ms", async ({ request }) => {
    const apiBase = process.env.API_BASE_URL || "http://localhost:4000/api";
    const start = Date.now();
    const res = await request.get(`${apiBase}/health`);
    const duration = Date.now() - start;
    expect(res.status()).toBe(200);
    expect(duration).toBeLessThan(500);
  });
});
