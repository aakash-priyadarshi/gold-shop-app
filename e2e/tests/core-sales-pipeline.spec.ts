/**
 * Core sales pipeline E2E — production smoke + authenticated flows.
 *
 * Setup (one-time):
 *   cd apps/api
 *   # Set E2E_API_URL, E2E_WEB_URL, TURNSTILE_BYPASS_SECRET,
 *   # E2E_SHOP_EMAIL, and E2E_SHOP_PASSWORD explicitly.
 *   railway run node ../../e2e/scripts/api-login.mjs
 *
 * Run:
 *   cd e2e && npx playwright test core-sales-pipeline --project=chromium --workers=1
 */
import { test, expect } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

const AUTH_FILE = path.join(__dirname, "..", ".auth", "seller.json");
const SESSION_FILE = path.join(__dirname, "..", ".auth", "session.json");
const hasAuth = fs.existsSync(AUTH_FILE);
const API_BASE = process.env.API_BASE_URL || "https://api.orivraa.com/api";

const checklist: { id: string; name: string; path: string }[] = [
  { id: "products", name: "Product Catalog", path: "/dashboard/shop/products" },
  { id: "inventory", name: "Pricing Setup (Inventory)", path: "/dashboard/shop/inventory" },
  { id: "stock", name: "Vault & Tags (Stock)", path: "/dashboard/shop/stock" },
  { id: "stock-audit", name: "RFID / Barcode Stock Audit", path: "/dashboard/shop/stock/audit" },
  { id: "catalogues", name: "Catalogues", path: "/dashboard/shop/catalogues" },
  { id: "quotes-create", name: "Create Quote", path: "/dashboard/shop/quotes/create" },
  { id: "quotes-list", name: "Quotes List", path: "/dashboard/shop/quotes" },
  { id: "invoice-create", name: "Create Invoice", path: "/dashboard/shop/invoices/create" },
  { id: "invoices-list", name: "Invoices List", path: "/dashboard/shop/invoices" },
  { id: "pos", name: "POS", path: "/dashboard/shop/pos" },
  { id: "accounting", name: "Accounting", path: "/dashboard/shop/accounting" },
  { id: "tax-reports", name: "Tax Reports", path: "/dashboard/shop/tax-reports" },
  { id: "customers", name: "Walk-in Customers", path: "/dashboard/shop/customers" },
];

const publicMarketingPages = [
  { id: "software", path: "/jewellery-shop-software" },
  { id: "download", path: "/download" },
  { id: "eu", path: "/eu/jewellery-shop-software" },
  { id: "lk", path: "/lk/jewellery-shop-software" },
];

test.describe("Public pages (no auth)", () => {
  test("API health", async ({ request }) => {
    const res = await request.get(`${API_BASE}/health`);
    if (res.status() === 403) {
      test.info().annotations.push({
        type: "note",
        description: "Cloudflare WAF blocked CI (expected)",
      });
      return;
    }
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.checks?.database?.status).toBe("up");
  });

  test("verify-bill page loads", async ({ page }) => {
    const res = await page.goto("/verify-bill/test-token");
    expect(res?.status()).toBeLessThan(500);
    await expect(page.locator("body")).toBeVisible();
  });

  test("track page loads", async ({ page }) => {
    const res = await page.goto("/track/test-token");
    expect(res?.status()).toBeLessThan(500);
    await expect(page.locator("body")).toBeVisible();
  });

  test("login page loads", async ({ page }) => {
    await page.goto("/auth/login");
    await expect(page.getByRole("heading", { name: /Welcome back/i })).toBeVisible();
  });

  for (const pageInfo of publicMarketingPages) {
    test(`marketing: ${pageInfo.id} page loads`, async ({ page }) => {
      const res = await page.goto(pageInfo.path);
      expect(res?.status()).toBeLessThan(500);
      await expect(page.locator("body")).toBeVisible();
    });
  }
});

test.describe("Authenticated core pipeline", () => {
  test.skip(!hasAuth, "Run api-login.mjs first with explicit E2E URLs, account credentials, and bypass secret");

  test.use({
    storageState: AUTH_FILE,
  });

  for (const item of checklist) {
    test(`${item.id}: ${item.name} page loads`, async ({ page }) => {
      await page.goto(item.path);
      await page.waitForLoadState("domcontentloaded");
      await page.waitForTimeout(1500);

      // Redirected to login = session invalid
      if (page.url().includes("/auth/login")) {
        throw new Error(`Session expired on ${item.path}`);
      }

      expect(page.url()).toContain(item.path.split("?")[0]);
      await expect(page.locator("body")).toBeVisible();

      // Invoice create: tax country + currency converter UI present
      if (item.id === "invoice-create") {
        await expect(page.getByText(/Country.*Tax|Invoice Country/i).first()).toBeVisible({
          timeout: 10000,
        });
        const converter = page.getByText(/different currency/i);
        if (await converter.isVisible({ timeout: 3000 }).catch(() => false)) {
          await converter.click();
          await expect(page.getByText(/Convert to/i)).toBeVisible();
        }
      }
    });
  }

  test("invoice-create: tax country selector is interactive", async ({ page }) => {
    await page.goto("/dashboard/shop/invoices/create");
    await page.waitForLoadState("domcontentloaded");
    if (page.url().includes("/auth/login")) test.skip();

    const countrySelect = page.locator('select').filter({ has: page.locator('option[value="IN"]') }).first();
    await expect(countrySelect).toBeVisible({ timeout: 10000 });
    const before = await countrySelect.inputValue();
    const next = before === "IN" ? "NP" : "IN";
    await countrySelect.selectOption(next);
    expect(await countrySelect.inputValue()).toBe(next);
  });
});

test.afterAll(async () => {
  if (hasAuth && fs.existsSync(SESSION_FILE)) {
    const session = JSON.parse(fs.readFileSync(SESSION_FILE, "utf8"));
    const user = session.user || { email: session.userEmail };
    console.log("\n=== E2E session ===");
    console.log("User:", user.email, "| Role:", user.role);
    console.log("Shop ID:", user.shopId);
  }
});
