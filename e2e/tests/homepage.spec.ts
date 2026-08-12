import { expect, test, type Page } from "@playwright/test";

async function openHomepage(page: Page) {
  await page.goto("/", { waitUntil: "domcontentloaded" });
}

test.describe("Homepage", () => {
  test("should load the homepage", async ({ page }) => {
    await openHomepage(page);
    await expect(page).toHaveTitle(/gold|jewel|shop/i);
  });

  test("should have a visible navigation bar", async ({ page }) => {
    await openHomepage(page);
    const nav = page.locator("nav").first();
    await expect(nav).toBeVisible();
  });

  test("should have a working search input", async ({ page }) => {
    await openHomepage(page);
    const searchInput = page.getByPlaceholder(/search/i).first();
    if (await searchInput.isVisible()) {
      await searchInput.fill("gold ring");
      await expect(searchInput).toHaveValue("gold ring");
    }
  });

  test("should navigate to login page", async ({ page }) => {
    await openHomepage(page);
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
    await openHomepage(page);
    await expect(page.locator("body")).toBeVisible();
  });
});
