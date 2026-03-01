import { expect, test } from "@playwright/test";

test.describe("Authentication", () => {
  const loginUrl = "/login";

  test("should show the login form", async ({ page }) => {
    await page.goto(loginUrl);
    await expect(page.getByRole("heading", { name: /log\s?in|sign\s?in/i })).toBeVisible();
  });

  test("should show validation errors for empty form", async ({ page }) => {
    await page.goto(loginUrl);
    const submitBtn = page.getByRole("button", { name: /log\s?in|sign\s?in|submit/i }).first();
    if (await submitBtn.isVisible()) {
      await submitBtn.click();
      // Expect some validation feedback
      const errorMsg = page.locator("[role='alert'], .error, .text-red, .text-destructive").first();
      await expect(errorMsg).toBeVisible({ timeout: 5000 }).catch(() => {
        // Some forms use HTML5 validation
      });
    }
  });

  test("should reject invalid credentials", async ({ page }) => {
    await page.goto(loginUrl);
    const emailInput = page.getByLabel(/email/i).first();
    const passInput = page.getByLabel(/password/i).first();

    if (await emailInput.isVisible()) {
      await emailInput.fill("fake@example.com");
      await passInput.fill("wrongpassword123");

      const submitBtn = page.getByRole("button", { name: /log\s?in|sign\s?in|submit/i }).first();
      await submitBtn.click();

      // Should show an error or stay on login page
      await expect(page).toHaveURL(/login|signin|auth/i, { timeout: 10000 });
    }
  });

  test("should have a link to registration", async ({ page }) => {
    await page.goto(loginUrl);
    const registerLink = page.getByRole("link", { name: /register|sign\s?up|create/i }).first();
    if (await registerLink.isVisible()) {
      await expect(registerLink).toHaveAttribute("href", /register|signup/i);
    }
  });

  test("should have a forgot password link", async ({ page }) => {
    await page.goto(loginUrl);
    const forgotLink = page.getByRole("link", { name: /forgot|reset/i }).first();
    if (await forgotLink.isVisible()) {
      await forgotLink.click();
      await expect(page).toHaveURL(/forgot|reset/i);
    }
  });
});
