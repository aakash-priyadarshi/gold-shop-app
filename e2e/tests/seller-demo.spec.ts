/**
 * Seller Product Demo — Playwright recording
 *
 * Produces a full video walkthrough of the seller dashboard.
 * Run:
 *   cd e2e
 *   DEMO_EMAIL=seller@example.com DEMO_PASSWORD=yourpass npx playwright test seller-demo --project=chromium --headed
 *
 * Video saved to: e2e/test-results/seller-demo-chromium/
 *
 * To record against production:
 *   BASE_URL=https://www.orivraa.com DEMO_EMAIL=... DEMO_PASSWORD=... npx playwright test seller-demo --project=chromium --headed
 */

import { expect, test, type Page } from "@playwright/test";

// ─── credentials from env ────────────────────────────────────────────────────
const EMAIL = process.env.DEMO_EMAIL ?? "";
const PASSWORD = process.env.DEMO_PASSWORD ?? "";

// ─── helper ──────────────────────────────────────────────────────────────────
async function pause(ms = 1800) {
  await new Promise((r) => setTimeout(r, ms));
}

async function scrollDown(page: Page, times = 3, delayMs = 600) {
  for (let i = 0; i < times; i++) {
    await page.evaluate(() => window.scrollBy(0, 350));
    await pause(delayMs);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await pause(400);
}

// ─── force video on for every test in this file ──────────────────────────────
test.use({ video: "on", viewport: { width: 1440, height: 900 } });

// ─── sign-in once, reuse auth for all scenes ─────────────────────────────────
test.describe("Orivraa Seller Demo", () => {
  test.beforeEach(async ({ page }) => {
    if (!EMAIL || !PASSWORD) {
      test.skip(true, "Set DEMO_EMAIL and DEMO_PASSWORD env vars to run demo.");
    }
    await page.goto("/login");
    await page.getByLabel(/email/i).fill(EMAIL);
    await page.getByLabel(/password/i).fill(PASSWORD);
    await page.getByRole("button", { name: /log\s?in|sign\s?in/i }).click();
    // Wait for redirect into dashboard
    await page.waitForURL(/dashboard/, { timeout: 15_000 });
    await pause(1000);
  });

  // ── 1. Dashboard overview ─────────────────────────────────────────────────
  test("01 – Dashboard overview", async ({ page }) => {
    await page.goto("/dashboard/shop");
    await page.waitForLoadState("networkidle");
    await pause(2000);
    await scrollDown(page, 4);
    await page.screenshot({ path: "screenshots/01-dashboard.png", fullPage: false });
  });

  // ── 2. Products – catalog & add product ──────────────────────────────────
  test("02 – Products catalog", async ({ page }) => {
    await page.goto("/dashboard/shop/products");
    await page.waitForLoadState("networkidle");
    await pause(2000);
    await scrollDown(page, 3);

    // Open "Add product" if present
    const addBtn = page.getByRole("button", { name: /add product|new product/i });
    if (await addBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await addBtn.click();
      await pause(1500);
      await page.screenshot({ path: "screenshots/02-add-product-modal.png" });
      // Close without saving
      const cancelBtn = page.getByRole("button", { name: /cancel|close|dismiss/i }).first();
      if (await cancelBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await cancelBtn.click();
      } else {
        await page.keyboard.press("Escape");
      }
      await pause(800);
    }
  });

  // ── 3. Orders ─────────────────────────────────────────────────────────────
  test("03 – Orders list", async ({ page }) => {
    await page.goto("/dashboard/shop/orders");
    await page.waitForLoadState("networkidle");
    await pause(2000);
    await scrollDown(page, 3);

    // Click first order row if visible
    const firstRow = page.locator("table tbody tr, [data-order-row]").first();
    if (await firstRow.isVisible({ timeout: 3000 }).catch(() => false)) {
      await firstRow.click();
      await page.waitForLoadState("networkidle");
      await pause(1800);
      await scrollDown(page, 3);
      await page.goBack();
      await pause(800);
    }
  });

  // ── 4. Analytics ─────────────────────────────────────────────────────────
  test("04 – Analytics", async ({ page }) => {
    await page.goto("/dashboard/shop/analytics");
    await page.waitForLoadState("networkidle");
    await pause(2500);
    await scrollDown(page, 4);
  });

  // ── 5. Tax Reports (view — free tier) ────────────────────────────────────
  test("05 – Tax Reports", async ({ page }) => {
    await page.goto("/dashboard/shop/tax-reports");
    await page.waitForLoadState("networkidle");
    await pause(2000);

    // Click through region tabs
    for (const tab of ["India", "Nepal", "UAE", "UK", "EU", "US"]) {
      const tabEl = page.getByRole("tab", { name: new RegExp(tab, "i") });
      if (await tabEl.isVisible({ timeout: 2000 }).catch(() => false)) {
        await tabEl.click();
        await pause(1200);
        await scrollDown(page, 2, 400);
      }
    }
  });

  // ── 6. Billing / Plan ────────────────────────────────────────────────────
  test("06 – Billing & subscription", async ({ page }) => {
    await page.goto("/dashboard/shop/billing");
    await page.waitForLoadState("networkidle");
    await pause(2000);
    await scrollDown(page, 3);
  });

  // ── 7. Settings & shop profile ───────────────────────────────────────────
  test("07 – Shop settings", async ({ page }) => {
    await page.goto("/dashboard/shop/settings");
    await page.waitForLoadState("networkidle");
    await pause(2000);
    await scrollDown(page, 4);
  });

  // ── 8. Messaging / chat ──────────────────────────────────────────────────
  test("08 – Messaging", async ({ page }) => {
    await page.goto("/dashboard/shop/messages");
    await page.waitForLoadState("networkidle");
    await pause(2000);
    await scrollDown(page, 2);
  });

  // ── 9. Pricing page (what sellers see before upgrade) ────────────────────
  test("09 – Pricing plans", async ({ page }) => {
    await page.goto("/pricing");
    await page.waitForLoadState("networkidle");
    await pause(2000);
    await scrollDown(page, 4);
  });
});
