import { expect, test } from "@playwright/test";

// Visual regression tests require baseline screenshots.
// First run will always fail to create the baseline, so skip in CI.
// Run locally with `--update-snapshots` to generate baselines.
test.describe("Visual Regression", () => {
  // eslint-disable-next-line playwright/no-skipped-test
  test.skip(
    !!process.env.CI,
    "Skipped in CI — baselines must be generated locally",
  );

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
