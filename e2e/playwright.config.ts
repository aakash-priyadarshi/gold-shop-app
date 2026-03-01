import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E configuration for Gold Shop App
 *
 * Usage:
 *   cd e2e && npx playwright test          # headless
 *   cd e2e && npx playwright test --ui     # interactive UI mode
 *   cd e2e && npx playwright test --headed # headed browser
 */
export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ["html", { outputFolder: "../playwright-report" }],
    ["json", { outputFile: "../e2e-results/results.json" }],
    ["list"],
  ],
  outputDir: "./test-results",

  use: {
    /* Base URL for the frontend — defaults to production */
    baseURL: process.env.BASE_URL || "https://www.orivraa.com",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "mobile-chrome",
      use: { ...devices["Pixel 5"] },
    },
  ],

  /* Optionally start the dev server before running tests */
  // webServer: {
  //   command: 'pnpm --filter web dev',
  //   url: 'http://localhost:3000',
  //   reuseExistingServer: !process.env.CI,
  //   timeout: 120_000,
  // },
});
