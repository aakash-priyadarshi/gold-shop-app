import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E configuration for Gold Shop App
 *
 * Usage:
 *   cd e2e && npx playwright test          # headless
 *   cd e2e && npx playwright test --ui     # interactive UI mode
 *   cd e2e && npx playwright test --headed # headed browser
 */
const CI_USER_AGENT =
  "Mozilla/5.0 (compatible; Orivraa-SmokeTest/1.0; +https://orivraa.com)";

export default defineConfig({
  testDir: "./tests",
  testIgnore: process.env.CI ? ["**/seller-demo.spec.ts"] : [],
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
    /* Cloudflare Bot Fight Mode blocks the default Playwright UA; use a
       browser-like UA that is allowed by the WAF in CI. */
    userAgent: process.env.CI ? CI_USER_AGENT : undefined,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        userAgent: process.env.CI ? CI_USER_AGENT : devices["Desktop Chrome"].userAgent,
      },
    },
    ...(!process.env.CI
      ? [
          {
            name: "firefox",
            use: { ...devices["Desktop Firefox"] },
          },
          {
            name: "mobile-chrome",
            use: { ...devices["Pixel 5"] },
          },
        ]
      : []),
  ],

  /* Optionally start the dev server before running tests */
  // webServer: {
  //   command: 'pnpm --filter web dev',
  //   url: 'http://localhost:3000',
  //   reuseExistingServer: !process.env.CI,
  //   timeout: 120_000,
  // },
});
