import { expect, test } from "@playwright/test";

test.describe("Visual Regression", () => {
  test("homepage visual snapshot", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot("homepage.png", {
      maxDiffPixelRatio: 0.05,
      fullPage: true,
    });
  });

  test("login page visual snapshot", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot("login.png", {
      maxDiffPixelRatio: 0.05,
    });
  });
});
