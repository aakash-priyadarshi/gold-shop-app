import { expect, test } from "@playwright/test";

function isBenignConsoleError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("favicon") ||
    lower.includes("third-party") ||
    lower.includes("content security policy") ||
    lower.includes("media-src") ||
    lower.includes("default-src") ||
    lower.includes("failed to load resource") ||
    lower.includes("status of 403") ||
    lower.includes("status of 404") ||
    lower.includes("[next-auth]") ||
    lower.includes("client_fetch_error") ||
    lower.includes("hydration") ||
    // PR checks target the currently deployed Railway build. Ignore the exact
    // retired Vercel Speed Insights script until the source removal deploys.
    (lower.includes("/_vercel/speed-insights/script.js") &&
      lower.includes("mime type")) ||
    // Chromium noise when blocked by CSP / WAF
    lower.includes("net::err_")
  );
}

test.describe("Performance", () => {
  test("homepage should load within 3 seconds", async ({ page }) => {
    const start = Date.now();
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const loadTime = Date.now() - start;
    expect(loadTime).toBeLessThan(3000);
  });

  test("homepage should have no unexpected app console errors", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });
    page.on("pageerror", (err) => {
      errors.push(err.message);
    });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("domcontentloaded");
    // Give hydration a moment without requiring networkidle (CF/CDN can hang)
    await page.waitForTimeout(1500);

    const criticalErrors = errors.filter((e) => !isBenignConsoleError(e));
    expect(criticalErrors).toHaveLength(0);
  });

  test("API health endpoint should respond within 2s", async ({ request }) => {
    const apiBase = process.env.API_BASE_URL || "https://api.orivraa.com/api";
    const start = Date.now();
    const res = await request.get(`${apiBase}/health`);
    const duration = Date.now() - start;
    if (res.status() === 403) {
      test.info().annotations.push({
        type: "note",
        description: "Cloudflare WAF blocked CI (expected)",
      });
      expect(duration).toBeLessThan(2000);
      return;
    }
    expect(res.status()).toBe(200);
    expect(duration).toBeLessThan(2000);
  });
});
