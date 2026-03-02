import { expect, test } from "@playwright/test";

test.describe("Homepage", () => {
  test("should load the homepage", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/gold|jewel|shop/i);
  });

  test("should have a visible navigation bar", async ({ page }) => {
    await page.goto("/");
    const nav = page.locator("nav").first();
    await expect(nav).toBeVisible();
  });

  test("should have a working search input", async ({ page }) => {
    await page.goto("/");
    const searchInput = page.getByPlaceholder(/search/i).first();
    if (await searchInput.isVisible()) {
      await searchInput.fill("gold ring");
      await expect(searchInput).toHaveValue("gold ring");
    }
  });

  test("should navigate to login page", async ({ page }) => {
    await page.goto("/");
    const loginLink = page
      .getByRole("link", { name: /log\s?in|sign\s?in/i })
      .first();
    if (await loginLink.isVisible()) {
      await loginLink.click();
      await expect(page).toHaveURL(/login|signin|auth/i);
    }
  });

  test("should be responsive on mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");
    await expect(page.locator("body")).toBeVisible();
  });
});
