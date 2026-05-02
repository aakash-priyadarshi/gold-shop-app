/**
 * Seller Product Demo — Playwright recording
 *
 * Prerequisites (one-time):
 *   cd e2e
 *   npx ts-node auth-setup.ts     ← logs in via Google manually, saves session
 *
 * Run the demo:
 *   npm run demo
 *   # or:
 *   BASE_URL=https://www.orivraa.com npx playwright test seller-demo --project=chromium --headed --workers=1
 *
 * Videos saved to: e2e/test-results/seller-demo-chromium/
 */

import { test, type Page } from "@playwright/test";
import * as path from "path";

const AUTH_FILE = path.join(__dirname, "..", ".auth", "seller.json");

// ─── helpers ─────────────────────────────────────────────────────────────────
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

// ─── load saved Google session, force video on ───────────────────────────────
test.use({
  video: "on",
  viewport: { width: 1440, height: 900 },
  storageState: AUTH_FILE,
});

test.describe("Orivraa Seller Demo", () => {
  test.beforeEach(async ({ page }) => {
    // Verify session is still valid
    await page.goto("/dashboard/shop");
    const url = page.url();
    if (!url.includes("dashboard")) {
      test.skip(true, "Session expired — re-run auth-setup.ts to refresh .auth/seller.json");
    }
    await pause(800);
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
